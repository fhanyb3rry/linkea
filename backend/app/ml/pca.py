"""Reduce el perfil de los estudiantes a 2D/3D con PCA para visualizarlo.

    python -m app.ml.pca

Es la práctica 9 aplicada a Linkea: el perfil de cada estudiante tiene 4
variables (las mismas de segmentar.py) y una gráfica normal no puede
mostrar 4 ejes. PCA las transforma en componentes principales que
concentran la mayor variabilidad posible:

    PC1  dirección donde más varían los perfiles
    PC2  la siguiente dirección con más variación (independiente de PC1)

Sirve para ver si los segmentos de K-Means se separan visualmente y para
exportar coordenadas que el frontend podría dibujar.

Se reutiliza el mismo dataset de segmentar.py (reales + sintéticos) y las
etiquetas de K-Means SOLO para colorear — PCA no las usa para calcular
las componentes.

Deja en app/ml/artefactos/pca/:
    varianza_explicada.csv    cuánta información concentra cada PC
    cargas.csv                cuánto aporta cada variable a cada PC
    coordenadas.csv           PC1..PC4 por estudiante (con su segmento)
    sedimentacion.png         varianza por componente
    varianza_acumulada.png    variabilidad conservada al sumar PCs
    pca_2d.png / pca_3d.png   proyecciones coloreadas por segmento
    pca.json                  resumen para el endpoint /ai/pca
"""

import asyncio
import json

import matplotlib
matplotlib.use("Agg")  # backend sin pantalla: solo guarda PNGs
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler

from app.core.database import close_mongo_connection, connect_to_mongo
from app.ml.generar_dataset import ARTEFACTOS
from app.ml.segmentar import (
    NOMBRES,
    NUM_CLUSTERS,
    NUM_INICIALIZACIONES,
    SEMILLA,
    VARIABLES,
    _estudiantes_reales,
    _estudiantes_sinteticos,
)

CARPETA = ARTEFACTOS / "pca"
VARIANZA_OBJETIVO = 0.85


async def _cargar_matriz() -> pd.DataFrame:
    """Misma matriz que segmentar.py: reales de Mongo + sintéticos."""
    await connect_to_mongo()
    try:
        reales = await _estudiantes_reales()
    finally:
        await close_mongo_connection()
    return pd.concat([reales, _estudiantes_sinteticos(300)], ignore_index=True)


async def main() -> None:
    print("=== PCA SOBRE EL PERFIL DE ESTUDIANTES ===")
    df = await _cargar_matriz()
    X = df[VARIABLES].to_numpy(dtype=float)
    print(f"Estudiantes: {len(df)} | Variables originales: {VARIABLES}")

    # ------------------------------------------------------------
    # 1. Estandarizar: PCA es sensible a la escala (minutos 0-90 vs
    #    cobertura 0-1); sin esto los minutos dominarían todo.
    # ------------------------------------------------------------
    escalador = StandardScaler()
    X_std = escalador.fit_transform(X)

    # Etiquetas de K-Means solo para colorear (como en la práctica).
    etiquetas = KMeans(n_clusters=NUM_CLUSTERS, init="k-means++",
                       n_init=NUM_INICIALIZACIONES,
                       random_state=SEMILLA).fit_predict(X_std)

    # ------------------------------------------------------------
    # 2. Entrenar PCA con las 4 componentes posibles
    # ------------------------------------------------------------
    pca = PCA(n_components=4)
    coords = pca.fit_transform(X_std)
    varianza = pca.explained_variance_ratio_
    acumulada = np.cumsum(varianza)

    df_varianza = pd.DataFrame({
        "componente": ["PC1", "PC2", "PC3", "PC4"],
        "varianza_explicada": varianza.round(4),
        "porcentaje": (varianza * 100).round(2),
        "acumulada": (acumulada * 100).round(2),
    })
    print("\nVarianza explicada:")
    print(df_varianza.to_string(index=False))

    # Cuántas PCs hacen falta para conservar el 85% de la variabilidad.
    n_componentes = int(np.argmax(acumulada >= VARIANZA_OBJETIVO) + 1)
    print(f"\nPara conservar {VARIANZA_OBJETIVO:.0%} de la variabilidad: "
          f"{n_componentes} componentes")

    # Cargas: qué aporta cada variable original a cada componente.
    cargas = pd.DataFrame(pca.components_, columns=VARIABLES,
                          index=["PC1", "PC2", "PC3", "PC4"])
    print("\nCargas (contribución de cada variable):")
    print(cargas.round(3).to_string())

    # Error de reconstrucción usando solo las PCs seleccionadas.
    reconstruidos = (coords[:, :n_componentes]
                     @ pca.components_[:n_componentes, :]) + pca.mean_
    error = float(mean_squared_error(X_std, reconstruidos))
    print(f"Error de reconstrucción con {n_componentes} PCs (MSE): {error:.4f}")

    # ------------------------------------------------------------
    # 3. Gráficas y exportaciones
    # ------------------------------------------------------------
    CARPETA.mkdir(exist_ok=True)
    df_varianza.to_csv(CARPETA / "varianza_explicada.csv", index=False, encoding="utf-8")
    cargas.round(4).to_csv(CARPETA / "cargas.csv", encoding="utf-8")

    plt.figure(figsize=(8, 5))
    plt.plot(df_varianza["componente"], df_varianza["porcentaje"], marker="o")
    plt.title("Varianza explicada por componente (sedimentación)")
    plt.ylabel("Varianza explicada (%)"); plt.grid(alpha=0.3); plt.tight_layout()
    plt.savefig(CARPETA / "sedimentacion.png", dpi=200); plt.close()

    plt.figure(figsize=(8, 5))
    plt.plot(df_varianza["componente"], df_varianza["acumulada"], marker="o")
    plt.axhline(y=VARIANZA_OBJETIVO * 100, linestyle="--", label="Objetivo 85%")
    plt.title("Varianza acumulada"); plt.ylabel("%"); plt.ylim(0, 105)
    plt.legend(); plt.grid(alpha=0.3); plt.tight_layout()
    plt.savefig(CARPETA / "varianza_acumulada.png", dpi=200); plt.close()

    # Orden de clusters por puntaje del centroide -> nombre del segmento.
    km_centros = KMeans(n_clusters=NUM_CLUSTERS, init="k-means++",
                        n_init=NUM_INICIALIZACIONES,
                        random_state=SEMILLA).fit(X_std).cluster_centers_
    puntaje = km_centros[:, 0] + km_centros[:, 1]  # cobertura + carrera
    orden = puntaje.argsort()
    nombres = {int(cluster): NOMBRES[i] for i, cluster in enumerate(orden)}

    es_real = (df["origen"] == "real").to_numpy()
    plt.figure(figsize=(10, 7))
    sc = plt.scatter(coords[:, 0], coords[:, 1], c=etiquetas, cmap="viridis",
                     alpha=0.6, s=40)
    plt.scatter(coords[es_real, 0], coords[es_real, 1], facecolors="none",
                edgecolors="red", s=120, linewidths=1.5,
                label="Estudiantes reales")
    plt.title("Estudiantes proyectados con PCA (color = segmento K-Means)")
    plt.xlabel("PC1"); plt.ylabel("PC2")
    plt.colorbar(sc, label="Cluster"); plt.legend(); plt.grid(alpha=0.2)
    plt.tight_layout(); plt.savefig(CARPETA / "pca_2d.png", dpi=200); plt.close()

    fig = plt.figure(figsize=(10, 7))
    ax = fig.add_subplot(111, projection="3d")
    sc = ax.scatter(coords[:, 0], coords[:, 1], coords[:, 2], c=etiquetas,
                    cmap="viridis", alpha=0.6, s=30)
    ax.set_xlabel("PC1"); ax.set_ylabel("PC2"); ax.set_zlabel("PC3")
    ax.set_title("Proyección PCA en 3D")
    fig.colorbar(sc, ax=ax, shrink=0.7, label="Cluster")
    plt.tight_layout(); plt.savefig(CARPETA / "pca_3d.png", dpi=200); plt.close()

    # Coordenadas exportables (para dashboard o guardarlas en Mongo).
    df_coords = pd.DataFrame({
        "id": df["id"], "nombre": df["nombre"], "origen": df["origen"],
        "segmento": [nombres[int(e)] for e in etiquetas],
        "PC1": coords[:, 0].round(3), "PC2": coords[:, 1].round(3),
        "PC3": coords[:, 2].round(3), "PC4": coords[:, 3].round(3),
    })
    df_coords.to_csv(CARPETA / "coordenadas.csv", index=False, encoding="utf-8")

    (CARPETA / "pca.json").write_text(json.dumps({
        "variables": VARIABLES,
        "varianza": df_varianza.to_dict("records"),
        "componentes_para_85pct": n_componentes,
        "error_reconstruccion": round(error, 4),
        "cargas": cargas.round(4).to_dict(),
        "coordenadas_reales": df_coords[es_real][
            ["id", "nombre", "segmento", "PC1", "PC2", "PC3"]
        ].to_dict("records"),
        "nota": "PC1+PC2 muestran la mayor parte de la variabilidad; si los "
                "segmentos se ven algo mezclados en 2D no significa que "
                "K-Means falló: parte de la separación puede vivir en PC3/PC4.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nArtefactos -> {CARPETA}")


if __name__ == "__main__":
    asyncio.run(main())
