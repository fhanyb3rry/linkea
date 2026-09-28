from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.models.student import Student, StudentCreate, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


def _oid(student_id: str) -> ObjectId:
    try:
        return ObjectId(student_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de estudiante inválido")


@router.post("", response_model=Student, status_code=201)
async def create_student(
    student: StudentCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.students.insert_one(student.model_dump())
    created = await db.students.find_one({"_id": result.inserted_id})
    return created


@router.get("", response_model=list[Student])
async def list_students(db: AsyncIOMotorDatabase = Depends(get_database)):
    return await db.students.find().to_list(length=None)


@router.get("/{student_id}", response_model=Student)
async def get_student(
    student_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    student = await db.students.find_one({"_id": _oid(student_id)})
    if student is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return student


@router.put("/{student_id}", response_model=Student)
async def update_student(
    student_id: str,
    student: StudentUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    update_data = {k: v for k, v in student.model_dump().items() if v is not None}
    if update_data:
        result = await db.students.update_one(
            {"_id": _oid(student_id)}, {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    updated = await db.students.find_one({"_id": _oid(student_id)})
    if updated is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return updated


@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.students.delete_one({"_id": _oid(student_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
