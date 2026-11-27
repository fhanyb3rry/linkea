"""Práctica 09 en Linkea: Reducción de Dimensionalidad mediante PCA (Mapa 2D / 3D).

Transforma las 4 variables estudiantiles en componentes principales (PC1..PC4):
  1. Estandarización obligatoria con StandardScaler antes de PCA
  2. Cálculo de varianza explicada individual y acumulada
  3. Matriz de cargas (loadings) de las 4 variables originales sobre PC1..PC4
  4. Selección automática de componentes para conservar >= 85% de la varianza
  5. Gráficas de sedimentación, varianza acumulada, proyección 2D y proyección 3D coloreadas por segmento
  6. Evaluación del error cuadrático medio de reconstrucción (MSE) y exportación de CSVs
"""

from datetime import datetime, timezone
import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler

from app.segmentacion.datos import (
    CARPETA_ML,
    COLOR_CARAMELO,
    COLOR_FONDO,
    COLOR_TEAL,
    COLOR_TINTA,
    COLOR_VINO,
    COLORES_SEGMENTOS,
    NOMBRES_SEGMENTOS_ORDENADOS,
    VARIABLES,
)
from app.segmentacion.practica07 import RUTA_CSV_SEGMENTADOS_P07, entrenar_practica07

CARPETA_P09 = os.path.join(CARPETA_ML, "p09")
RUTA_METRICAS_P09 = os.path.join(CARPETA_P09, "metricas_p09.json")

ARCHIVOS_P09 = {
    "cargas_png": "p09_cargas_componentes.png",
    "sedimentacion_png": "p09_sedimentacion.png",
    "acumulada_png": "p09_varianza_acumulada.png",
    "pca2d_png": "p09_pca_2d.png",
    "pca3d_png": "p09_pca_3d.png",
    "varianza_csv": "p09_varianza_explicada.csv",
    "cargas_csv": "p09_cargas_componentes.csv",
    "coordenadas_csv": "p09_coordenadas_pca.csv",
    "reconstruidos_csv": "p09_datos_reconstruidos.csv",
}


def entrenar_practica09(
    df_segmentado: pd.DataFrame | None = None,
    varianza_objetivo: float = 0.85,
    num_clusters: int = 3,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_P09,
) -> tuple[dict, pd.DataFrame]:
    """Ejecuta el análisis completo de PCA (Práctica 09) y devuelve métricas + coordenadas 2D/3D."""
    os.makedirs(carpeta_salida, exist_ok=True)

    if df_segmentado is not None:
        df = df_segmentado.copy()
    else:
        if not os.path.exists(RUTA_CSV_SEGMENTADOS_P07):
            entrenar_practica07(semilla=semilla)
        df = pd.read_csv(RUTA_CSV_SEGMENTADOS_P07)

    if "id_estudiante" not in df.columns:
        df.insert(0, "id_estudiante", [f"EST-{i:04d}" for i in range(1, len(df) + 1)])
    if "nombre" not in df.columns:
        df.insert(1, "nombre", df["id_estudiante"])
    if "origen" not in df.columns:
        df["origen"] = "sintetico"

    # Preparación y estandarización (PCA NO recibe etiquetas de cluster)
    X_df = df[VARIABLES].apply(pd.to_numeric, errors="coerce")
    X_df = X_df.fillna(X_df.median())
    X = X_df.to_numpy(dtype=float)

    escalador = StandardScaler()
    X_escalado = escalador.fit_transform(X)

    # Etiquetas de cluster solo para colorear visualizaciones
    if "cluster" in df.columns:
        etiquetas = df["cluster"].to_numpy(dtype=int)
    else:
        km = KMeans(n_clusters=num_clusters, init="k-means++", n_init=20, random_state=semilla)
        etiquetas = km.fit_predict(X_escalado)

    if "perfil" in df.columns:
        perfiles_texto = df["perfil"].astype(str).tolist()
    elif "perfil_academico" in df.columns:
        perfiles_texto = df["perfil_academico"].astype(str).tolist()
    else:
        proms = pd.DataFrame(X, columns=VARIABLES).groupby(etiquetas)["horas_disponibles"].mean()
        orden = proms.sort_values().index.tolist()
        mapa = {int(c): nom for c, nom in zip(orden, NOMBRES_SEGMENTOS_ORDENADOS)}
        perfiles_texto = [mapa.get(int(e), f"Grupo {e}") for e in etiquetas]

    # Entrenamiento de PCA con las 4 componentes
    modelo_pca = PCA(n_components=4)
    datos_pca = modelo_pca.fit_transform(X_escalado)

    varianza = modelo_pca.explained_variance_ratio_
    acumulada = np.cumsum(varianza)

    df_varianza = pd.DataFrame(
        {
            "componente": ["PC1", "PC2", "PC3", "PC4"],
            "varianza_explicada": np.round(varianza, 4),
            "porcentaje_explicado": np.round(varianza * 100, 2),
            "varianza_acumulada": np.round(acumulada, 4),
            "porcentaje_acumulado": np.round(acumulada * 100, 2),
        }
    )
    df_varianza.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P09["varianza_csv"]), index=False)

    cargas_df = pd.DataFrame(
        np.round(modelo_pca.components_, 4),
        columns=VARIABLES,
        index=["PC1", "PC2", "PC3", "PC4"],
    )
    cargas_df.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P09["cargas_csv"]))

    cantidad_comp = int(np.argmax(acumulada >= varianza_objetivo) + 1)
    if acumulada[-1] < varianza_objetivo:
        cantidad_comp = len(acumulada)

    # Reconstrucción y error cuadrático medio (MSE)
    datos_reducidos = datos_pca[:, :cantidad_comp]
    reconstruidos_esc = (datos_reducidos @ modelo_pca.components_[:cantidad_comp, :]) + modelo_pca.mean_
    mse = float(mean_squared_error(X_escalado, reconstruidos_esc))

    # Exportar coordenadas PCA y datos reconstruidos
    df_coordenadas = pd.DataFrame(
        {
            "id_estudiante": df["id_estudiante"],
            "nombre": df["nombre"],
            "origen": df["origen"],
            "cluster": etiquetas,
            "perfil": perfiles_texto,
            "PC1": np.round(datos_pca[:, 0], 4),
            "PC2": np.round(datos_pca[:, 1], 4),
            "PC3": np.round(datos_pca[:, 2], 4),
            "PC4": np.round(datos_pca[:, 3], 4),
        }
    )
    df_coordenadas[["id_estudiante", "cluster", "PC1", "PC2", "PC3", "PC4"]].to_csv(
        os.path.join(carpeta_salida, ARCHIVOS_P09["coordenadas_csv"]), index=False
    )

    reconstruidos_orig = escalador.inverse_transform(reconstruidos_esc)
    df_reconstruido = pd.DataFrame(np.round(reconstruidos_orig, 2), columns=VARIABLES)
    df_reconstruido.insert(0, "id_estudiante", df["id_estudiante"].to_numpy())
    df_reconstruido.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P09["reconstruidos_csv"]), index=False)

    _generar_graficas_p09(
        df_varianza=df_varianza,
        cargas_df=cargas_df,
        datos_pca=datos_pca,
        perfiles_texto=perfiles_texto,
        varianza_objetivo=varianza_objetivo,
        carpeta_salida=carpeta_salida,
    )

    # Puntos 2D para el mapa visual interactivo (priorizando todos los estudiantes reales + muestra histórica)
    reales_pts = df_coordenadas[df_coordenadas["origen"] == "real"]
    sint_pts = df_coordenadas[df_coordenadas["origen"] != "real"].head(max(0, 180 - len(reales_pts)))
    puntos_mapa = pd.concat([reales_pts, sint_pts], ignore_index=True)[
        ["id_estudiante", "nombre", "origen", "cluster", "perfil", "PC1", "PC2"]
    ].to_dict(orient="records")

    cargas_lista = [
        {"componente": idx, **{col: float(cargas_df.loc[idx, col]) for col in VARIABLES}}
        for idx in cargas_df.index
    ]

    metricas = {
        "practica": "P09",
        "titulo": "Reducción de Dimensionalidad mediante PCA (2D y 3D)",
        "entrenado_en": datetime.now(timezone.utc).isoformat(),
        "total_estudiantes": int(len(df)),
        "estandarizacion": {
            "medias": [round(float(v), 4) for v in X_escalado.mean(axis=0)],
            "desviaciones": [round(float(v), 4) for v in X_escalado.std(axis=0)],
        },
        "varianza": df_varianza.to_dict(orient="records"),
        "cargas": cargas_lista,
        "seleccion_componentes": {
            "varianza_objetivo": round(varianza_objetivo * 100, 2),
            "componentes_seleccionadas": cantidad_comp,
            "varianza_conservada": round(float(acumulada[cantidad_comp - 1] * 100), 2),
            "varianza_2d": round(float(acumulada[1] * 100), 2),
            "mse_reconstruccion": round(mse, 6),
        },
        "puntos_mapa_2d": puntos_mapa,
        "archivos": list(ARCHIVOS_P09.keys()),
    }

    with open(RUTA_METRICAS_P09, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return metricas, df_coordenadas


def _generar_graficas_p09(
    df_varianza: pd.DataFrame,
    cargas_df: pd.DataFrame,
    datos_pca: np.ndarray,
    perfiles_texto: list[str],
    varianza_objetivo: float,
    carpeta_salida: str,
) -> None:
    # 1. Cargas de las componentes
    fig, ax = plt.subplots(figsize=(8.8, 4.6))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    cmap_cargas = plt.matplotlib.colors.LinearSegmentedColormap.from_list(
        "cargas_linkea", [COLOR_VINO, "#fff9f0", COLOR_TEAL]
    )
    im = ax.imshow(cargas_df.values, aspect="auto", cmap=cmap_cargas, vmin=-1, vmax=1)
    plt.colorbar(im, ax=ax, label="Carga (loading)")
    ax.set_xticks(range(len(VARIABLES)), VARIABLES, rotation=20, ha="right")
    ax.set_yticks(range(4), cargas_df.index)
    ax.set_title("Contribución de cada variable original a las componentes (Loadings)", fontsize=11.5, fontweight="bold", color=COLOR_TINTA)
    for i in range(4):
        for j in range(len(VARIABLES)):
            ax.text(j, i, f"{cargas_df.values[i, j]:.2f}", ha="center", va="center", fontsize=9, fontweight="bold", color=COLOR_TINTA)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P09["cargas_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 2. Sedimentación
    fig, ax = plt.subplots(figsize=(7.6, 4.5))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ax.plot(df_varianza["componente"], df_varianza["porcentaje_explicado"], marker="o", linewidth=2.3, color=COLOR_VINO)
    ax.set_title("Gráfica de sedimentación PCA", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Componentes principales", color=COLOR_TINTA)
    ax.set_ylabel("Varianza explicada (%)", color=COLOR_TINTA)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P09["sedimentacion_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 3. Varianza acumulada
    fig, ax = plt.subplots(figsize=(7.6, 4.5))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ax.plot(df_varianza["componente"], df_varianza["porcentaje_acumulado"], marker="o", linewidth=2.3, color=COLOR_TEAL)
    ax.axhline(y=varianza_objetivo * 100, linestyle="--", color=COLOR_VINO, label=f"Objetivo ({varianza_objetivo:.0%})")
    ax.set_ylim(0, 105)
    ax.set_title("Varianza acumulada PCA", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Componentes principales", color=COLOR_TINTA)
    ax.set_ylabel("Varianza acumulada (%)", color=COLOR_TINTA)
    ax.legend(frameon=True, facecolor="#fffefb")
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P09["acumulada_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 4. Proyección PCA 2D
    fig, ax = plt.subplots(figsize=(9.0, 5.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    perfiles_arr = np.array(perfiles_texto)
    for nom in pd.unique(perfiles_arr):
        mask = perfiles_arr == nom
        ax.scatter(
            datos_pca[mask, 0],
            datos_pca[mask, 1],
            label=str(nom),
            alpha=0.75,
            s=40,
            color=COLORES_SEGMENTOS.get(str(nom), COLOR_CARAMELO),
        )
    ax.set_title("Mapa bidimensional PCA de perfiles estudiantiles (PC1 vs PC2)", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Componente principal 1 (PC1)", color=COLOR_TINTA)
    ax.set_ylabel("Componente principal 2 (PC2)", color=COLOR_TINTA)
    ax.legend(frameon=True, facecolor="#fffefb")
    ax.grid(True, linestyle="--", alpha=0.25)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P09["pca2d_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 5. Proyección PCA 3D
    fig = plt.figure(figsize=(9.2, 6.2))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax3 = fig.add_subplot(111, projection="3d")
    ax3.set_facecolor(COLOR_FONDO)
    for nom in pd.unique(perfiles_arr):
        mask = perfiles_arr == nom
        ax3.scatter(
            datos_pca[mask, 0],
            datos_pca[mask, 1],
            datos_pca[mask, 2],
            label=str(nom),
            alpha=0.75,
            s=32,
            color=COLORES_SEGMENTOS.get(str(nom), COLOR_CARAMELO),
        )
    ax3.set_title("Proyección tridimensional PCA (PC1, PC2 y PC3)", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax3.set_xlabel("PC1")
    ax3.set_ylabel("PC2")
    ax3.set_zlabel("PC3")
    ax3.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P09["pca3d_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)


def cargar_o_entrenar_p09() -> dict:
    if os.path.exists(RUTA_METRICAS_P09):
        with open(RUTA_METRICAS_P09, encoding="utf-8") as f:
            return json.load(f)
    metricas, _ = entrenar_practica09(semilla=42)
    return metricas
