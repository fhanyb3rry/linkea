"""Extracción de atributos de estudiantes de Linkea y cohorte sintética para K-Means (P07/P08) y PCA (P09).

Mapea las 4 variables académicas de las prácticas al dominio real de Linkea:
  - horas_disponibles     (0 a 12):  dedicación semanal normalizada para estadía (equiv. horas_estudio)
  - avance_academico      (0 a 100): semestre cursado y regularidad de días disponibles (equiv. asistencia)
  - evidencias_portafolio (0 a 30):  proyectos prácticos, CV cargado y enlaces (equiv. actividades)
  - dominio_habilidades   (0 a 100): amplitud de skills técnicas, idiomas e intereses (equiv. participacion)
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
import numpy as np
import pandas as pd

from app.ml_vs_reglas.modelo import (
    CARPETA_ML,
    COLOR_CAFE,
    COLOR_CARAMELO,
    COLOR_FONDO,
    COLOR_TEAL,
    COLOR_TINTA,
    COLOR_VINO,
)
from app.models.student import Student

VARIABLES = [
    "horas_disponibles",
    "avance_academico",
    "evidencias_portafolio",
    "dominio_habilidades",
]

DESCRIPCION_VARIABLES_SEG = [
    {
        "clave": "horas_disponibles",
        "nombre": "Dedicación semanal",
        "unidad": "pts (0-12)",
        "explicacion": "Índice de horas disponibles por semana para dedicar a la estadía.",
    },
    {
        "clave": "avance_academico",
        "nombre": "Avance y constancia",
        "unidad": "%",
        "explicacion": "Combina el semestre cursado con la regularidad de días disponibles.",
    },
    {
        "clave": "evidencias_portafolio",
        "nombre": "Portafolio y CV",
        "unidad": "pts (0-30)",
        "explicacion": "Proyectos registrados, currículum cargado y enlaces profesionales.",
    },
    {
        "clave": "dominio_habilidades",
        "nombre": "Amplitud de habilidades",
        "unidad": "%",
        "explicacion": "Cantidad de habilidades técnicas, idiomas e intereses profesionales.",
    },
]

NOMBRES_SEGMENTOS_ORDENADOS = [
    "Conviene acompañamiento",
    "En preparación intermedia",
    "Listo para estadía",
]

COLORES_SEGMENTOS = {
    "Conviene acompañamiento": COLOR_VINO,
    "En preparación intermedia": COLOR_CARAMELO,
    "Listo para estadía": COLOR_TEAL,
}

__all__ = [
    "CARPETA_ML",
    "COLOR_CAFE",
    "COLOR_CARAMELO",
    "COLOR_FONDO",
    "COLOR_TEAL",
    "COLOR_TINTA",
    "COLOR_VINO",
    "COLORES_SEGMENTOS",
    "DESCRIPCION_VARIABLES_SEG",
    "NOMBRES_SEGMENTOS_ORDENADOS",
    "VARIABLES",
    "construir_cohorte_segmentacion",
    "extraer_vector_estudiante",
    "generar_datos_cohorte",
]


def extraer_vector_estudiante(st: Student) -> dict:
    """Convierte un documento Student real de Linkea en las 4 variables numéricas de segmentación."""
    horas = float(st.disponibilidad.horas_por_semana or 0)
    dias = len(st.disponibilidad.dias or [])
    enlaces = st.enlaces
    n_enlaces = sum(1 for url in (enlaces.linkedin, enlaces.github, enlaces.portafolio) if url and url.strip())

    horas_disponibles = float(np.clip(round(horas * 0.34, 2), 0.0, 12.0))
    avance_academico = float(np.clip(round((st.semestre / 10.0) * 72.0 + min(28.0, dias * 5.6), 2), 0.0, 100.0))
    evidencias_portafolio = float(
        np.clip(
            round(len(st.proyectos) * 8.0 + (7.0 if st.cv is not None else 0.0) + n_enlaces * 3.0, 2),
            0.0,
            30.0,
        )
    )
    dominio_habilidades = float(
        np.clip(
            round(
                len(st.skills) * 11.5
                + len(st.idiomas) * 13.0
                + len(st.intereses) * 5.5
                + (10.0 if st.bio and st.bio.strip() else 0.0),
                2,
            ),
            0.0,
            100.0,
        )
    )

    return {
        "id_estudiante": str(st.id),
        "nombre": st.nombre,
        "carrera": st.carrera,
        "origen": "real",
        "horas_disponibles": horas_disponibles,
        "avance_academico": avance_academico,
        "evidencias_portafolio": evidencias_portafolio,
        "dominio_habilidades": dominio_habilidades,
    }


def generar_datos_cohorte(cantidad_por_perfil: tuple[int, int, int] = (180, 170, 150), semilla: int = 42) -> pd.DataFrame:
    """Genera 500 estudiantes simulados sin etiquetas para que K-Means descubra los 3 grupos por sí mismo."""
    rng = np.random.default_rng(semilla)

    alto = np.column_stack(
        [
            rng.normal(8.0, 1.0, cantidad_por_perfil[0]),
            rng.normal(92.0, 5.0, cantidad_por_perfil[0]),
            rng.normal(27.0, 2.0, cantidad_por_perfil[0]),
            rng.normal(90.0, 6.0, cantidad_por_perfil[0]),
        ]
    )
    medio = np.column_stack(
        [
            rng.normal(5.0, 1.0, cantidad_por_perfil[1]),
            rng.normal(75.0, 7.0, cantidad_por_perfil[1]),
            rng.normal(20.0, 3.0, cantidad_por_perfil[1]),
            rng.normal(65.0, 8.0, cantidad_por_perfil[1]),
        ]
    )
    bajo = np.column_stack(
        [
            rng.normal(2.5, 1.0, cantidad_por_perfil[2]),
            rng.normal(55.0, 8.0, cantidad_por_perfil[2]),
            rng.normal(12.0, 4.0, cantidad_por_perfil[2]),
            rng.normal(40.0, 10.0, cantidad_por_perfil[2]),
        ]
    )

    datos = np.vstack([alto, medio, bajo])
    rng.shuffle(datos)

    datos[:, 0] = np.clip(datos[:, 0], 0, 12)
    datos[:, 1] = np.clip(datos[:, 1], 0, 100)
    datos[:, 2] = np.clip(datos[:, 2], 0, 30)
    datos[:, 3] = np.clip(datos[:, 3], 0, 100)

    df = pd.DataFrame(datos, columns=VARIABLES)
    df.insert(0, "origen", "sintetico")
    df.insert(0, "carrera", "Cohorte histórica")
    df.insert(0, "nombre", [f"Estudiante {i:03d}" for i in range(1, len(df) + 1)])
    df.insert(0, "id_estudiante", [f"EST-{i:04d}" for i in range(1, len(df) + 1)])
    return df


async def construir_cohorte_segmentacion(
    db: AsyncIOMotorDatabase | None = None,
    total_objetivo: int = 500,
    semilla: int = 42,
    usar_reales: bool = True,
) -> tuple[pd.DataFrame, dict]:
    """Une los estudiantes reales registrados en Linkea con la cohorte histórica hasta `total_objetivo`."""
    reales_filas: list[dict] = []
    if db is not None and usar_reales:
        docs = await db.students.find().to_list(length=None)
        for doc in docs:
            reales_filas.append(extraer_vector_estudiante(Student(**doc)))

    df_reales = pd.DataFrame(reales_filas) if reales_filas else pd.DataFrame()
    n_reales = len(df_reales)

    df_base = generar_datos_cohorte(semilla=semilla)
    faltantes = max(0, total_objetivo - n_reales)
    df_sint = df_base.head(faltantes).copy() if faltantes <= len(df_base) else df_base.copy()
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

    resumen = {
        "total_estudiantes": int(len(df)),
        "estudiantes_reales": int(n_reales),
        "estudiantes_sinteticos": int(n_sint),
        "fuente": fuente,
        "semilla": semilla,
    }
    return df, resumen
