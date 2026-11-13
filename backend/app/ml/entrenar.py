"""Entrena el modelo de elegibilidad de Linkea (árbol de decisión).

    python -m app.ml.entrenar

Sigue la metodología de la práctica 4 (entrenamiento / validación / prueba)
aplicada a los datos del proyecto:

    1. Carga pares.csv (generado por generar_dataset.py).
    2. Divide los datos 60% entrenamiento / 20% validación / 20% prueba.
    3. Entrena árboles con distintas profundidades y compara
       entrenamiento vs validación para detectar subajuste/sobreajuste.
    4. Selecciona la profundidad con mejor exactitud de validación.
    5. Reentrena el ganador con entrenamiento + validación.
    6. Evalúa una sola vez en el conjunto de prueba (nunca usado antes).
    7. Compara las reglas fijas contra el aprendizaje automático.
    8. Valida estabilidad con validación cruzada estratificada (5 folds).

Deja en app/ml/artefactos/:
    modelo_elegibilidad.joblib       el árbol entrenado (lo carga modelo.py)
    metricas.json                    métricas, matriz, importancias y ajuste
    arbol.txt                        las reglas que aprendió, en texto
    comparacion_profundidades.csv    entrenamiento vs validación por profundidad
    predicciones_prueba.csv          predicciones sobre el conjunto de prueba
"""

import json

import joblib
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import (
    StratifiedKFold,
    cross_val_score,
    train_test_split,
)
from sklearn.tree import DecisionTreeClassifier, export_text

from app.ml.datos import FEATURES, regla_elegible
from app.ml.generar_dataset import ARTEFACTOS, CSV

SEMILLA = 42
PROFUNDIDADES = [1, 2, 3, 5, 10, None]

MODELO = ARTEFACTOS / "modelo_elegibilidad.joblib"
METRICAS = ARTEFACTOS / "metricas.json"
ARBOL_TXT = ARTEFACTOS / "arbol.txt"
PROFUNDIDADES_CSV = ARTEFACTOS / "comparacion_profundidades.csv"
PREDICCIONES_CSV = ARTEFACTOS / "predicciones_prueba.csv"


def _diagnostico(entrenamiento: float, validacion: float) -> str:
    """Indicador didáctico de ajuste (igual que en la práctica 4)."""
    if entrenamiento < 0.70 and validacion < 0.70:
        return "posible subajuste"
    if entrenamiento - validacion > 0.10:
        return "posible sobreajuste"
    return "buen ajuste"


def main() -> None:
    # ------------------------------------------------------------
    # 1. Datos (el CSV ya viene limpio de generar_dataset)
    # ------------------------------------------------------------
    df = pd.read_csv(CSV)
    print("=== DATASET ===")
    print(f"Filas: {len(df)} | Etiqueta 1 (elegible): {(df['elegible'] == 1).sum()}")

    X = df[FEATURES]
    y = df["elegible"]

    # ------------------------------------------------------------
    # 2. División 60% entrenamiento / 20% validación / 20% prueba
    # ------------------------------------------------------------
    X_ent, X_tmp, y_ent, y_tmp = train_test_split(
        X, y, test_size=0.40, random_state=SEMILLA, stratify=y
    )
    X_val, X_pru, y_val, y_pru = train_test_split(
        X_tmp, y_tmp, test_size=0.50, random_state=SEMILLA, stratify=y_tmp
    )
    print(f"\nEntrenamiento: {len(X_ent)} | Validación: {len(X_val)} | Prueba: {len(X_pru)}")

    # ------------------------------------------------------------
    # 3. Entrenar árboles con distintas profundidades
    #    (la validación elige; la prueba NO se toca todavía)
    # ------------------------------------------------------------
    resultados, modelos = [], {}
    for profundidad in PROFUNDIDADES:
        modelo = DecisionTreeClassifier(max_depth=profundidad, random_state=SEMILLA)
        modelo.fit(X_ent, y_ent)
        acc_ent = accuracy_score(y_ent, modelo.predict(X_ent))
        acc_val = accuracy_score(y_val, modelo.predict(X_val))
        resultados.append({
            "profundidad": "sin_limite" if profundidad is None else profundidad,
            "entrenamiento": round(acc_ent, 4),
            "validacion": round(acc_val, 4),
            "diferencia": round(acc_ent - acc_val, 4),
            "diagnostico": _diagnostico(acc_ent, acc_val),
        })
        modelos[profundidad] = modelo

    # ------------------------------------------------------------
    # 4. Seleccionar la profundidad con mejor validación.
    #    Desempate: mayor acuerdo con las reglas en los pares REALES
    #    (un árbol chico puede ganar validación ignorando carrera/skills);
    #    si sigue empatado, el árbol más chico (explica igual y más simple).
    # ------------------------------------------------------------
    reales = df[df["origen"] != "sintetico"]
    for r, (prof, m) in zip(resultados, modelos.items()):
        r["acuerdo_reales"] = (
            round(float((m.predict(reales[FEATURES]) == reales["elegible"]).mean()), 4)
            if not reales.empty else None
        )
    df_prof = pd.DataFrame(resultados)
    df_prof.to_csv(PROFUNDIDADES_CSV, index=False, encoding="utf-8")
    print("\n=== COMPARACIÓN DE PROFUNDIDADES ===")
    print(df_prof.to_string(index=False))

    mejor_val = df_prof["validacion"].max()
    candidatas = [r for r in resultados if r["validacion"] == mejor_val]
    mejor_fila = max(candidatas, key=lambda r: (r["acuerdo_reales"] or 0))
    mejor_profundidad = (
        None if mejor_fila["profundidad"] == "sin_limite" else mejor_fila["profundidad"]
    )
    # Entre las que mantienen la mejor fidelidad con la política, la más chica.
    mejor_acuerdo = mejor_fila["acuerdo_reales"] or 0
    misma_fidelidad = [r["profundidad"] for r in candidatas
                       if (r["acuerdo_reales"] or 0) == mejor_acuerdo]
    mejor_profundidad = min(
        (None if p == "sin_limite" else p for p in misma_fidelidad),
        key=lambda p: 99 if p is None else p,
    )
    print(f"\nProfundidad seleccionada: {mejor_profundidad} "
          f"(validación {mejor_val:.2%}, acuerdo con reglas en reales "
          f"{mejor_acuerdo:.2%})")

    # ------------------------------------------------------------
    # 5. Reentrenar el ganador con entrenamiento + validación (80%)
    # ------------------------------------------------------------
    X_final = pd.concat([X_ent, X_val])
    y_final = pd.concat([y_ent, y_val])
    modelo = clone(modelos[mejor_profundidad])
    modelo.fit(X_final, y_final)

    # ------------------------------------------------------------
    # 6. Evaluación final: el conjunto de prueba se usa solo aquí
    # ------------------------------------------------------------
    pred_ml = modelo.predict(X_pru)
    pred_reglas = X_pru.apply(regla_elegible, axis=1)

    acc_ml = accuracy_score(y_pru, pred_ml)
    acc_reglas = accuracy_score(y_pru, pred_reglas)
    print("\n=== EVALUACIÓN FINAL (prueba) ===")
    print(f"Reglas fijas: {acc_reglas:.2%}   Árbol aprendido: {acc_ml:.2%}")
    print(f"Precision: {precision_score(y_pru, pred_ml, zero_division=0):.2%}   "
          f"Recall: {recall_score(y_pru, pred_ml, zero_division=0):.2%}   "
          f"F1: {f1_score(y_pru, pred_ml, zero_division=0):.2%}")

    reporte = classification_report(
        y_pru, pred_ml, labels=[0, 1],
        target_names=["No elegible", "Elegible"], zero_division=0, output_dict=True,
    )
    matriz = confusion_matrix(y_pru, pred_ml, labels=[0, 1])
    print(classification_report(y_pru, pred_ml, labels=[0, 1],
                                target_names=["No elegible", "Elegible"], zero_division=0))
    print("Matriz de confusión:")
    print(matriz)

    # Predicciones de prueba exportadas (como en la práctica).
    df_pred = X_pru.copy()
    df_pred["resultado_real"] = y_pru
    df_pred["prediccion"] = pred_ml
    df_pred.to_csv(PREDICCIONES_CSV, index=False, encoding="utf-8")

    # Acuerdo con la política en pares reales y con postulaciones resueltas.
    acuerdo_reales = acuerdo_resultados = None
    if not reales.empty:
        acuerdo_reales = float((modelo.predict(reales[FEATURES]) == reales["elegible"]).mean())
        print(f"\nAcuerdo del árbol con las reglas en los {len(reales)} pares reales: "
              f"{acuerdo_reales:.2%}")
        con_resultado = reales[reales["resultado_real"].notna()]
        if not con_resultado.empty:
            real = con_resultado["resultado_real"].astype(int)
            acuerdo_resultados = float((modelo.predict(con_resultado[FEATURES]) == real).mean())
            print(f"Predicciones correctas vs resultado real de postulación "
                  f"({len(real)} casos resueltos): {acuerdo_resultados:.2%}")

    # ------------------------------------------------------------
    # 7. Validación cruzada estratificada sobre entrenamiento + validación
    #    (la prueba sigue sin participar)
    # ------------------------------------------------------------
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMILLA)
    puntuaciones_cv = cross_val_score(
        clone(modelo), X_final, y_final, cv=cv, scoring="accuracy"
    )
    print("\n=== VALIDACIÓN CRUZADA (5 folds, stratified) ===")
    print("Particiones:", [round(float(p), 4) for p in puntuaciones_cv])
    print(f"Promedio: {puntuaciones_cv.mean():.2%} | "
          f"Desviación: {puntuaciones_cv.std():.2%}")

    # ------------------------------------------------------------
    # 8. Guardar modelo + métricas + reglas aprendidas en texto
    # ------------------------------------------------------------
    importancias = {f: round(float(i), 3) for f, i in zip(FEATURES, modelo.feature_importances_)}
    joblib.dump(modelo, MODELO)
    METRICAS.write_text(json.dumps({
        "features": FEATURES,
        "filas_dataset": len(df),
        "division": {"entrenamiento": len(X_ent), "validacion": len(X_val), "prueba": len(X_pru)},
        "profundidad_elegida": mejor_profundidad,
        "comparacion_profundidades": resultados,
        "exactitud_reglas": round(acc_reglas, 4),
        "exactitud_modelo": round(acc_ml, 4),
        "precision": round(float(precision_score(y_pru, pred_ml, zero_division=0)), 4),
        "recall": round(float(recall_score(y_pru, pred_ml, zero_division=0)), 4),
        "f1": round(float(f1_score(y_pru, pred_ml, zero_division=0)), 4),
        "reporte": reporte,
        "matriz_confusion": matriz.tolist(),
        "validacion_cruzada": {
            "folds": [round(float(p), 4) for p in puntuaciones_cv],
            "promedio": round(float(puntuaciones_cv.mean()), 4),
            "desviacion": round(float(puntuaciones_cv.std()), 4),
        },
        "acuerdo_reglas_reales": acuerdo_reales,
        "acuerdo_resultados_reales": acuerdo_resultados,
        "importancia_por_variable": importancias,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    ARBOL_TXT.write_text(export_text(modelo, feature_names=FEATURES), encoding="utf-8")

    print("\nImportancia de cada variable (qué tanto decide cada aspecto):")
    for nombre, imp in sorted(importancias.items(), key=lambda kv: -kv[1]):
        print(f"  {nombre}: {imp:.1%}")
    print(f"\nModelo -> {MODELO}\nMétricas -> {METRICAS}\nÁrbol -> {ARBOL_TXT}")
    print(f"Profundidades -> {PROFUNDIDADES_CSV}\nPredicciones -> {PREDICCIONES_CSV}")


if __name__ == "__main__":
    main()
