"""Entrenamiento, validación, gráficas y predicción con Árbol de Decisión vs Reglas Fijas.

Sigue todas las etapas vistas en Fundamentos de IA (Práctica 03):
  PARTE 1  Sistema manual basado en reglas fijas (no aprende de los datos)
  PARTE 2  División estratificada 60% entrenamiento / 20% validación / 20% prueba
  PARTE 3  Selección de hiperparámetros (max_depth) con validación y validación cruzada (cv=5)
  PARTE 4  Entrenamiento final, métricas (accuracy, precision, recall, F1, matriz de confusión)
  PARTE 5  Generación de gráficas PNG con os y matplotlib.pyplot en la paleta de Linkea
  PARTE 6  Persistencia del modelo (joblib) y predicción individual para pares estudiante-vacante
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path

import joblib
import matplotlib

# Backend sin ventana gráfica: permite generar PNG dentro de FastAPI sin bloquear el servidor.
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text

from app.ml_vs_reglas.datos import (
    COLUMNAS_ENTRADA,
    DESCRIPCION_VARIABLES,
    CaracteristicasPar,
    estimar_calificacion_base,
    extraer_caracteristicas,
    generar_datos_sinteticos,
)
from app.models.company import Vacancy
from app.models.student import Student

# Carpeta donde se guardan el modelo entrenado y las gráficas PNG creadas con matplotlib.
CARPETA_ML = str(Path(__file__).resolve().parents[2] / "uploads" / "ml")
RUTA_MODELO = os.path.join(CARPETA_ML, "arbol_decision.joblib")
RUTA_METRICAS = os.path.join(CARPETA_ML, "metricas.json")

NOMBRES_GRAFICAS = {
    "profundidad": "profundidad_vs_exactitud.png",
    "comparacion": "comparacion_sistemas.png",
    "matriz": "matriz_confusion.png",
}

# Paleta cálida de Linkea (la misma que usa el frontend y demo_clase.py).
COLOR_FONDO = "#fff9f0"
COLOR_TINTA = "#4a3028"
COLOR_VINO = "#6d1e2e"
COLOR_CAFE = "#8a5a44"
COLOR_CARAMELO = "#c8915a"
COLOR_TEAL = "#76a8a5"


# ============================================================
# PARTE 1. SISTEMA BASADO EN REGLAS FIJAS
# ============================================================


def predecir_con_reglas(registro: pd.Series | dict | CaracteristicasPar) -> int:
    """Reglas manuales fijas: aprueba/acepta (1) solo si cumple TODAS las condiciones a la vez.

    Condiciones didácticas (equivalentes a las reglas de la Práctica 03):
      - al menos 5 puntos de horas de dedicación semanal;
      - al menos 70 % de compatibilidad horaria y traslado;
      - al menos 65 % de cobertura de skills y carrera;
      - al menos 5 puntos de participación en perfil.
    """
    datos = registro.model_dump() if isinstance(registro, CaracteristicasPar) else registro
    if (
        datos["horas_dedicacion"] >= 5
        and datos["compatibilidad_horaria"] >= 70
        and datos["cobertura_skills"] >= 65
        and datos["participacion_perfil"] >= 5
    ):
        return 1
    return 0


def explicar_reglas(c: CaracteristicasPar) -> tuple[int, list[str], list[str]]:
    """Devuelve (resultado 0/1, condiciones cumplidas, condiciones incumplidas)."""
    cumplidas: list[str] = []
    faltantes: list[str] = []

    condiciones = [
        (c.horas_dedicacion >= 5, f"Horas de dedicación ({c.horas_dedicacion}/15, mínimo 5)"),
        (c.compatibilidad_horaria >= 70, f"Compatibilidad horaria ({c.compatibilidad_horaria}%, mínimo 70%)"),
        (c.cobertura_skills >= 65, f"Cobertura de skills ({c.cobertura_skills}%, mínimo 65%)"),
        (c.participacion_perfil >= 5, f"Participación en perfil ({c.participacion_perfil}/10, mínimo 5)"),
    ]
    for ok, texto in condiciones:
        (cumplidas if ok else faltantes).append(texto)

    return (1 if not faltantes else 0), cumplidas, faltantes


# ============================================================
# PARTE 2, 3 Y 4. ENTRENAMIENTO, VALIDACIÓN (60/20/20) Y PRUEBA
# ============================================================


def entrenar_y_evaluar(
    df: pd.DataFrame,
    resumen_datos: dict | None = None,
    semilla: int = 42,
    carpeta_salida: str = CARPETA_ML,
) -> tuple[DecisionTreeClassifier, dict]:
    """Ejecuta el flujo completo de ML sobre `df`, guarda el modelo + gráficas y devuelve las métricas."""
    os.makedirs(carpeta_salida, exist_ok=True)

    X = df[COLUMNAS_ENTRADA]
    y = df["aceptado"]

    # División 60% entrenamiento / 20% validación / 20% prueba en dos pasos estratificados:
    #   1) 60% entrenamiento y 40% temporal
    #   2) el 40% temporal a la mitad -> 20% validación y 20% prueba
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

    # Selección del mejor max_depth usando el conjunto de VALIDACIÓN y validación cruzada (cv=5).
    mejor_profundidad = 1
    mejor_exactitud_val = -1.0
    historial_profundidad = []

    for profundidad in range(1, 9):
        candidato = DecisionTreeClassifier(max_depth=profundidad, random_state=semilla)
        candidato.fit(X_entrenamiento, y_entrenamiento)

        exactitud_entrenamiento = float(accuracy_score(y_entrenamiento, candidato.predict(X_entrenamiento)))
        exactitud_validacion = float(accuracy_score(y_validacion, candidato.predict(X_validacion)))
        puntajes_cv = cross_val_score(candidato, X_entrenamiento, y_entrenamiento, cv=5)
        exactitud_cruzada = float(puntajes_cv.mean())
        desviacion_cruzada = float(puntajes_cv.std())

        historial_profundidad.append(
            {
                "max_depth": profundidad,
                "exactitud_entrenamiento": round(exactitud_entrenamiento, 4),
                "exactitud_validacion": round(exactitud_validacion, 4),
                "exactitud_cruzada": round(exactitud_cruzada, 4),
                "desviacion_cruzada": round(desviacion_cruzada, 4),
            }
        )

        if exactitud_validacion > mejor_exactitud_val:
            mejor_exactitud_val = exactitud_validacion
            mejor_profundidad = profundidad

    # Entrenamos el modelo ganador con los datos de entrenamiento.
    modelo = DecisionTreeClassifier(max_depth=mejor_profundidad, random_state=semilla)
    modelo.fit(X_entrenamiento, y_entrenamiento)

    # Evaluación final sobre el conjunto de PRUEBA (datos nunca vistos ni en entrenamiento ni en validación).
    predicciones_ml = modelo.predict(X_prueba)
    probabilidades_ml = modelo.predict_proba(X_prueba)[:, 1]
    predicciones_reglas = X_prueba.apply(predecir_con_reglas, axis=1)

    exactitud_ml = float(accuracy_score(y_prueba, predicciones_ml))
    exactitud_reglas = float(accuracy_score(y_prueba, predicciones_reglas))

    reporte_dict = classification_report(
        y_prueba,
        predicciones_ml,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
        output_dict=True,
    )
    reporte_texto = classification_report(
        y_prueba,
        predicciones_ml,
        labels=[0, 1],
        target_names=["No aceptado", "Aceptado"],
        zero_division=0,
    )

    matriz = confusion_matrix(y_prueba, predicciones_ml, labels=[0, 1])
    matriz_reglas = confusion_matrix(y_prueba, predicciones_reglas, labels=[0, 1])

    # Tabla comparativa en el conjunto de prueba (ordenada por índice como en la práctica).
    comparacion = X_prueba.copy()
    comparacion["calificacion_final"] = df.loc[X_prueba.index, "calificacion_final"].round(0).astype(int)
    comparacion["resultado_real"] = y_prueba.astype(int)
    comparacion["prediccion_reglas"] = predicciones_reglas.astype(int)
    comparacion["prediccion_ml"] = predicciones_ml.astype(int)
    comparacion["probabilidad_ml"] = (probabilidades_ml * 100).round(1)
    comparacion = comparacion.sort_index()

    # Casos donde ML acierta y las reglas fijas fallan (muy útil para justificar el modelo).
    discrepancias_a_favor_ml = comparacion[
        (comparacion["prediccion_ml"] == comparacion["resultado_real"])
        & (comparacion["prediccion_reglas"] != comparacion["resultado_real"])
    ]

    # Importancia de cada variable dentro del árbol entrenado.
    importancias = [
        {
            "variable": col,
            "nombre": next(v["nombre"] for v in DESCRIPCION_VARIABLES if v["clave"] == col),
            "importancia": round(float(imp), 4),
        }
        for col, imp in zip(COLUMNAS_ENTRADA, modelo.feature_importances_)
    ]
    importancias.sort(key=lambda d: d["importancia"], reverse=True)

    reglas_arbol = export_text(modelo, feature_names=COLUMNAS_ENTRADA)

    # Estadísticas descriptivas del dataset completo.
    desc = df[COLUMNAS_ENTRADA + ["calificacion_final"]].describe().round(2).to_dict()
    conteo_clases = df["aceptado"].value_counts().sort_index().to_dict()

    # Generamos las 3 gráficas con matplotlib.pyplot.
    generar_graficas(
        historial_profundidad=historial_profundidad,
        mejor_profundidad=mejor_profundidad,
        exactitud_reglas=exactitud_reglas,
        exactitud_ml=exactitud_ml,
        matriz=matriz,
        carpeta_salida=carpeta_salida,
    )

    metricas = {
        "entrenado_en": datetime.now(timezone.utc).isoformat(),
        "datos": {
            **(resumen_datos or {"total_registros": len(df), "registros_reales": 0, "registros_sinteticos": len(df), "fuente": "sintetico", "semilla": semilla}),
            "filas": int(df.shape[0]),
            "columnas": int(df.shape[1]),
            "valores_faltantes": {k: int(v) for k, v in df[COLUMNAS_ENTRADA + ["aceptado"]].isnull().sum().to_dict().items()},
            "distribucion_clases": {
                "no_aceptado": int(conteo_clases.get(0, 0)),
                "aceptado": int(conteo_clases.get(1, 0)),
            },
            "estadisticas": desc,
            "muestra": df.head(12).to_dict(orient="records"),
        },
        "variables": DESCRIPCION_VARIABLES,
        "division": {
            "entrenamiento": int(len(X_entrenamiento)),
            "validacion": int(len(X_validacion)),
            "prueba": int(len(X_prueba)),
            "porcentajes": {"entrenamiento": 60, "validacion": 20, "prueba": 20},
        },
        "validacion": {
            "mejor_max_depth": int(mejor_profundidad),
            "mejor_exactitud_validacion": round(mejor_exactitud_val, 4),
            "historial": historial_profundidad,
        },
        "prueba": {
            "exactitud_reglas": round(exactitud_reglas, 4),
            "exactitud_ml": round(exactitud_ml, 4),
            "diferencia_puntos": round((exactitud_ml - exactitud_reglas) * 100, 2),
            "matriz_confusion_ml": matriz.tolist(),
            "matriz_confusion_reglas": matriz_reglas.tolist(),
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
            "muestra_comparacion": comparacion.head(20).reset_index(names="indice").to_dict(orient="records"),
            "casos_ml_supera_reglas": discrepancias_a_favor_ml.head(8).reset_index(names="indice").to_dict(orient="records"),
            "total_ml_supera_reglas": int(len(discrepancias_a_favor_ml)),
        },
        "arbol": {
            "max_depth": int(mejor_profundidad),
            "hojas": int(modelo.get_n_leaves()),
            "importancias": importancias,
            "reglas_texto": reglas_arbol,
        },
        "graficas": list(NOMBRES_GRAFICAS.keys()),
    }

    joblib.dump(modelo, os.path.join(carpeta_salida, "arbol_decision.joblib"))
    with open(os.path.join(carpeta_salida, "metricas.json"), "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return modelo, metricas


# ============================================================
# PARTE 5. GRÁFICAS CON OS Y MATPLOTLIB (PALETA LINKEA)
# ============================================================


def generar_graficas(
    historial_profundidad: list[dict],
    mejor_profundidad: int,
    exactitud_reglas: float,
    exactitud_ml: float,
    matriz: np.ndarray,
    carpeta_salida: str = CARPETA_ML,
) -> dict[str, str]:
    """Crea y guarda las 3 gráficas PNG usando matplotlib.pyplot con la paleta cálida de Linkea."""
    os.makedirs(carpeta_salida, exist_ok=True)
    rutas: dict[str, str] = {}

    profundidades = [d["max_depth"] for d in historial_profundidad]
    val_scores = [d["exactitud_validacion"] for d in historial_profundidad]
    cv_scores = [d["exactitud_cruzada"] for d in historial_profundidad]

    # Gráfica 1: Exactitud según max_depth (Validación vs Validación Cruzada)
    fig, ax = plt.subplots(figsize=(8, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    ax.plot(profundidades, val_scores, marker="o", linewidth=2.2, color=COLOR_VINO, label="Validación (20%)")
    ax.plot(profundidades, cv_scores, marker="s", linewidth=2.0, color=COLOR_CARAMELO, label="Validación cruzada (cv=5)")
    ax.axvline(mejor_profundidad, color=COLOR_TEAL, linestyle="--", linewidth=1.8, label=f"Elegido: max_depth={mejor_profundidad}")
    ax.set_title("Selección del modelo: exactitud según max_depth", fontsize=13, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Profundidad máxima del árbol (max_depth)", color=COLOR_TINTA)
    ax.set_ylabel("Exactitud", color=COLOR_TINTA)
    ax.set_xticks(profundidades)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=True, facecolor="#fffefb")
    plt.tight_layout()
    ruta_1 = os.path.join(carpeta_salida, NOMBRES_GRAFICAS["profundidad"])
    plt.savefig(ruta_1, dpi=160, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)
    rutas["profundidad"] = ruta_1

    # Gráfica 2: Comparación final en el conjunto de prueba (Reglas fijas vs Machine Learning)
    fig, ax = plt.subplots(figsize=(6.4, 4.8))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    sistemas = ["Reglas fijas", "Machine Learning\n(Árbol de decisión)"]
    exactitudes = [exactitud_reglas, exactitud_ml]
    barras = ax.bar(sistemas, exactitudes, color=[COLOR_CAFE, COLOR_VINO], width=0.52)
    ax.set_ylim(0, 1.08)
    ax.set_title("Exactitud final en el conjunto de prueba (20%)", fontsize=13, fontweight="bold", color=COLOR_TINTA)
    ax.set_ylabel("Exactitud", color=COLOR_TINTA)
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.spines[["top", "right"]].set_visible(False)
    for barra, valor in zip(barras, exactitudes):
        ax.text(
            barra.get_x() + barra.get_width() / 2,
            valor + 0.025,
            f"{valor:.2%}",
            ha="center",
            fontweight="bold",
            color=COLOR_TINTA,
        )
    plt.tight_layout()
    ruta_2 = os.path.join(carpeta_salida, NOMBRES_GRAFICAS["comparacion"])
    plt.savefig(ruta_2, dpi=160, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)
    rutas["comparacion"] = ruta_2

    # Gráfica 3: Matriz de confusión en el conjunto de prueba
    fig, ax = plt.subplots(figsize=(5.4, 4.6))
    fig.patch.set_facecolor(COLOR_FONDO)
    ax.set_facecolor(COLOR_FONDO)
    cmap_linkea = plt.matplotlib.colors.LinearSegmentedColormap.from_list("linkea", ["#f6e8de", COLOR_CARAMELO, COLOR_VINO])
    im = ax.imshow(matriz, cmap=cmap_linkea)
    ax.set_title("Matriz de confusión (conjunto de prueba)", fontsize=12.5, fontweight="bold", color=COLOR_TINTA)
    ax.set_xlabel("Predicción del modelo", color=COLOR_TINTA)
    ax.set_ylabel("Resultado real", color=COLOR_TINTA)
    ax.set_xticks([0, 1], ["No aceptado", "Aceptado"])
    ax.set_yticks([0, 1], ["No aceptado", "Aceptado"])
    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    umbral_texto = matriz.max() * 0.55 if matriz.max() > 0 else 1
    for fila in range(2):
        for col in range(2):
            valor = int(matriz[fila, col])
            ax.text(
                col,
                fila,
                str(valor),
                ha="center",
                va="center",
                color="white" if valor > umbral_texto else COLOR_TINTA,
                fontsize=15,
                fontweight="bold",
            )
    plt.tight_layout()
    ruta_3 = os.path.join(carpeta_salida, NOMBRES_GRAFICAS["matriz"])
    plt.savefig(ruta_3, dpi=160, bbox_inches="tight", facecolor=COLOR_FONDO)
    plt.close(fig)
    rutas["matriz"] = ruta_3

    return rutas


# ============================================================
# PARTE 6. CARGA DEL MODELO Y PREDICCIÓN INDIVIDUAL
# ============================================================


def cargar_o_entrenar_por_defecto() -> tuple[DecisionTreeClassifier, dict]:
    """Carga el modelo y métricas guardados; si aún no existen, entrena con los 500 datos base."""
    if os.path.exists(RUTA_MODELO) and os.path.exists(RUTA_METRICAS):
        modelo = joblib.load(RUTA_MODELO)
        with open(RUTA_METRICAS, encoding="utf-8") as f:
            metricas = json.load(f)
        return modelo, metricas

    df = generar_datos_sinteticos(cantidad=500, semilla=42)
    return entrenar_y_evaluar(df, semilla=42)


def predecir_caracteristicas(c: CaracteristicasPar) -> dict:
    """Evalúa unas características con ambos sistemas: Reglas Fijas vs Árbol de Decisión."""
    modelo, metricas = cargar_o_entrenar_por_defecto()
    fila = pd.DataFrame([c.model_dump()])[COLUMNAS_ENTRADA]

    pred_ml = int(modelo.predict(fila)[0])
    prob_aceptar = float(modelo.predict_proba(fila)[0][1])
    pred_reglas, cumplidas, faltantes = explicar_reglas(c)
    cal_estimada = estimar_calificacion_base(c)

    coinciden = pred_ml == pred_reglas
    if coinciden and pred_ml == 1:
        resumen = "Ambos sistemas coinciden: el perfil tiene alta probabilidad de ser aceptado en la vacante."
    elif coinciden and pred_ml == 0:
        resumen = "Ambos sistemas coinciden: conviene fortalecer el perfil o elegir una vacante más afín antes de postularse."
    elif pred_ml == 1 and pred_reglas == 0:
        resumen = (
            "Las reglas fijas lo descartan por no cumplir un corte estricto, pero el Árbol de Decisión detecta "
            "que sus fortalezas compensan y predice aceptación."
        )
    else:
        resumen = (
            "Cumple los mínimos de las reglas fijas, pero el Árbol de Decisión advierte que casos similares "
            "quedaron justos en la calificación global."
        )

    return {
        "caracteristicas": c.model_dump(),
        "calificacion_estimada": cal_estimada,
        "reglas": {
            "prediccion": pred_reglas,
            "etiqueta": "Aceptado" if pred_reglas == 1 else "No aceptado",
            "cumplidas": cumplidas,
            "faltantes": faltantes,
        },
        "ml": {
            "prediccion": pred_ml,
            "etiqueta": "Aceptado" if pred_ml == 1 else "No aceptado",
            "probabilidad_aceptacion": round(prob_aceptar * 100, 1),
            "max_depth": metricas["arbol"]["max_depth"],
            "exactitud_prueba": round(metricas["prueba"]["exactitud_ml"] * 100, 1),
        },
        "coinciden": coinciden,
        "resumen": resumen,
    }


def predecir_par(student: Student, vacancy: Vacancy) -> dict:
    """Predicción completa para un estudiante y una vacante reales de Linkea."""
    c = extraer_caracteristicas(student, vacancy)
    resultado = predecir_caracteristicas(c)
    return {
        "student_id": str(student.id),
        "estudiante": student.nombre,
        "vacancy_id": str(vacancy.id),
        "vacante": vacancy.titulo,
        "empresa": vacancy.nombre_empresa,
        **resultado,
    }
