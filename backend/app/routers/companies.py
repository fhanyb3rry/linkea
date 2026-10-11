from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.company import Vacancy, VacancyCreate, VacancyUpdate

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _oid(vacancy_id: str) -> ObjectId:
    try:
        return ObjectId(vacancy_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de vacante inválido")


@router.post("", response_model=Vacancy, status_code=201)
async def create_vacancy(
    vacancy: VacancyCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.vacancies.insert_one(vacancy.model_dump())
    created = await db.vacancies.find_one({"_id": result.inserted_id})
    return created


@router.get("", response_model=list[Vacancy])
async def list_vacancies(db: AsyncIOMotorDatabase = Depends(get_database)):
    return await db.vacancies.find().to_list(length=None)


@router.get("/{vacancy_id}", response_model=Vacancy)
async def get_vacancy(
    vacancy_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    vacancy = await db.vacancies.find_one({"_id": _oid(vacancy_id)})
    if vacancy is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return vacancy


@router.put("/{vacancy_id}", response_model=Vacancy)
async def update_vacancy(
    vacancy_id: str,
    vacancy: VacancyUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    update_data = {k: v for k, v in vacancy.model_dump().items() if v is not None}
    if update_data:
        result = await db.vacancies.update_one(
            {"_id": _oid(vacancy_id)}, {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Vacante no encontrada")
    updated = await db.vacancies.find_one({"_id": _oid(vacancy_id)})
    if updated is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return updated


@router.delete("/{vacancy_id}", status_code=204)
async def delete_vacancy(
    vacancy_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.vacancies.delete_one({"_id": _oid(vacancy_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    await db.applications.delete_many({"vacancy_id": vacancy_id})
