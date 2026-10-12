from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core import archivos
from app.core.database import get_database
from app.core.estadias import con_totales, nuevo_id
from app.core.seguridad import es_rol, requiere_rol, usuario_actual
from app.models.seguimiento import (
    AsesorIn,
    BitacoraIn,
    EstadoDocumento,
    EstadoRevision,
    EstadoSeguimiento,
    Firmante,
    IncidenciaIn,
    RechazoIn,
    ResolucionIn,
    RevisionIn,
    SeguimientoOut,
    SeguimientoUpdate,
)
from app.models.user import Rol

router = APIRouter(prefix="/seguimientos", tags=["seguimientos"], dependencies=[Depends(usuario_actual)])

# Qué asesor firma según el rol de la cuenta.
FIRMANTE_DE = {Rol.ASESOR_ACADEMICO.value: Firmante.ACADEMICO, Rol.EMPRESA.value: Firmante.EMPRESARIAL}


def _ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


def _oid(seguimiento_id: str) -> ObjectId:
    try:
        return ObjectId(seguimiento_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de seguimiento inválido")


def _filtro_de(usuario: dict) -> dict:
    """Qué seguimientos puede ver cada rol."""
    uid = str(usuario["_id"])
    return {
        Rol.COORDINADOR.value: {},
        Rol.ESTUDIANTE.value: {"student_id": usuario.get("perfil_id") or "-"},
        Rol.EMPRESA.value: {"empresa_user_id": uid},
        Rol.ASESOR_ACADEMICO.value: {"asesor_academico_id": uid},
    }[usuario["rol"]]


async def _seguimiento(db: AsyncIOMotorDatabase, seguimiento_id: str, usuario: dict) -> dict:
    doc = await db.seguimientos.find_one({"_id": _oid(seguimiento_id), **_filtro_de(usuario)})
    if doc is None:
        # 404 tanto si no existe como si no es suyo: no se revela qué seguimientos hay.
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado")
    return doc


def _en_curso(doc: dict) -> None:
    if doc["estado"] != EstadoSeguimiento.EN_CURSO.value:
        raise HTTPException(status_code=409, detail="La estadía ya no está en curso")


def _pieza(lista: list[dict], pieza_id: str, nombre: str) -> dict:
    for p in lista:
        if p["id"] == pieza_id:
            return p
    raise HTTPException(status_code=404, detail=f"{nombre} no encontrada")


async def _devolver(db: AsyncIOMotorDatabase, oid: ObjectId) -> SeguimientoOut:
    return con_totales(await db.seguimientos.find_one({"_id": oid}))


# ---- Consulta -----------------------------------------------------------------------------

@router.get("", response_model=list[SeguimientoOut])
async def list_seguimientos(
    estado: EstadoSeguimiento | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    filtro = _filtro_de(usuario)
    if estado:
        filtro["estado"] = estado.value
    docs = await db.seguimientos.find(filtro).sort("creado_en", -1).to_list(length=None)
    return [con_totales(d) for d in docs]


@router.get("/{seguimiento_id}", response_model=SeguimientoOut)
async def get_seguimiento(
    seguimiento_id: str, db: AsyncIOMotorDatabase = Depends(get_database), usuario: dict = Depends(usuario_actual)
):
    return con_totales(await _seguimiento(db, seguimiento_id, usuario))


# ---- Coordinación -------------------------------------------------------------------------

@router.patch("/{seguimiento_id}", response_model=SeguimientoOut)
async def update_seguimiento(
    seguimiento_id: str,
    data: SeguimientoUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.COORDINADOR)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    cambios = data.model_dump(exclude_none=True, mode="json")
    if cambios.get("estado") == EstadoSeguimiento.CONCLUIDA.value:
        actual = con_totales({**doc, **cambios})
        if actual.horas_validadas < actual.horas_requeridas:
            raise HTTPException(status_code=409, detail="Aún no se completan las horas requeridas")
        if actual.documentos_completos < len(actual.documentos):
            raise HTTPException(status_code=409, detail="Faltan documentos por completar y firmar")
    if cambios:
        await db.seguimientos.update_one({"_id": doc["_id"]}, {"$set": cambios})
    return await _devolver(db, doc["_id"])


@router.put("/{seguimiento_id}/asesor", response_model=SeguimientoOut)
async def asignar_asesor(
    seguimiento_id: str,
    data: AsesorIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.COORDINADOR)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    try:
        asesor = await db.users.find_one({"_id": ObjectId(data.asesor_id), "rol": Rol.ASESOR_ACADEMICO.value})
    except InvalidId:
        asesor = None
    if asesor is None:
        raise HTTPException(status_code=404, detail="Asesor académico no encontrado")
    await db.seguimientos.update_one(
        {"_id": doc["_id"]},
        {"$set": {"asesor_academico_id": str(asesor["_id"]), "asesor_academico_nombre": asesor["nombre"]}},
    )
    return await _devolver(db, doc["_id"])


# ---- Bitácoras: el estudiante registra horas y la empresa las valida -----------------------

@router.post("/{seguimiento_id}/bitacoras", response_model=SeguimientoOut, status_code=201)
async def crear_bitacora(
    seguimiento_id: str,
    data: BitacoraIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ESTUDIANTE)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    _en_curso(doc)
    bitacora = {**data.model_dump(), "id": nuevo_id(), "estado": EstadoRevision.PENDIENTE.value,
                "revisada_por": "", "revisada_en": "", "observacion": "", "creada_en": _ahora()}
    await db.seguimientos.update_one({"_id": doc["_id"]}, {"$push": {"bitacoras": bitacora}})
    return await _devolver(db, doc["_id"])


@router.patch("/{seguimiento_id}/bitacoras/{bitacora_id}", response_model=SeguimientoOut)
async def revisar_bitacora(
    seguimiento_id: str,
    bitacora_id: str,
    data: RevisionIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.EMPRESA)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    _pieza(doc["bitacoras"], bitacora_id, "Bitácora")
    if data.estado == EstadoRevision.PENDIENTE:
        raise HTTPException(status_code=422, detail="Indica si la bitácora se valida o se rechaza")
    if data.estado == EstadoRevision.RECHAZADA and not data.observacion.strip():
        raise HTTPException(status_code=422, detail="Escribe el motivo del rechazo")
    await db.seguimientos.update_one(
        {"_id": doc["_id"], "bitacoras.id": bitacora_id},
        {"$set": {
            "bitacoras.$.estado": data.estado.value,
            "bitacoras.$.observacion": data.observacion.strip(),
            "bitacoras.$.revisada_por": usuario["nombre"],
            "bitacoras.$.revisada_en": _ahora(),
        }},
    )
    return await _devolver(db, doc["_id"])


@router.delete("/{seguimiento_id}/bitacoras/{bitacora_id}", response_model=SeguimientoOut)
async def borrar_bitacora(
    seguimiento_id: str,
    bitacora_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ESTUDIANTE)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    if _pieza(doc["bitacoras"], bitacora_id, "Bitácora")["estado"] == EstadoRevision.VALIDADA.value:
        raise HTTPException(status_code=409, detail="Una bitácora validada ya no se puede borrar")
    await db.seguimientos.update_one({"_id": doc["_id"]}, {"$pull": {"bitacoras": {"id": bitacora_id}}})
    return await _devolver(db, doc["_id"])


# ---- Reportes ------------------------------------------------------------------------------

@router.post("/{seguimiento_id}/reportes", response_model=SeguimientoOut, status_code=201)
async def crear_reporte(
    seguimiento_id: str,
    titulo: str = Form(min_length=3, max_length=120),
    periodo: str = Form(default="", max_length=60),
    contenido: str = Form(default="", max_length=3000),
    file: UploadFile | None = File(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ESTUDIANTE)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    _en_curso(doc)
    if not contenido.strip() and file is None:
        raise HTTPException(status_code=422, detail="Escribe el reporte o adjunta un PDF")
    archivo = None
    if file is not None:
        datos, nombre = await archivos.leer_pdf(file)
        archivo = {
            "archivo_id": await archivos.guardar(db, datos, nombre, "application/pdf", seguimiento_id=seguimiento_id, clase="reporte"),
            "nombre": nombre, "tipo": "application/pdf", "tamano": len(datos), "subido_por": usuario["nombre"], "fecha": _ahora(),
        }
    reporte = {"id": nuevo_id(), "titulo": titulo.strip(), "periodo": periodo.strip(), "contenido": contenido.strip(),
               "archivo": archivo, "por": usuario["nombre"], "fecha": _ahora()}
    await db.seguimientos.update_one({"_id": doc["_id"]}, {"$push": {"reportes": reporte}})
    return await _devolver(db, doc["_id"])


@router.get("/{seguimiento_id}/reportes/{reporte_id}/archivo")
async def descargar_reporte(
    seguimiento_id: str, reporte_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database), usuario: dict = Depends(usuario_actual),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    archivo = _pieza(doc["reportes"], reporte_id, "Reporte").get("archivo")
    if not archivo:
        raise HTTPException(status_code=404, detail="Este reporte no tiene archivo")
    return await archivos.descargar(db, archivo["archivo_id"], archivo["nombre"], archivo["tipo"])


# ---- Incidencias: cualquiera de la estadía las reporta; coordinación o el asesor las resuelve -

@router.post("/{seguimiento_id}/incidencias", response_model=SeguimientoOut, status_code=201)
async def crear_incidencia(
    seguimiento_id: str,
    data: IncidenciaIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    incidencia = {**data.model_dump(), "id": nuevo_id(), "estado": "abierta", "reportada_por": usuario["nombre"],
                  "rol": usuario["rol"], "fecha": _ahora(), "resolucion": "", "resuelta_por": "", "resuelta_en": ""}
    await db.seguimientos.update_one({"_id": doc["_id"]}, {"$push": {"incidencias": incidencia}})
    return await _devolver(db, doc["_id"])


@router.patch("/{seguimiento_id}/incidencias/{incidencia_id}", response_model=SeguimientoOut)
async def resolver_incidencia(
    seguimiento_id: str,
    incidencia_id: str,
    data: ResolucionIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.COORDINADOR, Rol.ASESOR_ACADEMICO)),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    if _pieza(doc["incidencias"], incidencia_id, "Incidencia")["estado"] == "resuelta":
        raise HTTPException(status_code=409, detail="La incidencia ya está resuelta")
    await db.seguimientos.update_one(
        {"_id": doc["_id"], "incidencias.id": incidencia_id},
        {"$set": {"incidencias.$.estado": "resuelta", "incidencias.$.resolucion": data.resolucion.strip(),
                  "incidencias.$.resuelta_por": usuario["nombre"], "incidencias.$.resuelta_en": _ahora()}},
    )
    return await _devolver(db, doc["_id"])


# ---- Documentos: se firman a mano, se sube el PDF y cada asesor marca su firma -------------

@router.post("/{seguimiento_id}/documentos/{documento_id}/archivo", response_model=SeguimientoOut)
async def subir_documento(
    seguimiento_id: str,
    documento_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    _en_curso(doc)
    documento = _pieza(doc["documentos"], documento_id, "Documento")
    if documento["estado"] == EstadoDocumento.COMPLETO.value:
        raise HTTPException(status_code=409, detail="Este documento ya está completo")
    datos, nombre = await archivos.leer_pdf(file)
    version = {
        "archivo_id": await archivos.guardar(db, datos, nombre, "application/pdf", seguimiento_id=seguimiento_id, clase="documento"),
        "nombre": nombre, "tipo": "application/pdf", "tamano": len(datos), "subido_por": usuario["nombre"], "fecha": _ahora(),
    }
    # Una versión nueva es otro papel: las firmas anteriores ya no cuentan.
    await db.seguimientos.update_one(
        {"_id": doc["_id"], "documentos.id": documento_id},
        {"$push": {"documentos.$.versiones": version},
         "$set": {"documentos.$.estado": EstadoDocumento.SUBIDO.value, "documentos.$.firmas": {}, "documentos.$.observacion": ""}},
    )
    return await _devolver(db, doc["_id"])


@router.get("/{seguimiento_id}/documentos/{documento_id}/archivo")
async def descargar_documento(
    seguimiento_id: str, documento_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database), usuario: dict = Depends(usuario_actual),
):
    doc = await _seguimiento(db, seguimiento_id, usuario)
    versiones = _pieza(doc["documentos"], documento_id, "Documento")["versiones"]
    if not versiones:
        raise HTTPException(status_code=404, detail="Aún no se sube este documento")
    ultima = versiones[-1]
    return await archivos.descargar(db, ultima["archivo_id"], ultima["nombre"], ultima["tipo"])


async def _documento_para_firmar(db, seguimiento_id: str, documento_id: str, usuario: dict) -> tuple[dict, dict, Firmante]:
    doc = await _seguimiento(db, seguimiento_id, usuario)
    _en_curso(doc)
    documento = _pieza(doc["documentos"], documento_id, "Documento")
    firmante = FIRMANTE_DE[usuario["rol"]]
    if firmante.value not in documento["requiere"]:
        raise HTTPException(status_code=403, detail="Este documento no lo firma tu asesoría")
    if documento["estado"] != EstadoDocumento.SUBIDO.value:
        raise HTTPException(status_code=409, detail="Primero se debe subir el PDF del documento")
    return doc, documento, firmante


@router.post("/{seguimiento_id}/documentos/{documento_id}/firmar", response_model=SeguimientoOut)
async def firmar_documento(
    seguimiento_id: str,
    documento_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ASESOR_ACADEMICO, Rol.EMPRESA)),
):
    doc, documento, firmante = await _documento_para_firmar(db, seguimiento_id, documento_id, usuario)
    if firmante.value in documento["firmas"]:
        raise HTTPException(status_code=409, detail="Ya firmaste este documento")
    firmas = {**documento["firmas"], firmante.value: {"por": usuario["nombre"], "fecha": _ahora()}}
    completo = all(r in firmas for r in documento["requiere"])
    await db.seguimientos.update_one(
        {"_id": doc["_id"], "documentos.id": documento_id},
        {"$set": {"documentos.$.firmas": firmas,
                  "documentos.$.estado": (EstadoDocumento.COMPLETO if completo else EstadoDocumento.SUBIDO).value}},
    )
    return await _devolver(db, doc["_id"])


@router.post("/{seguimiento_id}/documentos/{documento_id}/rechazar", response_model=SeguimientoOut)
async def rechazar_documento(
    seguimiento_id: str,
    documento_id: str,
    data: RechazoIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ASESOR_ACADEMICO, Rol.EMPRESA)),
):
    doc, _, _ = await _documento_para_firmar(db, seguimiento_id, documento_id, usuario)
    await db.seguimientos.update_one(
        {"_id": doc["_id"], "documentos.id": documento_id},
        {"$set": {"documentos.$.estado": EstadoDocumento.RECHAZADO.value, "documentos.$.firmas": {},
                  "documentos.$.observacion": f"{usuario['nombre']}: {data.observacion.strip()}"}},
    )
    return await _devolver(db, doc["_id"])
