"""Demostración en consola del modelo de Machine Learning de Linkea (Reglas Fijas vs Árbol de Decisión).

Se corre desde la carpeta backend:
    python demo_ml.py

Ejecuta el mismo motor `app.ml_vs_reglas` que usa la API web:
  1. Genera 500 casos históricos reproducibles (semilla 42) con numpy y pandas
  2. Divide en 60% entrenamiento, 20% validación y 20% prueba
  3. Selecciona el mejor max_depth con validación + validación cruzada (cross_val_score, cv=5)
  4. Evalúa en el conjunto de prueba contra el sistema de reglas fijas
  5. Guarda las 3 gráficas PNG con os y matplotlib en uploads/ml/
  6. Prueba un caso individual nuevo
"""

from app.ml_vs_reglas.datos import CaracteristicasPar, generar_datos_sinteticos
from app.ml_vs_reglas.modelo import CARPETA_ML, entrenar_y_evaluar, predecir_caracteristicas


def main() -> None:
    df = generar_datos_sinteticos(cantidad=500, semilla=42)
    _, m = entrenar_y_evaluar(df, semilla=42)

    print("\n" + "=" * 64)
    print("LINKEA - MODELO DE MACHINE LEARNING VS REGLAS FIJAS")
    print("=" * 64)

    print(f"\n1. DATOS GENERADOS: {m['datos']['filas']} registros x {m['datos']['columnas']} columnas")
    print("   Distribucion de clases:", m["datos"]["distribucion_clases"])

    div = m["division"]
    print("\n2. DIVISION DE DATOS (60 / 20 / 20)")
    print(f"   Entrenamiento (60%): {div['entrenamiento']} registros")
    print(f"   Validacion    (20%): {div['validacion']} registros")
    print(f"   Prueba        (20%): {div['prueba']} registros")

    print("\n3. SELECCION DEL MODELO CON VALIDACION Y VALIDACION CRUZADA (cv=5)")
    for h in m["validacion"]["historial"]:
        marca = "  <-- elegido" if h["max_depth"] == m["validacion"]["mejor_max_depth"] else ""
        print(
            f"   max_depth={h['max_depth']} -> "
            f"validacion: {h['exactitud_validacion']:.2%} | "
            f"cruzada (cv=5): {h['exactitud_cruzada']:.2%}{marca}"
        )

    pr = m["prueba"]
    print("\n4. EVALUACION FINAL EN EL CONJUNTO DE PRUEBA")
    print(f"   Exactitud de Reglas Fijas:     {pr['exactitud_reglas']:.2%}")
    print(f"   Exactitud de Machine Learning: {pr['exactitud_ml']:.2%}")
    print("\n5. REPORTE DE CLASIFICACION (PRUEBA)")
    print(pr["reporte_texto"])
    print("6. MATRIZ DE CONFUSION (PRUEBA)")
    for fila in pr["matriz_confusion_ml"]:
        print("  ", fila)

    caso = CaracteristicasPar(
        horas_dedicacion=11,
        compatibilidad_horaria=90,
        cobertura_skills=88,
        participacion_perfil=4,
    )
    sim = predecir_caracteristicas(caso)
    print("\n7. PRUEBA CON UN CANDIDATO NUEVO (CASO FRONTERA)")
    print("   Caracteristicas:", sim["caracteristicas"])
    print(f"   Reglas fijas:     {sim['reglas']['etiqueta']}")
    print(f"   Machine Learning: {sim['ml']['etiqueta']} ({sim['ml']['probabilidad_aceptacion']}% prob.)")
    print(f"   Interpretacion:   {sim['resumen']}")
    print(f"\nGraficas y modelo guardados en: {CARPETA_ML}")


if __name__ == "__main__":
    main()
