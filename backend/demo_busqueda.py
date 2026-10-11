"""Demo de DFS/BFS de Linkea: imprime lo que pide la tarea y genera dos gráficas.

Se corre desde la carpeta backend:   python demo_busqueda.py excel "machine learning" 4
(necesita:  pip install matplotlib numpy  — solo para esta demo, el servidor no lo usa)

Partes:
  PARTE 1  Leer argumentos y correr los algoritmos
  PARTE 2  Mostrar en consola (orden de exploración, rutas, ciclos, límite)
  PARTE 3  Gráfica 1: el grafo de habilidades con las rutas resaltadas
  PARTE 4  Gráfica 2: cuántas rutas aparecen según el límite de profundidad
"""

import sys

import matplotlib.pyplot as plt
import numpy as np

from app.search.busqueda import bfs_ruta_corta, dfs_primera_ruta, dfs_todas_las_rutas
from app.search.grafo_skills import GRAFO_SKILLS

# Paleta de Linkea (la misma del front) para que la gráfica se vea de la casa.
VINO, CAFE, CARAMELO, CREMA, TINTA = "#6d1e2e", "#8a5a44", "#c8915a", "#fff9f0", "#4a3028"

# ============================================================
# PARTE 1. ARGUMENTOS Y ALGORITMOS
# ============================================================
inicio = sys.argv[1] if len(sys.argv) > 1 else "excel"
objetivo = sys.argv[2] if len(sys.argv) > 2 else "machine learning"
limite = int(sys.argv[3]) if len(sys.argv) > 3 else 4

primera = dfs_primera_ruta(GRAFO_SKILLS, inicio, objetivo, limite)
todas = dfs_todas_las_rutas(GRAFO_SKILLS, inicio, objetivo, limite)
corta = bfs_ruta_corta(GRAFO_SKILLS, inicio, objetivo, limite)

# ============================================================
# PARTE 2. SALIDA EN CONSOLA
# ============================================================
print("=" * 60)
print(f"De «{inicio}» a «{objetivo}»  |  límite de profundidad: {limite}")
print("=" * 60)
for res in (primera, corta, todas):
    print(f"\n[{res.algoritmo}]")
    print("Orden de exploración:", " → ".join(res.orden_exploracion[:25]), "..." if len(res.orden_exploracion) > 25 else "")
    print(f"Nodos explorados (distintos): {len(res.nodos_explorados)}")
    print(f"Mecanismo contra ciclos: {res.mecanismo_ciclos}")
    print(f"Ciclos evitados: {len(res.ciclos_evitados)} | Ramas cortadas por el límite: {res.podados_por_limite}")
    for i, ruta in enumerate(res.rutas[:10], 1):
        print(f"  Ruta {i}: " + " → ".join(ruta))
    if len(res.rutas) > 10:
        print(f"  ... y {len(res.rutas) - 10} rutas más")

# ============================================================
# PARTE 3. GRÁFICA 1: EL GRAFO CON LAS RUTAS RESALTADAS
# ============================================================
# Acomodamos los nodos en círculo (así no necesitamos librerías extra para dibujar grafos).
nombres = list(GRAFO_SKILLS)
angulos = np.linspace(0, 2 * np.pi, len(nombres), endpoint=False)
pos = {n: (np.cos(a), np.sin(a)) for n, a in zip(nombres, angulos)}

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 8), gridspec_kw={"width_ratios": [1.5, 1]})
fig.patch.set_facecolor(CREMA)
fig.suptitle("Rutas de aprendizaje entre habilidades — Linkea", fontsize=20, fontweight="bold", color=TINTA)

for a, vecinos in GRAFO_SKILLS.items():  # aristas de fondo (grises)
    for b in vecinos:
        if a < b:
            ax1.plot(*zip(pos[a], pos[b]), color="#d9c8b8", linewidth=0.8, zorder=1)

en_ruta_corta = set(corta.rutas[0]) if corta.rutas else set()
for ruta in todas.rutas[:10]:  # las primeras rutas, en caramelo
    for a, b in zip(ruta, ruta[1:]):
        ax1.plot(*zip(pos[a], pos[b]), color=CARAMELO, linewidth=2.2, alpha=0.7, zorder=2)
if corta.rutas:  # la ruta más corta, en vino y más gruesa
    for a, b in zip(corta.rutas[0], corta.rutas[0][1:]):
        ax1.plot(*zip(pos[a], pos[b]), color=VINO, linewidth=4.5, zorder=3)

for n, (x, y) in pos.items():
    color = VINO if n in (inicio, objetivo) else (CAFE if n in en_ruta_corta else "white")
    ax1.scatter(x, y, s=700, color=color, edgecolors=CAFE, linewidths=1.5, zorder=4)
    # Etiqueta hacia afuera del círculo, alineada según el lado en el que cae para que no se corte.
    ax1.text(x * 1.12, y * 1.12, n, ha="left" if x > 0.1 else "right" if x < -0.1 else "center",
             va="center", fontsize=9, color=TINTA)

ax1.plot([], [], color=VINO, linewidth=4.5, label=f"Ruta más corta (BFS, {len(corta.rutas[0]) - 1 if corta.rutas else 0} pasos)")
ax1.plot([], [], color=CARAMELO, linewidth=2.2, label=f"Otras rutas (DFS, {len(todas.rutas)} dentro del límite)")
ax1.set_title(f"«{inicio}» → «{objetivo}» con límite {limite}", fontsize=13, color=TINTA)
ax1.legend(loc="lower left", fontsize=10, frameon=False)
ax1.set_axis_off()
ax1.set_xlim(-1.75, 1.75)
ax1.set_ylim(-1.35, 1.35)

# ============================================================
# PARTE 4. GRÁFICA 2: RUTAS SEGÚN EL LÍMITE DE PROFUNDIDAD
# ============================================================
limites = list(range(1, 8))
n_rutas = [len(dfs_todas_las_rutas(GRAFO_SKILLS, inicio, objetivo, lim).rutas) for lim in limites]
n_cortes = [dfs_todas_las_rutas(GRAFO_SKILLS, inicio, objetivo, lim).podados_por_limite for lim in limites]

barras = ax2.bar([str(l) for l in limites], n_rutas, color=CAFE, label="Rutas encontradas")
ax2.bar_label(barras, fontsize=10, color=TINTA, padding=3)
# Las ramas cortadas son muchas más que las rutas, así que van en un eje propio (derecha).
ax3 = ax2.twinx()
ax3.plot([str(l) for l in limites], n_cortes, color=VINO, marker="o", linewidth=2.5, label="Ramas cortadas por el límite")
ax3.set_ylabel("Ramas cortadas", fontsize=12, fontweight="bold", color=VINO)
ax3.spines[["top"]].set_visible(False)
ax2.set_facecolor(CREMA)
ax2.set_title("¿Qué cambia al mover el límite de profundidad?", fontsize=13, color=TINTA)
ax2.set_xlabel("Límite de profundidad (pasos)", fontsize=12, fontweight="bold", color=TINTA)
ax2.set_ylabel("Rutas encontradas", fontsize=12, fontweight="bold", color=TINTA)
ax2.grid(axis="y", linestyle="--", alpha=0.4)
ax2.spines[["top", "right"]].set_visible(False)
h1, l1 = ax2.get_legend_handles_labels()
h2, l2 = ax3.get_legend_handles_labels()
ax2.legend(h1 + h2, l1 + l2, loc="upper left", frameon=False)

fig.text(0.01, 0.01, "Fuente: grafo de habilidades de Linkea | Elaboración propia | UTVT", fontsize=9, color="gray")
plt.tight_layout(rect=(0, 0.02, 1, 0.95))
plt.savefig("grafica_rutas_linkea.png", dpi=200, bbox_inches="tight", facecolor=CREMA)
print("\nGráfica guardada en grafica_rutas_linkea.png")
