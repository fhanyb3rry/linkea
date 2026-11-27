"""Práctica 08 en Linkea: Análisis Avanzado, Estabilidad ARI y Detección de Perfiles Atípicos.

Continúa el análisis sobre los segmentos encontrados en la Práctica 07:
  1. Compara inicialización 'k-means++' vs 'random' (Inercia y Silhouette)
  2. Compara escaladores StandardScaler vs MinMaxScaler
  3. Evalúa estabilidad mediante Adjusted Rand Index (ARI) con semillas [10, 20, 30, 40, 50, 42]
  4. Recupera centroides en unidades originales y calcula Silhouette individual
  5. Detecta casos singulares / atípicos que superan el percentil 95 de distancia al centroide
  6. Exporta los 8 archivos CSV y las 5 gráficas PNG en uploads/ml/p08/
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
from sklearn.metrics import adjusted_rand_score, silhouette_samples, silhouette_score
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from app.segmentacion.datos import (
    CARPETA_ML,
    COLOR_CAFE,
    COLOR_CARAMELO,
    COLOR_FONDO,
    COLOR_TEAL,
    COLOR_TINTA,
    COLOR_VINO,
    COLORES_SEGMENTOS,
    NOMBRES_SEGMENTOS_ORDENADOS,
    VARIABLES,
    generar_datos_cohorte,
)
from app.segmentacion.practica07 import RUTA_CSV_SEGMENTADOS_P07

CARPETA_P08 = os.path.join(CARPETA_ML, "p08")
RUTA_METRICAS_P08 = os.path.join(CARPETA_P08, "metricas_p08.json")

ARCHIVOS_P08 = {
    "inicializaciones_png": "p08_inicializaciones.png",
    "escaladores_png": "p08_escaladores.png",
    "estabilidad_png": "p08_matriz_estabilidad.png",
    "distancias_png": "p08_distancias_atipicos.png",
    "segmentacion_png": "p08_segmentacion_final.png",
    "inicializaciones_csv": "p08_inicializaciones.csv",
    "escaladores_csv": "p08_comparacion_escaladores.csv",
    "ari_csv": "p08_estabilidad_ari.csv",
    "centroides_csv": "p08_centroides.csv",
    "perfiles_csv": "p08_perfiles.csv",
    "distancias_csv": "p08_analisis_distancias.csv",
    "atipicos_csv": "p08_posibles_atipicos.csv",
    "reporte_csv": "p08_reporte_integral.csv",
}


def cargar_datos_base_p08(df_externo: pd.DataFrame | None = None, semilla: int = 42) -> pd.DataFrame:
    """Carga los datos desde P07 (eliminando etiquetas previas) o genera datos equivalentes."""
    if df_externo is not None:
        df = df_externo.copy()
    elif os.path.exists(RUTA_CSV_SEGMENTADOS_P07):
        df = pd.read_csv(RUTA_CSV_SEGMENTADOS_P07)
    else:
        df = generar_datos_cohorte(semilla=semilla)

    df = df.drop(columns=["cluster", "perfil", "perfil_academico"], errors="ignore")
    if "id_estudiante" not in df.columns:
        df.insert(0, "id_estudiante", [f"EST-{i:04d}" for i in range(1, len(df) + 1)])
    if "nombre" not in df.columns:
        df.insert(1, "nombre", df["id_estudiante"])
    if "origen" not in df.columns:
        df["origen"] = "sintetico"
    return df


def _explicar_singularidad(fila: pd.Series, centroide: pd.Series) -> str:
    """Explica en español claro por qué un estudiante destaca respecto al promedio de su propio grupo."""
    etiquetas_amigables = {
        "horas_disponibles": "sus horas disponibles por semana",
        "avance_academico": "su avance de semestre y días disponibles",
        "evidencias_portafolio": "la cantidad de proyectos y CV en su perfil",
        "dominio_habilidades": "su amplitud de habilidades e idiomas",
    }
    rangos = {"horas_disponibles": 12.0, "avance_academico": 100.0, "evidencias_portafolio": 30.0, "dominio_habilidades": 100.0}

    mayor_col = max(VARIABLES, key=lambda col: abs(float(fila[col]) - float(centroide[col])) / rangos[col])
    dif = float(fila[mayor_col]) - float(centroide[mayor_col])
    sentido = "está muy por encima" if dif > 0 else "está muy por debajo"
    return f"Respecto a compañeros de su misma etapa, {etiquetas_amigables[mayor_col]} {sentido} del promedio del grupo."


def entrenar_practica08(
    df_externo: pd.DataFrame | None = None,
    resumen_datos: dict | None = None,
    num_clusters: int = 3,
    num_inicializaciones: int = 20,
    percentil_atipicos: float = 95.0,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_P08,
) -> tuple[dict, pd.DataFrame]:
    """Ejecuta el análisis avanzado de estabilidad y detección de atípicos de la Práctica 08."""
    os.makedirs(carpeta_salida, exist_ok=True)

    df = cargar_datos_base_p08(df_externo=df_externo, semilla=semilla)
    for col in VARIABLES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    faltantes = {col: int(df[col].isnull().sum()) for col in VARIABLES}
    df[VARIABLES] = df[VARIABLES].fillna(df[VARIABLES].median())
    X = df[VARIABLES].to_numpy(dtype=float)

    # 1. Comparación de inicializaciones (k-means++ vs random)
    escalador_std = StandardScaler()
    X_std = escalador_std.fit_transform(X)
    res_init: list[dict] = []
    for init_metodo in ["k-means++", "random"]:
        mod = KMeans(
            n_clusters=num_clusters,
            init=init_metodo,
            n_init=num_inicializaciones,
            random_state=semilla,
        )
        etiq = mod.fit_predict(X_std)
        sil = float(silhouette_score(X_std, etiq))
        res_init.append(
            {
                "inicializacion": init_metodo,
                "inercia": round(float(mod.inertia_), 4),
                "silhouette": round(sil, 4),
            }
        )
    pd.DataFrame(res_init).to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["inicializaciones_csv"]), index=False)

    # 2. Comparación de escaladores (StandardScaler vs MinMaxScaler)
    res_scalers: list[dict] = []
    etiq_por_scaler: dict[str, np.ndarray] = {}
    for nombre_sc, sc_obj in [("StandardScaler", StandardScaler()), ("MinMaxScaler", MinMaxScaler())]:
        X_tr = sc_obj.fit_transform(X)
        mod = KMeans(
            n_clusters=num_clusters,
            init="k-means++",
            n_init=num_inicializaciones,
            random_state=semilla,
        )
        etiq = mod.fit_predict(X_tr)
        etiq_por_scaler[nombre_sc] = etiq
        res_scalers.append(
            {
                "escalador": nombre_sc,
                "inercia": round(float(mod.inertia_), 4),
                "silhouette": round(float(silhouette_score(X_tr, etiq)), 4),
            }
        )
    ari_entre_escaladores = float(adjusted_rand_score(etiq_por_scaler["StandardScaler"], etiq_por_scaler["MinMaxScaler"]))
    pd.DataFrame(res_scalers).to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["escaladores_csv"]), index=False)

    # 3. Análisis de estabilidad mediante Adjusted Rand Index (ARI)
    semillas = [10, 20, 30, 40, 50, 42]
    particiones: dict[int, np.ndarray] = {}
    for s in semillas:
        mod = KMeans(n_clusters=num_clusters, init="k-means++", n_init=num_inicializaciones, random_state=s)
        particiones[s] = mod.fit_predict(X_std)

    res_ari: list[dict] = []
    matriz_ari = np.eye(len(semillas))
    for i in range(len(semillas)):
        for j in range(i + 1, len(semillas)):
            sa, sb = semillas[i], semillas[j]
            val_ari = float(adjusted_rand_score(particiones[sa], particiones[sb]))
            res_ari.append({"semilla_a": sa, "semilla_b": sb, "ARI": round(val_ari, 4)})
            matriz_ari[i, j] = val_ari
            matriz_ari[j, i] = val_ari

    df_ari = pd.DataFrame(res_ari)
    df_ari.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["ari_csv"]), index=False)
    ari_promedio = float(df_ari["ARI"].mean())

    # 4. Modelo final, centroides originales y perfiles promedio
    modelo_final = KMeans(
        n_clusters=num_clusters,
        init="k-means++",
        n_init=num_inicializaciones,
        random_state=semilla,
    )
    etiquetas = modelo_final.fit_predict(X_std)
    sil_ind = silhouette_samples(X_std, etiquetas)
    sil_global = float(silhouette_score(X_std, etiquetas))

    centroides_orig = escalador_std.inverse_transform(modelo_final.cluster_centers_)
    df_centroides = pd.DataFrame(centroides_orig, columns=VARIABLES)
    df_centroides.insert(0, "cluster", list(range(num_clusters)))

    orden = df_centroides.sort_values("horas_disponibles")["cluster"].tolist()
    nombres_lista = NOMBRES_SEGMENTOS_ORDENADOS if num_clusters == 3 else [f"Grupo {i + 1}" for i in range(num_clusters)]
    mapa_nombres = {int(c): nom for c, nom in zip(orden, nombres_lista)}
    df_centroides["perfil_academico"] = df_centroides["cluster"].map(mapa_nombres)
    df_centroides.round(2).to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["centroides_csv"]), index=False)

    df_perfiles = df[VARIABLES].copy()
    df_perfiles["cluster"] = etiquetas
    perfiles = df_perfiles.groupby("cluster")[VARIABLES].mean().reset_index()
    perfiles["perfil_academico"] = perfiles["cluster"].map(mapa_nombres)
    perfiles.round(2).to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["perfiles_csv"]), index=False)

    # 5. Detección de posibles casos atípicos (Percentil 95 de distancia al centroide)
    centroides_asignados = modelo_final.cluster_centers_[etiquetas]
    distancias = np.linalg.norm(X_std - centroides_asignados, axis=1)
    umbral = float(np.percentile(distancias, percentil_atipicos))

    reporte = df.copy()
    reporte["cluster"] = etiquetas
    reporte["perfil_academico"] = reporte["cluster"].map(mapa_nombres)
    reporte["distancia_centroide"] = np.round(distancias, 4)
    reporte["silhouette_individual"] = np.round(sil_ind, 4)
    reporte["posible_atipico"] = distancias > umbral

    centroides_por_cluster = df_centroides.set_index("cluster")
    motivos = [
        _explicar_singularidad(fila, centroides_por_cluster.loc[int(fila["cluster"])])
        for _, fila in reporte.iterrows()
    ]
    reporte["motivo_singularidad"] = motivos

    candidatos = reporte[reporte["posible_atipico"]].sort_values("distancia_centroide", ascending=False).copy()

    reporte.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["distancias_csv"]), index=False)
    candidatos.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["atipicos_csv"]), index=False)
    reporte.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P08["reporte_csv"]), index=False)

    _generar_graficas_p08(
        df=reporte,
        res_init=res_init,
        res_scalers=res_scalers,
        semillas=semillas,
        matriz_ari=matriz_ari,
        distancias=distancias,
        umbral=umbral,
        percentil=percentil_atipicos,
        carpeta_salida=carpeta_salida,
    )

    reales_atipicos = candidatos[candidatos["origen"] == "real"].head(12).to_dict(orient="records")
    muestra_atipicos = (
        reales_atipicos
        if len(reales_atipicos) >= 4
        else candidatos.head(12).to_dict(orient="records")
    )

    metricas = {
        "practica": "P08",
        "titulo": "Optimización de Segmentos, Estabilidad ARI y Casos Atípicos",
        "entrenado_en": datetime.now(timezone.utc).isoformat(),
        "datos": {
            **(resumen_datos or {"total_estudiantes": len(df), "fuente": "sintetico", "semilla": semilla}),
            "valores_faltantes": faltantes,
        },
        "configuracion": {
            "num_clusters": num_clusters,
            "num_inicializaciones": num_inicializaciones,
            "percentil_atipicos": percentil_atipicos,
        },
        "inicializaciones": res_init,
        "escaladores": {
            "comparacion": res_scalers,
            "ari_coincidencia_entre_escaladores": round(ari_entre_escaladores, 4),
        },
        "estabilidad_ari": {
            "semillas": semillas,
            "promedio_ari": round(ari_promedio, 4),
            "matriz": np.round(matriz_ari, 4).tolist(),
            "comparaciones": res_ari,
        },
        "centroides": df_centroides.round(2).to_dict(orient="records"),
        "perfiles_promedio": perfiles.round(2).to_dict(orient="records"),
        "atipicos": {
            "percentil": percentil_atipicos,
            "umbral_distancia": round(umbral, 4),
            "total_candidatos": int(len(candidatos)),
            "porcentaje": round(len(candidatos) / len(reporte) * 100, 2),
            "candidatos": muestra_atipicos,
        },
        "silhouette_final": round(sil_global, 4),
        "archivos": list(ARCHIVOS_P08.keys()),
    }

    with open(RUTA_METRICAS_P08, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return metricas, reporte


def _generar_graficas_p08(
    df: pd.DataFrame,
    res_init: list[dict],
    res_scalers: list[dict],
    semillas: list[int],
    matriz_ari: np.ndarray,
    distancias: np.ndarray,
    umbral: float,
    percentil: float,
    carpeta_salida: str,
) -> None:
    # 1. Inicializaciones
    fig, ax = plt.subplots(figsize=(7.2, 4.5))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    barras = ax.bar(
        [r["inicializacion"] for r in res_init],
        [r["silhouette"] for r in res_init],
        color=[COLOR_VINO, COLOR_CAFE],
        width=0.48,
    )
    for b in barras:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.012, f"{b.get_height():.4f}", ha="center", fontweight="bold", color=COLOR_TINTA)
    ax.set_ylim(0, max(0.75, max(r["silhouette"] for r in res_init) + 0.12))
    ax.set_title("Comparación de inicializaciones K-Means", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_ylabel("Silhouette Score", color=COLOR_TINTA)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P08["inicializaciones_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 2. Escaladores
    fig, ax = plt.subplots(figsize=(7.2, 4.5))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    barras = ax.bar(
        [r["escalador"] for r in res_scalers],
        [r["silhouette"] for r in res_scalers],
        color=[COLOR_TEAL, COLOR_CARAMELO],
        width=0.48,
    )
    for b in barras:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.012, f"{b.get_height():.4f}", ha="center", fontweight="bold", color=COLOR_TINTA)
    ax.set_ylim(0, max(0.75, max(r["silhouette"] for r in res_scalers) + 0.12))
    ax.set_title("Comparación de escaladores (StandardScaler vs MinMaxScaler)", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_ylabel("Silhouette Score", color=COLOR_TINTA)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P08["escaladores_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 3. Matriz de estabilidad ARI
    fig, ax = plt.subplots(figsize=(6.8, 5.4))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    cmap_ari = plt.matplotlib.colors.LinearSegmentedColormap.from_list("ari_linkea", ["#f6e8de", COLOR_CARAMELO, COLOR_TEAL])
    im = ax.imshow(matriz_ari, vmin=0, vmax=1, cmap=cmap_ari)
    plt.colorbar(im, ax=ax, label="Adjusted Rand Index")
    ax.set_xticks(range(len(semillas)), semillas)
    ax.set_yticks(range(len(semillas)), semillas)
    ax.set_title("Estabilidad de K-Means mediante ARI", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Semilla", color=COLOR_TINTA)
    ax.set_ylabel("Semilla", color=COLOR_TINTA)
    for i in range(len(semillas)):
        for j in range(len(semillas)):
            ax.text(j, i, f"{matriz_ari[i, j]:.2f}", ha="center", va="center", fontsize=9, fontweight="bold", color=COLOR_TINTA)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P08["estabilidad_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 4. Distancias y umbral de atípicos
    fig, ax = plt.subplots(figsize=(9.4, 4.6))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    es_atip = distancias > umbral
    ax.scatter(np.where(~es_atip)[0], distancias[~es_atip], s=22, alpha=0.65, color=COLOR_TEAL, label="Dentro del rango habitual")
    ax.scatter(np.where(es_atip)[0], distancias[es_atip], s=38, alpha=0.9, color=COLOR_VINO, label=f"Singular (> P{percentil:g})")
    ax.axhline(y=umbral, linestyle="--", linewidth=1.8, color=COLOR_VINO, label=f"Umbral P{percentil:g} ({umbral:.2f})")
    ax.set_title("Distancia de cada estudiante al centroide de su segmento", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Índice de estudiante", color=COLOR_TINTA)
    ax.set_ylabel("Distancia euclidiana estandarizada", color=COLOR_TINTA)
    ax.legend(frameon=True, facecolor="#fffefb")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P08["distancias_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 5. Segmentación final
    fig, ax = plt.subplots(figsize=(9.0, 5.2))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    for perfil_nom, sub in df.groupby("perfil_academico"):
        ax.scatter(
            sub["horas_disponibles"],
            sub["avance_academico"],
            label=perfil_nom,
            alpha=0.72,
            s=36,
            color=COLORES_SEGMENTOS.get(str(perfil_nom), COLOR_CAFE),
        )
    ax.set_title("Segmentación optimizada de perfiles en Linkea", fontsize=12, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Dedicación semanal (0 a 12)", color=COLOR_TINTA)
    ax.set_ylabel("Avance y constancia (%)", color=COLOR_TINTA)
    ax.legend(frameon=True, facecolor="#fffefb")
    ax.grid(True, linestyle="--", alpha=0.3)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P08["segmentacion_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)


def cargar_o_entrenar_p08() -> dict:
    if os.path.exists(RUTA_METRICAS_P08):
        with open(RUTA_METRICAS_P08, encoding="utf-8") as f:
            return json.load(f)
    metricas, _ = entrenar_practica08(semilla=42)
    return metricas
