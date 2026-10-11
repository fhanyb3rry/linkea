from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.ai.client import ia_configurada, probar_conexion
from app.ai.compatibilidad import ErrorIA, evaluar_con_ia, huella
from app.core.config import settings
from app.core.database import get_database
from app.logic.logic_rules import evaluar_elegibilidad
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status")
async def status():
    """¿Hay key configurada? No gasta nada ni llama a la API."""
    return {"configurada": ia_configurada(), "modelo": settings.anthropic_model}


@router.post("/test")
async def test():
    """Prueba real de conexión con la API de Claude (una llamada mínima, gasta una fracción de centavo)."""
    if not ia_configurada():
        return {
            "ok": False,
            "modelo": settings.anthropic_model,
            "detalle": "Falta ANTHROPIC_API_KEY en backend/.env (y reiniciar el backend).",
        }
    return await probar_conexion()


# ------------------------------------------------------------
# FILTRO 2: compatibilidad con IA
# ------------------------------------------------------------


class CompatibilidadRespuesta(BaseModel):
    fuente: Literal["ia", "reglas", "no_aplica"]  # quién calculó el puntaje
    puntaje: int | None = None
    razones_a_favor: list[str] = []
    razones_en_contra: list[str] = []
    resumen: str = ""
    aviso: str = ""  # por qué no se usó la IA, si aplica
    modelo: str | None = None
    desde_cache: bool = False


@router.get("/compatibility/{student_id}/{vacancy_id}", response_model=CompatibilidadRespuesta)
async def compatibilidad(
    student_id: str,
    vacancy_id: str,
    refrescar: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Filtro 2. Solo evalúa con IA a quien pasó el filtro 1; si la IA falla, responde con las reglas."""
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    student, vacancy = Student(**student_doc), Vacancy(**vacancy_doc)

    # Filtro 1: si no es elegible, aquí termina (no gastamos IA).
    filtro1 = evaluar_elegibilidad(student, vacancy)
    if not filtro1.elegible:
        return CompatibilidadRespuesta(
            fuente="no_aplica",
            aviso="No pasó el filtro de elegibilidad, así que no se evalúa con IA.",
            razones_en_contra=filtro1.razones_descarte,
        )

    def respaldo(aviso: str) -> CompatibilidadRespuesta:
        return CompatibilidadRespuesta(fuente="reglas", puntaje=filtro1.compatibilidad, aviso=aviso)

    if not ia_configurada():
        return respaldo("La IA no está configurada; se muestra el porcentaje por reglas (estimado).")

    # Caché: si el par no cambió desde la última vez, se reutiliza sin llamar a la API.
    clave = f"{student_id}:{vacancy_id}"
    sello = huella(student, vacancy)
    guardado = await db.ai_compatibilidad.find_one({"_id": clave})
    if guardado and guardado["huella"] == sello and not refrescar:
        return CompatibilidadRespuesta(**{**guardado["resultado"], "desde_cache": True})

    try:
        resultado, _uso = await evaluar_con_ia(student, vacancy)
    except ErrorIA as error:
        return respaldo(f"{error} Se muestra el porcentaje por reglas (estimado).")

    respuesta = CompatibilidadRespuesta(fuente="ia", modelo=settings.anthropic_model, **resultado.model_dump())
    await db.ai_compatibilidad.replace_one(
        {"_id": clave}, {"_id": clave, "huella": sello, "resultado": respuesta.model_dump()}, upsert=True
    )
    return respuesta
