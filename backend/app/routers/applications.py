from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.seguridad import es_rol, requiere_rol, usuario_actual
from app.models.application import (
    Application,
    ApplicationCreate,
    ApplicationUpdate,
    EstadoPostulacion,
)
from app.routers.companies import _oid as vacancy_oid
from app.models.user import Rol
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/applications", tags=["applications"], dependencies=[Depends(usuario_actual)])


def _oid(application_id: str) -> ObjectId:
    try:
        return ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de postulación inválido")


async def _vacantes_de(db: AsyncIOMotorDatabase, usuario: dict) -> list[str]:
    """Ids de las vacantes que publicó la empresa."""
    docs = await db.vacancies.find({"user_id": str(usuario["_id"])}, {"_id": 1}).to_list(length=None)
    return [str(d["_id"]) for d in docs]


async def _postulacion(db: AsyncIOMotorDatabase, application_id: str) -> dict:
    doc = await db.applications.find_one({"_id": _oid(application_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    return doc


@router.post("", response_model=Application, status_code=201)
async def create_application(
    data: ApplicationCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ESTUDIANTE)),
):
    if data.student_id != usuario.get("perfil_id"):
        raise HTTPException(status_code=403, detail="Solo puedes postularte con tu propio perfil")
    if await db.students.find_one({"_id": student_oid(data.student_id)}, {"_id": 1}) is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    if await db.vacancies.find_one({"_id": vacancy_oid(data.vacancy_id)}, {"_id": 1}) is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    if await db.applications.find_one(
        {"student_id": data.student_id, "vacancy_id": data.vacancy_id}, {"_id": 1}
    ):
        raise HTTPException(status_code=409, detail="Ya te postulaste a esta vacante")

    doc = {
        **data.model_dump(),
        "estado": EstadoPostulacion.ENVIADA.value,
        "creada_en": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.applications.insert_one(doc)
    return await db.applications.find_one({"_id": result.inserted_id})


@router.get("", response_model=list[Application])
async def list_applications(
    student_id: str | None = None,
    vacancy_id: str | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    filtro = {}
    if student_id:
        filtro["student_id"] = student_id
    if vacancy_id:
        filtro["vacancy_id"] = vacancy_id
    # Cada quien ve solo lo suyo: el estudiante sus postulaciones y la empresa las de sus vacantes.
    if es_rol(usuario, Rol.ESTUDIANTE):
        if student_id and student_id != usuario.get("perfil_id"):
            return []
        filtro["student_id"] = usuario.get("perfil_id") or ""
    elif es_rol(usuario, Rol.EMPRESA):
        mias = await _vacantes_de(db, usuario)
        filtro["vacancy_id"] = vacancy_id if vacancy_id in mias else {"$in": [] if vacancy_id else mias}
    return await db.applications.find(filtro).sort("creada_en", -1).to_list(length=None)


@router.patch("/{application_id}", response_model=Application)
async def update_application(
    application_id: str,
    data: ApplicationUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.EMPRESA, Rol.COORDINADOR)),
):
    doc = await _postulacion(db, application_id)
    if es_rol(usuario, Rol.EMPRESA) and doc["vacancy_id"] not in await _vacantes_de(db, usuario):
        raise HTTPException(status_code=403, detail="Esta postulación no es de una de tus vacantes")
    result = await db.applications.update_one(
        {"_id": _oid(application_id)}, {"$set": {"estado": data.estado.value}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    return await db.applications.find_one({"_id": _oid(application_id)})


@router.delete("/{application_id}", status_code=204)
async def delete_application(
    application_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ESTUDIANTE)),
):
    doc = await _postulacion(db, application_id)
    if doc["student_id"] != usuario.get("perfil_id"):
        raise HTTPException(status_code=403, detail="Solo puedes retirar tus propias postulaciones")
    result = await db.applications.delete_one({"_id": _oid(application_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
