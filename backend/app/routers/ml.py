"""Endpoints de Machine Learning: entrenamiento 60/20/20, métricas, gráficas y predicción."""

import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.database import get_database
from app.core.seguridad import usuario_actual
from app.ml_vs_reglas.datos import CaracteristicasPar, construir_dataset
from app.ml_vs_reglas.modelo import (
    CARPETA_ML,
    NOMBRES_GRAFICAS,
    cargar_o_entrenar_por_defecto,
    entrenar_y_evaluar,
    predecir_caracteristicas,
    predecir_par,
)
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/ml", tags=["ml"], dependencies=[Depends(usuario_actual)])


class EntrenamientoConfig(BaseModel):
    cantidad: int = Field(default=500, ge=100, le=5000, description="Total de registros para entrenar/validar/probar")
    semilla: int = Field(default=42, ge=0, le=99999, description="Semilla aleatoria reproducible")


@router.get("/estado")
async def estado_modelo(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Devuelve las métricas completas del modelo actual; si no existe aún, lo entrena por primera vez."""
    if not os.path.exists(os.path.join(CARPETA_ML, "metricas.json")):
        df, resumen = await construir_dataset(db, cantidad_objetivo=500, semilla=42)
        _, metricas = entrenar_y_evaluar(df, resumen_datos=resumen, semilla=42)
        return metricas
    _, metricas = cargar_o_entrenar_por_defecto()
    return metricas


@router.post("/entrenar")
async def entrenar_modelo(
    config: EntrenamientoConfig = EntrenamientoConfig(),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Reentrena el árbol de decisión combinando postulaciones reales cerradas con datos sintéticos."""
    df, resumen = await construir_dataset(db, cantidad_objetivo=config.cantidad, semilla=config.semilla)
    _, metricas = entrenar_y_evaluar(df, resumen_datos=resumen, semilla=config.semilla)
    return metricas


@router.get("/predict/{student_id}/{vacancy_id}")
async def predecir_estudiante_vacante(
    student_id: str,
    vacancy_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Compara la predicción de Reglas Fijas vs Machine Learning para un par real estudiante-vacante."""
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    return predecir_par(Student(**student_doc), Vacancy(**vacancy_doc))


@router.post("/simular")
async def simular_caso(caracteristicas: CaracteristicasPar):
    """Evalúa un estudiante/caso hipotético con Reglas Fijas y con el Árbol de Decisión entrenado."""
    return predecir_caracteristicas(caracteristicas)


@router.get("/grafica/{nombre}")
async def obtener_grafica(nombre: str):
    """Entrega una de las gráficas PNG generadas con matplotlib (profundidad | comparacion | matriz)."""
    archivo = NOMBRES_GRAFICAS.get(nombre)
    if archivo is None:
        raise HTTPException(status_code=404, detail="Gráfica no válida: usa profundidad, comparacion o matriz")
    cargar_o_entrenar_por_defecto()
    ruta = os.path.join(CARPETA_ML, archivo)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="La gráfica aún no se ha generado")
    return FileResponse(ruta, media_type="image/png", filename=archivo)
