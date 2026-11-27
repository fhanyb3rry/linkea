"""Práctica 06 en Linkea: Optimización de Hiperparámetros (GridSearchCV vs RandomizedSearchCV).

Optimiza los tres clasificadores sobre las postulaciones estudiante-vacante de Linkea:
  1. Decision Tree (max_depth, min_samples_split, min_samples_leaf, criterion)
  2. Random Forest (n_estimators, max_depth, min_samples_split, min_samples_leaf)
  3. KNN en Pipeline con StandardScaler (n_neighbors, weights, metric: euclidean / manhattan)

Utiliza:
  - División estratificada 80% entrenamiento / 20% prueba intacta
  - StratifiedKFold(n_splits=5, shuffle=True, random_state=semilla)
  - GridSearchCV (búsqueda exhaustiva) y RandomizedSearchCV (n_iter=20 con scipy.stats.randint)
  - Selección del mejor modelo optimizado por F1-score y evaluación final en el 20% de prueba
"""

from datetime import datetime, timezone
import json
import os

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import randint
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from app.ml_vs_reglas.datos import COLUMNAS_ENTRADA, DESCRIPCION_VARIABLES, CaracteristicasPar
from app.ml_vs_reglas.modelo import (
    CARPETA_ML,
    COLOR_CARAMELO,
    COLOR_FONDO,
    COLOR_TEAL,
    COLOR_TINTA,
    COLOR_VINO,
)
from app.ml_vs_reglas.practica05 import generar_datos_p05

CARPETA_P06 = os.path.join(CARPETA_ML, "p06")
RUTA_MEJOR_MODELO_P06 = os.path.join(CARPETA_P06, "mejor_modelo_p06.joblib")
RUTA_MODELOS_GRID_P06 = os.path.join(CARPETA_P06, "modelos_grid_p06.joblib")
RUTA_METRICAS_P06 = os.path.join(CARPETA_P06, "metricas_p06.json")

ARCHIVOS_P06 = {
    "matriz_png": "p06_matriz_confusion.png",
    "comparacion_png": "p06_comparacion_optimizacion.png",
    "grid_csv": "p06_resultados_gridsearch.csv",
    "random_csv": "p06_resultados_randomizedsearch.csv",
    "comparacion_csv": "p06_comparacion_metodos.csv",
}


def _serializar_params(params: dict) -> dict:
    limpio = {}
    for k, v in params.items():
        if isinstance(v, (np.integer,)):
            limpio[k] = int(v)
        elif isinstance(v, (np.floating,)):
            limpio[k] = float(v)
        else:
            limpio[k] = v
    return limpio


def entrenar_practica06(
    df: pd.DataFrame | None = None,
    resumen_datos: dict | None = None,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_P06,
) -> tuple[object, dict]:
    """Ejecuta GridSearchCV y RandomizedSearchCV con StratifiedKFold(cv=5) sobre los 3 clasificadores."""
    os.makedirs(carpeta_salida, exist_ok=True)

    if df is None:
        df = generar_datos_p05(cantidad=500, semilla=semilla)
        resumen_datos = {
            "total_registros": len(df),
            "registros_reales": 0,
            "registros_sinteticos": len(df),
            "fuente": "sintetico",
            "semilla": semilla,
        }

    X = df[COLUMNAS_ENTRADA]
    y = df["aceptado"].astype(int)

    X_entrenamiento, X_prueba, y_entrenamiento, y_prueba = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=semilla,
        stratify=y,
    )

    validacion_cruzada = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=semilla,
    )

    modelo_arbol = DecisionTreeClassifier(random_state=semilla)
    parametros_arbol = {
        "max_depth": [2, 3, 5, 8, 10, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "criterion": ["gini", "entropy"],
    }

    modelo_bosque = RandomForestClassifier(random_state=semilla, n_jobs=-1)
    parametros_bosque = {
        "n_estimators": [50, 100, 200],
        "max_depth": [3, 5, 8, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
    }

    modelo_knn = Pipeline(
        [
            ("escalador", StandardScaler()),
            ("clasificador", KNeighborsClassifier()),
        ]
    )
    parametros_knn = {
        "clasificador__n_neighbors": [3, 5, 7, 9, 11, 15],
        "clasificador__weights": ["uniform", "distance"],
        "clasificador__metric": ["euclidean", "manhattan"],
    }

    modelos = {
        "Decision Tree": (modelo_arbol, parametros_arbol),
        "Random Forest": (modelo_bosque, parametros_bosque),
        "KNN": (modelo_knn, parametros_knn),
    }

    # 1. GridSearchCV
    resultados_grid: list[dict] = []
    mejores_modelos_grid: dict[str, object] = {}

    for nombre, (modelo, parametros) in modelos.items():
        busqueda = GridSearchCV(
            estimator=modelo,
            param_grid=parametros,
            scoring="f1",
            cv=validacion_cruzada,
            n_jobs=-1,
            return_train_score=True,
            verbose=0,
        )
        busqueda.fit(X_entrenamiento, y_entrenamiento)
        mejores_modelos_grid[nombre] = busqueda.best_estimator_
        best_idx = busqueda.best_index_
        train_f1 = float(busqueda.cv_results_["mean_train_score"][best_idx])

        resultados_grid.append(
            {
                "algoritmo": nombre,
                "mejor_f1": round(float(busqueda.best_score_), 4),
                "f1_entrenamiento_cv": round(train_f1, 4),
                "hiperparametros_dict": _serializar_params(busqueda.best_params_),
                "hiperparametros": str(_serializar_params(busqueda.best_params_)),
                "combinaciones": int(len(busqueda.cv_results_["params"])),
            }
        )

    df_grid = pd.DataFrame(resultados_grid)

    # 2. RandomizedSearchCV
    parametros_random = {
        "Decision Tree": {
            "max_depth": randint(2, 15),
            "min_samples_split": randint(2, 15),
            "min_samples_leaf": randint(1, 8),
            "criterion": ["gini", "entropy"],
        },
        "Random Forest": {
            "n_estimators": randint(50, 301),
            "max_depth": [3, 5, 8, 12, None],
            "min_samples_split": randint(2, 12),
            "min_samples_leaf": randint(1, 6),
        },
        "KNN": {
            "clasificador__n_neighbors": [3, 5, 7, 9, 11, 15, 19],
            "clasificador__weights": ["uniform", "distance"],
            "clasificador__metric": ["euclidean", "manhattan"],
        },
    }

    resultados_random: list[dict] = []
    mejores_modelos_random: dict[str, object] = {}

    for nombre, (modelo, _) in modelos.items():
        busqueda_random = RandomizedSearchCV(
            estimator=modelo,
            param_distributions=parametros_random[nombre],
            n_iter=20,
            scoring="f1",
            cv=validacion_cruzada,
            n_jobs=-1,
            random_state=semilla,
            verbose=0,
        )
        busqueda_random.fit(X_entrenamiento, y_entrenamiento)
        mejores_modelos_random[nombre] = busqueda_random.best_estimator_
        resultados_random.append(
            {
                "algoritmo": nombre,
                "mejor_f1": round(float(busqueda_random.best_score_), 4),
                "iteraciones": 20,
                "hiperparametros_dict": _serializar_params(busqueda_random.best_params_),
                "hiperparametros": str(_serializar_params(busqueda_random.best_params_)),
            }
        )

    df_random = pd.DataFrame(resultados_random)

    comparacion = pd.merge(
        df_grid[["algoritmo", "mejor_f1", "combinaciones"]].rename(columns={"mejor_f1": "gridsearch"}),
        df_random[["algoritmo", "mejor_f1", "iteraciones"]].rename(columns={"mejor_f1": "randomizedsearch"}),
        on="algoritmo",
    )

    # 3. Selección del mejor algoritmo optimizado por GridSearchCV
    mejor_indice = int(df_grid["mejor_f1"].idxmax())
    mejor_nombre = str(df_grid.loc[mejor_indice, "algoritmo"])
    mejor_modelo = mejores_modelos_grid[mejor_nombre]

    # 4. Evaluación final sobre el 20% de prueba
    predicciones = mejor_modelo.predict(X_prueba)
    accuracy = float(accuracy_score(y_prueba, predicciones))
    precision = float(precision_score(y_prueba, predicciones, zero_division=0))
    recall = float(recall_score(y_prueba, predicciones, zero_division=0))
    f1 = float(f1_score(y_prueba, predicciones, zero_division=0))

    reporte_dict = classification_report(
        y_prueba,
        predicciones,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
        output_dict=True,
    )
    reporte_texto = classification_report(
        y_prueba,
        predicciones,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
    )
    matriz = confusion_matrix(y_prueba, predicciones, labels=[0, 1])

    # Exportar CSVs
    df_grid[["algoritmo", "mejor_f1", "hiperparametros", "combinaciones"]].to_csv(
        os.path.join(carpeta_salida, ARCHIVOS_P06["grid_csv"]), index=False, encoding="utf-8"
    )
    df_random[["algoritmo", "mejor_f1", "hiperparametros"]].to_csv(
        os.path.join(carpeta_salida, ARCHIVOS_P06["random_csv"]), index=False, encoding="utf-8"
    )
    comparacion[["algoritmo", "gridsearch", "randomizedsearch"]].to_csv(
        os.path.join(carpeta_salida, ARCHIVOS_P06["comparacion_csv"]), index=False, encoding="utf-8"
    )

    _generar_graficas_p06(comparacion, mejor_nombre, matriz, carpeta_salida)

    conteo = y.value_counts().sort_index().to_dict()
    metricas = {
        "practica": "P06",
        "titulo": "Optimización de Hiperparámetros (GridSearchCV vs RandomizedSearchCV)",
        "entrenado_en": datetime.now(timezone.utc).isoformat(),
        "datos": {
            **(
                resumen_datos
                or {
                    "total_registros": len(df),
                    "registros_reales": 0,
                    "registros_sinteticos": len(df),
                    "fuente": "sintetico",
                    "semilla": semilla,
                }
            ),
            "filas": int(len(df)),
            "distribucion_clases": {
                "no_aceptado": int(conteo.get(0, 0)),
                "aceptado": int(conteo.get(1, 0)),
            },
        },
        "variables": DESCRIPCION_VARIABLES,
        "division": {
            "entrenamiento_cv": int(len(X_entrenamiento)),
            "prueba": int(len(X_prueba)),
            "estrategia_cv": "StratifiedKFold(n_splits=5, shuffle=True, random_state=42)",
        },
        "gridsearch": resultados_grid,
        "randomizedsearch": resultados_random,
        "comparacion_metodos": comparacion.to_dict(orient="records"),
        "modelo_seleccionado": {
            "algoritmo": mejor_nombre,
            "metodo": "GridSearchCV",
            "f1_cv": float(df_grid.loc[mejor_indice, "mejor_f1"]),
            "mejores_hiperparametros": resultados_grid[mejor_indice]["hiperparametros_dict"],
        },
        "evaluacion_final": {
            "algoritmo": mejor_nombre,
            "exactitud": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "matriz_confusion": matriz.tolist(),
            "reporte_clasificacion": {
                "no_aceptado": {
                    "precision": round(float(reporte_dict["No aceptado"]["precision"]), 4),
                    "recall": round(float(reporte_dict["No aceptado"]["recall"]), 4),
                    "f1": round(float(reporte_dict["No aceptado"]["f1-score"]), 4),
                    "soporte": int(reporte_dict["No aceptado"]["support"]),
                },
                "aceptado": {
                    "precision": round(float(reporte_dict["Aceptado"]["precision"]), 4),
                    "recall": round(float(reporte_dict["Aceptado"]["recall"]), 4),
                    "f1": round(float(reporte_dict["Aceptado"]["f1-score"]), 4),
                    "soporte": int(reporte_dict["Aceptado"]["support"]),
                },
            },
            "reporte_texto": reporte_texto,
        },
        "archivos": list(ARCHIVOS_P06.keys()),
    }

    joblib.dump(mejor_modelo, RUTA_MEJOR_MODELO_P06)
    joblib.dump(mejores_modelos_grid, RUTA_MODELOS_GRID_P06)
    with open(RUTA_METRICAS_P06, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return mejor_modelo, metricas


def _generar_graficas_p06(
    comparacion: pd.DataFrame,
    mejor_nombre: str,
    matriz: np.ndarray,
    carpeta_salida: str,
) -> None:
    """Genera las dos gráficas PNG de la Práctica 06 en la paleta cálida de Linkea."""
    # 1. Matriz de confusión del campeón optimizado
    fig, ax = plt.subplots(figsize=(5.8, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    cmap_linkea = plt.matplotlib.colors.LinearSegmentedColormap.from_list(
        "linkea_p06", ["#f6e8de", COLOR_CARAMELO, COLOR_VINO]
    )
    disp = ConfusionMatrixDisplay(confusion_matrix=matriz, display_labels=["No aceptado", "Aceptado"])
    disp.plot(ax=ax, cmap=cmap_linkea, values_format="d")
    ax.set_title(f"Matriz de confusión optimizada · {mejor_nombre}", fontsize=12.5, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Predicción del modelo", color=COLOR_TINTA)
    ax.set_ylabel("Resultado real", color=COLOR_TINTA)
    plt.tight_layout()
    plt.savefig(os.path.join(carpeta_salida, ARCHIVOS_P06["matriz_png"]), dpi=200, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)

    # 2. Comparativa GridSearchCV vs RandomizedSearchCV
    fig, ax = plt.subplots(figsize=(8.8, 5.0))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    posiciones = np.arange(len(comparacion))
    ancho = 0.34
    b1 = ax.bar(posiciones - ancho / 2, comparacion["gridsearch"], width=ancho, color=COLOR_VINO, label="GridSearchCV")
    b2 = ax.bar(posiciones + ancho / 2, comparacion["randomizedsearch"], width=ancho, color=COLOR_TEAL, label="RandomizedSearchCV")
    for barras in (b1, b2):
        for b in barras:
            val = b.get_height()
            ax.text(
                b.get_x() + b.get_width() / 2,
                val + 0.015,
                f"{val:.1%}",
                ha="center",
                fontsize=9,
                fontweight="bold",
                color=COLOR_TINTA,
            )
    ax.set_xticks(posiciones, comparacion["algoritmo"])
    ax.set_ylim(0, 1.06)
    ax.set_ylabel("Mejor F1-score (CV=5)", color=COLOR_TINTA)
    ax.set_xlabel("Algoritmo", color=COLOR_TINTA)
    ax.set_title("Comparación de métodos de optimización de hiperparámetros", fontsize=12.5, fontweight="bold", color=COLOR_TINTA)
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P06["comparacion_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)


def cargar_o_entrenar_p06() -> tuple[object, dict]:
    """Carga el campeón optimizado y métricas de P06; si no existen aún, los entrena."""
    if os.path.exists(RUTA_MEJOR_MODELO_P06) and os.path.exists(RUTA_METRICAS_P06):
        modelo = joblib.load(RUTA_MEJOR_MODELO_P06)
        with open(RUTA_METRICAS_P06, encoding="utf-8") as f:
            metricas = json.load(f)
        return modelo, metricas
    return entrenar_practica06(semilla=42)


def predecir_optimizado_p06(c: CaracteristicasPar) -> dict:
    """Evalúa un par con el clasificador campeón tras optimizar hiperparámetros con GridSearchCV."""
    modelo, metricas = cargar_o_entrenar_p06()
    fila = pd.DataFrame([c.model_dump()])[COLUMNAS_ENTRADA]
    pred = int(modelo.predict(fila)[0])
    prob = float(modelo.predict_proba(fila)[0][1])
    return {
        "algoritmo": metricas["modelo_seleccionado"]["algoritmo"],
        "prediccion": pred,
        "etiqueta": "Aceptado" if pred == 1 else "No aceptado",
        "probabilidad_aceptacion": round(prob * 100, 1),
        "hiperparametros": metricas["modelo_seleccionado"]["mejores_hiperparametros"],
    }
