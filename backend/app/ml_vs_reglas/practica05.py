"""Práctica 05 en Linkea: Comparación de Algoritmos de Clasificación y Experimentos.

Compara tres algoritmos sobre las postulaciones estudiante-vacante de Linkea:
  1. Decision Tree (DecisionTreeClassifier)
  2. Random Forest (RandomForestClassifier)
  3. K-Nearest Neighbors (Pipeline: StandardScaler + KNeighborsClassifier)

Flujo metodológico completo:
  - División estratificada 60% entrenamiento / 20% validación / 20% prueba
  - Entrenamiento en el 60% y evaluación comparativa en el 20% de validación
  - Selección del mejor algoritmo usando el mayor F1-score en validación
  - Reentrenamiento (clone) con el 80% (entrenamiento + validación)
  - Evaluación final en el 20% de prueba + Reporte + Matriz de confusión
  - Validación cruzada (StratifiedKFold, cv=5, scoring='f1') sobre el 80%
  - Actividad de modificación:
      * Experimento A: KNN con n_neighbors en [3, 5, 7, 9, 15]
      * Experimento B: Random Forest con n_estimators en [50, 100, 200, 500]
      * Experimento C: Decision Tree con max_depth en [2, 3, 5, 8, None]
  - Gráficas PNG con matplotlib y archivos CSV en uploads/ml/p05/
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
from sklearn.base import clone
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
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from app.ml_vs_reglas.datos import (
    COLUMNAS_ENTRADA,
    DESCRIPCION_VARIABLES,
    CaracteristicasPar,
    estimar_calificacion_base,
    extraer_caracteristicas,
)
from app.ml_vs_reglas.modelo import (
    CARPETA_ML,
    COLOR_CAFE,
    COLOR_CARAMELO,
    COLOR_FONDO,
    COLOR_TEAL,
    COLOR_TINTA,
    COLOR_VINO,
    explicar_reglas,
)
from app.models.company import Vacancy
from app.models.student import Student

CARPETA_P05 = os.path.join(CARPETA_ML, "p05")
RUTA_MODELO_GANADOR_P05 = os.path.join(CARPETA_P05, "modelo_ganador_p05.joblib")
RUTA_TODOS_MODELOS_P05 = os.path.join(CARPETA_P05, "modelos_p05.joblib")
RUTA_METRICAS_P05 = os.path.join(CARPETA_P05, "metricas_p05.json")

ARCHIVOS_P05 = {
    "comparacion_png": "p05_comparacion_algoritmos.png",
    "matriz_png": "p05_matriz_confusion.png",
    "experimentos_png": "p05_experimentos.png",
    "comparacion_csv": "p05_resultados_comparacion.csv",
    "experimentos_csv": "p05_experimentos.csv",
}


def generar_datos_p05(cantidad: int = 500, semilla: int = 42) -> pd.DataFrame:
    """Genera el dataset sintético de la Práctica 05 adaptado a los rangos de Linkea."""
    rng = np.random.default_rng(semilla)

    horas_dedicacion = rng.uniform(0, 15, cantidad)
    compatibilidad_horaria = rng.uniform(40, 100, cantidad)
    cobertura_skills = rng.uniform(10, 100, cantidad)
    participacion_perfil = rng.uniform(0, 10, cantidad)

    puntaje = (
        (horas_dedicacion / 15.0) * 0.30
        + (compatibilidad_horaria / 100.0) * 0.25
        + (cobertura_skills / 100.0) * 0.30
        + (participacion_perfil / 10.0) * 0.15
    )
    ruido = rng.normal(loc=0, scale=0.12, size=cantidad)
    puntaje_final = puntaje + ruido
    aceptado = (puntaje_final >= 0.58).astype(int)

    return pd.DataFrame(
        {
            "horas_dedicacion": horas_dedicacion,
            "compatibilidad_horaria": compatibilidad_horaria,
            "cobertura_skills": cobertura_skills,
            "participacion_perfil": participacion_perfil,
            "calificacion_final": np.clip(np.round(puntaje_final * 100, 1), 0, 100),
            "aceptado": aceptado,
            "origen": "sintetico",
        }
    )


def construir_catalogo_modelos(semilla: int = 42) -> dict:
    """Define los tres clasificadores de la Práctica 05 con sus hiperparámetros base."""
    return {
        "Decision Tree": DecisionTreeClassifier(
            max_depth=5,
            min_samples_leaf=4,
            random_state=semilla,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            n_jobs=1,
            random_state=semilla,
        ),
        "KNN": Pipeline(
            [
                ("escalador", StandardScaler()),
                (
                    "clasificador",
                    KNeighborsClassifier(
                        n_neighbors=7,
                        weights="distance",
                    ),
                ),
            ]
        ),
    }


def _evaluar_metricas(y_real: pd.Series, pred: np.ndarray) -> dict[str, float]:
    return {
        "exactitud": round(float(accuracy_score(y_real, pred)), 4),
        "precision": round(float(precision_score(y_real, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_real, pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_real, pred, zero_division=0)), 4),
    }


def _ejecutar_experimentos(
    X_entrenamiento: pd.DataFrame,
    y_entrenamiento: pd.Series,
    X_validacion: pd.DataFrame,
    y_validacion: pd.Series,
    semilla: int,
) -> dict:
    """Ejecuta los Experimentos A (KNN), B (Random Forest) y C (Decision Tree) de la Práctica 05."""
    exp_a: list[dict] = []
    for k in [3, 5, 7, 9, 15]:
        m = Pipeline(
            [
                ("escalador", StandardScaler()),
                ("clasificador", KNeighborsClassifier(n_neighbors=k, weights="distance")),
            ]
        )
        m.fit(X_entrenamiento, y_entrenamiento)
        met = _evaluar_metricas(y_validacion, m.predict(X_validacion))
        exp_a.append(
            {
                "experimento": "A",
                "algoritmo": "KNN",
                "parametro": "n_neighbors",
                "valor": str(k),
                "entrenamiento": round(float(accuracy_score(y_entrenamiento, m.predict(X_entrenamiento))), 4),
                **met,
            }
        )

    exp_b: list[dict] = []
    for n_est in [50, 100, 200, 500]:
        m = RandomForestClassifier(
            n_estimators=n_est,
            max_depth=None,
            min_samples_leaf=2,
            n_jobs=1,
            random_state=semilla,
        )
        m.fit(X_entrenamiento, y_entrenamiento)
        met = _evaluar_metricas(y_validacion, m.predict(X_validacion))
        exp_b.append(
            {
                "experimento": "B",
                "algoritmo": "Random Forest",
                "parametro": "n_estimators",
                "valor": str(n_est),
                "entrenamiento": round(float(accuracy_score(y_entrenamiento, m.predict(X_entrenamiento))), 4),
                **met,
            }
        )

    exp_c: list[dict] = []
    for depth in [2, 3, 5, 8, None]:
        m = DecisionTreeClassifier(
            max_depth=depth,
            min_samples_leaf=4,
            random_state=semilla,
        )
        m.fit(X_entrenamiento, y_entrenamiento)
        met = _evaluar_metricas(y_validacion, m.predict(X_validacion))
        exp_c.append(
            {
                "experimento": "C",
                "algoritmo": "Decision Tree",
                "parametro": "max_depth",
                "valor": "Sin límite" if depth is None else str(depth),
                "entrenamiento": round(float(accuracy_score(y_entrenamiento, m.predict(X_entrenamiento))), 4),
                **met,
            }
        )

    mejor_a = max(exp_a, key=lambda r: r["f1_score"])
    mejor_b = max(exp_b, key=lambda r: r["f1_score"])
    mejor_c = max(exp_c, key=lambda r: r["f1_score"])

    return {
        "experimento_a": {
            "titulo": "Experimento A · KNN (n_neighbors: 3, 5, 7, 9, 15)",
            "parametro": "n_neighbors",
            "mejor_valor": mejor_a["valor"],
            "mejor_f1": mejor_a["f1_score"],
            "conclusion": (
                f"Con pocos vecinos (k=3) KNN es más sensible al ruido local; el mejor F1 en validación se "
                f"alcanzó en n_neighbors={mejor_a['valor']} ({mejor_a['f1_score']:.2%}), suavizando la frontera de decisión."
            ),
            "resultados": exp_a,
        },
        "experimento_b": {
            "titulo": "Experimento B · Random Forest (n_estimators: 50, 100, 200, 500)",
            "parametro": "n_estimators",
            "mejor_valor": mejor_b["valor"],
            "mejor_f1": mejor_b["f1_score"],
            "conclusion": (
                f"Al aumentar los árboles del bosque el rendimiento se estabiliza sin sobreajustar; "
                f"el mejor F1 se registró con n_estimators={mejor_b['valor']} ({mejor_b['f1_score']:.2%})."
            ),
            "resultados": exp_b,
        },
        "experimento_c": {
            "titulo": "Experimento C · Decision Tree (max_depth: 2, 3, 5, 8, Sin límite)",
            "parametro": "max_depth",
            "mejor_valor": mejor_c["valor"],
            "mejor_f1": mejor_c["f1_score"],
            "conclusion": (
                f"Profundidades muy bajas limitan las reglas y profundidades altas incrementan la brecha "
                f"frente a entrenamiento; el mejor equilibrio en validación fue max_depth={mejor_c['valor']} ({mejor_c['f1_score']:.2%})."
            ),
            "resultados": exp_c,
        },
    }


def entrenar_practica05(
    df: pd.DataFrame | None = None,
    resumen_datos: dict | None = None,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_P05,
) -> tuple[object, dict]:
    """Ejecuta íntegramente la Práctica 05 y los 3 experimentos de modificación."""
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

    # División de la Práctica 05:
    # 1) 80% entrenamiento+validación y 20% prueba
    # 2) Del 80%: 75% entrenamiento (60% total) y 25% validación (20% total)
    X_entrenamiento_validacion, X_prueba, y_entrenamiento_validacion, y_prueba = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=semilla,
        stratify=y,
    )
    X_entrenamiento, X_validacion, y_entrenamiento, y_validacion = train_test_split(
        X_entrenamiento_validacion,
        y_entrenamiento_validacion,
        test_size=0.25,
        random_state=semilla,
        stratify=y_entrenamiento_validacion,
    )

    modelos_base = construir_catalogo_modelos(semilla=semilla)
    descripciones_modelos = {
        "Decision Tree": "Árbol de decisión individual (max_depth=5, min_samples_leaf=4)",
        "Random Forest": "Bosque aleatorio de 200 árboles (min_samples_leaf=2)",
        "KNN": "Pipeline StandardScaler + KNeighborsClassifier (n_neighbors=7, weights='distance')",
    }

    resultados: list[dict] = []
    for nombre, modelo in modelos_base.items():
        modelo.fit(X_entrenamiento, y_entrenamiento)
        pred_val = modelo.predict(X_validacion)
        pred_train = modelo.predict(X_entrenamiento)
        met = _evaluar_metricas(y_validacion, pred_val)
        resultados.append(
            {
                "algoritmo": nombre,
                "descripcion": descripciones_modelos[nombre],
                "exactitud_entrenamiento": round(float(accuracy_score(y_entrenamiento, pred_train)), 4),
                **met,
            }
        )

    df_resultados = (
        pd.DataFrame(resultados)
        .sort_values(by="f1_score", ascending=False)
        .reset_index(drop=True)
    )

    mejor_registro = df_resultados.iloc[0]
    mejor_nombre = str(mejor_registro["algoritmo"])

    # Reentrenar los modelos con el 80% (entrenamiento + validación) dejando intacto el 20% de prueba
    X_entrenamiento_final = pd.concat([X_entrenamiento, X_validacion])
    y_entrenamiento_final = pd.concat([y_entrenamiento, y_validacion])

    modelos_finales: dict[str, object] = {}
    for nombre, base in modelos_base.items():
        copia = clone(base)
        copia.fit(X_entrenamiento_final, y_entrenamiento_final)
        modelos_finales[nombre] = copia

    modelo_final = modelos_finales[mejor_nombre]

    # Evaluación final en el 20% de PRUEBA
    predicciones_finales = modelo_final.predict(X_prueba)
    metricas_prueba = _evaluar_metricas(y_prueba, predicciones_finales)

    reporte_dict = classification_report(
        y_prueba,
        predicciones_finales,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
        output_dict=True,
    )
    reporte_texto = classification_report(
        y_prueba,
        predicciones_finales,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
    )
    matriz = confusion_matrix(y_prueba, predicciones_finales, labels=[0, 1])

    # Validación cruzada (cv=5, scoring='f1') sobre el 80% de entrenamiento+validación
    skf = StratifiedKFold(n_splits=5)
    resultados_cv = cross_val_score(
        clone(modelos_base[mejor_nombre]),
        X_entrenamiento_final,
        y_entrenamiento_final,
        cv=skf,
        scoring="f1",
        n_jobs=1,
    )

    # Ejecutar los 3 experimentos de modificación
    experimentos = _ejecutar_experimentos(
        X_entrenamiento=X_entrenamiento,
        y_entrenamiento=y_entrenamiento,
        X_validacion=X_validacion,
        y_validacion=y_validacion,
        semilla=semilla,
    )

    # Exportar CSVs
    df_csv = df_resultados[["algoritmo", "exactitud", "precision", "recall", "f1_score"]]
    df_csv.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P05["comparacion_csv"]), index=False, encoding="utf-8")

    filas_exp = (
        experimentos["experimento_a"]["resultados"]
        + experimentos["experimento_b"]["resultados"]
        + experimentos["experimento_c"]["resultados"]
    )
    pd.DataFrame(filas_exp).to_csv(
        os.path.join(carpeta_salida, ARCHIVOS_P05["experimentos_csv"]),
        index=False,
        encoding="utf-8",
    )

    _generar_graficas_p05(df_resultados, mejor_nombre, matriz, experimentos, carpeta_salida)

    conteo = y.value_counts().sort_index().to_dict()
    tabla_ordenada = df_resultados.to_dict(orient="records")
    for idx, fila in enumerate(tabla_ordenada):
        fila["posicion"] = idx + 1
        fila["seleccionado"] = idx == 0

    metricas = {
        "practica": "P05",
        "titulo": "Comparación de Algoritmos de Clasificación (Decision Tree, Random Forest y KNN)",
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
            "columnas": int(df.shape[1]),
            "distribucion_clases": {
                "no_aceptado": int(conteo.get(0, 0)),
                "aceptado": int(conteo.get(1, 0)),
            },
            "muestra": df.head(10).to_dict(orient="records"),
        },
        "variables": DESCRIPCION_VARIABLES,
        "division": {
            "entrenamiento": int(len(X_entrenamiento)),
            "validacion": int(len(X_validacion)),
            "entrenamiento_mas_validacion": int(len(X_entrenamiento_final)),
            "prueba": int(len(X_prueba)),
            "porcentajes": {"entrenamiento": 60, "validacion": 20, "prueba": 20},
        },
        "comparacion_validacion": tabla_ordenada,
        "modelo_seleccionado": {
            "algoritmo": mejor_nombre,
            "descripcion": descripciones_modelos[mejor_nombre],
            "criterio": "Mayor F1-score en el conjunto de validación (20%)",
            "f1_validacion": round(float(mejor_registro["f1_score"]), 4),
            "exactitud_validacion": round(float(mejor_registro["exactitud"]), 4),
            "registros_reentrenamiento": int(len(X_entrenamiento_final)),
        },
        "evaluacion_final": {
            "algoritmo": mejor_nombre,
            **metricas_prueba,
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
        "validacion_cruzada": {
            "metodo": "StratifiedKFold (cv=5, scoring='f1' sobre el 80% entrenamiento+validación)",
            "particiones": [round(float(v), 4) for v in resultados_cv],
            "promedio_f1": round(float(resultados_cv.mean()), 4),
            "desviacion_estandar": round(float(resultados_cv.std()), 4),
        },
        "experimentos": experimentos,
        "archivos": list(ARCHIVOS_P05.keys()),
    }

    joblib.dump(modelo_final, RUTA_MODELO_GANADOR_P05)
    joblib.dump(modelos_finales, RUTA_TODOS_MODELOS_P05)
    with open(RUTA_METRICAS_P05, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return modelo_final, metricas


def _generar_graficas_p05(
    df_resultados: pd.DataFrame,
    mejor_nombre: str,
    matriz: np.ndarray,
    experimentos: dict,
    carpeta_salida: str,
) -> None:
    """Genera las gráficas PNG de la Práctica 05 en la paleta cálida de Linkea."""
    metricas = ["exactitud", "precision", "recall", "f1_score"]
    etiquetas_m = ["Exactitud", "Precision", "Recall", "F1 Score"]
    colores_m = [COLOR_VINO, COLOR_CAFE, COLOR_CARAMELO, COLOR_TEAL]

    # Gráfica 1: Barras agrupadas por algoritmo y métrica
    fig, ax = plt.subplots(figsize=(10.5, 5.4))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ancho = 0.20
    posiciones = np.arange(len(df_resultados))

    for i, (metrica, etiqueta, color) in enumerate(zip(metricas, etiquetas_m, colores_m)):
        desplazamiento = (i - 1.5) * ancho
        barras = ax.bar(
            posiciones + desplazamiento,
            df_resultados[metrica],
            width=ancho,
            color=color,
            label=etiqueta,
        )
        for b, val in zip(barras, df_resultados[metrica]):
            ax.text(
                b.get_x() + b.get_width() / 2,
                val + 0.015,
                f"{val:.0%}",
                ha="center",
                fontsize=8.5,
                fontweight="bold",
                color=COLOR_TINTA,
            )

    ax.set_xticks(posiciones, df_resultados["algoritmo"])
    ax.set_ylim(0, 1.08)
    ax.set_ylabel("Resultado en validación", color=COLOR_TINTA)
    ax.set_xlabel("Algoritmo de clasificación", color=COLOR_TINTA)
    ax.set_title(
        "Práctica 05 · Comparación de algoritmos de clasificación",
        fontsize=13,
        fontweight="bold",
        color=COLOR_TINTA,
    )
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P05["comparacion_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)

    # Gráfica 2: Matriz de confusión del modelo ganador con ConfusionMatrixDisplay
    fig, ax = plt.subplots(figsize=(5.8, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    cmap_linkea = plt.matplotlib.colors.LinearSegmentedColormap.from_list(
        "linkea_p05", ["#f6e8de", COLOR_CARAMELO, COLOR_VINO]
    )
    visualizacion = ConfusionMatrixDisplay(
        confusion_matrix=matriz,
        display_labels=["No aceptado", "Aceptado"],
    )
    visualizacion.plot(ax=ax, cmap=cmap_linkea, values_format="d")
    ax.set_title(
        f"Matriz de confusión · {mejor_nombre} (Prueba 20%)",
        fontsize=12.5,
        fontweight="bold",
        color=COLOR_TINTA,
    )
    ax.set_xlabel("Predicción del modelo", color=COLOR_TINTA)
    ax.set_ylabel("Resultado real", color=COLOR_TINTA)
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P05["matriz_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)

    # Gráfica 3: Resumen visual de los Experimentos A, B y C
    fig, axes = plt.subplots(1, 3, figsize=(13.5, 4.4))
    fig.patch.set_facecolor(COLOR_FONDO)
    pares_exp = [
        ("experimento_a", "Exp. A: KNN (n_neighbors)"),
        ("experimento_b", "Exp. B: Random Forest (n_estimators)"),
        ("experimento_c", "Exp. C: Decision Tree (max_depth)"),
    ]
    for ax_i, (clave, titulo) in zip(axes, pares_exp):
        ax_i.set_facecolor(COLOR_FONDO)
        datos_e = experimentos[clave]["resultados"]
        xs = [r["valor"] for r in datos_e]
        f1s = [r["f1_score"] for r in datos_e]
        accs = [r["exactitud"] for r in datos_e]
        pos = np.arange(len(xs))
        ax_i.plot(pos, f1s, marker="o", linewidth=2.3, color=COLOR_VINO, label="F1-score (val)")
        ax_i.plot(pos, accs, marker="s", linewidth=1.9, color=COLOR_TEAL, label="Exactitud (val)")
        ax_i.set_xticks(pos, xs)
        ax_i.set_ylim(0.55, 1.02)
        ax_i.set_title(titulo, fontsize=10.5, fontweight="bold", color=COLOR_TINTA)
        ax_i.grid(True, linestyle="--", alpha=0.35)
        ax_i.spines[["top", "right"]].set_visible(False)
        ax_i.legend(fontsize=8, frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P05["experimentos_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)


def cargar_o_entrenar_p05() -> tuple[dict[str, object], dict]:
    """Carga los 3 modelos entrenados y métricas de P05; si aún no existen, entrena con semilla 42."""
    if os.path.exists(RUTA_TODOS_MODELOS_P05) and os.path.exists(RUTA_METRICAS_P05):
        modelos = joblib.load(RUTA_TODOS_MODELOS_P05)
        with open(RUTA_METRICAS_P05, encoding="utf-8") as f:
            metricas = json.load(f)
        return modelos, metricas
    entrenar_practica05(semilla=42)
    modelos = joblib.load(RUTA_TODOS_MODELOS_P05)
    with open(RUTA_METRICAS_P05, encoding="utf-8") as f:
        metricas = json.load(f)
    return modelos, metricas


def comparar_predicciones_p05(c: CaracteristicasPar) -> dict:
    """Evalúa un candidato con Reglas Fijas + los 3 algoritmos de P05 (Decision Tree, Random Forest, KNN)."""
    modelos, metricas = cargar_o_entrenar_p05()
    fila = pd.DataFrame([c.model_dump()])[COLUMNAS_ENTRADA]
    ganador = metricas["modelo_seleccionado"]["algoritmo"]

    pred_reglas, cumplidas, faltantes = explicar_reglas(c)
    por_f1 = {r["algoritmo"]: r["f1_score"] for r in metricas["comparacion_validacion"]}

    predicciones_modelos = []
    for nombre in ["Decision Tree", "Random Forest", "KNN"]:
        mod = modelos[nombre]
        pred = int(mod.predict(fila)[0])
        prob = float(mod.predict_proba(fila)[0][1])
        predicciones_modelos.append(
            {
                "algoritmo": nombre,
                "prediccion": pred,
                "etiqueta": "Aceptado" if pred == 1 else "No aceptado",
                "probabilidad_aceptacion": round(prob * 100, 1),
                "f1_validacion": round(por_f1.get(nombre, 0.0) * 100, 1),
                "es_ganador": nombre == ganador,
            }
        )

    votos_positivos = sum(p["prediccion"] for p in predicciones_modelos)
    pred_ganador = next(p for p in predicciones_modelos if p["es_ganador"])

    return {
        "caracteristicas": c.model_dump(),
        "calificacion_estimada": estimar_calificacion_base(c),
        "algoritmo_ganador": ganador,
        "consenso": {
            "votos_aceptado": votos_positivos,
            "total_modelos": len(predicciones_modelos),
            "unanimidad": votos_positivos in (0, len(predicciones_modelos)),
        },
        "reglas": {
            "prediccion": pred_reglas,
            "etiqueta": "Aceptado" if pred_reglas == 1 else "No aceptado",
            "cumplidas": cumplidas,
            "faltantes": faltantes,
        },
        "ganador": pred_ganador,
        "modelos": predicciones_modelos,
    }


def comparar_par_p05(student: Student, vacancy: Vacancy) -> dict:
    """Evalúa un par real (Student, Vacancy) de Linkea con los 3 algoritmos de clasificación de P05."""
    c = extraer_caracteristicas(student, vacancy)
    return {
        "student_id": str(student.id),
        "estudiante": student.nombre,
        "vacancy_id": str(vacancy.id),
        "vacante": vacancy.titulo,
        "empresa": vacancy.nombre_empresa,
        **comparar_predicciones_p05(c),
    }
