"""Endpoints de Machine Learning en Linkea: Prácticas 03 (Reglas vs ML), 04 (Ajuste 60/20/20) y 05 (Comparación de Algoritmos)."""

import os
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
import pandas as pd
from pydantic import BaseModel, Field

from app.core.database import get_database
from app.core.seguridad import usuario_actual
from app.ml_vs_reglas.datos import (
    COLUMNAS_ENTRADA,
    CaracteristicasPar,
    construir_dataset,
    extraer_postulaciones_reales,
)
from app.ml_vs_reglas.modelo import (
    CARPETA_ML,
    NOMBRES_GRAFICAS,
    cargar_o_entrenar_por_defecto,
    entrenar_y_evaluar,
    predecir_caracteristicas,
    predecir_par,
)
from app.ml_vs_reglas.practica04 import (
    ARCHIVOS_P04,
    CARPETA_P04,
    RUTA_METRICAS_P04,
    cargar_o_entrenar_p04,
    entrenar_practica04,
    generar_datos_p04,
)
from app.ml_vs_reglas.practica05 import (
    ARCHIVOS_P05,
    CARPETA_P05,
    RUTA_METRICAS_P05,
    cargar_o_entrenar_p05,
    comparar_par_p05,
    comparar_predicciones_p05,
    entrenar_practica05,
    generar_datos_p05,
)
from app.ml_vs_reglas.practica06 import (
    ARCHIVOS_P06,
    CARPETA_P06,
    RUTA_MEJOR_MODELO_P06,
    RUTA_METRICAS_P06,
    cargar_o_entrenar_p06,
    entrenar_practica06,
    predecir_optimizado_p06,
)
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/ml", tags=["ml"], dependencies=[Depends(usuario_actual)])


class EntrenamientoConfig(BaseModel):
    cantidad: int = Field(default=500, ge=100, le=5000, description="Total de registros para entrenar/validar/probar")
    semilla: int = Field(default=42, ge=0, le=99999, description="Semilla aleatoria reproducible")
    usar_reales: bool = Field(default=True, description="Combinar con postulaciones cerradas reales de MongoDB")


async def _construir_dataset_practica(
    db: AsyncIOMotorDatabase | None,
    generador_sintetico: Callable[[int, int], pd.DataFrame],
    cantidad_objetivo: int = 500,
    semilla: int = 42,
    usar_reales: bool = True,
) -> tuple[pd.DataFrame, dict]:
    """Combina postulaciones reales cerradas de Linkea con registros sintéticos de P04 o P05."""
    df_reales = await extraer_postulaciones_reales(db) if (db is not None and usar_reales) else pd.DataFrame()
    n_reales = len(df_reales)

    faltantes = max(0, cantidad_objetivo - n_reales)
    df_sint = generador_sintetico(faltantes, semilla) if faltantes > 0 else pd.DataFrame()
    n_sint = len(df_sint)

    if n_reales > 0 and n_sint > 0:
        df = pd.concat([df_reales, df_sint], ignore_index=True)
        fuente = "mixto"
    elif n_reales > 0:
        df = df_reales.reset_index(drop=True)
        fuente = "real"
    else:
        df = df_sint.reset_index(drop=True)
        fuente = "sintetico"

    for col in COLUMNAS_ENTRADA:
        df[col] = df[col].astype(float)
    df["aceptado"] = df["aceptado"].astype(int)
    df["calificacion_final"] = df["calificacion_final"].astype(float)

    resumen = {
        "total_registros": len(df),
        "registros_reales": n_reales,
        "registros_sinteticos": n_sint,
        "fuente": fuente,
        "semilla": semilla,
    }
    return df, resumen


# ============================================================
# PRÁCTICA 03 + SIMULADOR UNIFICADO (REGLAS + ÁRBOL + 3 ALGORITMOS)
# ============================================================


@router.get("/estado")
async def estado_modelo(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Devuelve las métricas del modelo base (Práctica 03); si no existe aún, lo entrena por primera vez."""
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
    df, resumen = await construir_dataset(
        db if config.usar_reales else None,
        cantidad_objetivo=config.cantidad,
        semilla=config.semilla,
    )
    _, metricas = entrenar_y_evaluar(df, resumen_datos=resumen, semilla=config.semilla)
    return metricas


@router.get("/predict/{student_id}/{vacancy_id}")
async def predecir_estudiante_vacante(
    student_id: str,
    vacancy_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Compara Reglas Fijas, Árbol de Decisión y los 3 algoritmos (Decision Tree, Random Forest, KNN) para un par real."""
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    student = Student(**student_doc)
    vacancy = Vacancy(**vacancy_doc)
    base = predecir_par(student, vacancy)
    comp = comparar_par_p05(student, vacancy)
    opt = predecir_optimizado_p06(CaracteristicasPar(**base["caracteristicas"])) if os.path.exists(RUTA_MEJOR_MODELO_P06) else None
    return {
        **base,
        "optimizado_p06": opt,
        "algoritmos_p05": {
            "algoritmo_ganador": comp["algoritmo_ganador"],
            "ganador": opt or comp["ganador"],
            "consenso": comp["consenso"],
            "modelos": comp["modelos"],
        },
    }


@router.get("/pronostico-vacante/{vacancy_id}")
async def pronostico_candidatos_vacante(
    vacancy_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Calcula en bloque el pronóstico histórico de aceptación de cada estudiante para una vacante."""
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    vacancy = Vacancy(**vacancy_doc)

    students_docs = await db.students.find().to_list(length=None)
    if not students_docs:
        return {}

    if os.path.exists(RUTA_MEJOR_MODELO_P06):
        modelo_ganador, _ = cargar_o_entrenar_p06()
    else:
        modelos, metricas = cargar_o_entrenar_p05()
        ganador_nombre = metricas["modelo_seleccionado"]["algoritmo"]
        modelo_ganador = modelos[ganador_nombre]

    from app.ml_vs_reglas.datos import extraer_caracteristicas

    ids: list[str] = []
    filas: list[dict] = []
    for doc in students_docs:
        st = Student(**doc)
        ids.append(str(st.id))
        filas.append(extraer_caracteristicas(st, vacancy).model_dump())

    df_lote = pd.DataFrame(filas)[COLUMNAS_ENTRADA]
    probas = modelo_ganador.predict_proba(df_lote)[:, 1]
    preds = modelo_ganador.predict(df_lote)

    respuesta = {}
    for sid, prob, pred in zip(ids, probas, preds):
        pct = round(float(prob) * 100, 1)
        nivel = "Alto" if pct >= 75 else "Medio" if pct >= 50 else "Bajo"
        respuesta[sid] = {
            "probabilidad": pct,
            "prediccion": int(pred),
            "nivel": nivel,
        }
    return respuesta


@router.post("/simular")
async def simular_caso(caracteristicas: CaracteristicasPar):
    """Evalúa un candidato hipotético con Reglas Fijas, Árbol de Decisión y el clasificador optimizado."""
    base = predecir_caracteristicas(caracteristicas)
    comp = comparar_predicciones_p05(caracteristicas)
    opt = predecir_optimizado_p06(caracteristicas) if os.path.exists(RUTA_MEJOR_MODELO_P06) else None
    return {
        **base,
        "optimizado_p06": opt,
        "algoritmos_p05": {
            "algoritmo_ganador": comp["algoritmo_ganador"],
            "ganador": opt or comp["ganador"],
            "consenso": comp["consenso"],
            "modelos": comp["modelos"],
        },
    }


@router.get("/grafica/{nombre}")
async def obtener_grafica(nombre: str):
    """Entrega una de las gráficas PNG base (profundidad | comparacion | matriz)."""
    archivo = NOMBRES_GRAFICAS.get(nombre)
    if archivo is None:
        raise HTTPException(status_code=404, detail="Gráfica no válida: usa profundidad, comparacion o matriz")
    cargar_o_entrenar_por_defecto()
    ruta = os.path.join(CARPETA_ML, archivo)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="La gráfica aún no se ha generado")
    return FileResponse(ruta, media_type="image/png", filename=archivo)


# ============================================================
# PRÁCTICA 04: ENTRENAMIENTO, VALIDACIÓN Y PRUEBA (AJUSTE)
# ============================================================


@router.get("/p04/estado")
async def estado_practica04(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Devuelve las métricas completas de la Práctica 04; si no existen aún, entrena por primera vez."""
    if not os.path.exists(RUTA_METRICAS_P04):
        df, resumen = await _construir_dataset_practica(
            db, generar_datos_p04, cantidad_objetivo=500, semilla=42, usar_reales=True
        )
        _, metricas = entrenar_practica04(df=df, resumen_datos=resumen, semilla=42)
        return metricas
    _, metricas = cargar_o_entrenar_p04()
    return metricas


@router.post("/p04/entrenar")
async def entrenar_modelo_p04(
    config: EntrenamientoConfig = EntrenamientoConfig(),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Reentrena la Práctica 04 (profundidades 1, 2, 3, 5, 10 y Sin límite + diagnóstico de ajuste)."""
    df, resumen = await _construir_dataset_practica(
        db,
        generar_datos_p04,
        cantidad_objetivo=config.cantidad,
        semilla=config.semilla,
        usar_reales=config.usar_reales,
    )
    _, metricas = entrenar_practica04(df=df, resumen_datos=resumen, semilla=config.semilla)
    return metricas


@router.get("/p04/archivo/{nombre}")
async def obtener_archivo_p04(nombre: str):
    """Entrega gráficas PNG o tablas CSV generadas por la Práctica 04."""
    archivo = ARCHIVOS_P04.get(nombre)
    if archivo is None:
        raise HTTPException(status_code=404, detail="Archivo no válido para Práctica 04")
    cargar_o_entrenar_p04()
    ruta = os.path.join(CARPETA_P04, archivo)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="El archivo aún no se ha generado")
    media = "text/csv; charset=utf-8" if archivo.endswith(".csv") else "image/png"
    return FileResponse(ruta, media_type=media, filename=archivo)


# ============================================================
# PRÁCTICA 05: COMPARACIÓN DE ALGORITMOS + EXPERIMENTOS A, B Y C
# ============================================================


@router.get("/p05/estado")
async def estado_practica05(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Devuelve las métricas completas y experimentos A/B/C de la Práctica 05."""
    if not os.path.exists(RUTA_METRICAS_P05):
        df, resumen = await _construir_dataset_practica(
            db, generar_datos_p05, cantidad_objetivo=500, semilla=42, usar_reales=True
        )
        _, metricas = entrenar_practica05(df=df, resumen_datos=resumen, semilla=42)
        return metricas
    _, metricas = cargar_o_entrenar_p05()
    return metricas


@router.post("/p05/entrenar")
async def entrenar_modelo_p05(
    config: EntrenamientoConfig = EntrenamientoConfig(),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Reentrena la comparación de Decision Tree, Random Forest y KNN + Experimentos A, B y C."""
    df, resumen = await _construir_dataset_practica(
        db,
        generar_datos_p05,
        cantidad_objetivo=config.cantidad,
        semilla=config.semilla,
        usar_reales=config.usar_reales,
    )
    _, metricas = entrenar_practica05(df=df, resumen_datos=resumen, semilla=config.semilla)
    return metricas


@router.get("/p05/archivo/{nombre}")
async def obtener_archivo_p05(nombre: str):
    """Entrega gráficas PNG o tablas CSV generadas por la Práctica 05."""
    archivo = ARCHIVOS_P05.get(nombre)
    if archivo is None:
        raise HTTPException(status_code=404, detail="Archivo no válido para Práctica 05")
    cargar_o_entrenar_p05()
    ruta = os.path.join(CARPETA_P05, archivo)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="El archivo aún no se ha generado")
    media = "text/csv; charset=utf-8" if archivo.endswith(".csv") else "image/png"
    return FileResponse(ruta, media_type=media, filename=archivo)


# ============================================================
# PRÁCTICA 06: OPTIMIZACIÓN DE HIPERPARÁMETROS (GRID VS RANDOMIZED)
# ============================================================


@router.get("/p06/estado")
async def estado_practica06(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Devuelve las métricas de GridSearchCV vs RandomizedSearchCV (P06)."""
    if not os.path.exists(RUTA_METRICAS_P06):
        df, resumen = await _construir_dataset_practica(
            db, generar_datos_p05, cantidad_objetivo=500, semilla=42, usar_reales=True
        )
        _, metricas = entrenar_practica06(df=df, resumen_datos=resumen, semilla=42)
        return metricas
    _, metricas = cargar_o_entrenar_p06()
    return metricas


@router.post("/p06/entrenar")
async def entrenar_modelo_p06(
    config: EntrenamientoConfig = EntrenamientoConfig(),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Reentrena la optimización de hiperparámetros con GridSearchCV y RandomizedSearchCV."""
    df, resumen = await _construir_dataset_practica(
        db,
        generar_datos_p05,
        cantidad_objetivo=config.cantidad,
        semilla=config.semilla,
        usar_reales=config.usar_reales,
    )
    _, metricas = entrenar_practica06(df=df, resumen_datos=resumen, semilla=config.semilla)
    return metricas


@router.get("/p06/archivo/{nombre}")
async def obtener_archivo_p06(nombre: str):
    """Entrega gráficas PNG o tablas CSV generadas por la optimización de hiperparámetros (P06)."""
    archivo = ARCHIVOS_P06.get(nombre)
    if archivo is None:
        raise HTTPException(status_code=404, detail="Archivo no válido")
    cargar_o_entrenar_p06()
    ruta = os.path.join(CARPETA_P06, archivo)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="El archivo aún no se ha generado")
    media = "text/csv; charset=utf-8" if archivo.endswith(".csv") else "image/png"
    return FileResponse(ruta, media_type=media, filename=archivo)
