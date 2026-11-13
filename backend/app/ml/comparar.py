"""Compara algoritmos de clasificación sobre el dataset de Linkea.

    python -m app.ml.comparar

Es la práctica 5 aplicada al proyecto: sobre el mismo pares.csv se enfrentan
tres algoritmos para ver cuál predice mejor la elegibilidad con datos que no
ha visto:

    Árbol de decisión  reglas de decisión sobre las 4 variables del par
    Random Forest      muchos árboles votando juntos
    KNN                los pares más parecidos deciden (necesita escalar)

Además corre los tres experimentos de la actividad de modificación:
    A) KNN con n_neighbors = 3, 5, 7, 9, 15
    B) Random Forest con n_estimators = 50, 100, 200, 500
    C) Árbol con max_depth = 2, 3, 5, 8, sin límite

El ganador se decide por F1 en validación; luego se reentrena con
entrenamiento + validación y se evalúa una vez en la prueba.

Deja en app/ml/artefactos/:
    comparacion_algoritmos.csv   tabla comparativa de los 3 algoritmos
    experimentos.csv             resultados de los experimentos A/B/C
    comparacion.json             resumen completo para /ai/modelo
"""

import json

import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
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
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from app.ml.datos import FEATURES, regla_elegible
from app.ml.generar_dataset import ARTEFACTOS, CSV

SEMILLA = 42

COMPARACION_CSV = ARTEFACTOS / "comparacion_algoritmos.csv"
EXPERIMENTOS_CSV = ARTEFACTOS / "experimentos.csv"
COMPARACION_JSON = ARTEFACTOS / "comparacion.json"


def _fabricas():
    """Los tres algoritmos de la práctica, con los parámetros base."""
    return {
        "Arbol de decision": DecisionTreeClassifier(
            max_depth=5, min_samples_leaf=4, random_state=SEMILLA
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, min_samples_leaf=2, n_jobs=-1, random_state=SEMILLA
        ),
        # KNN compara distancias: sin escalar, los minutos (0-90) aplastarían
        # a cobertura_skills (0-1). El Pipeline escala solo con datos de entrenamiento.
        "KNN": Pipeline([
            ("escalador", StandardScaler()),
            ("clasificador", KNeighborsClassifier(n_neighbors=7, weights="distance")),
        ]),
    }


def _metricas(y_real, predicciones) -> dict:
    return {
        "exactitud": accuracy_score(y_real, predicciones),
        "precision": precision_score(y_real, predicciones, zero_division=0),
        "recall": recall_score(y_real, predicciones, zero_division=0),
        "f1_score": f1_score(y_real, predicciones, zero_division=0),
    }


def main() -> None:
    df = pd.read_csv(CSV)
    X = df[FEATURES]
    y = df["elegible"]
    print(f"=== COMPARACIÓN DE ALGORITMOS ({len(df)} filas) ===")

    # ------------------------------------------------------------
    # 1. Misma división 60/20/20 que usa entrenar.py
    # ------------------------------------------------------------
    X_ent, X_tmp, y_ent, y_tmp = train_test_split(
        X, y, test_size=0.40, random_state=SEMILLA, stratify=y
    )
    X_val, X_pru, y_val, y_pru = train_test_split(
        X_tmp, y_tmp, test_size=0.50, random_state=SEMILLA, stratify=y_tmp
    )

    # ------------------------------------------------------------
    # 2. Entrenar los 3 algoritmos y medirlos en validación
    # ------------------------------------------------------------
    modelos = _fabricas()
    resultados = []
    for nombre, modelo in modelos.items():
        modelo.fit(X_ent, y_ent)
        resultados.append({"algoritmo": nombre, **_metricas(y_val, modelo.predict(X_val))})

    df_res = pd.DataFrame(resultados).sort_values("f1_score", ascending=False).reset_index(drop=True)
    df_res.to_csv(COMPARACION_CSV, index=False, encoding="utf-8")
    print("\n=== VALIDACIÓN (ordenado por F1) ===")
    print(df_res.to_string(index=False, formatters={
        m: "{:.2%}".format for m in ["exactitud", "precision", "recall", "f1_score"]
    }))

    # También las reglas fijas como referencia (línea base del sistema).
    pred_reglas = X_val.apply(regla_elegible, axis=1)
    print(f"\nReglas fijas en validación: "
          f"{accuracy_score(y_val, pred_reglas):.2%} exactitud")

    # ------------------------------------------------------------
    # 3. Ganador: se reentrena con entrenamiento + validación y
    #    se evalúa una sola vez en la prueba
    # ------------------------------------------------------------
    mejor_nombre = df_res.iloc[0]["algoritmo"]
    X_final, y_final = pd.concat([X_ent, X_val]), pd.concat([y_ent, y_val])
    mejor = clone(modelos[mejor_nombre])
    mejor.fit(X_final, y_final)
    pred_pru = mejor.predict(X_pru)
    finales = _metricas(y_pru, pred_pru)
    matriz = confusion_matrix(y_pru, pred_pru, labels=[0, 1])
    print(f"\n=== GANADOR: {mejor_nombre} ===")
    print({k: f"{v:.2%}" for k, v in finales.items()})
    print("Matriz de confusión:")
    print(matriz)

    # ------------------------------------------------------------
    # 4. Validación cruzada del ganador (sobre el 80%, sin tocar prueba)
    # ------------------------------------------------------------
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMILLA)
    puntuaciones = cross_val_score(
        clone(modelos[mejor_nombre]), X_final, y_final, cv=cv, scoring="f1", n_jobs=-1
    )
    print(f"\nValidación cruzada F1: {puntuaciones.mean():.2%} "
          f"(± {puntuaciones.std():.2%})")

    # ------------------------------------------------------------
    # 5. Experimentos de la actividad: un parámetro a la vez
    # ------------------------------------------------------------
    experimentos = []
    for k in [3, 5, 7, 9, 15]:
        m = Pipeline([("escalador", StandardScaler()),
                      ("c", KNeighborsClassifier(n_neighbors=k, weights="distance"))])
        m.fit(X_ent, y_ent)
        experimentos.append({"experimento": "A - KNN n_neighbors", "valor": k,
                             **_metricas(y_val, m.predict(X_val))})
    for n in [50, 100, 200, 500]:
        m = RandomForestClassifier(n_estimators=n, min_samples_leaf=2,
                                   n_jobs=-1, random_state=SEMILLA)
        m.fit(X_ent, y_ent)
        experimentos.append({"experimento": "B - RF n_estimators", "valor": n,
                             **_metricas(y_val, m.predict(X_val))})
    for prof in [2, 3, 5, 8, None]:
        m = DecisionTreeClassifier(max_depth=prof, min_samples_leaf=4, random_state=SEMILLA)
        m.fit(X_ent, y_ent)
        experimentos.append({"experimento": "C - Arbol max_depth",
                             "valor": "sin_limite" if prof is None else prof,
                             **_metricas(y_val, m.predict(X_val))})

    df_exp = pd.DataFrame(experimentos)
    df_exp.to_csv(EXPERIMENTOS_CSV, index=False, encoding="utf-8")
    print("\n=== EXPERIMENTOS (validación) ===")
    for exp, grupo in df_exp.groupby("experimento", sort=False):
        print(f"\n{exp}:")
        print(grupo[["valor", "exactitud", "f1_score"]].to_string(
            index=False, formatters={"exactitud": "{:.2%}".format, "f1_score": "{:.2%}".format}))

    # ------------------------------------------------------------
    # 6. Guardar resumen para el endpoint /ai/modelo
    # ------------------------------------------------------------
    COMPARACION_JSON.write_text(json.dumps({
        "algoritmos_comparados": [r["algoritmo"] for r in resultados],
        "tabla_validacion": [{**r, **{m: round(r[m], 4) for m in
                                     ["exactitud", "precision", "recall", "f1_score"]}}
                             for r in resultados],
        "ganador": mejor_nombre,
        "metricas_prueba": {k: round(v, 4) for k, v in finales.items()},
        "matriz_confusion": matriz.tolist(),
        "reporte": classification_report(y_pru, pred_pru, labels=[0, 1],
                                         target_names=["No elegible", "Elegible"],
                                         zero_division=0, output_dict=True),
        "validacion_cruzada_f1": {
            "folds": [round(float(p), 4) for p in puntuaciones],
            "promedio": round(float(puntuaciones.mean()), 4),
            "desviacion": round(float(puntuaciones.std()), 4),
        },
        "experimentos": [{**e, **{m: round(e[m], 4) for m in
                                  ["exactitud", "precision", "recall", "f1_score"]}}
                         for e in experimentos],
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nTabla -> {COMPARACION_CSV}\nExperimentos -> {EXPERIMENTOS_CSV}\n"
          f"Resumen -> {COMPARACION_JSON}")


if __name__ == "__main__":
    main()
