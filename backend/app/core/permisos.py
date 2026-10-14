"""Quién puede consultar datos de un par estudiante-vacante (compatibilidad con IA, traslado, etc.)."""

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.seguridad import es_rol
from app.models.user import Rol


async def verificar_acceso_par(db: AsyncIOMotorDatabase, usuario: dict, student_id: str, vacancy_doc: dict) -> None:
    """Cada quien solo ve lo suyo:
       estudiante -> solo su propio perfil | empresa -> solo sus vacantes y alumnos que se postularon a ellas
       coordinación y asesores -> cualquiera.
    Lanza 403 si no tiene permiso."""
    vacancy_id = str(vacancy_doc["_id"])
    if es_rol(usuario, Rol.ESTUDIANTE) and student_id != usuario.get("perfil_id"):
        raise HTTPException(status_code=403, detail="Solo puedes ver la información de tu propio perfil")
    if es_rol(usuario, Rol.EMPRESA):
        postulo = await db.applications.find_one({"student_id": student_id, "vacancy_id": vacancy_id})
        if vacancy_doc.get("user_id") != str(usuario["_id"]) or postulo is None:
            raise HTTPException(status_code=403, detail="Solo puedes ver a quienes se postularon a tus vacantes")
