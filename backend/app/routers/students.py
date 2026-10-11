from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import BACKEND_ROOT
from app.core.database import get_database
from app.models.student import Student, StudentCreate, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])

CV_DIR = BACKEND_ROOT / "uploads" / "cv"
CV_MAX_BYTES = 5 * 1024 * 1024
CV_TIPOS = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _oid(student_id: str) -> ObjectId:
    try:
        return ObjectId(student_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de estudiante inválido")


def _borrar_archivos_cv(student_id: str) -> None:
    """Elimina cualquier CV guardado del estudiante (el nombre en disco es su id + extensión)."""
    for ext in CV_TIPOS:
        (CV_DIR / f"{student_id}{ext}").unlink(missing_ok=True)


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
    _borrar_archivos_cv(student_id)
    await db.applications.delete_many({"student_id": student_id})


@router.post("/{student_id}/cv", response_model=Student)
async def upload_cv(
    student_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _oid(student_id)
    if await db.students.find_one({"_id": oid}, {"_id": 1}) is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    nombre = Path(file.filename or "").name
    ext = Path(nombre).suffix.lower()
    if ext not in CV_TIPOS:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa PDF, DOC o DOCX")

    contenido = await file.read(CV_MAX_BYTES + 1)
    if len(contenido) > CV_MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 5 MB")
    if len(contenido) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    if ext == ".pdf" and not contenido.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="El archivo no es un PDF válido")

    CV_DIR.mkdir(parents=True, exist_ok=True)
    _borrar_archivos_cv(student_id)
    (CV_DIR / f"{student_id}{ext}").write_bytes(contenido)

    cv = {
        "nombre_archivo": nombre[:120],
        "tipo": CV_TIPOS[ext],
        "tamano": len(contenido),
        "subido_en": datetime.now(timezone.utc).isoformat(),
    }
    await db.students.update_one({"_id": oid}, {"$set": {"cv": cv}})
    return await db.students.find_one({"_id": oid})


@router.get("/{student_id}/cv")
async def download_cv(
    student_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.students.find_one({"_id": _oid(student_id)}, {"cv": 1})
    cv = (doc or {}).get("cv")
    if not cv:
        raise HTTPException(status_code=404, detail="Este estudiante no ha subido su currículum")
    ext = Path(cv["nombre_archivo"]).suffix.lower()
    ruta = CV_DIR / f"{student_id}{ext}"
    if not ruta.exists():
        raise HTTPException(status_code=404, detail="No se encontró el archivo del currículum")
    return FileResponse(ruta, media_type=cv["tipo"], filename=cv["nombre_archivo"])


@router.delete("/{student_id}/cv", status_code=204)
async def delete_cv(
    student_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.students.update_one({"_id": _oid(student_id)}, {"$unset": {"cv": ""}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    _borrar_archivos_cv(student_id)
