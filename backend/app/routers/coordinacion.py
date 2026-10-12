"""Consultas institucionales para coordinación, hechas con aggregation pipelines de MongoDB.

Cada indicador es un pipeline: Mongo agrupa y cuenta del lado del servidor ($group, $unwind,
$lookup, …) y a la API solo le llega el resultado, en lugar de traer todos los documentos.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.seguridad import requiere_rol
from app.models.user import Rol

router = APIRouter(prefix="/coordinacion", tags=["coordinacion"], dependencies=[Depends(requiere_rol(Rol.COORDINADOR))])


async def _conteo_por(db: AsyncIOMotorDatabase, coleccion: str, campo: str) -> dict[str, int]:
    """{valor: cuántos documentos} agrupando por un campo."""
    pipeline = [{"$group": {"_id": f"${campo}", "total": {"$sum": 1}}}]
    return {d["_id"]: d["total"] async for d in db[coleccion].aggregate(pipeline)}


@router.get("/indicadores")
async def indicadores(db: AsyncIOMotorDatabase = Depends(get_database)):
    # Horas validadas por estadía: se "desenrollan" las bitácoras, se filtran las validadas y se suman.
    horas = await db.seguimientos.aggregate([
        {"$unwind": "$bitacoras"},
        {"$match": {"bitacoras.estado": "validada"}},
        {"$group": {"_id": "$_id", "horas": {"$sum": "$bitacoras.horas"}}},
        {"$group": {"_id": None, "promedio": {"$avg": "$horas"}, "total": {"$sum": "$horas"}}},
    ]).to_list(length=1)

    # Documentos que aún no se completan, agrupados por tipo de documento.
    documentos = await db.seguimientos.aggregate([
        {"$match": {"estado": "en_curso"}},
        {"$unwind": "$documentos"},
        {"$match": {"documentos.estado": {"$ne": "completo"}}},
        {"$group": {"_id": "$documentos.nombre", "pendientes": {"$sum": 1}}},
        {"$sort": {"pendientes": -1, "_id": 1}},
    ]).to_list(length=None)

    # Estudiantes que todavía no se postulan a nada ($lookup = "join" con postulaciones).
    sin_postular = await db.students.aggregate([
        {"$lookup": {"from": "applications", "let": {"sid": {"$toString": "$_id"}},
                     "pipeline": [{"$match": {"$expr": {"$eq": ["$student_id", "$$sid"]}}}, {"$limit": 1}],
                     "as": "postulaciones"}},
        {"$match": {"postulaciones": {"$size": 0}}},
        {"$count": "total"},
    ]).to_list(length=1)

    # Vacantes y postulaciones por organización.
    organizaciones = await db.organizations.aggregate([
        {"$lookup": {"from": "vacancies", "let": {"oid": {"$toString": "$_id"}},
                     "pipeline": [{"$match": {"$expr": {"$eq": ["$organizacion_id", "$$oid"]}}}, {"$project": {"_id": 1}}],
                     "as": "vacantes"}},
        {"$lookup": {"from": "applications", "let": {"vids": {"$map": {"input": "$vacantes", "in": {"$toString": "$$this._id"}}}},
                     "pipeline": [{"$match": {"$expr": {"$in": ["$vacancy_id", "$$vids"]}}}, {"$project": {"_id": 1}}],
                     "as": "postulaciones"}},
        {"$project": {"_id": 0, "id": {"$toString": "$_id"}, "nombre": 1,
                      "vacantes": {"$size": "$vacantes"}, "postulaciones": {"$size": "$postulaciones"}}},
        {"$sort": {"postulaciones": -1, "nombre": 1}},
    ]).to_list(length=None)

    incidencias_abiertas = await db.seguimientos.aggregate([
        {"$unwind": "$incidencias"},
        {"$match": {"incidencias.estado": "abierta"}},
        {"$count": "total"},
    ]).to_list(length=1)

    return {
        "estudiantes": await db.students.count_documents({}),
        "estudiantes_por_estado": await _conteo_por(db, "students", "estado"),
        "estudiantes_sin_postular": sin_postular[0]["total"] if sin_postular else 0,
        "organizaciones": await db.organizations.count_documents({}),
        "vacantes": await db.vacancies.count_documents({}),
        "postulaciones_por_estado": await _conteo_por(db, "applications", "estado"),
        "estadias_por_estado": await _conteo_por(db, "seguimientos", "estado"),
        "estadias_sin_asesor": await db.seguimientos.count_documents({"estado": "en_curso", "asesor_academico_id": None}),
        "horas_promedio": round(horas[0]["promedio"], 1) if horas else 0,
        "horas_totales": horas[0]["total"] if horas else 0,
        "incidencias_abiertas": incidencias_abiertas[0]["total"] if incidencias_abiertas else 0,
        "documentos_pendientes": [{"nombre": d["_id"], "pendientes": d["pendientes"]} for d in documentos],
        "organizaciones_detalle": organizaciones,
    }


@router.get("/postulaciones")
async def postulaciones(estado: str | None = None, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Todas las postulaciones con el nombre del estudiante y de la vacante ($lookup a dos colecciones)."""
    pipeline = [{"$match": {"estado": estado}}] if estado else []
    pipeline += [
        {"$sort": {"creada_en": -1}},
        {"$lookup": {"from": "students", "let": {"sid": {"$toObjectId": "$student_id"}},
                     "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$sid"]}}},
                                  {"$project": {"nombre": 1, "matricula": 1, "carrera": 1}}],
                     "as": "estudiante"}},
        {"$lookup": {"from": "vacancies", "let": {"vid": {"$toObjectId": "$vacancy_id"}},
                     "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$vid"]}}},
                                  {"$project": {"titulo": 1, "nombre_empresa": 1}}],
                     "as": "vacante"}},
        {"$unwind": "$estudiante"},
        {"$unwind": "$vacante"},
        {"$project": {
            "_id": 0, "id": {"$toString": "$_id"}, "estado": 1, "creada_en": 1,
            "student_id": 1, "vacancy_id": 1,
            "estudiante": "$estudiante.nombre", "matricula": "$estudiante.matricula", "carrera": "$estudiante.carrera",
            "vacante": "$vacante.titulo", "empresa": "$vacante.nombre_empresa",
        }},
    ]
    return await db.applications.aggregate(pipeline).to_list(length=None)


@router.get("/incidencias")
async def incidencias(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Incidencias de todas las estadías (las abiertas primero)."""
    return await db.seguimientos.aggregate([
        {"$unwind": "$incidencias"},
        {"$project": {"_id": 0, "seguimiento_id": {"$toString": "$_id"}, "estudiante": "$estudiante_nombre",
                      "organizacion": "$organizacion_nombre", "incidencia": "$incidencias"}},
        {"$sort": {"incidencia.estado": 1, "incidencia.fecha": -1}},
    ]).to_list(length=None)
