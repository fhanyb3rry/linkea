"""Algoritmos de búsqueda ciega sobre el grafo de habilidades (DFS y BFS).

Va dividido en partes, igual que los ejercicios de clase:
  PARTE 1  Qué devolvemos (el resultado, con todo lo que pide la tarea)
  PARTE 2  DFS clásico: la primera ruta que encuentre (visitados globales)
  PARTE 3  DFS de todas las rutas: backtracking + control de ciclos + límite de profundidad
  PARTE 4  BFS: la ruta más corta (por niveles)

Ojo con la diferencia que pide la maestra:
  - nodos explorados  = todo lo que el algoritmo tuvo que revisar (puede ser mucho)
  - ruta encontrada   = solo el camino que de verdad llega al objetivo
"""

from collections import deque

from pydantic import BaseModel, Field

# ============================================================
# PARTE 1. QUÉ DEVOLVEMOS
# ============================================================


class ResultadoBusqueda(BaseModel):
    algoritmo: str
    inicio: str
    objetivo: str
    limite_profundidad: int | None  # None = sin límite
    orden_exploracion: list[str] = Field(default_factory=list)  # cada vez que se "visita" un nodo
    nodos_explorados: list[str] = Field(default_factory=list)  # lo mismo pero sin repetidos (el set)
    rutas: list[list[str]] = Field(default_factory=list)  # solo los caminos que llegan al objetivo
    ciclos_evitados: list[list[str]] = Field(default_factory=list)  # intentos de volver a un nodo ya visitado
    podados_por_limite: int = 0  # ramas que se cortaron por llegar al límite
    mecanismo_ciclos: str = ""


def _sin_repetidos(orden: list[str]) -> list[str]:
    return list(dict.fromkeys(orden))  # dict conserva el orden en que aparecen


# ============================================================
# PARTE 2. DFS CLÁSICO (se detiene en la primera ruta)
# ============================================================
# Es el de clase: un set `visitados` GLOBAL. Si un nodo ya se visitó, no se vuelve a entrar
# nunca (ni por otro camino). Es rápido y no cicla, pero por eso solo sirve para hallar UNA ruta.


def dfs_primera_ruta(
    grafo: dict[str, list[str]], inicio: str, objetivo: str, limite: int | None = None
) -> ResultadoBusqueda:
    res = ResultadoBusqueda(
        algoritmo="DFS (primera ruta)",
        inicio=inicio,
        objetivo=objetivo,
        limite_profundidad=limite,
        mecanismo_ciclos="set `visitados` global: un nodo visitado no se vuelve a explorar",
    )
    visitados: set[str] = set()
    camino: list[str] = []

    def explorar(actual: str, profundidad: int) -> bool:
        visitados.add(actual)
        camino.append(actual)
        res.orden_exploracion.append(actual)

        if actual == objetivo:  # ¡llegamos! ya no seguimos buscando
            res.rutas.append(list(camino))
            return True

        if limite is not None and profundidad >= limite:  # ya no bajamos más por esta rama
            res.podados_por_limite += 1
            camino.pop()
            return False

        for vecino in grafo.get(actual, []):
            if vecino in visitados:
                res.ciclos_evitados.append(camino + [vecino])
                continue
            if explorar(vecino, profundidad + 1):
                return True

        camino.pop()  # backtracking: de aquí no se llega, regresamos un paso
        return False

    if inicio in grafo:
        explorar(inicio, 0)
    res.nodos_explorados = _sin_repetidos(res.orden_exploracion)
    return res


# ============================================================
# PARTE 3. DFS DE TODAS LAS RUTAS (backtracking)
# ============================================================
# Aquí NO podemos usar un `visitados` global: si marcamos un nodo para siempre, nunca
# encontraríamos la segunda ruta que también pasa por él. Entonces usamos `en_camino`:
# solo los nodos de la ruta ACTUAL. Al regresar (backtracking) el nodo se "desmarca", así
# otra rama puede volver a usarlo, pero dentro de una misma ruta jamás se repite un nodo,
# y eso es justo lo que evita los ciclos infinitos.


def dfs_todas_las_rutas(
    grafo: dict[str, list[str]],
    inicio: str,
    objetivo: str,
    limite: int | None = None,
    max_rutas: int = 200,
) -> ResultadoBusqueda:
    res = ResultadoBusqueda(
        algoritmo="DFS (todas las rutas)",
        inicio=inicio,
        objetivo=objetivo,
        limite_profundidad=limite,
        mecanismo_ciclos="set `en_camino`: nodos de la ruta actual; se quitan al hacer backtracking",
    )
    camino = [inicio]
    en_camino = {inicio}

    def explorar(actual: str, profundidad: int) -> None:
        res.orden_exploracion.append(actual)

        if actual == objetivo:  # guardamos la ruta y NO nos detenemos: seguimos con las demás ramas
            res.rutas.append(list(camino))
            return

        if limite is not None and profundidad >= limite:  # límite de profundidad: se corta la rama
            res.podados_por_limite += 1
            return

        for vecino in grafo.get(actual, []):
            if len(res.rutas) >= max_rutas:  # tope de seguridad por si el grafo crece mucho
                return
            if vecino in en_camino:  # ¡ciclo! este vecino ya está en la ruta actual
                res.ciclos_evitados.append(camino + [vecino])
                continue

            camino.append(vecino)  # avanzamos...
            en_camino.add(vecino)
            explorar(vecino, profundidad + 1)
            camino.pop()  # ...y retrocedemos (backtracking)
            en_camino.remove(vecino)

    if inicio in grafo:
        explorar(inicio, 0)
    res.nodos_explorados = _sin_repetidos(res.orden_exploracion)
    return res


# ============================================================
# PARTE 4. BFS (la ruta más corta)
# ============================================================
# Igual que el de clase pero con deque (cola eficiente) en lugar de list.pop(0). Explora por
# niveles: primero todo lo que está a 1 paso, luego a 2... por eso la primera ruta que encuentra
# es la que tiene menos pasos.


def bfs_ruta_corta(
    grafo: dict[str, list[str]], inicio: str, objetivo: str, limite: int | None = None
) -> ResultadoBusqueda:
    res = ResultadoBusqueda(
        algoritmo="BFS (ruta más corta)",
        inicio=inicio,
        objetivo=objetivo,
        limite_profundidad=limite,
        mecanismo_ciclos="set `visitados` global: un nodo se encola una sola vez",
    )
    if inicio not in grafo:
        return res

    cola = deque([[inicio]])
    visitados = {inicio}

    while cola:
        camino = cola.popleft()
        actual = camino[-1]
        res.orden_exploracion.append(actual)

        if actual == objetivo:
            res.rutas.append(camino)
            break

        if limite is not None and len(camino) - 1 >= limite:
            res.podados_por_limite += 1
            continue

        for vecino in grafo.get(actual, []):
            if vecino in visitados:
                res.ciclos_evitados.append(camino + [vecino])
                continue
            visitados.add(vecino)
            cola.append(camino + [vecino])

    res.nodos_explorados = _sin_repetidos(res.orden_exploracion)
    return res


ALGORITMOS = {
    "dfs": dfs_primera_ruta,
    "dfs_todas": dfs_todas_las_rutas,
    "bfs": bfs_ruta_corta,
}
