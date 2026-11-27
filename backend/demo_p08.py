"""Demostración en consola de la Práctica 08 en Linkea: Estabilidad ARI, Escaladores y Atípicos.

Se ejecuta desde la carpeta backend:
    python demo_p08.py
"""

import sys

from app.segmentacion.practica08 import CARPETA_P08, entrenar_practica08


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    m, _ = entrenar_practica08(semilla=42)

    print("\n" + "=" * 60)
    print("LINKEA · PRACTICA 08: ANALISIS AVANZADO DE SEGMENTOS")
    print("=" * 60)

    print("\n1. COMPARACION DE INICIALIZACIONES (k-means++ vs random)")
    for r in m["inicializaciones"]:
        print(f"  {r['inicializacion']:<12} -> Inercia: {r['inercia']:.4f} | Silhouette: {r['silhouette']:.4f}")

    print("\n2. COMPARACION DE ESCALADORES (StandardScaler vs MinMaxScaler)")
    for r in m["escaladores"]["comparacion"]:
        print(f"  {r['escalador']:<15} -> Inercia: {r['inercia']:.4f} | Silhouette: {r['silhouette']:.4f}")
    print("  Coincidencia ARI entre ambos escaladores:", m["escaladores"]["ari_coincidencia_entre_escaladores"])

    print("\n3. ESTABILIDAD MEDIANTE ADJUSTED RAND INDEX (ARI)")
    print("  Semillas evaluadas:", m["estabilidad_ari"]["semillas"])
    print("  ARI promedio:", m["estabilidad_ari"]["promedio_ari"])

    at = m["atipicos"]
    print("\n4. DETECCION DE CASOS ATIPICOS / SINGULARES (Percentil 95)")
    print(f"  Umbral de distancia (P{at['percentil']:g}): {at['umbral_distancia']}")
    print(f"  Candidatos a revision: {at['total_candidatos']} ({at['porcentaje']}%)")
    for c in at["candidatos"][:5]:
        print(
            f"    {c['id_estudiante']} ({c['perfil_academico']}) -> "
            f"dist={c['distancia_centroide']} | sil={c['silhouette_individual']}"
        )

    print("\n5. RESUMEN FINAL")
    print("  Silhouette global final:", m["silhouette_final"])
    print("  Archivos PNG y CSV guardados en:", CARPETA_P08)
    print("PRACTICA 08 FINALIZADA.")


if __name__ == "__main__":
    main()
