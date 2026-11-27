"""Demostración en consola de la Práctica 07 en Linkea: Segmentación K-Means.

Se ejecuta desde la carpeta backend:
    python demo_p07.py
"""

import sys

from app.segmentacion.practica07 import CARPETA_P07, entrenar_practica07


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    m, df = entrenar_practica07(semilla=42)

    print("\n==========================================")
    print("LINKEA · PRACTICA 07: SEGMENTACION MEDIANTE K-MEANS")
    print("==========================================")
    print("Total de estudiantes:", m["datos"]["total_estudiantes"])
    print("\nPrimeros 8 registros:")
    print(df[["id_estudiante", "horas_disponibles", "avance_academico", "evidencias_portafolio", "dominio_habilidades", "cluster", "perfil"]].head(8).round(2).to_string(index=False))

    print("\n==========================================")
    print("2. METODO DEL CODO (K=1..8)")
    print("==========================================")
    for r in m["metodo_codo"]:
        print(f"  K={r['k']} | Inercia (WCSS) = {r['inercia']:.2f}")

    print("\n==========================================")
    print("3. SILHOUETTE SCORE (K=2..8)")
    print("==========================================")
    for r in m["evaluacion_silhouette"]:
        marca = "  <-- optimo" if r["k"] == m["mejor_k_silhouette"] else ""
        print(f"  K={r['k']} | Silhouette Score = {r['silhouette']:.4f}{marca}")

    print("\n==========================================")
    print("4. PERFILES PROMEDIO Y CENTROIDES (K=3)")
    print("==========================================")
    for g in m["modelo_final"]["grupos"]:
        p = g["promedios"]
        print(
            f"  [{g['cluster']}] {g['perfil']:<27} ({g['cantidad']} est., {g['porcentaje']}%) -> "
            f"Horas: {p['horas_disponibles']:.2f} | Avance: {p['avance_academico']:.2f}% | "
            f"Portafolio: {p['evidencias_portafolio']:.2f} | Habilidades: {p['dominio_habilidades']:.2f}%"
        )

    esc = m["escalamiento"]
    print("\n==========================================")
    print("5. COMPARACION ESCALADO VS SIN ESCALAR")
    print("==========================================")
    print(f"  Silhouette con StandardScaler: {esc['silhouette_con_escalador']:.4f}")
    print(f"  Silhouette sin escalar:        {esc['silhouette_sin_escalador']:.4f}")

    print("\nArchivos PNG y CSV guardados en:", CARPETA_P07)
    print("PRACTICA 07 FINALIZADA.")


if __name__ == "__main__":
    main()
