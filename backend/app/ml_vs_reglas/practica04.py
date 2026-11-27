"""Práctica 04 en Linkea: Entrenamiento, Validación y Prueba (Diagnóstico de Ajuste).

Adapta el flujo completo de la Práctica 04 al dominio de Linkea (postulaciones estudiante-vacante):
  1. División estratificada 60% entrenamiento / 20% validación / 20% prueba
  2. Entrenamiento de DecisionTreeClassifier con profundidades [1, 2, 3, 5, 10, None (Sin límite)]
  3. Diagnóstico automático de subajuste (underfitting), buen ajuste y sobreajuste (overfitting)
  4. Selección del mejor modelo usando exclusivamente el conjunto de validación
  5. Evaluación final en el conjunto de prueba (Accuracy, Precision, Recall, F1, Reporte y Matriz)
  6. Validación cruzada estratificada (StratifiedKFold, cv=5) sobre el conjunto de entrenamiento
  7. Generación de gráficas PNG con matplotlib y exportación de CSVs en uploads/ml/p04/
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
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
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
)
from app.models.company import Vacancy
from app.models.student import Student

CARPETA_P04 = os.path.join(CARPETA_ML, "p04")
RUTA_MODELO_P04 = os.path.join(CARPETA_P04, "modelo_p04.joblib")
RUTA_METRICAS_P04 = os.path.join(CARPETA_P04, "metricas_p04.json")

PROFUNDIDADES_P04: list[int | None] = [1, 2, 3, 5, 10, None]

ARCHIVOS_P04 = {
    "comparacion_png": "p04_comparacion_modelos.png",
    "matriz_png": "p04_matriz_confusion.png",
    "comparacion_csv": "p04_comparacion_modelos.csv",
    "predicciones_csv": "p04_predicciones_prueba.csv",
}


def generar_datos_p04(cantidad: int = 500, semilla: int = 42) -> pd.DataFrame:
    """Genera 500 postulaciones sintéticas continuas con ruido realista para observar subajuste y sobreajuste."""
    np.random.seed(semilla)

    horas_dedicacion = np.random.uniform(0, 15, cantidad)
    compatibilidad_horaria = np.random.uniform(30, 100, cantidad)
    cobertura_skills = np.random.uniform(10, 100, cantidad)
    participacion_perfil = np.random.uniform(0, 10, cantidad)

    ruido = np.random.normal(0, 7, cantidad)
    puntuacion = (
        horas_dedicacion * 2.5
        + compatibilidad_horaria * 0.25
        + cobertura_skills * 0.15
        + participacion_perfil * 1.5
        + ruido
    )
    aceptado = (puntuacion >= 55).astype(int)

    return pd.DataFrame(
        {
            "horas_dedicacion": horas_dedicacion,
            "compatibilidad_horaria": compatibilidad_horaria,
            "cobertura_skills": cobertura_skills,
            "participacion_perfil": participacion_perfil,
            "calificacion_final": np.clip(np.round(puntuacion, 1), 0, 100),
            "aceptado": aceptado,
            "origen": "sintetico",
        }
    )


def _diagnosticar_ajuste(
    profundidad: int | None,
    entrenamiento: float,
    validacion: float,
    mejor_validacion: float,
) -> tuple[str, str, str]:
    """Clasifica el comportamiento del modelo según su exactitud y brecha entrenamiento-validación."""
    diferencia = entrenamiento - validacion

    if entrenamiento < 0.70 and validacion < 0.70:
        return (
            "subajuste",
            "Posible subajuste",
            "Exactitud menor a 70% en entrenamiento y validación: modelo demasiado simple.",
        )
    if diferencia > 0.10:
        return (
            "sobreajuste",
            "Posible sobreajuste",
            "La brecha supera 10 puntos: memoriza detalles y ruido del entrenamiento y pierde generalización.",
        )
    if abs(validacion - mejor_validacion) < 1e-9:
        return (
            "optimo",
            "Mejor resultado (buen ajuste)",
            "Obtiene la mayor exactitud en validación sin presentar una brecha grande frente a entrenamiento.",
        )
    if profundidad in (1, 2) and (mejor_validacion - validacion) >= 0.03:
        return (
            "limitado",
            "Ajuste limitado",
            "No hay brecha grande, pero el árbol tiene muy pocas divisiones y aún puede aprender más patrones.",
        )
    return (
        "buen_ajuste",
        "Buen comportamiento",
        "No se observa una brecha grande entre entrenamiento y validación.",
    )


def entrenar_practica04(
    df: pd.DataFrame | None = None,
    resumen_datos: dict | None = None,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_P04,
) -> tuple[DecisionTreeClassifier, dict]:
    """Ejecuta íntegramente la Práctica 04 y guarda gráficas PNG, archivos CSV, modelo y JSON."""
    os.makedirs(carpeta_salida, exist_ok=True)

    if df is None:
        df = generar_datos_p04(cantidad=500, semilla=semilla)
        resumen_datos = {
            "total_registros": len(df),
            "registros_reales": 0,
            "registros_sinteticos": len(df),
            "fuente": "sintetico",
            "semilla": semilla,
        }

    X = df[COLUMNAS_ENTRADA]
    y = df["aceptado"].astype(int)

    # División 60% entrenamiento / 20% validación / 20% prueba estratificada
    X_entrenamiento, X_temporal, y_entrenamiento, y_temporal = train_test_split(
        X,
        y,
        test_size=0.40,
        random_state=semilla,
        stratify=y,
    )
    X_validacion, X_prueba, y_validacion, y_prueba = train_test_split(
        X_temporal,
        y_temporal,
        test_size=0.50,
        random_state=semilla,
        stratify=y_temporal,
    )

    resultados_crudos: list[dict] = []
    modelos: dict[int | None, DecisionTreeClassifier] = {}

    for profundidad in PROFUNDIDADES_P04:
        modelo = DecisionTreeClassifier(max_depth=profundidad, random_state=semilla)
        modelo.fit(X_entrenamiento, y_entrenamiento)

        pred_entrenamiento = modelo.predict(X_entrenamiento)
        pred_validacion = modelo.predict(X_validacion)

        exactitud_entrenamiento = float(accuracy_score(y_entrenamiento, pred_entrenamiento))
        exactitud_validacion = float(accuracy_score(y_validacion, pred_validacion))

        modelos[profundidad] = modelo
        resultados_crudos.append(
            {
                "profundidad_valor": profundidad,
                "profundidad": "Sin límite" if profundidad is None else str(profundidad),
                "profundidad_grafica": 12 if profundidad is None else profundidad,
                "entrenamiento": round(exactitud_entrenamiento, 4),
                "validacion": round(exactitud_validacion, 4),
                "diferencia": round(exactitud_entrenamiento - exactitud_validacion, 4),
                "hojas": int(modelo.get_n_leaves()),
                "profundidad_real": int(modelo.get_depth()),
            }
        )

    mejor_val = max(r["validacion"] for r in resultados_crudos)
    indice_mejor = next(i for i, r in enumerate(resultados_crudos) if r["validacion"] == mejor_val)

    for idx, r in enumerate(resultados_crudos):
        codigo, etiqueta, explicacion = _diagnosticar_ajuste(
            r["profundidad_valor"],
            r["entrenamiento"],
            r["validacion"],
            mejor_val if idx == indice_mejor else mejor_val + 1.0 if r["validacion"] == mejor_val else mejor_val,
        )
        r["estado_ajuste"] = codigo
        r["diagnostico"] = etiqueta
        r["explicacion"] = explicacion
        r["seleccionado"] = idx == indice_mejor

    mejor_registro = resultados_crudos[indice_mejor]
    profundidad_seleccionada: int | None = mejor_registro["profundidad_valor"]
    mejor_modelo = modelos[profundidad_seleccionada]

    # Evaluación final con el conjunto de PRUEBA (20% nunca antes visto)
    pred_prueba = mejor_modelo.predict(X_prueba)
    exactitud = float(accuracy_score(y_prueba, pred_prueba))
    precision = float(precision_score(y_prueba, pred_prueba, zero_division=0))
    recall = float(recall_score(y_prueba, pred_prueba, zero_division=0))
    f1 = float(f1_score(y_prueba, pred_prueba, zero_division=0))

    reporte_dict = classification_report(
        y_prueba,
        pred_prueba,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
        output_dict=True,
    )
    reporte_texto = classification_report(
        y_prueba,
        pred_prueba,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
    )
    matriz = confusion_matrix(y_prueba, pred_prueba, labels=[0, 1])
    vn, fp, fn, vp = (
        int(matriz[0, 0]),
        int(matriz[0, 1]),
        int(matriz[1, 0]),
        int(matriz[1, 1]),
    )

    # Validación cruzada estratificada (StratifiedKFold) aplicada SOLO a entrenamiento (60%)
    skf = StratifiedKFold(n_splits=5)
    modelo_cv = DecisionTreeClassifier(max_depth=profundidad_seleccionada, random_state=semilla)
    puntuaciones_cv = cross_val_score(
        modelo_cv,
        X_entrenamiento,
        y_entrenamiento,
        cv=skf,
        scoring="accuracy",
    )

    # Exportar CSVs de la Práctica 04
    df_resultados = pd.DataFrame(
        [
            {
                "profundidad": r["profundidad"],
                "profundidad_grafica": r["profundidad_grafica"],
                "entrenamiento": r["entrenamiento"],
                "validacion": r["validacion"],
                "diferencia": r["diferencia"],
                "diagnostico": r["diagnostico"],
            }
            for r in resultados_crudos
        ]
    )
    df_resultados.to_csv(os.path.join(carpeta_salida, ARCHIVOS_P04["comparacion_csv"]), index=False, encoding="utf-8")

    df_predicciones = X_prueba.copy()
    df_predicciones["resultado_real"] = y_prueba.values
    df_predicciones["prediccion"] = pred_prueba
    df_predicciones.to_csv(
        os.path.join(carpeta_salida, ARCHIVOS_P04["predicciones_csv"]),
        index=False,
        encoding="utf-8",
    )

    _generar_graficas_p04(df_resultados, mejor_registro["profundidad_grafica"], matriz, carpeta_salida)

    conteo = y.value_counts().sort_index().to_dict()
    total_reales_positivos = vp + fn

    metricas = {
        "practica": "P04",
        "titulo": "Entrenamiento, Validación y Prueba (Subajuste vs. Sobreajuste)",
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
            "prueba": int(len(X_prueba)),
            "porcentajes": {"entrenamiento": 60, "validacion": 20, "prueba": 20},
        },
        "comparacion_modelos": resultados_crudos,
        "modelo_seleccionado": {
            "profundidad": mejor_registro["profundidad"],
            "max_depth_param": profundidad_seleccionada,
            "profundidad_real": mejor_registro["profundidad_real"],
            "hojas": mejor_registro["hojas"],
            "exactitud_entrenamiento": mejor_registro["entrenamiento"],
            "exactitud_validacion": mejor_registro["validacion"],
            "diferencia": mejor_registro["diferencia"],
        },
        "evaluacion_final": {
            "exactitud": round(exactitud, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "matriz_confusion": matriz.tolist(),
            "desglose_matriz": {
                "verdaderos_negativos": vn,
                "falsos_positivos": fp,
                "falsos_negativos": fn,
                "verdaderos_positivos": vp,
                "interpretacion": (
                    f"De {total_reales_positivos} postulaciones realmente aceptadas en prueba, el modelo detectó "
                    f"correctamente {vp} (recall {recall:.1%}) y omitió {fn}, logrando una precisión de {precision:.1%}."
                ),
            },
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
            "metodo": "StratifiedKFold (n_splits=5 sobre entrenamiento 60%)",
            "particiones": [round(float(v), 4) for v in puntuaciones_cv],
            "promedio": round(float(puntuaciones_cv.mean()), 4),
            "desviacion_estandar": round(float(puntuaciones_cv.std()), 4),
            "nota_metodologica": (
                "Se aplica exclusivamente sobre el 60% de entrenamiento usando StratifiedKFold para conservar la "
                "proporción de clases sin tocar el conjunto de prueba."
            ),
        },
        "archivos": list(ARCHIVOS_P04.keys()),
    }

    joblib.dump(mejor_modelo, RUTA_MODELO_P04)
    with open(RUTA_METRICAS_P04, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return mejor_modelo, metricas


def _generar_graficas_p04(
    df_resultados: pd.DataFrame,
    mejor_x: int,
    matriz: np.ndarray,
    carpeta_salida: str,
) -> None:
    """Genera las dos gráficas PNG de la Práctica 04 con la paleta cálida de Linkea."""
    x = df_resultados["profundidad_grafica"]
    etiquetas = df_resultados["profundidad"]

    # Gráfica 1: Entrenamiento vs Validación según la profundidad del árbol
    fig, ax = plt.subplots(figsize=(9.5, 5.2))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ax.plot(
        x,
        df_resultados["entrenamiento"],
        marker="o",
        linewidth=2.3,
        color=COLOR_CAFE,
        label="Entrenamiento (60%)",
    )
    ax.plot(
        x,
        df_resultados["validacion"],
        marker="s",
        linewidth=2.5,
        color=COLOR_VINO,
        label="Validación (20%)",
    )
    ax.axvline(
        mejor_x,
        color=COLOR_TEAL,
        linestyle="--",
        linewidth=1.8,
        label="Mejor validación seleccionado",
    )
    ax.set_xticks(x, etiquetas)
    ax.set_ylim(0.5, 1.05)
    ax.set_title(
        "Práctica 04 · Entrenamiento vs Validación (Detección de Sobreajuste)",
        fontsize=13,
        fontweight="bold",
        color=COLOR_TINTA,
    )
    ax.set_xlabel("Profundidad máxima del árbol (max_depth)", color=COLOR_TINTA)
    ax.set_ylabel("Exactitud", color=COLOR_TINTA)
    ax.grid(True, linestyle="--", alpha=0.4)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P04["comparacion_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)

    # Gráfica 2: Matriz de confusión en el conjunto de prueba
    fig, ax = plt.subplots(figsize=(5.8, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    cmap_linkea = plt.matplotlib.colors.LinearSegmentedColormap.from_list(
        "linkea_p04", ["#f6e8de", COLOR_CARAMELO, COLOR_VINO]
    )
    im = ax.imshow(matriz, cmap=cmap_linkea)
    ax.set_title(
        "Práctica 04 · Matriz de confusión (Conjunto de prueba)",
        fontsize=12.5,
        fontweight="bold",
        color=COLOR_TINTA,
    )
    ax.set_xlabel("Predicción del modelo", color=COLOR_TINTA)
    ax.set_ylabel("Resultado real", color=COLOR_TINTA)
    ax.set_xticks([0, 1], ["No aceptado", "Aceptado"])
    ax.set_yticks([0, 1], ["No aceptado", "Aceptado"])
    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    umbral = matriz.max() * 0.55 if matriz.max() > 0 else 1
    for fila in range(2):
        for col in range(2):
            valor = int(matriz[fila, col])
            ax.text(
                col,
                fila,
                str(valor),
                ha="center",
                va="center",
                fontsize=14,
                fontweight="bold",
                color="white" if valor > umbral else COLOR_TINTA,
            )
    plt.tight_layout()
    plt.savefig(
        os.path.join(carpeta_salida, ARCHIVOS_P04["matriz_png"]),
        dpi=200,
        bbox_inches="tight",
        facecolor=COLOR_FONDO,
    )
    plt.close(fig)


def cargar_o_entrenar_p04() -> tuple[DecisionTreeClassifier, dict]:
    """Carga el modelo y métricas de la Práctica 04; si aún no existen, entrena con semilla 42."""
    if os.path.exists(RUTA_MODELO_P04) and os.path.exists(RUTA_METRICAS_P04):
        modelo = joblib.load(RUTA_MODELO_P04)
        with open(RUTA_METRICAS_P04, encoding="utf-8") as f:
            metricas = json.load(f)
        return modelo, metricas
    return entrenar_practica04(semilla=42)


def predecir_p04_caracteristicas(c: CaracteristicasPar) -> dict:
    """Evalúa un perfil con el árbol óptimo de la Práctica 04."""
    modelo, metricas = cargar_o_entrenar_p04()
    fila = pd.DataFrame([c.model_dump()])[COLUMNAS_ENTRADA]
    pred = int(modelo.predict(fila)[0])
    prob = float(modelo.predict_proba(fila)[0][1])
    return {
        "prediccion": pred,
        "etiqueta": "Aceptado" if pred == 1 else "No aceptado",
        "probabilidad_aceptacion": round(prob * 100, 1),
        "profundidad": metricas["modelo_seleccionado"]["profundidad"],
        "calificacion_estimada": estimar_calificacion_base(c),
    }


def predecir_p04_par(student: Student, vacancy: Vacancy) -> dict:
    c = extraer_caracteristicas(student, vacancy)
    return {
        "caracteristicas": c.model_dump(),
        **predecir_p04_caracteristicas(c),
    }
