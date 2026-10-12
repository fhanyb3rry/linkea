"""Alta del seguimiento cuando una postulación pasa a «asignada», y los totales que se muestran."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.seguimiento import EstadoDocumento, EstadoRevision, SeguimientoOut


def nuevo_id() -> str:
    """Id para las piezas embebidas (bitácoras, reportes, …)."""
    return str(ObjectId())


async def crear_seguimiento(db: AsyncIOMotorDatabase, postulacion: dict) -> ObjectId:
    """Crea el seguimiento de una postulación asignada (si ya existe, devuelve el que hay)."""
    existente = await db.seguimientos.find_one({"postulacion_id": str(postulacion["_id"])}, {"_id": 1})
    if existente:
        return existente["_id"]

    estudiante = await db.students.find_one({"_id": ObjectId(postulacion["student_id"])}) or {}
    vacante = await db.vacancies.find_one({"_id": ObjectId(postulacion["vacancy_id"])}) or {}
    org = {}
    if vacante.get("organizacion_id"):
        org = await db.organizations.find_one({"_id": ObjectId(vacante["organizacion_id"])}) or {}
    contacto = org.get("contacto", {})
    asesor_empresarial = " · ".join(x for x in [contacto.get("responsable", ""), contacto.get("cargo", "")] if x)

    # Cada estadía arranca con los documentos activos del catálogo de coordinación.
    catalogo = await db.catalogo_documentos.find({"activo": True}).sort("orden", 1).to_list(length=None)
    documentos = [
        {
            "id": nuevo_id(),
            "catalogo_id": str(d["_id"]),
            "nombre": d["nombre"],
            "descripcion": d.get("descripcion", ""),
            "requiere": d["requiere"],
            "estado": EstadoDocumento.PENDIENTE.value,
            "versiones": [],
            "firmas": {},
            "observacion": "",
        }
        for d in catalogo
    ]

    ahora = datetime.now(timezone.utc)
    doc = {
        "postulacion_id": str(postulacion["_id"]),
        "student_id": postulacion["student_id"],
        "vacancy_id": postulacion["vacancy_id"],
        "organizacion_id": vacante.get("organizacion_id"),
        "empresa_user_id": vacante.get("user_id"),
        "asesor_academico_id": None,
        "estudiante_nombre": estudiante.get("nombre", ""),
        "matricula": estudiante.get("matricula", ""),
        "carrera": estudiante.get("carrera", ""),
        "vacante_titulo": vacante.get("titulo", ""),
        "organizacion_nombre": vacante.get("nombre_empresa", ""),
        "asesor_academico_nombre": "",
        "asesor_empresarial": asesor_empresarial,
        "estado": "en_curso",
        "fecha_inicio": ahora.date().isoformat(),
        "horas_requeridas": 600,
        "bitacoras": [],
        "reportes": [],
        "incidencias": [],
        "documentos": documentos,
        "creado_en": ahora.isoformat(),
    }
    return (await db.seguimientos.insert_one(doc)).inserted_id


def con_totales(doc: dict) -> SeguimientoOut:
    bitacoras = doc.get("bitacoras", [])
    return SeguimientoOut(
        **doc,
        horas_validadas=sum(b["horas"] for b in bitacoras if b["estado"] == EstadoRevision.VALIDADA.value),
        horas_pendientes=sum(b["horas"] for b in bitacoras if b["estado"] == EstadoRevision.PENDIENTE.value),
        documentos_completos=sum(1 for d in doc.get("documentos", []) if d["estado"] == EstadoDocumento.COMPLETO.value),
        incidencias_abiertas=sum(1 for i in doc.get("incidencias", []) if i["estado"] == "abierta"),
    )
