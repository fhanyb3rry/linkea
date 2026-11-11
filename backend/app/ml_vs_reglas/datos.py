"""Preparación de datos históricos y extracción de características para Machine Learning.

  PARTE 1  Las 4 variables de entrada (con sus rangos) y cómo se extraen de un par real (Student, Vacancy)
  PARTE 2  Generación de casos históricos sintéticos con numpy.random (semilla reproducible = 42)
  PARTE 3  Lectura de postulaciones cerradas reales desde MongoDB y armado del DataFrame en pandas
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

from app.models.application import EstadoPostulacion
from app.models.company import Modalidad, Vacancy
from app.models.student import Student
from app.search.traslado import tiempo_traslado

# ============================================================
# PARTE 1. LAS CARACTERÍSTICAS DEL PAR ESTUDIANTE - VACANTE
# ============================================================

# Columnas que utiliza el modelo para aprender patrones:
#   - horas_dedicacion:       0 a 15  (margen de horas semanales frente a lo que pide la vacante)
#   - compatibilidad_horaria: 30 a 100 (cobertura de horas + viabilidad de traslado A* entre zonas)
#   - cobertura_skills:       10 a 100 (coincidencia de skills clave + afinidad de carrera)
#   - participacion_perfil:   0 a 10  (proyectos en portafolio, avance de semestre, idiomas y CV)
COLUMNAS_ENTRADA = [
    "horas_dedicacion",
    "compatibilidad_horaria",
    "cobertura_skills",
    "participacion_perfil",
]

DESCRIPCION_VARIABLES = [
    {
        "clave": "horas_dedicacion",
        "nombre": "Horas de dedicación",
        "rango": "0 a 15",
        "min": 0,
        "max": 15,
        "unidad": "pts/sem",
        "explicacion": "Margen de horas semanales disponibles del estudiante frente a las requeridas por la vacante.",
    },
    {
        "clave": "compatibilidad_horaria",
        "nombre": "Compatibilidad horaria y traslado",
        "rango": "30 a 100",
        "min": 30,
        "max": 100,
        "unidad": "%",
        "explicacion": "Combina el porcentaje de horas cubiertas con la cercanía entre zonas calculada con A*.",
    },
    {
        "clave": "cobertura_skills",
        "nombre": "Cobertura de skills y carrera",
        "rango": "10 a 100",
        "min": 10,
        "max": 100,
        "unidad": "%",
        "explicacion": "Porcentaje de habilidades clave de la vacante que domina el estudiante más afinidad de carrera.",
    },
    {
        "clave": "participacion_perfil",
        "nombre": "Participación y preparación",
        "rango": "0 a 10",
        "min": 0,
        "max": 10,
        "unidad": "/ 10",
        "explicacion": "Proyectos prácticos en portafolio, semestre cursado, idiomas adicionales y CV cargado.",
    },
]


class CaracteristicasPar(BaseModel):
    horas_dedicacion: int = Field(ge=0, le=15)
    compatibilidad_horaria: int = Field(ge=30, le=100)
    cobertura_skills: int = Field(ge=10, le=100)
    participacion_perfil: int = Field(ge=0, le=10)


def extraer_caracteristicas(student: Student, vacancy: Vacancy) -> CaracteristicasPar:
    """Convierte un par real (Student, Vacancy) de Linkea en las 4 variables numéricas del modelo."""
    horas_est = student.disponibilidad.horas_por_semana
    horas_vac = max(1, vacancy.horarios.horas_por_semana)

    # 1. Horas de dedicación (0 a 15): holgura sobre las horas pedidas (+5 de base cuando cumple exacto).
    horas_dedicacion = int(np.clip(horas_est - horas_vac + 5, 0, 15))

    # 2. Compatibilidad horaria y traslado (30 a 100): 65% cobertura de horas + 35% cercanía A*.
    ratio_horas = min(1.0, max(0.0, horas_est / horas_vac))
    if vacancy.modalidad == Modalidad.REMOTO:
        factor_traslado = 1.0
    else:
        tr = tiempo_traslado(student.ubicacion.zona, vacancy.ubicacion.zona)
        if tr.conocido:
            factor_traslado = max(0.0, 1.0 - (tr.minutos_reales or 0.0) / 90.0)
        else:
            misma = student.ubicacion.zona.strip().lower() == vacancy.ubicacion.zona.strip().lower()
            factor_traslado = 1.0 if misma else 0.45
    compatibilidad_horaria = int(np.clip(round(30 + 70 * (0.65 * ratio_horas + 0.35 * factor_traslado)), 30, 100))

    # 3. Cobertura de skills y carrera (10 a 100): 70% skills clave en común + 30% carrera aceptada.
    skills_alumno = {s.strip().lower() for s in student.skills}
    skills_vacante = {s.strip().lower() for s in vacancy.requisitos.skills_clave}
    ratio_skills = len(skills_alumno & skills_vacante) / len(skills_vacante) if skills_vacante else 1.0
    carrera_ok = student.carrera.strip().lower() in {
        c.strip().lower() for c in vacancy.requisitos.carreras_aceptadas
    }
    cobertura_skills = int(np.clip(round(10 + 90 * (0.70 * ratio_skills + 0.30 * float(carrera_ok))), 10, 100))

    # 4. Participación y preparación del perfil (0 a 10).
    pts_proyectos = min(4, len(student.proyectos) * 2)
    pts_semestre = 3 if student.semestre >= 8 else 2 if student.semestre >= 6 else 1 if student.semestre >= 4 else 0
    pts_idiomas = 1 if len(student.idiomas) >= 2 else 0
    pts_cv = 1 if student.cv is not None else 0
    pts_bio = 1 if (student.bio.strip() or student.intereses) else 0
    participacion_perfil = int(np.clip(pts_proyectos + pts_semestre + pts_idiomas + pts_cv + pts_bio, 0, 10))

    return CaracteristicasPar(
        horas_dedicacion=horas_dedicacion,
        compatibilidad_horaria=compatibilidad_horaria,
        cobertura_skills=cobertura_skills,
        participacion_perfil=participacion_perfil,
    )


def estimar_calificacion_base(c: CaracteristicasPar) -> float:
    """Calificación estimada (0-100) con los pesos del dominio: horas 35%, skills 30%, horario 25%, participación 10%."""
    puntaje = (
        (c.horas_dedicacion / 15.0) * 35.0
        + (c.cobertura_skills / 100.0) * 30.0
        + (c.compatibilidad_horaria / 100.0) * 25.0
        + (c.participacion_perfil / 10.0) * 10.0
    )
    return float(np.clip(round(puntaje, 1), 0.0, 100.0))


# ============================================================
# PARTE 2. DATOS HISTÓRICOS SINTÉTICOS (500 REGISTROS)
# ============================================================


def generar_datos_sinteticos(cantidad: int = 500, semilla: int = 42) -> pd.DataFrame:
    """Genera registros ficticios reproducibles para entrenar, validar y probar el modelo.

    Sigue la misma lógica de la Práctica 03:
      - horas_dedicacion:       entre 0 y 15
      - compatibilidad_horaria: entre 30 y 100
      - cobertura_skills:       entre 10 y 100
      - participacion_perfil:   entre 0 y 10
      - calificacion_final:     combinación ponderada + variación normal, acotada 0..100
      - aceptado:               1 si calificacion_final >= 60, 0 en caso contrario
    """
    rng = np.random.default_rng(semilla)
    # Usamos también seed clásica de numpy cuando semilla == 42 para mantener reproducibilidad exacta.
    np.random.seed(semilla)

    horas_dedicacion = np.random.randint(0, 16, cantidad)
    compatibilidad_horaria = np.random.randint(30, 101, cantidad)
    cobertura_skills = np.random.randint(10, 101, cantidad)
    participacion_perfil = np.random.randint(0, 11, cantidad)

    variacion = np.random.normal(0, 5, cantidad)
    _ = rng  # reservado por si se amplía la simulación

    calificacion_final = (
        (horas_dedicacion / 15.0) * 35.0
        + (cobertura_skills / 100.0) * 30.0
        + (compatibilidad_horaria / 100.0) * 25.0
        + (participacion_perfil / 10.0) * 10.0
        + variacion
    )
    calificacion_final = np.clip(calificacion_final, 0, 100).round()
    aceptado = (calificacion_final >= 60).astype(int)

    return pd.DataFrame(
        {
            "horas_dedicacion": horas_dedicacion,
            "compatibilidad_horaria": compatibilidad_horaria,
            "cobertura_skills": cobertura_skills,
            "participacion_perfil": participacion_perfil,
            "calificacion_final": calificacion_final,
            "aceptado": aceptado,
            "origen": "sintetico",
        }
    )


# ============================================================
# PARTE 3. DATOS REALES DE MONGODB + SINTÉTICOS
# ============================================================

ESTADOS_POSITIVOS = {EstadoPostulacion.ACEPTADA.value, EstadoPostulacion.ASIGNADA.value}
ESTADOS_NEGATIVOS = {EstadoPostulacion.RECHAZADA.value}
ESTADOS_CERRADOS = ESTADOS_POSITIVOS | ESTADOS_NEGATIVOS


async def extraer_postulaciones_reales(db: AsyncIOMotorDatabase) -> pd.DataFrame:
    """Convierte las postulaciones con veredicto final (aceptada/asignada vs rechazada) en filas de entrenamiento."""
    apps = await db.applications.find({"estado": {"$in": list(ESTADOS_CERRADOS)}}).to_list(length=None)
    if not apps:
        return pd.DataFrame(columns=[*COLUMNAS_ENTRADA, "calificacion_final", "aceptado", "origen"])

    students_docs = await db.students.find().to_list(length=None)
    vacancies_docs = await db.vacancies.find().to_list(length=None)
    por_estudiante = {str(d["_id"]): Student(**d) for d in students_docs}
    por_vacante = {str(d["_id"]): Vacancy(**d) for d in vacancies_docs}

    filas = []
    for app_doc in apps:
        st = por_estudiante.get(app_doc["student_id"])
        vac = por_vacante.get(app_doc["vacancy_id"])
        if st is None or vac is None:
            continue
        c = extraer_caracteristicas(st, vac)
        aceptado = 1 if app_doc["estado"] in ESTADOS_POSITIVOS else 0
        cal_base = estimar_calificacion_base(c)
        cal_final = max(60.0, cal_base) if aceptado == 1 else min(59.0, cal_base)
        filas.append(
            {
                **c.model_dump(),
                "calificacion_final": round(cal_final),
                "aceptado": aceptado,
                "origen": "real",
            }
        )

    if not filas:
        return pd.DataFrame(columns=[*COLUMNAS_ENTRADA, "calificacion_final", "aceptado", "origen"])
    return pd.DataFrame(filas)


async def construir_dataset(
    db: AsyncIOMotorDatabase | None = None,
    cantidad_objetivo: int = 500,
    semilla: int = 42,
) -> tuple[pd.DataFrame, dict]:
    """Arma el DataFrame final combinando postulaciones reales cerradas con registros sintéticos hasta completar `cantidad_objetivo`."""
    df_reales = await extraer_postulaciones_reales(db) if db is not None else pd.DataFrame()
    n_reales = len(df_reales)

    faltantes = max(0, cantidad_objetivo - n_reales)
    df_sint = generar_datos_sinteticos(cantidad=faltantes, semilla=semilla) if faltantes > 0 else pd.DataFrame()
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

    for col in COLUMNAS_ENTRADA + ["aceptado"]:
        df[col] = df[col].astype(int)
    df["calificacion_final"] = df["calificacion_final"].astype(float)

    resumen = {
        "total_registros": len(df),
        "registros_reales": n_reales,
        "registros_sinteticos": n_sint,
        "fuente": fuente,
        "semilla": semilla,
    }
    return df, resumen
