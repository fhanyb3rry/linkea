"""Los ejemplos de la clase (p11 / p21) corridos con los algoritmos de Linkea, más la comparación de paletas.

Se corre desde la carpeta backend:   python demo_clase.py
(necesita matplotlib y numpy: pip install -r requirements-demo.txt)

Partes:
  PARTE 1  El grafo de p11 (A-F, con ciclos) y el ciclo simple A→B→C→D→A que pide la tarea
  PARTE 2  Probar distintos límites de profundidad y ver cómo cambia el resultado
  PARTE 3  Comparar paletas de color (como graficas3.py) y justificar la que usa Linkea
"""

import matplotlib.pyplot as plt
import numpy as np

from app.search.busqueda import bfs_ruta_corta, dfs_primera_ruta, dfs_todas_las_rutas
from app.search.grafo_skills import GRAFO_SKILLS

# ============================================================
# PARTE 1. LOS GRAFOS DE LA CLASE
# ============================================================

# El de p11: cada estado se mueve a izquierda o derecha, así que cada arista va en los dos sentidos
# (y por eso A-B-C-F-E-D-A forma un ciclo). Aquí A es el inicio y F el objetivo.
GRAFO_P11 = {
    "A": ["B", "D"],
    "B": ["A", "C"],
    "C": ["B", "F"],
    "D": ["A", "E"],
    "E": ["D", "F"],
    "F": ["C", "E"],
}

# El ciclo simple del enunciado:  A → B → C → D → A  (con una salida a F para tener objetivo).
GRAFO_CICLO = {
    "A": ["B"],
    "B": ["C"],
    "C": ["D", "F"],
    "D": ["A"],  # aquí se cierra el ciclo: D vuelve a A
    "F": [],
}


def mostrar(titulo, grafo, inicio, objetivo, limite=None):
    print("\n" + "=" * 60)
    print(f"{titulo}   ({inicio} → {objetivo}, límite: {limite if limite is not None else 'sin límite'})")
    print("=" * 60)
    for res in (dfs_primera_ruta(grafo, inicio, objetivo, limite),
                bfs_ruta_corta(grafo, inicio, objetivo, limite),
                dfs_todas_las_rutas(grafo, inicio, objetivo, limite)):
        print(f"\n[{res.algoritmo}]")
        print("  Orden de exploración:", " → ".join(res.orden_exploracion))
        print("  Nodos explorados:    ", ", ".join(res.nodos_explorados))
        for i, ruta in enumerate(res.rutas, 1):
            print(f"  Ruta {i}: " + " → ".join(ruta))
        if not res.rutas:
            print("  Sin ruta dentro del límite")
        print("  Contra ciclos:", res.mecanismo_ciclos)
        print("  Ciclos evitados:", [" → ".join(c) for c in res.ciclos_evitados])
        print("  Ramas cortadas por el límite:", res.podados_por_limite)


mostrar("Grafo de p11 (con ciclos)", GRAFO_P11, "A", "F")
mostrar("Ciclo simple A→B→C→D→A", GRAFO_CICLO, "A", "F")

# ============================================================
# PARTE 2. DISTINTOS LÍMITES DE PROFUNDIDAD
# ============================================================
print("\n" + "=" * 60)
print("¿Cómo cambia el resultado según el límite? (grafo de p11, A → F)")
print("=" * 60)
print(f"{'Límite':>7} | {'Rutas':>5} | {'Nodos explorados':>16} | {'Ramas cortadas':>14}")
limites = [1, 2, 3, 4, 5, 6]
for lim in limites:
    r = dfs_todas_las_rutas(GRAFO_P11, "A", "F", lim)
    print(f"{lim:>7} | {len(r.rutas):>5} | {len(r.nodos_explorados):>16} | {r.podados_por_limite:>14}")

# ============================================================
# PARTE 3. COMPARAR PALETAS (como graficas3.py)
# ============================================================
# Los datos del grafo de p11 se quedan en 2 rutas, así que para esta gráfica usamos el grafo de habilidades
# de Linkea (excel → machine learning), donde las rutas sí crecen al subir el límite.
rutas_por_limite = [len(dfs_todas_las_rutas(GRAFO_SKILLS, "excel", "machine learning", lim).rutas) for lim in limites]

# Mismos datos en tres paletas. La idea de la clase: la paleta depende de lo que se muestre.
#   - Categorías sin orden (departamentos, tipos de algoritmo) → paleta CATEGÓRICA.
#   - Algo que crece de menos a más (rutas según el límite)   → paleta SECUENCIAL.
LINKEA = ["#6d1e2e", "#8a5a44", "#c8915a", "#a0b8a0", "#d9b8a0", "#4a3028"]  # vino, café, caramelo...
n = len(limites)
paletas = {
    "Linkea (categórica, cálida)": [LINKEA[i % len(LINKEA)] for i in range(n)],
    "Secuencial «Blues» (de menos a más)": [plt.cm.Blues(0.35 + 0.6 * i / (n - 1)) for i in range(n)],
    "Secuencial Linkea (café → vino)": [
        tuple(np.array(plt.matplotlib.colors.to_rgb("#e8cdb5")) * (1 - t) + np.array(plt.matplotlib.colors.to_rgb("#6d1e2e")) * t)
        for t in np.linspace(0.1, 1, n)
    ],
}

fig, axs = plt.subplots(len(paletas), 1, figsize=(10, 11), sharex=True)
fig.patch.set_facecolor("#fff9f0")
fig.suptitle("Rutas excel → machine learning según el límite de profundidad: tres paletas", fontsize=18, fontweight="bold", color="#4a3028")
for ax, (nombre, colores) in zip(axs, paletas.items()):
    barras = ax.bar([str(l) for l in limites], rutas_por_limite, color=colores)
    ax.bar_label(barras, padding=2, color="#4a3028")
    ax.set_title(f"Paleta: {nombre}", fontsize=12, fontweight="bold", color="#4a3028")
    ax.set_ylabel("Rutas")
    ax.set_ylim(0, max(rutas_por_limite) * 1.15)
    ax.set_facecolor("#fff9f0")
    ax.grid(axis="y", linestyle="--", alpha=0.3)
    ax.spines[["top", "right"]].set_visible(False)
axs[-1].set_xlabel("Límite de profundidad (pasos)", fontweight="bold")
fig.text(
    0.01, 0.005,
    "Conclusión: como el dato crece de menos a más, conviene una paleta secuencial; la categórica sirve para "
    "áreas o carreras sin orden. | Grafo de habilidades de Linkea | UTVT",
    fontsize=8, color="gray",
)
plt.tight_layout(rect=(0, 0.02, 1, 0.96))
plt.savefig("paletas_linkea.png", dpi=200, bbox_inches="tight", facecolor="#fff9f0")
print("\nGráfica guardada en paletas_linkea.png")
