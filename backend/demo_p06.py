"""Demostración en consola de la Práctica 06 en Linkea: Optimización de Hiperparámetros.

Se ejecuta desde la carpeta backend:
    python demo_p06.py
"""

import sys

from app.ml_vs_reglas.practica05 import generar_datos_p05
from app.ml_vs_reglas.practica06 import CARPETA_P06, entrenar_practica06


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    df = generar_datos_p05(cantidad=500, semilla=42)
    _, m = entrenar_practica06(df=df, semilla=42)

    print("\n==========================================")
    print("LINKEA · PRACTICA 06: OPTIMIZACION DE HIPERPARAMETROS")
    print("==========================================")

    print("\n1. DATOS Y DIVISION")
    print("Total:", m["datos"]["filas"], "| Clases:", m["datos"]["distribucion_clases"])
    print("Entrenamiento (80%):", m["division"]["entrenamiento_cv"], "| Prueba (20%):", m["division"]["prueba"])

    print("\n==========================================")
    print("3-4. RESULTADOS GRIDSEARCHCV (StratifiedKFold, cv=5)")
    print("==========================================")
    for r in m["gridsearch"]:
        print(f"  {r['algoritmo']:<15} | Mejor F1: {r['mejor_f1']:.2%} | Combinaciones: {r['combinaciones']}")
        print(f"    Mejores hiperparametros: {r['hiperparametros']}")

    print("\n==========================================")
    print("5. RESULTADOS RANDOMIZEDSEARCHCV (n_iter=20)")
    print("==========================================")
    for r in m["randomizedsearch"]:
        print(f"  {r['algoritmo']:<15} | Mejor F1: {r['mejor_f1']:.2%}")
        print(f"    Mejores hiperparametros: {r['hiperparametros']}")

    print("\n==========================================")
    print("6. COMPARACION DE METODOS DE OPTIMIZACION")
    print("==========================================")
    print(f"{'Algoritmo':<16} {'GridSearchCV':>14} {'RandomizedSearchCV':>20}")
    for c in m["comparacion_metodos"]:
        print(f"{c['algoritmo']:<16} {c['gridsearch']:>13.2%} {c['randomizedsearch']:>19.2%}")

    sel = m["modelo_seleccionado"]
    ev = m["evaluacion_final"]
    print("\n==========================================")
    print("7-8. MEJOR MODELO OPTIMIZADO Y EVALUACION EN PRUEBA (20%)")
    print("==========================================")
    print("Mejor algoritmo:", sel["algoritmo"], f"(F1 CV: {sel['f1_cv']:.2%})")
    print("Configuracion:", sel["mejores_hiperparametros"])
    print(f"Accuracy:  {ev['exactitud']:.2%}")
    print(f"Precision: {ev['precision']:.2%}")
    print(f"Recall:    {ev['recall']:.2%}")
    print(f"F1-score:  {ev['f1_score']:.2%}")

    print("\n9. REPORTE DE CLASIFICACION")
    print(ev["reporte_texto"])

    print("10. MATRIZ DE CONFUSION")
    for fila in ev["matriz_confusion"]:
        print(" ", fila)

    print("\nArchivos PNG y CSV guardados en:", CARPETA_P06)
    print("PRACTICA 06 FINALIZADA.")


if __name__ == "__main__":
    main()
