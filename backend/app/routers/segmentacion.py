"""Endpoints de acompañamiento, mapa de generación y auditoría de segmentación (P07, P08 y P09)."""

import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import joblib
from motor.motor_asyncio import AsyncIOMotorDatabase
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from sklearn.decomposition import PCA

from app.core.database import get_database
from app.core.seguridad import usuario_actual
from app.models.student import Student
from app.routers.students import _oid as student_oid
from app.segmentacion.datos import (
    VARIABLES,
    construir_cohorte_segmentacion,
    extraer_vector_estudiante,
    generar_datos_cohorte,
)
from app.segmentacion.practica07 import (
    ARCHIVOS_P07,
    CARPETA_P07,
    RUTA_MODELO_P07,
    cargar_o_entrenar_p07,
    entrenar_practica07,
)
from app.segmentacion.practica08 import (
    ARCHIVOS_P08,
    CARPETA_P08,
    cargar_o_entrenar_p08,
    entrenar_practica08,
)
from app.segmentacion.practica09 import (
    ARCHIVOS_P09,
    CARPETA_P09,
    cargar_o_entrenar_p09,
    entrenar_practica09,
)

router = APIRouter(prefix="/segmentacion", tags=["segmentacion"], dependencies=[Depends(usuario_actual)])


class SegmentacionConfig(BaseModel):
    total_objetivo: int = Field(default=500, ge=100, le=3000)
    k: int = Field(default=3, ge=2, le=8)
    percentil_atipicos: float = Field(default=95.0, ge=80.0, le=99.5)
    varianza_objetivo: float = Field(default=0.85, ge=0.50, le=0.99)
    semilla: int = Field(default=42, ge=0, le=99999)
    usar_reales: bool = Field(default=True)


def _cargar_artefacto_kmeans() -> dict:
    if not os.path.exists(RUTA_MODELO_P07):
        entrenar_practica07(semilla=42)
    return joblib.load(RUTA_MODELO_P07)


def _codigo_etapa(etiqueta: str) -> str:
    if "Listo" in etiqueta:
        return "listo"
    if "intermedia" in etiqueta:
        return "intermedio"
    return "acompanamiento"


def _sugerencia_humana(fila: dict, codigo: str) -> str:
    faltas: list[str] = []
    if fila["evidencias_portafolio"] < 14:
        faltas.append("subir tu CV o registrar al menos un proyecto práctico")
    if fila["horas_disponibles"] < 4.5:
        faltas.append("ampliar tus horas semanales disponibles")
    if fila["dominio_habilidades"] < 50:
        faltas.append("agregar más herramientas técnicas o idiomas a tu perfil")

    if codigo == "listo":
        return "Tu perfil cuenta con buen respaldo de tiempo, habilidades y evidencias para postularte con confianza."
    if faltas:
        return f"Para dar el siguiente salto te ayudará principalmente {' y '.join(faltas[:2])}."
    return "Vas por buen camino; mantener actualizado tu portafolio y disponibilidad fortalecerá tus postulaciones."


def _evaluar_dataframe_estudiantes(df_reales: pd.DataFrame) -> dict:
    """Proyecta estudiantes reales sobre el modelo K-Means entrenado, calcula singularidad P95 y mapa 2D PCA."""
    artefacto = _cargar_artefacto_kmeans()
    modelo = artefacto["modelo"]
    escalador = artefacto["escalador"]
    mapa_nombres = {int(k): v for k, v in artefacto["mapa_nombres"].items()}

    # Cohorte de referencia para el umbral P95 y los ejes del mapa visual PCA
    df_ref = generar_datos_cohorte(semilla=42)
    X_ref_esc = escalador.transform(df_ref[VARIABLES])
    etiq_ref = modelo.predict(X_ref_esc)
    dist_ref = np.linalg.norm(X_ref_esc - modelo.cluster_centers_[etiq_ref], axis=1)
    umbral_p95 = float(np.percentile(dist_ref, 95))

    pca_2d = PCA(n_components=2)
    coords_ref = pca_2d.fit_transform(X_ref_esc)
    var_2d = round(float(np.sum(pca_2d.explained_variance_ratio_) * 100), 1)

    centroides_orig = pd.DataFrame(escalador.inverse_transform(modelo.cluster_centers_), columns=VARIABLES)
    rangos = {"horas_disponibles": 12.0, "avance_academico": 100.0, "evidencias_portafolio": 30.0, "dominio_habilidades": 100.0}
    nombres_amigables = {
        "horas_disponibles": "sus horas semanales disponibles",
        "avance_academico": "su avance de semestre y regularidad de días",
        "evidencias_portafolio": "sus proyectos y currículum cargado",
        "dominio_habilidades": "la amplitud de sus habilidades registradas",
    }

    por_estudiante: dict[str, dict] = {}
    conteos = {"listo": 0, "intermedio": 0, "acompanamiento": 0}
    singulares: list[dict] = []
    puntos_reales: list[dict] = []

    if not df_reales.empty:
        X_real_esc = escalador.transform(df_reales[VARIABLES])
        etiq_real = modelo.predict(X_real_esc)
        dist_real = np.linalg.norm(X_real_esc - modelo.cluster_centers_[etiq_real], axis=1)
        coords_real = pca_2d.transform(X_real_esc)

        for idx, fila in df_reales.iterrows():
            pos = df_reales.index.get_loc(idx)
            cl = int(etiq_real[pos])
            etapa = mapa_nombres.get(cl, "En preparación intermedia")
            codigo = _codigo_etapa(etapa)
            conteos[codigo] = conteos.get(codigo, 0) + 1

            dist = float(dist_real[pos])
            es_singular = bool(dist > umbral_p95)
            centro = centroides_orig.iloc[cl]
            col_destacada = max(
                VARIABLES,
                key=lambda c: abs(float(fila[c]) - float(centro[c])) / rangos[c],
            )
            dif = float(fila[col_destacada]) - float(centro[col_destacada])
            motivo = (
                f"Dentro de su grupo ({etapa.lower()}), {nombres_amigables[col_destacada]} "
                f"{'supera ampliamente' if dif > 0 else 'está por debajo de'} lo habitual."
            )

            info = {
                "student_id": str(fila["id_estudiante"]),
                "nombre": str(fila["nombre"]),
                "carrera": str(fila["carrera"]),
                "etapa": etapa,
                "codigo_etapa": codigo,
                "es_singular": es_singular,
                "motivo_singular": motivo,
                "sugerencia": _sugerencia_humana(fila, codigo),
                "pos_x": round(float(coords_real[pos, 0]), 3),
                "pos_y": round(float(coords_real[pos, 1]), 3),
                "indicadores": {
                    "horas_disponibles": round(float(fila["horas_disponibles"]), 1),
                    "avance_academico": round(float(fila["avance_academico"]), 1),
                    "evidencias_portafolio": round(float(fila["evidencias_portafolio"]), 1),
                    "dominio_habilidades": round(float(fila["dominio_habilidades"]), 1),
                },
            }
            por_estudiante[str(fila["id_estudiante"])] = info
            puntos_reales.append(
                {
                    "id": str(fila["id_estudiante"]),
                    "nombre": str(fila["nombre"]),
                    "carrera": str(fila["carrera"]),
                    "etapa": etapa,
                    "codigo_etapa": codigo,
                    "es_singular": es_singular,
                    "es_real": True,
                    "x": info["pos_x"],
                    "y": info["pos_y"],
                }
            )
            if es_singular:
                singulares.append(info)

    # Muestra ligera de fondo histórico para dar contexto visual al mapa 2D
    puntos_fondo = [
        {
            "id": f"ref-{i}",
            "nombre": "Referencia histórica",
            "carrera": "",
            "etapa": mapa_nombres.get(int(etiq_ref[i]), "En preparación intermedia"),
            "codigo_etapa": _codigo_etapa(mapa_nombres.get(int(etiq_ref[i]), "")),
            "es_singular": False,
            "es_real": False,
            "x": round(float(coords_ref[i, 0]), 3),
            "y": round(float(coords_ref[i, 1]), 3),
        }
        for i in range(0, min(120, len(df_ref)))
    ]

    return {
        "estudiantes": por_estudiante,
        "resumen": {
            "total_reales": len(por_estudiante),
            "conteos": conteos,
            "total_singulares": len(singulares),
            "informacion_mapa_pct": var_2d,
        },
        "singulares": singulares,
        "mapa": puntos_fondo + puntos_reales,
    }


# ============================================================
# VISTAS HUMANAS PARA ESTUDIANTES, EMPRESAS, ASESORES Y COORDINACIÓN
# ============================================================


@router.get("/estudiantes")
async def panorama_estudiantes(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Devuelve en lenguaje claro la etapa de preparación, casos singulares y mapa visual de los estudiantes reales."""
    docs = await db.students.find().to_list(length=None) if db is not None else []
    filas = [extraer_vector_estudiante(Student(**d)) for d in docs]
    df_reales = pd.DataFrame(filas) if filas else pd.DataFrame(columns=["id_estudiante", "nombre", "carrera", "origen", *VARIABLES])
    return _evaluar_dataframe_estudiantes(df_reales)


@router.get("/estudiante/{student_id}")
async def etapa_estudiante_individual(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Devuelve la etapa de preparación y recomendación amigable para la ficha de un estudiante."""
    doc = await db.students.find_one({"_id": student_oid(student_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    fila = extraer_vector_estudiante(Student(**doc))
    res = _evaluar_dataframe_estudiantes(pd.DataFrame([fila]))
    return res["estudiantes"][str(fila["id_estudiante"])]


# ============================================================
# AUDITORÍA TÉCNICA PARA COORDINACIÓN (P07, P08 Y P09)
# ============================================================


@router.get("/auditoria")
async def estado_auditoria_completa():
    """Entrega juntas las métricas de segmentación K-Means (P07), estabilidad/atípicos (P08) y PCA (P09)."""
    p07 = cargar_o_entrenar_p07()
    p08 = cargar_o_entrenar_p08()
    p09 = cargar_o_entrenar_p09()
    return {"p07": p07, "p08": p08, "p09": p09}


@router.post("/recalibrar")
async def recalibrar_todo(
    config: SegmentacionConfig = SegmentacionConfig(),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Reentrena en cadena P07 -> P08 -> P09 integrando a los estudiantes reales de Linkea."""
    df, resumen = await construir_cohorte_segmentacion(
        db=db,
        total_objetivo=config.total_objetivo,
        semilla=config.semilla,
        usar_reales=config.usar_reales,
    )
    m07, df_seg = entrenar_practica07(
        df=df,
        resumen_datos=resumen,
        k_final=config.k,
        semilla=config.semilla,
    )
    m08, _ = entrenar_practica08(
        df_externo=df,
        resumen_datos=resumen,
        num_clusters=config.k,
        percentil_atipicos=config.percentil_atipicos,
        semilla=config.semilla,
    )
    m09, _ = entrenar_practica09(
        df_segmentado=df_seg,
        varianza_objetivo=config.varianza_objetivo,
        num_clusters=config.k,
        semilla=config.semilla,
    )
    return {"p07": m07, "p08": m08, "p09": m09}


@router.get("/{practica}/archivo/{nombre}")
async def descargar_archivo_segmentacion(practica: str, nombre: str):
    """Descarga gráficas PNG o tablas CSV generadas por P07, P08 o P09."""
    catalogo = {
        "p07": (CARPETA_P07, ARCHIVOS_P07, cargar_o_entrenar_p07),
        "p08": (CARPETA_P08, ARCHIVOS_P08, cargar_o_entrenar_p08),
        "p09": (CARPETA_P09, ARCHIVOS_P09, cargar_o_entrenar_p09),
    }
    entrada = catalogo.get(practica)
    if entrada is None:
        raise HTTPException(status_code=404, detail="Módulo no válido")
    carpeta, archivos, asegurar = entrada
    archivo = archivos.get(nombre)
    if archivo is None:
        raise HTTPException(status_code=404, detail="Archivo no válido")
    asegurar()
    ruta = os.path.join(carpeta, archivo)
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail="El archivo aún no existe")
    media = "text/csv; charset=utf-8" if archivo.endswith(".csv") else "image/png"
    return FileResponse(ruta, media_type=media, filename=archivo)
