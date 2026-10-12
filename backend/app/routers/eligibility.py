from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.seguridad import usuario_actual
from app.logic.logic_rules import (
    EligibilityResult,
    evaluar_elegibilidad,
    generar_tabla_verdad,
    verificar_equivalencias,
)
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/eligibility", tags=["eligibility"], dependencies=[Depends(usuario_actual)])


@router.get("/truth-table")
async def truth_table():
    return generar_tabla_verdad()


@router.get("/equivalences")
async def equivalences():
    return verificar_equivalencias()


@router.get("/check/{student_id}/{vacancy_id}", response_model=EligibilityResult)
async def check_eligibility(
    student_id: str,
    vacancy_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    student = Student(**student_doc)
    vacancy = Vacancy(**vacancy_doc)
    return evaluar_elegibilidad(student, vacancy)
