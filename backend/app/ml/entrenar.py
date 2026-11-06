"""Entrena el primer modelo de IA de Linkea: un árbol de decisión de elegibilidad.

    python -m app.ml.entrenar

Es la práctica 3 aplicada al proyecto: los datos vienen del CSV que genera
`generar_dataset.py` (pares reales + sintéticos), el objetivo y es `elegible`,
y al final se comparan las REGLAS FIJAS contra el APRENDIZAJE AUTOMÁTICO.

Deja en app/ml/artefactos/:
    modelo_elegibilidad.joblib   el árbol entrenado (lo carga modelo.py)
    metricas.json                exactitud, reporte, matriz e importancias
    arbol.txt                    las reglas que aprendió, en texto
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text

from app.ml.datos import FEATURES, regla_elegible
from app.ml.generar_dataset import ARTEFACTOS, CSV

MODELO = ARTEFACTOS / "modelo_elegibilidad.joblib"
METRICAS = ARTEFACTOS / "metricas.json"
ARBOL_TXT = ARTEFACTOS / "arbol.txt"


def main() -> None:
    # ------------------------------------------------------------
    # 1. Datos (el CSV ya viene limpio de generar_dataset)
    # ------------------------------------------------------------
    df = pd.read_csv(CSV)
    print("=== DATASET ===")
    print(f"Filas: {len(df)} | Etiqueta 1 (elegible): {(df['elegible'] == 1).sum()}")

    # ------------------------------------------------------------
    # 2. X e y, y división entrenamiento / prueba (estratificada)
    # ------------------------------------------------------------
    X = df[FEATURES]
    y = df["elegible"]
    X_ent, X_pru, y_ent, y_pru = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    print(f"Entrenamiento: {len(X_ent)} | Prueba: {len(X_pru)}")

    # ------------------------------------------------------------
    # 3. Entrenar el árbol de decisión
    # ------------------------------------------------------------
    modelo = DecisionTreeClassifier(max_depth=4, random_state=42)
    modelo.fit(X_ent, y_ent)

    # ------------------------------------------------------------
    # 4. Comparación: reglas fijas vs aprendizaje automático
    # ------------------------------------------------------------
    pred_ml = modelo.predict(X_pru)
    pred_reglas = X_pru.apply(regla_elegible, axis=1)

    acc_ml = accuracy_score(y_pru, pred_ml)
    acc_reglas = accuracy_score(y_pru, pred_reglas)
    print("\n=== EXACTITUD (sobre la prueba) ===")
    print(f"Reglas fijas: {acc_reglas:.2%}   Árbol aprendido: {acc_ml:.2%}")

    reporte = classification_report(
        y_pru, pred_ml, labels=[0, 1],
        target_names=["No elegible", "Elegible"], zero_division=0, output_dict=True,
    )
    matriz = confusion_matrix(y_pru, pred_ml, labels=[0, 1])
    print("\n=== REPORTE ===")
    print(classification_report(y_pru, pred_ml, labels=[0, 1],
                                target_names=["No elegible", "Elegible"], zero_division=0))
    print("Matriz de confusión (filas = real, columnas = predicho):")
    print(matriz)

    # Qué tanto coincide el árbol con la regla en datos reales (los del origen
    # 'real'/'postulacion'): el modelo debe respetar la política del sistema.
    reales = df[df["origen"] != "sintetico"]
    if not reales.empty:
        acuerdo = (modelo.predict(reales[FEATURES]) == reales["elegible"]).mean()
        print(f"\nAcuerdo del árbol con las reglas en los {len(reales)} pares reales: {acuerdo:.2%}")
        con_resultado = reales[reales["resultado_real"].notna()]
        if not con_resultado.empty:
            real = con_resultado["resultado_real"].astype(int)
            print(f"Predicciones correctas vs resultado real de postulación "
                  f"({len(real)} casos resueltos): "
                  f"{(modelo.predict(con_resultado[FEATURES]) == real).mean():.2%}")

    # ------------------------------------------------------------
    # 5. Guardar modelo + métricas + reglas aprendidas en texto
    # ------------------------------------------------------------
    importancias = {f: round(i, 3) for f, i in zip(FEATURES, modelo.feature_importances_)}
    joblib.dump(modelo, MODELO)
    METRICAS.write_text(json.dumps({
        "features": FEATURES,
        "filas_dataset": len(df),
        "exactitud_reglas": round(acc_reglas, 4),
        "exactitud_modelo": round(acc_ml, 4),
        "reporte": reporte,
        "matriz_confusion": matriz.tolist(),
        "importancia_por_variable": importancias,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    ARBOL_TXT.write_text(export_text(modelo, feature_names=FEATURES), encoding="utf-8")

    print("\nImportancia de cada variable (qué tanto decide cada aspecto):")
    for nombre, imp in sorted(importancias.items(), key=lambda kv: -kv[1]):
        print(f"  {nombre}: {imp:.1%}")
    print(f"\nModelo -> {MODELO}\nMétricas -> {METRICAS}\nÁrbol -> {ARBOL_TXT}")


if __name__ == "__main__":
    main()
