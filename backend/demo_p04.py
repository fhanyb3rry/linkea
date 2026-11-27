"""Demostración en consola de la Práctica 04 en Linkea: Entrenamiento, Validación y Prueba.

Se ejecuta desde la carpeta backend:
    python demo_p04.py
"""

import sys

from app.ml_vs_reglas.practica04 import CARPETA_P04, entrenar_practica04, generar_datos_p04


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    df = generar_datos_p04(cantidad=500, semilla=42)
    _, m = entrenar_practica04(df=df, semilla=42)

    print("\n==========================================")
    print("LINKEA · PRACTICA 04: ENTRENAMIENTO, VALIDACION Y PRUEBA")
    print("==========================================")

    print("\n==========================================")
    print("1. DATOS GENERADOS")
    print("==========================================")
    print(df[df.columns[:-1]].head(10).to_string(index=False))
    print("\nCantidad de registros:", m["datos"]["filas"])
    print("Distribucion de las clases:", m["datos"]["distribucion_clases"])

    div = m["division"]
    print("\n==========================================")
    print("2. DISTRIBUCION DE LOS CONJUNTOS (60 / 20 / 20)")
    print("==========================================")
    print("Entrenamiento:", div["entrenamiento"])
    print("Validacion:", div["validacion"])
    print("Prueba:", div["prueba"])

    print("\n==========================================")
    print("3. COMPARACION DE MODELOS")
    print("==========================================")
    print(f"{'Profundidad':<14} {'Entrenamiento':>15} {'Validacion':>13} {'Diferencia':>12}  Diagnostico")
    for r in m["comparacion_modelos"]:
        print(
            f"{r['profundidad']:<14} "
            f"{r['entrenamiento']:>14.2%} "
            f"{r['validacion']:>12.2%} "
            f"{r['diferencia']:>11.2%}  "
            f"{r['diagnostico']}"
        )

    print("\n==========================================")
    print("4. ANALISIS DE AJUSTE")
    print("==========================================")
    for r in m["comparacion_modelos"]:
        print(f"\nModelo: {r['profundidad']}")
        print(f"  Exactitud entrenamiento: {r['entrenamiento']:.2%}")
        print(f"  Exactitud validacion:    {r['validacion']:.2%}")
        print(f"  Diferencia:              {r['diferencia']:.2%}")
        print(f"  -> {r['diagnostico']}: {r['explicacion']}")

    sel = m["modelo_seleccionado"]
    print("\n==========================================")
    print("5. MODELO SELECCIONADO")
    print("==========================================")
    print("Profundidad seleccionada:", sel["profundidad"])
    print(f"Exactitud de validacion:  {sel['exactitud_validacion']:.2%}")
    print("Configuracion interna max_depth:", sel["max_depth_param"])

    ev = m["evaluacion_final"]
    print("\n==========================================")
    print("6. EVALUACION FINAL (CONJUNTO DE PRUEBA)")
    print("==========================================")
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
    print(" ", ev["desglose_matriz"]["interpretacion"])

    cv = m["validacion_cruzada"]
    print("\n==========================================")
    print("9. VALIDACION CRUZADA (StratifiedKFold, cv=5)")
    print("==========================================")
    print("Resultados de cada particion:", cv["particiones"])
    print(f"Promedio:            {cv['promedio']:.2%}")
    print(f"Desviacion estandar: {cv['desviacion_estandar']:.2%}")
    print("Nota:", cv["nota_metodologica"])

    print("\n==========================================")
    print("10. CONCLUSIONES Y ARCHIVOS GENERADOS")
    print("==========================================")
    print("Archivos PNG y CSV guardados en:", CARPETA_P04)
    print("PRACTICA 04 FINALIZADA.")


if __name__ == "__main__":
    main()
