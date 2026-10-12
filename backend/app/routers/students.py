from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core import archivos
from app.core.database import get_database
from app.core.seguridad import requiere_rol, usuario_actual
from app.models.student import Student, StudentCreate, StudentUpdate
from app.models.user import Rol

router = APIRouter(prefix="/students", tags=["students"], dependencies=[Depends(usuario_actual)])

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


def _propio(usuario: dict, student_id: str) -> ObjectId:
    """Solo el dueño del perfil puede modificarlo."""
    oid = _oid(student_id)
    if usuario.get("perfil_id") != student_id or usuario["rol"] != Rol.ESTUDIANTE.value:
        raise HTTPException(status_code=403, detail="Solo puedes modificar tu propio perfil")
    return oid


async def _borrar_cv(db: AsyncIOMotorDatabase, oid: ObjectId) -> None:
    """Elimina de GridFS el CV guardado del estudiante, si tiene."""
    doc = await db.students.find_one({"_id": oid}, {"cv": 1})
    await archivos.borrar(db, ((doc or {}).get("cv") or {}).get("archivo_id"))


@router.post("", response_model=Student, status_code=201)
async def create_student(
    student: StudentCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.ESTUDIANTE)),
):
    if usuario.get("perfil_id"):
        raise HTTPException(status_code=409, detail="Ya tienes un perfil; edítalo en lugar de crear otro")
    user_id = str(usuario["_id"])
    result = await db.students.insert_one({**student.model_dump(), "user_id": user_id})
    await db.users.update_one({"_id": usuario["_id"]}, {"$set": {"perfil_id": str(result.inserted_id)}})
    return await db.students.find_one({"_id": result.inserted_id})


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
    usuario: dict = Depends(usuario_actual),
):
    oid = _propio(usuario, student_id)
    update_data = {k: v for k, v in student.model_dump().items() if v is not None}
    if update_data:
        result = await db.students.update_one({"_id": oid}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    updated = await db.students.find_one({"_id": _oid(student_id)})
    if updated is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return updated


@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    oid = _propio(usuario, student_id)
    await _borrar_cv(db, oid)
    result = await db.students.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    await db.users.update_one({"_id": usuario["_id"]}, {"$set": {"perfil_id": None}})
    await db.applications.delete_many({"student_id": student_id})


@router.post("/{student_id}/cv", response_model=Student)
async def upload_cv(
    student_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    oid = _propio(usuario, student_id)
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

    await _borrar_cv(db, oid)
    archivo_id = await archivos.guardar(
        db, contenido, nombre[:120], CV_TIPOS[ext], student_id=student_id, clase="cv"
    )

    cv = {
        "archivo_id": archivo_id,
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
    if not cv or not cv.get("archivo_id"):
        raise HTTPException(status_code=404, detail="Este estudiante no ha subido su currículum")
    return await archivos.descargar(db, cv["archivo_id"], cv["nombre_archivo"], cv["tipo"])


@router.delete("/{student_id}/cv", status_code=204)
async def delete_cv(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    oid = _propio(usuario, student_id)
    await _borrar_cv(db, oid)
    result = await db.students.update_one({"_id": oid}, {"$unset": {"cv": ""}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
