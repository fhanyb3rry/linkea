"""Optimización de hiperparámetros — práctica 6 adaptada a Linkea.

    python -m app.ml.optimizar

En comparar.py los valores de los algoritmos se eligieron a mano. Aquí los
buscamos de forma sistemática con las dos técnicas de la práctica:

    GridSearchCV        prueba TODAS las combinaciones de la rejilla
                        (útil cuando el espacio es chico)
    RandomizedSearchCV  prueba 20 configuraciones aleatorias de rangos más
                        amplios (útil cuando el espacio es grande)

Ambas evalúan con StratifiedKFold(5) solo sobre el 80% de entrenamiento —
el 20% de prueba queda intocable hasta el final, igual que en la práctica.

Hiperparámetros que se exploran por algoritmo:

    Árbol    max_depth, min_samples_split, min_samples_leaf, criterion
    Bosque   n_estimators, max_depth, min_samples_split, min_samples_leaf
    KNN      n_neighbors, weights, metric (dentro de un Pipeline con
             StandardScaler, igual que en comparar.py)

Salida: artefactos/optimizacion/ con el ganador, sus hiperparámetros, la
comparación grid-vs-random y la evaluación final en prueba. El modelo de
producción NO se sustituye solo por ganar aquí: el árbol de profundidad 5
sigue siendo el que explica decision_path; si la búsqueda encuentra algo
mejor, el JSON lo señala como candidato a promover.
"""

import json

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import randint
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, f1_score, confusion_matrix
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from app.ml.datos import (
    FEATURES,
    dividir_por_grupo,
    grupos_de_estudiante,
    kfold_por_grupo,
)
from app.ml.generar_dataset import ARTEFACTOS, CSV

CLASES = {0: "No elegible", 1: "Elegible"}

SEMILLA = 42
CV = kfold_por_grupo(n_splits=5, semilla=SEMILLA)
CARPETA = ARTEFACTOS / "optimizacion"


def rejillas() -> dict:
    """Los tres espacios de búsqueda para GridSearchCV (formato rejilla)."""
    return {
        "Arbol de decision": (
            DecisionTreeClassifier(random_state=SEMILLA),
            {
                "max_depth": [2, 3, 5, 8, 10, None],
                "min_samples_split": [2, 5, 10],
                "min_samples_leaf": [1, 2, 4],
                "criterion": ["gini", "entropy"],
            },
        ),
        "Random Forest": (
            RandomForestClassifier(random_state=SEMILLA, n_jobs=-1),
            {
                "n_estimators": [50, 100, 200],
                "max_depth": [3, 5, 8, None],
                "min_samples_split": [2, 5, 10],
                "min_samples_leaf": [1, 2, 4],
            },
        ),
        "KNN": (
            Pipeline([
                ("escalador", StandardScaler()),
                ("clasificador", KNeighborsClassifier()),
            ]),
            {
                "clasificador__n_neighbors": [3, 5, 7, 9, 11, 15],
                "clasificador__weights": ["uniform", "distance"],
                "clasificador__metric": ["euclidean", "manhattan"],
            },
        ),
    }


def rangos_aleatorios() -> dict:
    """Los espacios más amplios para RandomizedSearchCV (formato distribuciones)."""
    return {
        "Arbol de decision": {
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


def main() -> None:
    df = pd.read_csv(CSV)
    X, y = df[FEATURES], df["elegible"]

    # Igual que la práctica: 80% para optimizar con CV, 20% intocable;
    # la división es por estudiante (sin fuga de perfiles entre conjuntos).
    grupos = grupos_de_estudiante(df)
    i_ent, i_pru = dividir_por_grupo(X, y, grupos, 0.20, SEMILLA)
    X_ent, X_pru = X.iloc[i_ent], X.iloc[i_pru]
    y_ent, y_pru = y.iloc[i_ent], y.iloc[i_pru]
    grupos_ent = grupos[i_ent]
    print(f"Optimización: {len(X_ent)} pares con CV x5 | Prueba final: {len(X_pru)}")

    modelos = rejillas()
    rangos = rangos_aleatorios()
    filas_grid, filas_random, mejores = [], [], {}

    for nombre, (modelo, rejilla) in modelos.items():
        grid = GridSearchCV(modelo, rejilla, scoring="f1", cv=CV, n_jobs=-1,
                            return_train_score=True)
        grid.fit(X_ent, y_ent, groups=grupos_ent)
        filas_grid.append({
            "algoritmo": nombre, "mejor_f1": grid.best_score_,
            "combinaciones": len(grid.cv_results_["params"]),
            "hiperparametros": json.dumps(grid.best_params_),
        })
        mejores[nombre] = grid.best_estimator_
        print(f"\n[GRID] {nombre}: F1 {grid.best_score_:.2%} "
              f"({len(grid.cv_results_['params'])} combinaciones) -> {grid.best_params_}")

        aleatoria = RandomizedSearchCV(modelo, rangos[nombre], n_iter=20,
                                       scoring="f1", cv=CV, n_jobs=-1,
                                       random_state=SEMILLA)
        aleatoria.fit(X_ent, y_ent, groups=grupos_ent)
        filas_random.append({
            "algoritmo": nombre, "mejor_f1": aleatoria.best_score_,
            "combinaciones": 20,
            "hiperparametros": json.dumps(aleatoria.best_params_),
        })
        print(f"[RAND] {nombre}: F1 {aleatoria.best_score_:.2%} (20 aleatorias) "
              f"-> {aleatoria.best_params_}")

    df_grid = pd.DataFrame(filas_grid)
    df_random = pd.DataFrame(filas_random)
    comparacion = df_grid.merge(
        df_random.rename(columns={"mejor_f1": "randomizedsearch", "hiperparametros": "params_random"}),
        on="algoritmo").rename(columns={"mejor_f1": "gridsearch", "hiperparametros": "params_grid"})
    print("\n=== GRID vs RANDOM ===")
    print(comparacion[["algoritmo", "gridsearch", "randomizedsearch"]].to_string(index=False))

    # Ganador global por F1 de GridSearchCV; evaluado una vez en la prueba.
    ganador = df_grid.loc[df_grid["mejor_f1"].idxmax(), "algoritmo"]
    modelo = mejores[ganador]
    pred = modelo.predict(X_pru)
    acc, f1 = accuracy_score(y_pru, pred), f1_score(y_pru, pred)
    print(f"\nGanador: {ganador} | Prueba: accuracy {acc:.2%}, F1 {f1:.2%}")
    print(confusion_matrix(y_pru, pred))

    # Si el ganador no es el árbol de producción, lo anotamos como candidato
    # (no se cambia solo: el árbol se eligió por explicabilidad, no por puntaje).
    produccion = joblib.load(ARTEFACTOS / "modelo_elegibilidad.joblib")
    nota = (
        "El ganador coincide con el modelo de produccion."
        if isinstance(modelo, DecisionTreeClassifier) and ganador == "Arbol de decision"
        else f"{ganador} gano en esta busqueda; candidato a promover si el proyecto "
             "deja de requerir las explicaciones paso a paso del arbol."
    )

    CARPETA.mkdir(exist_ok=True)
    df_grid.to_csv(CARPETA / "resultados_gridsearch.csv", index=False)
    df_random.to_csv(CARPETA / "resultados_randomizedsearch.csv", index=False)
    comparacion.to_csv(CARPETA / "comparacion_metodos.csv", index=False)
    ConfusionMatrixDisplay.from_predictions(
        y_pru, pred, display_labels=list(CLASES.values()), cmap="Blues")
    plt.title(f"Matriz de confusion - {ganador} optimizado")
    plt.tight_layout()
    plt.savefig(CARPETA / "matriz_confusion.png", dpi=150)
    plt.close()

    pos = np.arange(len(comparacion))
    plt.figure(figsize=(8, 5))
    plt.bar(pos - 0.18, comparacion["gridsearch"], width=0.35, label="GridSearchCV")
    plt.bar(pos + 0.18, comparacion["randomizedsearch"], width=0.35, label="RandomizedSearchCV")
    plt.xticks(pos, comparacion["algoritmo"])
    plt.ylim(0, 1.05)
    plt.ylabel("F1 (validacion cruzada)")
    plt.title("Linkea - metodos de optimizacion")
    plt.legend()
    plt.tight_layout()
    plt.savefig(CARPETA / "comparacion_optimizacion.png", dpi=150)
    plt.close()

    (CARPETA / "optimizacion.json").write_text(json.dumps({
        "ganador": ganador,
        "mejores_hiperparametros": df_grid.set_index("algoritmo")["hiperparametros"]
            .map(json.loads).to_dict(),
        "f1_gridsearch": df_grid.set_index("algoritmo")["mejor_f1"].to_dict(),
        "f1_randomizedsearch": df_random.set_index("algoritmo")["mejor_f1"].to_dict(),
        "prueba": {"accuracy": acc, "f1": f1,
                   "matriz_confusion": confusion_matrix(y_pru, pred).tolist()},
        "nota": nota,
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nArtefactos -> {CARPETA}")
    print("PRACTICA 6 (optimizacion) FINALIZADA.")


if __name__ == "__main__":
    main()
