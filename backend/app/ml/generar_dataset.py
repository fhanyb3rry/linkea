"""Genera el dataset de entrenamiento: pares estudiante × vacante con sus features.

    python -m app.ml.generar_dataset

Fuentes de filas:
    real        cada estudiante contra cada vacante de la base (36 con 6×6)
    postulacion pares que además tienen postulación; guarda el resultado real
                (aceptada/asignada = funcionó, rechazada = no) para comparar
    sintetico   ejemplos inventados que cubren todo el espacio, para que el
                árbol tenga suficientes casos donde aprender los límites

Salida: app/ml/artefactos/pares.csv
"""

import asyncio
import random
from pathlib import Path

import pandas as pd

from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.ml.datos import FEATURES, MINUTOS_LEJOS, features_del_par, regla_elegible
from app.models.application import EstadoPostulacion
from app.models.company import Vacancy
from app.models.student import Student

ARTEFACTOS = Path(__file__).parent / "artefactos"
CSV = ARTEFACTOS / "pares.csv"

# Cuántos ejemplos sintéticos generar (los reales son pocos para entrenar solos).
N_SINTETICOS = 400
POSITIVOS = {EstadoPostulacion.ACEPTADA, EstadoPostulacion.ASIGNADA}
NEGATIVOS = {EstadoPostulacion.RECHAZADA}


async def _filas_reales() -> list[dict]:
    db = get_database()
    students = [Student(**d) async for d in db.students.find()]
    vacancies = [Vacancy(**d) async for d in db.vacancies.find()]

    # Resultados reales de postulaciones ya resueltas, indexados por par.
    resultados: dict[tuple[str, str], int] = {}
    async for ap in db.applications.find():
        estado = ap.get("estado")
        if estado in {e.value for e in POSITIVOS}:
            resultados[(ap["student_id"], ap["vacancy_id"])] = 1
        elif estado in {e.value for e in NEGATIVOS}:
            resultados[(ap["student_id"], ap["vacancy_id"])] = 0

    filas = []
    for s in students:
        for v in vacancies:
            f = features_del_par(s, v)
            clave = (str(s.id), str(v.id))
            resultado = resultados.get(clave)
            filas.append({
                "student_id": clave[0],
                "vacancy_id": clave[1],
                "estudiante": s.nombre,
                "vacante": v.titulo,
                **f,
                "elegible": regla_elegible(f),
                "resultado_real": resultado if resultado is not None else "",
                "origen": "postulacion" if resultado is not None else "real",
            })
    return filas


def _filas_sinteticas(n: int, semilla: int = 42) -> list[dict]:
    """Ejemplos inventados que barren el espacio, con extra cerca de los límites
    (45 min, 1.0 de horas, 0 de skills) para que el árbol aprenda justo ahí."""
    rng = random.Random(semilla)
    filas = []
    for _ in range(n):
        f = {
            "carrera": float(rng.random() < 0.5),
            "cobertura_skills": round(rng.random(), 3),
            "razon_horas": round(rng.uniform(0, 2), 3),
            "minutos": round(rng.uniform(0, MINUTOS_LEJOS), 1),
        }
        # La mitad de los ejemplos cae cerca de las fronteras de decisión.
        if rng.random() < 0.5:
            frontera = rng.choice(["minutos", "razon_horas", "cobertura_skills"])
            f[frontera] = {
                "minutos": round(rng.uniform(35, 55), 1),
                "razon_horas": round(rng.uniform(0.8, 1.2), 3),
                "cobertura_skills": round(rng.uniform(0, 0.25), 3),
            }[frontera]
        filas.append({**f, "elegible": regla_elegible(f), "resultado_real": "", "origen": "sintetico"})
    return filas


def _limpiar(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Limpieza estilo práctica: quita duplicados y filas fuera de rango, y deja
    los descartes en otra tabla para auditarlos (no desaparecen sin explicación)."""
    df = df.drop_duplicates(subset=FEATURES).copy()
    valido = (
        df[FEATURES].notna().all(axis=1)
        & df["carrera"].isin([0.0, 1.0])
        & df["cobertura_skills"].between(0, 1)
        & df["razon_horas"].between(0, 2)
        & df["minutos"].between(0, MINUTOS_LEJOS)
        & df["elegible"].isin([0, 1])
    )
    return df[valido].copy(), df[~valido].copy()


async def main() -> None:
    await connect_to_mongo()
    try:
        reales = await _filas_reales()
    finally:
        await close_mongo_connection()

    df = pd.concat([pd.DataFrame(reales), pd.DataFrame(_filas_sinteticas(N_SINTETICOS))],
                   ignore_index=True)
    limpios, revision = _limpiar(df)

    ARTEFACTOS.mkdir(exist_ok=True)
    limpios.to_csv(CSV, index=False, encoding="utf-8")
    if not revision.empty:
        revision.to_csv(ARTEFACTOS / "pares_revision.csv", index=False, encoding="utf-8")

    print(f"Pares reales/postulación: {len(reales)}  |  sintéticos: {N_SINTETICOS}")
    print(f"Válidos: {len(limpios)}  |  a revisión: {len(revision)}")
    print("Distribución de la etiqueta:")
    print(limpios["elegible"].value_counts().sort_index().to_string())
    print("Distribución por origen:")
    print(limpios["origen"].value_counts().to_string())
    print(f"\nCSV -> {CSV}")


if __name__ == "__main__":
    asyncio.run(main())
