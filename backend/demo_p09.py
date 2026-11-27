"""Demostración en consola de la Práctica 09 en Linkea: Reducción de Dimensionalidad con PCA.

Se ejecuta desde la carpeta backend:
    python demo_p09.py
"""

import sys

from app.segmentacion.practica09 import CARPETA_P09, entrenar_practica09


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    m, _ = entrenar_practica09(semilla=42)

    print("\n" + "=" * 65)
    print("LINKEA · PRACTICA 09: REDUCCION DE DIMENSIONALIDAD MEDIANTE PCA")
    print("=" * 65)

    print("\n1. TABLA DE VARIANZA EXPLICADA Y ACUMULADA")
    for v in m["varianza"]:
        print(
            f"  {v['componente']} -> Explicada: {v['porcentaje_explicado']:>6.2f}% | "
            f"Acumulada: {v['porcentaje_acumulado']:>6.2f}%"
        )

    print("\n2. CARGAS (LOADINGS) DE CADA VARIABLE")
    for c in m["cargas"]:
        print(
            f"  {c['componente']}: horas={c['horas_disponibles']:+.3f}, "
            f"avance={c['avance_academico']:+.3f}, "
            f"portafolio={c['evidencias_portafolio']:+.3f}, "
            f"habilidades={c['dominio_habilidades']:+.3f}"
        )

    sel = m["seleccion_componentes"]
    print("\n3. SELECCION DE COMPONENTES Y RECONSTRUCCION")
    print(f"  Varianza objetivo:           {sel['varianza_objetivo']}%")
    print(f"  Componentes seleccionadas:   {sel['componentes_seleccionadas']}")
    print(f"  Varianza acumulada lograda:  {sel['varianza_conservada']}%")
    print(f"  Varianza en mapa 2D (PC1+2): {sel['varianza_2d']}%")
    print(f"  Error cuadratico medio MSE:  {sel['mse_reconstruccion']}")

    print("\nArchivos PNG y CSV guardados en:", CARPETA_P09)
    print("PRACTICA 09 FINALIZADA.")


if __name__ == "__main__":
    main()
