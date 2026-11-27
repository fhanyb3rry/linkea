"""Práctica 07 en Linkea: Segmentación de Estudiantes mediante K-Means.

Descubre grupos naturales de preparación para estadía sin usar etiquetas previas:
  1. Estandarización de las 4 características con StandardScaler
  2. Método del codo (K=1..8) midiendo Inercia (WCSS)
  3. Coeficiente Silhouette (K=2..8) para medir cohesión y separación
  4. Comparativa entre datos escalados vs datos sin escalar (Actividad 3)
  5. Modelo final (K=3), recuperación de centroides en unidades originales e interpretación humana
"""

from datetime import datetime, timezone
import json
import os

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from app.segmentacion.datos import (
    CARPETA_ML,
    COLOR_CAFE,
    COLOR_FONDO,
    COLOR_TEAL,
    COLOR_TINTA,
    COLOR_VINO,
    COLORES_SEGMENTOS,
    DESCRIPCION_VARIABLES_SEG,
    NOMBRES_SEGMENTOS_ORDENADOS,
    VARIABLES,
    generar_datos_cohorte,
)

CARPETA_P07 = os.path.join(CARPETA_ML, "p07")
RUTA_CSV_SEGMENTADOS_P07 = os.path.join(CARPETA_P07, "p07_estudiantes_segmentados.csv")
RUTA_MODELO_P07 = os.path.join(CARPETA_P07, "modelo_p07.joblib")
RUTA_METRICAS_P07 = os.path.join(CARPETA_P07, "metricas_p07.json")

ARCHIVOS_P07 = {
    "codo_png": "p07_metodo_del_codo.png",
    "silhouette_png": "p07_silhouette.png",
    "segmentacion_png": "p07_segmentacion_estudiantes.png",
    "segmentados_csv": "p07_estudiantes_segmentados.csv",
    "perfiles_csv": "p07_perfiles_academicos.csv",
}


def entrenar_practica07(
    df: pd.DataFrame | None = None,
    resumen_datos: dict | None = None,
    k_final: int = 3,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_P07,
) -> tuple[dict, pd.DataFrame]:
    """Ejecuta el flujo completo de K-Means de la Práctica 07 y guarda gráficas, CSVs y métricas."""
    os.makedirs(carpeta_salida, exist_ok=True)

    if df is None:
        df = generar_datos_cohorte(semilla=semilla)
        resumen_datos = {
            "total_estudiantes": len(df),
            "estudiantes_reales": 0,
            "estudiantes_sinteticos": len(df),
            "fuente": "sintetico",
            "semilla": semilla,
        }
    else:
        df = df.copy()

    X = df[VARIABLES].apply(pd.to_numeric, errors="coerce")
    X = X.fillna(X.median())

    escalador = StandardScaler()
    X_escalado = escalador.fit_transform(X)

    # 1. Método del codo (K = 1..8)
    codo: list[dict] = []
    for k in range(1, 9):
        mod = KMeans(n_clusters=k, random_state=semilla, n_init=20)
        mod.fit(X_escalado)
        codo.append({"k": k, "inercia": round(float(mod.inertia_), 2)})

    # 2. Evaluación Silhouette (K = 2..8)
    silhouettes: list[dict] = []
    for k in range(2, 9):
        mod = KMeans(n_clusters=k, random_state=semilla, n_init=20)
        etiq = mod.fit_predict(X_escalado)
        punt = float(silhouette_score(X_escalado, etiq))
        silhouettes.append({"k": k, "silhouette": round(punt, 4)})

    mejor_k_sil = max(silhouettes, key=lambda r: r["silhouette"])["k"]

    # 3. Modelo final (K = k_final)
    modelo_final = KMeans(n_clusters=k_final, random_state=semilla, n_init=20)
    etiquetas = modelo_final.fit_predict(X_escalado)
    df["cluster"] = etiquetas

    # Actividad 3: Comparación datos escalados vs datos sin escalar
    modelo_sin_escalar = KMeans(n_clusters=k_final, random_state=semilla, n_init=20)
    etiq_sin_escalar = modelo_sin_escalar.fit_predict(X.to_numpy())
    sil_sin_escalar = float(silhouette_score(X.to_numpy(), etiq_sin_escalar))
    sil_final = float(silhouette_score(X_escalado, etiquetas))

    # 4. Perfiles promedio y nombres orientativos ordenados de menor a mayor preparación
    perfiles_df = df.groupby("cluster")[VARIABLES].mean().round(2)
    orden = perfiles_df["horas_disponibles"].sort_values().index.tolist()

    if k_final == 3:
        nombres = NOMBRES_SEGMENTOS_ORDENADOS
    else:
        nombres = [f"Grupo {i + 1}" for i in range(k_final)]

    mapa_nombres = {int(c): nombre for c, nombre in zip(orden, nombres)}
    df["perfil"] = df["cluster"].map(mapa_nombres)

    centroides_orig = escalador.inverse_transform(modelo_final.cluster_centers_)
    centroides_df = pd.DataFrame(centroides_orig, columns=VARIABLES).round(2)
    centroides_df.insert(0, "cluster", list(range(k_final)))
    centroides_df["perfil"] = centroides_df["cluster"].map(mapa_nombres)

    conteos = df["cluster"].value_counts().to_dict()
    resumen_grupos = []
    for c in orden:
        fila_p = perfiles_df.loc[c]
        resumen_grupos.append(
            {
                "cluster": int(c),
                "perfil": mapa_nombres[int(c)],
                "cantidad": int(conteos.get(c, 0)),
                "porcentaje": round(int(conteos.get(c, 0)) / len(df) * 100, 1),
                "promedios": {col: float(fila_p[col]) for col in VARIABLES},
            }
        )

    # Exportar CSVs (incluyendo p07_estudiantes_segmentados.csv que consumen P08 y P09)
    df.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P07["segmentados_csv"]), index=False, encoding="utf-8-sig")
    perfiles_export = perfiles_df.copy()
    perfiles_export["perfil"] = perfiles_export.index.map(mapa_nombres)
    perfiles_export.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P07["perfiles_csv"]), encoding="utf-8-sig")

    _generar_graficas_p07(df, codo, silhouettes, centroides_df, mapa_nombres, carpeta_salida)

    metricas = {
        "practica": "P07",
        "titulo": "Segmentación de Estudiantes mediante K-Means",
        "entrenado_en": datetime.now(timezone.utc).isoformat(),
        "datos": resumen_datos or {"total_estudiantes": len(df), "fuente": "sintetico", "semilla": semilla},
        "variables": DESCRIPCION_VARIABLES_SEG,
        "escalamiento": {
            "medias_escaladas": [round(float(v), 4) for v in X_escalado.mean(axis=0)],
            "desviaciones_escaladas": [round(float(v), 4) for v in X_escalado.std(axis=0)],
            "silhouette_con_escalador": round(sil_final, 4),
            "silhouette_sin_escalador": round(sil_sin_escalar, 4),
            "nota": (
                "Sin StandardScaler las variables de escala 0-100 dominan la distancia euclidiana sobre las variables "
                "de escala 0-12 y 0-30."
            ),
        },
        "metodo_codo": codo,
        "evaluacion_silhouette": silhouettes,
        "mejor_k_silhouette": int(mejor_k_sil),
        "modelo_final": {
            "k": int(k_final),
            "inercia": round(float(modelo_final.inertia_), 2),
            "silhouette": round(sil_final, 4),
            "grupos": resumen_grupos,
            "centroides": centroides_df.to_dict(orient="records"),
        },
        "archivos": list(ARCHIVOS_P07.keys()),
    }

    joblib.dump({"modelo": modelo_final, "escalador": escalador, "mapa_nombres": mapa_nombres}, RUTA_MODELO_P07)
    with open(RUTA_METRICAS_P07, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return metricas, df


def _generar_graficas_p07(
    df: pd.DataFrame,
    codo: list[dict],
    silhouettes: list[dict],
    centroides_df: pd.DataFrame,
    mapa_nombres: dict[int, str],
    carpeta_salida: str,
) -> None:
    # 1. Método del codo
    fig, ax = plt.subplots(figsize=(8.4, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ks = [r["k"] for r in codo]
    ins = [r["inercia"] for r in codo]
    ax.plot(ks, ins, marker="o", linewidth=2.3, color=COLOR_VINO)
    ax.axvline(3, color=COLOR_TEAL, linestyle="--", linewidth=1.7, label="Codo seleccionado (K=3)")
    ax.set_title("Método del codo · Selección de K", fontsize=12.5, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Cantidad de grupos (K)", color=COLOR_TINTA)
    ax.set_ylabel("Inercia (WCSS)", color=COLOR_TINTA)
    ax.set_xticks(ks)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P07["codo_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 2. Silhouette Score
    fig, ax = plt.subplots(figsize=(8.4, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ks_s = [r["k"] for r in silhouettes]
    sils = [r["silhouette"] for r in silhouettes]
    ax.plot(ks_s, sils, marker="s", linewidth=2.3, color=COLOR_TEAL)
    ax.set_title("Evaluación de separación · Silhouette Score", fontsize=12.5, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Cantidad de grupos (K)", color=COLOR_TINTA)
    ax.set_ylabel("Silhouette Score", color=COLOR_TINTA)
    ax.set_xticks(ks_s)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P07["silhouette_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)

    # 3. Dispersión 2D con centroides
    fig, ax = plt.subplots(figsize=(9.2, 5.4))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    paleta_idx = [COLOR_VINO, COLOR_CAFE, COLOR_TEAL]
    for idx, cluster in enumerate(sorted(df["cluster"].unique())):
        sub = df[df["cluster"] == cluster]
        nombre = mapa_nombres[int(cluster)]
        color = COLORES_SEGMENTOS.get(nombre, paleta_idx[idx % len(paleta_idx)])
        ax.scatter(sub["horas_disponibles"], sub["avance_academico"], label=nombre, alpha=0.72, s=36, color=color)

    ax.scatter(
        centroides_df["horas_disponibles"],
        centroides_df["avance_academico"],
        marker="X",
        s=230,
        color="#2a1a15",
        edgecolor="white",
        linewidth=1.5,
        label="Centroides",
    )
    ax.set_title("Segmentación de perfiles estudiantiles en Linkea", fontsize=12.5, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Dedicación semanal (0 a 12)", color=COLOR_TINTA)
    ax.set_ylabel("Avance y constancia (%)", color=COLOR_TINTA)
    ax.grid(True, linestyle="--", alpha=0.3)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P07["segmentacion_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)


def cargar_o_entrenar_p07() -> dict:
    if os.path.exists(RUTA_METRICAS_P07) and os.path.exists(RUTA_CSV_SEGMENTADOS_P07):
        with open(RUTA_METRICAS_P07, encoding="utf-8") as f:
            return json.load(f)
    metricas, _ = entrenar_practica07(semilla=42)
    return metricas
