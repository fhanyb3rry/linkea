from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.application import (
    Application,
    ApplicationCreate,
    ApplicationUpdate,
    EstadoPostulacion,
)
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/applications", tags=["applications"])


def _oid(application_id: str) -> ObjectId:
    try:
        return ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de postulación inválido")


@router.post("", response_model=Application, status_code=201)
async def create_application(
    data: ApplicationCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
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
):
    filtro = {}
    if student_id:
        filtro["student_id"] = student_id
    if vacancy_id:
        filtro["vacancy_id"] = vacancy_id
    return await db.applications.find(filtro).sort("creada_en", -1).to_list(length=None)


@router.patch("/{application_id}", response_model=Application)
async def update_application(
    application_id: str,
    data: ApplicationUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    result = await db.applications.update_one(
        {"_id": _oid(application_id)}, {"$set": {"estado": data.estado.value}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    return await db.applications.find_one({"_id": _oid(application_id)})


@router.delete("/{application_id}", status_code=204)
async def delete_application(
    application_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.applications.delete_one({"_id": _oid(application_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
