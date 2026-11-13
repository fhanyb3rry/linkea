"""Segmenta estudiantes por perfil de compatibilidad con K-Means.

    python -m app.ml.segmentar

Es la práctica 8 aplicada a Linkea. En lugar de "segmentos académicos",
agrupamos a los estudiantes según su perfil frente a las vacantes del
sistema, con cuatro variables (análogas a horas_estudio, asistencia,
actividades y participación):

    cobertura_skills_prom   promedio de skills clave cubiertas (0 a 1)
    carrera_match           fracción de vacantes que aceptan su carrera (0 a 1)
    horas_disponibles       horas por semana que puede trabajar
    minutos_prom            traslado promedio a las vacantes (min)

Los tres segmentos salen con nombres descriptivos según sus centroides:
    Perfil fuerte / Perfil medio / Requiere acompañamiento

También replica los análisis de la práctica:
    - k-means++ vs random (inercia y silhouette)
    - StandardScaler vs MinMaxScaler
    - estabilidad entre semillas con Adjusted Rand Index
    - posibles atípicos por distancia al centroide (percentil 95)

Como la base real tiene pocos estudiantes, se agregan perfiles sintéticos
para que el clustering tenga masa crítica (los reales se marcan).

Deja en app/ml/artefactos/segmentos/:
    reporte_integral.csv    cada estudiante con su segmento y silhouette
    centroides.csv          centroides en unidades originales
    perfiles.csv            promedios observados por segmento
    atipicos.csv            candidatos a revisión por distancia
    comparaciones.csv       init/escalador/ARI resumidos
    segmentos.json          resumen para el endpoint /ai/segmentos
"""

import asyncio
import json

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import (
    adjusted_rand_score,
    silhouette_samples,
    silhouette_score,
)
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.ml.datos import MINUTOS_LEJOS, features_del_par
from app.ml.generar_dataset import ARTEFACTOS
from app.models.company import Vacancy
from app.models.student import Student

SEMILLA = 42
NUM_CLUSTERS = 3
NUM_INICIALIZACIONES = 20
PERCENTIL_ATIPICOS = 95
N_SINTETICOS = 300

CARPETA = ARTEFACTOS / "segmentos"

VARIABLES = ["cobertura_skills_prom", "carrera_match", "horas_disponibles", "minutos_prom"]

# Nombres ordenados de peor a mejor segmento (se asignan por el promedio
# de cobertura+carrera del centroide, no por número de cluster).
NOMBRES = ["Requiere acompañamiento", "Perfil medio", "Perfil fuerte"]


# ------------------------------------------------------------
# 1. Datos: perfil de cada estudiante frente a todas las vacantes
# ------------------------------------------------------------
async def _estudiantes_reales() -> pd.DataFrame:
    db = get_database()
    students = [Student(**d) async for d in db.students.find()]
    vacancies = [Vacancy(**d) async for d in db.vacancies.find()]

    filas = []
    for s in students:
        f = [features_del_par(s, v) for v in vacancies]
        filas.append({
            "id": str(s.id),
            "nombre": s.nombre,
            "origen": "real",
            "cobertura_skills_prom": np.mean([p["cobertura_skills"] for p in f]),
            "carrera_match": np.mean([p["carrera"] for p in f]),
            "horas_disponibles": float(s.disponibilidad.horas_por_semana),
            "minutos_prom": np.mean([p["minutos"] for p in f]),
        })
    return pd.DataFrame(filas)


def _estudiantes_sinteticos(n: int) -> pd.DataFrame:
    """Tres perfiles simulados para que K-Means tenga datos suficientes."""
    rng = np.random.default_rng(SEMILLA)
    fuerte = np.column_stack([
        rng.normal(0.80, 0.08, n // 3), rng.normal(0.85, 0.10, n // 3),
        rng.normal(32.0, 4.0, n // 3), rng.normal(20.0, 8.0, n // 3)])
    medio = np.column_stack([
        rng.normal(0.50, 0.10, n // 3), rng.normal(0.50, 0.12, n // 3),
        rng.normal(22.0, 5.0, n // 3), rng.normal(40.0, 10.0, n // 3)])
    bajo = np.column_stack([
        rng.normal(0.20, 0.10, n // 3), rng.normal(0.20, 0.12, n // 3),
        rng.normal(12.0, 4.0, n // 3), rng.normal(60.0, 12.0, n // 3)])
    datos = np.vstack([fuerte, medio, bajo])
    rng.shuffle(datos)

    # Recortar a rangos plausibles del sistema.
    datos[:, 0] = np.clip(datos[:, 0], 0, 1)
    datos[:, 1] = np.clip(datos[:, 1], 0, 1)
    datos[:, 2] = np.clip(datos[:, 2], 0, 40)
    datos[:, 3] = np.clip(datos[:, 3], 0, MINUTOS_LEJOS)

    df = pd.DataFrame(datos, columns=VARIABLES)
    df.insert(0, "nombre", [f"SIM-{i:04d}" for i in range(1, len(df) + 1)])
    df.insert(0, "id", df["nombre"])
    df["origen"] = "sintetico"
    return df


# ------------------------------------------------------------
# 2. Comparaciones de la práctica: init, escalador y estabilidad
# ------------------------------------------------------------
def _comparaciones(X: np.ndarray) -> dict:
    resumen = {}

    # k-means++ vs random (mismo escalado y semilla para comparar parejo).
    escalador = StandardScaler()
    X_std = escalador.fit_transform(X)
    inicializaciones = []
    for init in ["k-means++", "random"]:
        m = KMeans(n_clusters=NUM_CLUSTERS, init=init,
                   n_init=NUM_INICIALIZACIONES, random_state=SEMILLA)
        etiquetas = m.fit_predict(X_std)
        inicializaciones.append({
            "inicializacion": init, "inercia": round(float(m.inertia_), 2),
            "silhouette": round(float(silhouette_score(X_std, etiquetas)), 4),
        })
    resumen["inicializaciones"] = inicializaciones

    # StandardScaler vs MinMaxScaler.
    escaladores = []
    for nombre, esc in [("StandardScaler", StandardScaler()), ("MinMaxScaler", MinMaxScaler())]:
        Xt = esc.fit_transform(X)
        m = KMeans(n_clusters=NUM_CLUSTERS, init="k-means++",
                   n_init=NUM_INICIALIZACIONES, random_state=SEMILLA)
        etiquetas = m.fit_predict(Xt)
        escaladores.append({
            "escalador": nombre,
            "silhouette": round(float(silhouette_score(Xt, etiquetas)), 4),
        })
    resumen["escaladores"] = escaladores

    # Estabilidad: ARI entre particiones con distintas semillas.
    semillas = [10, 20, 30, 40, 50, SEMILLA]
    particiones = {}
    for semilla in semillas:
        m = KMeans(n_clusters=NUM_CLUSTERS, init="k-means++",
                   n_init=NUM_INICIALIZACIONES, random_state=semilla)
        particiones[semilla] = m.fit_predict(X_std)
    aris = [adjusted_rand_score(particiones[a], particiones[b])
            for i, a in enumerate(semillas) for b in semillas[i + 1:]]
    resumen["ari_promedio"] = round(float(np.mean(aris)), 4)

    return resumen, X_std


# ------------------------------------------------------------
# 3. Pipeline principal
# ------------------------------------------------------------
async def main() -> None:
    print("=== SEGMENTACIÓN DE ESTUDIANTES (K-Means) ===")
    await connect_to_mongo()
    try:
        reales = await _estudiantes_reales()
    finally:
        await close_mongo_connection()

    df = pd.concat([reales, _estudiantes_sinteticos(N_SINTETICOS)], ignore_index=True)
    X = df[VARIABLES].to_numpy(dtype=float)
    print(f"Estudiantes: {len(reales)} reales + {N_SINTETICOS} sintéticos")

    # Comparaciones preliminares.
    resumen, X_std = _comparaciones(X)
    print("\nInicializaciones:", resumen["inicializaciones"])
    print("Escaladores:", resumen["escaladores"])
    print(f"ARI promedio (estabilidad): {resumen['ari_promedio']}")

    # ------------------------------------------------------------
    # 4. Modelo final: StandardScaler + k-means++ (el de mejor silhouette)
    # ------------------------------------------------------------
    modelo = KMeans(n_clusters=NUM_CLUSTERS, init="k-means++",
                    n_init=NUM_INICIALIZACIONES, random_state=SEMILLA)
    etiquetas = modelo.fit_predict(X_std)
    sil_individual = silhouette_samples(X_std, etiquetas)
    sil_total = float(silhouette_score(X_std, etiquetas))
    print(f"\nSilhouette final: {sil_total:.4f}")

    # Centroides en unidades originales para nombrar los segmentos.
    esc = StandardScaler().fit(X)
    centroides = esc.inverse_transform(modelo.cluster_centers_)
    df_centroides = pd.DataFrame(centroides, columns=VARIABLES)
    df_centroides.insert(0, "cluster", range(NUM_CLUSTERS))

    # El "mejor" segmento = mayor cobertura + carrera del centroide.
    puntaje_centroide = df_centroides["cobertura_skills_prom"] + df_centroides["carrera_match"]
    orden = puntaje_centroide.sort_values().index.tolist()  # peor -> mejor
    nombres = {cluster: NOMBRES[i] for i, cluster in enumerate(orden)}
    print("Centroides:")
    print(df_centroides.round(3).to_string(index=False))
    print("Nombre de cada cluster:", nombres)

    # Perfil promedio observado por grupo.
    df_perfil = df[VARIABLES].copy()
    df_perfil["cluster"] = etiquetas
    perfiles = df_perfil.groupby("cluster")[VARIABLES].mean().reset_index()
    perfiles["segmento"] = perfiles["cluster"].map(nombres)

    # ------------------------------------------------------------
    # 5. Atípicos: distancia al centroide por encima del percentil 95
    # ------------------------------------------------------------
    distancias = np.linalg.norm(X_std - modelo.cluster_centers_[etiquetas], axis=1)
    umbral = float(np.percentile(distancias, PERCENTIL_ATIPICOS))

    reporte = df.copy()
    reporte["cluster"] = etiquetas
    reporte["segmento"] = reporte["cluster"].map(nombres)
    reporte["silhouette"] = sil_individual.round(4)
    reporte["distancia_centroide"] = distancias.round(4)
    reporte["posible_atipico"] = reporte["distancia_centroide"] > umbral
    atipicos = reporte[reporte["posible_atipico"]]
    print(f"\nUmbral P{PERCENTIL_ATIPICOS}: {umbral:.4f} | "
          f"candidatos atípicos: {len(atipicos)} "
          f"({len(atipicos) / len(reporte):.1%})")

    # Segmento de los estudiantes REALES (lo que le interesa al sistema).
    reales_seg = reporte[reporte["origen"] == "real"][
        ["id", "nombre", "segmento", "silhouette", "posible_atipico"]
    ]
    print("\nSegmentos de estudiantes reales:")
    print(reales_seg.to_string(index=False))

    # ------------------------------------------------------------
    # 6. Guardar artefactos
    # ------------------------------------------------------------
    CARPETA.mkdir(exist_ok=True)
    reporte.to_csv(CARPETA / "reporte_integral.csv", index=False, encoding="utf-8")
    df_centroides.to_csv(CARPETA / "centroides.csv", index=False, encoding="utf-8")
    perfiles.to_csv(CARPETA / "perfiles.csv", index=False, encoding="utf-8")
    atipicos.to_csv(CARPETA / "atipicos.csv", index=False, encoding="utf-8")
    pd.DataFrame(
        [{**{"tipo": "inicializacion"}, **r} for r in resumen["inicializaciones"]]
        + [{**{"tipo": "escalador"}, **r} for r in resumen["escaladores"]]
    ).to_csv(CARPETA / "comparaciones.csv", index=False, encoding="utf-8")

    (CARPETA / "segmentos.json").write_text(json.dumps({
        "variables": VARIABLES,
        "total_estudiantes": len(reporte),
        "estudiantes_reales": len(reales),
        "silhouette": round(sil_total, 4),
        "ari_promedio": resumen["ari_promedio"],
        "inicializaciones": resumen["inicializaciones"],
        "escaladores": resumen["escaladores"],
        "nombres_segmentos": nombres,
        "segmentos_reales": [
            {**fila, "silhouette": float(fila["silhouette"]),
             "posible_atipico": bool(fila["posible_atipico"])}
            for fila in reales_seg.to_dict("records")
        ],
        "perfiles": perfiles.round(3).to_dict("records"),
        "nota": "Un posible atípico solo está lejos del centro de su grupo; "
                "no significa mal perfil ni error.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nArtefactos -> {CARPETA}")


if __name__ == "__main__":
    asyncio.run(main())
