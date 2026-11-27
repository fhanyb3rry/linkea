"""Demostración en consola de la Práctica 05 en Linkea: Comparación de Algoritmos + Experimentos A/B/C.

Se ejecuta desde la carpeta backend:
    python demo_p05.py
"""

import sys

from app.ml_vs_reglas.datos import CaracteristicasPar
from app.ml_vs_reglas.practica05 import (
    CARPETA_P05,
    comparar_predicciones_p05,
    entrenar_practica05,
    generar_datos_p05,
)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    df = generar_datos_p05(cantidad=500, semilla=42)
    _, m = entrenar_practica05(df=df, semilla=42)

    print("\n==========================================")
    print("LINKEA · PRACTICA 05: COMPARACION DE ALGORITMOS")
    print("==========================================")

    print("\n==========================================")
    print("1. DATOS GENERADOS")
    print("==========================================")
    print(df[df.columns[:-1]].head(10).round(2).to_string(index=False))
    print("\nCantidad de registros:", m["datos"]["filas"])
    print("Distribucion de resultados:", m["datos"]["distribucion_clases"])

    div = m["division"]
    print("\n==========================================")
    print("2. DISTRIBUCION DE LOS CONJUNTOS (60 / 20 / 20)")
    print("==========================================")
    print("Entrenamiento:", div["entrenamiento"])
    print("Validacion:", div["validacion"])
    print("Prueba:", div["prueba"])

    print("\n==========================================")
    print("4. COMPARACION DE ALGORITMOS (VALIDACION)")
    print("==========================================")
    print(f"{'Algoritmo':<16} {'Exactitud':>11} {'Precision':>11} {'Recall':>10} {'F1-score':>10}")
    for r in m["comparacion_validacion"]:
        marca = "  <-- seleccionado" if r["seleccionado"] else ""
        print(
            f"{r['algoritmo']:<16} "
            f"{r['exactitud']:>10.2%} "
            f"{r['precision']:>10.2%} "
            f"{r['recall']:>9.2%} "
            f"{r['f1_score']:>9.2%}{marca}"
        )

    sel = m["modelo_seleccionado"]
    print("\n==========================================")
    print("5. MODELO SELECCIONADO Y REENTRENAMIENTO (80%)")
    print("==========================================")
    print("Algoritmo:", sel["algoritmo"])
    print(f"F1-score de validacion: {sel['f1_validacion']:.2%}")
    print("Criterio:", sel["criterio"])
    print("Registros de reentrenamiento (60% + 20%):", sel["registros_reentrenamiento"])

    ev = m["evaluacion_final"]
    print("\n==========================================")
    print("6. EVALUACION FINAL CON DATOS DE PRUEBA (20%)")
    print("==========================================")
    print("Algoritmo:", ev["algoritmo"])
    print(f"Exactitud: {ev['exactitud']:.2%}")
    print(f"Precision: {ev['precision']:.2%}")
    print(f"Recall:    {ev['recall']:.2%}")
    print(f"F1-score:  {ev['f1_score']:.2%}")

    print("\n==========================================")
    print("7. REPORTE DE CLASIFICACION")
    print("==========================================")
    print(ev["reporte_texto"])

    print("==========================================")
    print("8. MATRIZ DE CONFUSION")
    print("==========================================")
    for fila in ev["matriz_confusion"]:
        print(" ", fila)

    cv = m["validacion_cruzada"]
    print("\n==========================================")
    print("9. VALIDACION CRUZADA (cv=5, scoring='f1')")
    print("==========================================")
    print("Resultados por particion:", cv["particiones"])
    print(f"Promedio F1:         {cv['promedio_f1']:.2%}")
    print(f"Desviacion estandar: {cv['desviacion_estandar']:.2%}")

    print("\n==========================================")
    print("10. ACTIVIDAD DE MODIFICACION (EXPERIMENTOS A, B Y C)")
    print("==========================================")
    for clave in ("experimento_a", "experimento_b", "experimento_c"):
        exp = m["experimentos"][clave]
        print(f"\n{exp['titulo']}")
        for r in exp["resultados"]:
            print(
                f"  {r['parametro']}={r['valor']:<11} -> "
                f"Exactitud: {r['exactitud']:.2%} | Precision: {r['precision']:.2%} | "
                f"Recall: {r['recall']:.2%} | F1: {r['f1_score']:.2%}"
            )
        print("  Conclusion:", exp["conclusion"])

    caso = CaracteristicasPar(
        horas_dedicacion=11,
        compatibilidad_horaria=90,
        cobertura_skills=88,
        participacion_perfil=4,
    )
    sim = comparar_predicciones_p05(caso)
    print("\n==========================================")
    print("11. PRUEBA EN VIVO CON LOS 3 ALGORITMOS")
    print("==========================================")
    for mod in sim["modelos"]:
        marca = " (Ganador)" if mod["es_ganador"] else ""
        print(
            f"  {mod['algoritmo']:<15}: {mod['etiqueta']} "
            f"({mod['probabilidad_aceptacion']}% prob.){marca}"
        )

    print("\nArchivos PNG y CSV guardados en:", CARPETA_P05)
    print("PROCESO FINALIZADO.")


if __name__ == "__main__":
    main()
