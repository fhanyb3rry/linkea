from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agent.agent import Accion, AgenteVinculacion
from app.agent.peas import PEAS
from app.core.database import get_database
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/peas")
async def peas():
    return PEAS


@router.get("/recommend/{student_id}", response_model=Accion)
async def recommend(student_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_docs = await db.vacancies.find().to_list(length=None)
    return AgenteVinculacion().recomendar(
        Student(**student_doc), [Vacancy(**d) for d in vacancy_docs]
    )
