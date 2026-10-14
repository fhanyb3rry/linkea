"""Tiempo de traslado entre zonas con búsqueda heurística (BFS, DFS, UCS, Greedy y A*).

  PARTE 1  El mapa: zonas con coordenadas y los minutos REALES de cada tramo
  PARTE 2  La heurística: minutos ESTIMADOS en línea recta (y la prueba de que no exagera)
  PARTE 3  Los cinco algoritmos (mismo formato de resultado para poder compararlos)
  PARTE 4  Todas las rutas con backtracking, control de ciclos y límite de profundidad
  PARTE 5  Lo que usa el resto de Linkea: tiempo de traslado entre dos zonas

"""

import heapq
import math
import unicodedata
from collections import deque

from pydantic import BaseModel, Field

# ============================================================
# PARTE 1. EL MAPA (costos REALES)
# ============================================================

# Zonas del Valle de Toluca (y la CDMX, que queda más lejos): nombre -> (latitud, longitud).
ZONAS: dict[str, tuple[float, float]] = {
    "Toluca": (19.2826, -99.6557),
    "Metepec": (19.2527, -99.6040),
    "Lerma": (19.2849, -99.5114),
    "Zinacantepec": (19.2830, -99.7370),
    "San Mateo Atenco": (19.2667, -99.5333),
    "Almoloya de Juárez": (19.3667, -99.7583),
    "Xonacatlán": (19.4000, -99.5333),
    "Ocoyoacac": (19.2700, -99.4600),
    "Calimaya": (19.1667, -99.6167),
    "Tenango del Valle": (19.1000, -99.5997),
    "Santiago Tianguistenco": (19.1833, -99.4667),
    "Ciudad de México": (19.3590, -99.2600),
}

# Tramos (zona A, zona B, minutos reales en auto o transporte). Van en los DOS sentidos, así que el
# mapa tiene ciclos (Toluca -> Metepec -> San Mateo Atenco -> Toluca...) y hay que cuidarlos.
_TRAMOS: list[tuple[str, str, int]] = [
    ("Toluca", "Metepec", 15),
    ("Toluca", "Zinacantepec", 20),
    ("Toluca", "San Mateo Atenco", 20),
    ("Toluca", "Lerma", 25),
    ("Toluca", "Almoloya de Juárez", 25),
    ("Toluca", "Xonacatlán", 30),
    ("Metepec", "San Mateo Atenco", 15),
    ("Metepec", "Calimaya", 20),
    ("San Mateo Atenco", "Lerma", 10),
    ("Lerma", "Ocoyoacac", 12),
    ("Lerma", "Xonacatlán", 25),
    ("Lerma", "Ciudad de México", 50),
    ("Ocoyoacac", "Ciudad de México", 45),
    ("Ocoyoacac", "Santiago Tianguistenco", 20),
    ("Zinacantepec", "Almoloya de Juárez", 25),
    ("Calimaya", "Tenango del Valle", 20),
    ("Calimaya", "Santiago Tianguistenco", 30),
]

# Cómo se escriben a veces las zonas en los perfiles -> el nombre que usamos en el mapa.
_ALIAS = {"cdmx": "Ciudad de México", "cdmx sur": "Ciudad de México", "cdmx norte": "Ciudad de México",
          "ciudad de mexico": "Ciudad de México", "df": "Ciudad de México"}

# Hasta cuántos minutos de traslado consideramos "ubicación compatible" (proposición del filtro 1).
LIMITE_TRASLADO_MIN = 45


def _velocidad_maxima() -> int:
    """El tramo más rápido del mapa (km/h), redondeado hacia arriba.

    La heurística usa esta velocidad: como ningún tramo real va más rápido, h nunca puede ser mayor
    que el tiempo real (y como es la velocidad del mejor tramo, h queda lo más pegada posible).
    """
    return math.ceil(max(distancia_km(a, b) / minutos * 60 for a, b, minutos in _TRAMOS))


def _clave(texto: str) -> str:
    """Sin acentos, minúsculas y sin espacios de sobra: 'Almoloya de Juárez ' == 'almoloya de juarez'."""
    sin_acentos = unicodedata.normalize("NFD", texto)
    return "".join(c for c in sin_acentos if unicodedata.category(c) != "Mn").strip().lower()


_POR_CLAVE = {_clave(z): z for z in ZONAS}
_POR_CLAVE.update({_clave(alias): destino for alias, destino in _ALIAS.items()})


def nombre_zona(texto: str) -> str | None:
    """El nombre oficial de la zona en el mapa, o None si no la conocemos."""
    return _POR_CLAVE.get(_clave(texto))


def _construir_grafo() -> dict[str, dict[str, int]]:
    grafo: dict[str, dict[str, int]] = {z: {} for z in ZONAS}
    for a, b, minutos in _TRAMOS:
        grafo[a][b] = minutos
        grafo[b][a] = minutos
    return {z: dict(sorted(v.items())) for z, v in sorted(grafo.items())}


GRAFO_ZONAS = _construir_grafo()


# ============================================================
# PARTE 2. LA HEURÍSTICA (costos ESTIMADOS)
# ============================================================
# h(zona) = lo que tardaría llegar al destino si pudiera ir en LÍNEA RECTA a la velocidad máxima.
# Es una corazonada: casi nunca es el tiempo real (hay curvas, tráfico, rodeos), pero NUNCA es
# mayor que el real. A eso se le llama heurística admisible, y es lo que hace confiable a A*.


def distancia_km(a: str, b: str) -> float:
    """Distancia en línea recta entre dos zonas (fórmula de haversine)."""
    lat1, lng1 = map(math.radians, ZONAS[a])
    lat2, lng2 = map(math.radians, ZONAS[b])
    d = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(d))


VELOCIDAD_MAX_KMH = _velocidad_maxima()


def heuristica_hacia(objetivo: str) -> dict[str, float]:
    """h(n) de cada zona hacia el objetivo, en minutos."""
    return {z: round(distancia_km(z, objetivo) / VELOCIDAD_MAX_KMH * 60, 1) for z in ZONAS}


def _costos_reales(inicio: str) -> dict[str, float]:
    """Minutos reales mínimos desde `inicio` a todas las zonas (Dijkstra), solo para verificar."""
    mejor = {inicio: 0.0}
    cola = [(0.0, inicio)]
    while cola:
        g, n = heapq.heappop(cola)
        if g > mejor.get(n, math.inf):
            continue
        for v, w in GRAFO_ZONAS[n].items():
            if g + w < mejor.get(v, math.inf):
                mejor[v] = g + w
                heapq.heappush(cola, (g + w, v))
    return mejor


def verificar_heuristica() -> dict:
    """Comprueba que h nunca sobreestima (admisible) y que es consistente, para TODOS los destinos."""
    admisible = consistente = True
    pares = 0
    mayor_exceso = 0.0  # cuánto se acerca h al costo real en el peor caso (1.0 = lo iguala)
    for objetivo in ZONAS:
        h = heuristica_hacia(objetivo)
        real = {z: _costos_reales(z).get(objetivo, math.inf) for z in ZONAS}
        for z in ZONAS:
            pares += 1
            if h[z] > real[z] + 1e-9:
                admisible = False
            if real[z] > 0 and math.isfinite(real[z]):
                mayor_exceso = max(mayor_exceso, h[z] / real[z])
            for v, w in GRAFO_ZONAS[z].items():
                if h[z] > w + h[v] + 1e-9:
                    consistente = False
    return {
        "admisible": admisible,
        "consistente": consistente,
        "pares_revisados": pares,
        "h_sobre_real_maximo": round(mayor_exceso, 2),
    }


# ============================================================
# PARTE 3. LOS CINCO ALGORITMOS
# ============================================================


class ResultadoTraslado(BaseModel):
    algoritmo: str
    inicio: str
    objetivo: str
    limite_profundidad: int | None = None
    encontrado: bool = False
    camino: list[str] = Field(default_factory=list)  # solo la ruta que llega al objetivo
    costo_real: float | None = None  # minutos reales sumando los tramos del camino
    costo_estimado: float | None = None  # h(inicio): la corazonada inicial
    aristas: int = 0
    expandidos: list[str] = Field(default_factory=list)  # orden de exploración
    cantidad_expandidos: int = 0
    ciclos_evitados: list[list[str]] = Field(default_factory=list)  # [desde, hacia] ya descubierto
    registro: list[str] = Field(default_factory=list)  # paso a paso, en palabras
    mecanismo_ciclos: str = ""


def costo_de(camino: list[str]) -> float | None:
    """Suma de los minutos reales de cada tramo del camino."""
    if not camino:
        return None
    return float(sum(GRAFO_ZONAS[a][b] for a, b in zip(camino, camino[1:])))


def _reconstruir(padres: dict, inicio: str, objetivo: str) -> list[str]:
    if objetivo not in padres:
        return []
    camino, actual = [], objetivo
    while actual is not None:
        camino.append(actual)
        actual = padres[actual]
    camino.reverse()
    return camino if camino[0] == inicio else []


def _resultado(nombre, inicio, objetivo, limite, h, padres, expandidos, registro, ciclos, mecanismo) -> ResultadoTraslado:
    camino = _reconstruir(padres, inicio, objetivo) if objetivo in expandidos else []
    return ResultadoTraslado(
        algoritmo=nombre, inicio=inicio, objetivo=objetivo, limite_profundidad=limite,
        encontrado=bool(camino), camino=camino, costo_real=costo_de(camino),
        costo_estimado=h[inicio], aristas=max(len(camino) - 1, 0),
        expandidos=expandidos, cantidad_expandidos=len(expandidos), ciclos_evitados=ciclos,
        registro=registro, mecanismo_ciclos=mecanismo,
    )


def bfs(inicio: str, objetivo: str, limite: int | None = None) -> ResultadoTraslado:
    """Anchura: por niveles. Da la ruta con MENOS TRAMOS, no la de menos minutos."""
    h = heuristica_hacia(objetivo)
    cola = deque([(inicio, 0)])
    descubiertos, padres = {inicio}, {inicio: None}
    expandidos, registro, ciclos = [], [], []
    while cola:
        actual, prof = cola.popleft()
        expandidos.append(actual)
        registro.append(f"BFS: sacamos {actual} de la cola (nivel {prof}).")
        if actual == objetivo:
            break
        if limite is not None and prof >= limite:
            registro.append(f"  Límite de profundidad ({limite}): ya no seguimos por {actual}.")
            continue
        for vecino, minutos in GRAFO_ZONAS[actual].items():
            if vecino in descubiertos:
                ciclos.append([actual, vecino])
                continue
            descubiertos.add(vecino)
            padres[vecino] = actual
            cola.append((vecino, prof + 1))
            registro.append(f"  Descubrimos {vecino} desde {actual} ({minutos} min).")
    return _resultado("BFS", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set descubiertos: una zona se mete a la cola una sola vez")


def dfs(inicio: str, objetivo: str, limite: int | None = None) -> ResultadoTraslado:
    """Profundidad: se mete lo más hondo posible. Ni el menor número de tramos ni el menor tiempo."""
    h = heuristica_hacia(objetivo)
    pila = [(inicio, 0)]
    descubiertos, padres = {inicio}, {inicio: None}
    expandidos, registro, ciclos = [], [], []
    while pila:
        actual, prof = pila.pop()
        expandidos.append(actual)
        registro.append(f"DFS: sacamos {actual} de la pila (profundidad {prof}).")
        if actual == objetivo:
            break
        if limite is not None and prof >= limite:
            registro.append(f"  Límite de profundidad ({limite}): ya no bajamos por {actual}.")
            continue
        # Se invierte para que la primera zona alfabéticamente sea la primera en salir.
        for vecino, minutos in reversed(list(GRAFO_ZONAS[actual].items())):
            if vecino in descubiertos:
                ciclos.append([actual, vecino])
                continue
            descubiertos.add(vecino)
            padres[vecino] = actual
            pila.append((vecino, prof + 1))
            registro.append(f"  Apilamos {vecino} desde {actual} ({minutos} min).")
    return _resultado("DFS", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set descubiertos: una zona se apila una sola vez")


def ucs(inicio: str, objetivo: str, limite: int | None = None) -> ResultadoTraslado:
    """Costo uniforme: siempre expande lo que MENOS minutos reales lleva gastados, g(n)."""
    h = heuristica_hacia(objetivo)
    frontera = [(0.0, inicio)]
    mejor_g, padres, prof = {inicio: 0.0}, {inicio: None}, {inicio: 0}
    cerrados, expandidos, registro, ciclos = set(), [], [], []
    while frontera:
        g, actual = heapq.heappop(frontera)
        if g > mejor_g.get(actual, math.inf) or actual in cerrados:
            continue
        cerrados.add(actual)
        expandidos.append(actual)
        registro.append(f"UCS: expandimos {actual} con g(n)={g:g} min.")
        if actual == objetivo:
            break
        if limite is not None and prof[actual] >= limite:
            registro.append(f"  Límite de profundidad ({limite}): ya no seguimos por {actual}.")
            continue
        for vecino, minutos in GRAFO_ZONAS[actual].items():
            if vecino in cerrados:
                ciclos.append([actual, vecino])
                continue
            nuevo = g + minutos
            if nuevo < mejor_g.get(vecino, math.inf):
                mejor_g[vecino], padres[vecino], prof[vecino] = nuevo, actual, prof[actual] + 1
                heapq.heappush(frontera, (nuevo, vecino))
                registro.append(f"  Mejor tiempo hasta {vecino}: g(n)={nuevo:g} min.")
    return _resultado("UCS", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set cerrados: una zona ya expandida no se vuelve a expandir")


def greedy(inicio: str, objetivo: str, limite: int | None = None) -> ResultadoTraslado:
    """Voraz: solo mira h(n), la corazonada. Rápido, pero puede escoger una ruta peor."""
    h = heuristica_hacia(objetivo)
    frontera = [(h[inicio], inicio)]
    descubiertos, padres, prof = {inicio}, {inicio: None}, {inicio: 0}
    expandidos, registro, ciclos = [], [], []
    while frontera:
        h_actual, actual = heapq.heappop(frontera)
        expandidos.append(actual)
        registro.append(f"Greedy: expandimos {actual} con h(n)={h_actual:g} min.")
        if actual == objetivo:
            break
        if limite is not None and prof[actual] >= limite:
            registro.append(f"  Límite de profundidad ({limite}): ya no seguimos por {actual}.")
            continue
        for vecino, _minutos in GRAFO_ZONAS[actual].items():
            if vecino in descubiertos:
                ciclos.append([actual, vecino])
                continue
            descubiertos.add(vecino)
            padres[vecino], prof[vecino] = actual, prof[actual] + 1
            heapq.heappush(frontera, (h[vecino], vecino))
            registro.append(f"  Agregamos {vecino}: h(n)={h[vecino]:g} min.")
    return _resultado("Greedy", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set descubiertos: una zona se agrega una sola vez")


def astar(inicio: str, objetivo: str, limite: int | None = None) -> ResultadoTraslado:
    """A*: f(n) = g(n) + h(n), lo que ya llevo gastado más lo que estimo que falta."""
    h = heuristica_hacia(objetivo)
    frontera = [(h[inicio], 0.0, inicio)]
    mejor_g, padres, prof = {inicio: 0.0}, {inicio: None}, {inicio: 0}
    expandidos, registro, ciclos = [], [], []
    while frontera:
        f, g, actual = heapq.heappop(frontera)
        if g > mejor_g.get(actual, math.inf):
            continue
        expandidos.append(actual)
        registro.append(f"A*: expandimos {actual}: g={g:g} + h={h[actual]:g} = f={f:g} min.")
        if actual == objetivo:
            break
        if limite is not None and prof[actual] >= limite:
            registro.append(f"  Límite de profundidad ({limite}): ya no seguimos por {actual}.")
            continue
        for vecino, minutos in GRAFO_ZONAS[actual].items():
            nuevo_g = g + minutos
            if nuevo_g < mejor_g.get(vecino, math.inf):
                mejor_g[vecino], padres[vecino], prof[vecino] = nuevo_g, actual, prof[actual] + 1
                nuevo_f = nuevo_g + h[vecino]
                heapq.heappush(frontera, (nuevo_f, nuevo_g, vecino))
                registro.append(f"  Actualizamos {vecino}: g={nuevo_g:g}, h={h[vecino]:g}, f={nuevo_f:g}.")
            else:
                ciclos.append([actual, vecino])  # ya había una forma igual o mejor de llegar
    return _resultado("A*", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "dict mejor_g: solo se reabre una zona si llegamos a ella en menos minutos")


ALGORITMOS_TRASLADO = {"bfs": bfs, "dfs": dfs, "ucs": ucs, "greedy": greedy, "astar": astar}


# ============================================================
# PARTE 4. TODAS LAS RUTAS (backtracking)
# ============================================================
# Igual que en el DFS de todas las rutas de habilidades: `en_camino` evita los ciclos y el límite
# de profundidad corta las ramas largas. Aquí además cada ruta lleva sus minutos reales.


class RutaConCosto(BaseModel):
    camino: list[str]
    minutos: float
    aristas: int


class TodasLasRutas(BaseModel):
    inicio: str
    objetivo: str
    limite_profundidad: int | None
    rutas: list[RutaConCosto] = Field(default_factory=list)  # de la más rápida a la más lenta
    orden_exploracion: list[str] = Field(default_factory=list)
    ciclos_evitados: list[list[str]] = Field(default_factory=list)
    podados_por_limite: int = 0
    mecanismo_ciclos: str = "set en_camino: zonas de la ruta actual; se quitan al hacer backtracking"


def todas_las_rutas(inicio: str, objetivo: str, limite: int | None = 6, max_rutas: int = 50) -> TodasLasRutas:
    res = TodasLasRutas(inicio=inicio, objetivo=objetivo, limite_profundidad=limite)
    camino, en_camino = [inicio], {inicio}

    def explorar(actual: str, prof: int) -> None:
        res.orden_exploracion.append(actual)
        if actual == objetivo:
            res.rutas.append(RutaConCosto(camino=list(camino), minutos=costo_de(camino) or 0, aristas=len(camino) - 1))
            return
        if limite is not None and prof >= limite:
            res.podados_por_limite += 1
            return
        for vecino in GRAFO_ZONAS[actual]:
            if len(res.rutas) >= max_rutas:
                return
            if vecino in en_camino:  # ¡ciclo!
                res.ciclos_evitados.append(camino + [vecino])
                continue
            camino.append(vecino)
            en_camino.add(vecino)
            explorar(vecino, prof + 1)
            camino.pop()
            en_camino.remove(vecino)

    explorar(inicio, 0)
    res.rutas.sort(key=lambda r: (r.minutos, r.aristas))
    return res


# ============================================================
# PARTE 5. LO QUE USA EL RESTO DE LINKEA
# ============================================================


class TrasladoPar(BaseModel):
    conocido: bool  # False si alguna de las dos zonas no está en el mapa
    origen: str
    destino: str
    ruta: list[str] = Field(default_factory=list)
    minutos_reales: float | None = None
    minutos_estimados: float | None = None  # lo que decía la heurística al inicio
    nodos_explorados: int = 0
    limite_minutos: int = LIMITE_TRASLADO_MIN
    compatible: bool = False


def tiempo_traslado(zona_origen: str, zona_destino: str, limite_min: int = LIMITE_TRASLADO_MIN) -> TrasladoPar:
    """Tiempo de traslado entre dos zonas (con A*). Si no conocemos alguna zona, `conocido` es False."""
    a, b = nombre_zona(zona_origen), nombre_zona(zona_destino)
    if a is None or b is None:
        return TrasladoPar(conocido=False, origen=zona_origen, destino=zona_destino, limite_minutos=limite_min)
    r = astar(a, b)
    return TrasladoPar(
        conocido=True, origen=a, destino=b, ruta=r.camino, minutos_reales=r.costo_real,
        minutos_estimados=r.costo_estimado, nodos_explorados=r.cantidad_expandidos,
        limite_minutos=limite_min, compatible=r.encontrado and (r.costo_real or 0) <= limite_min,
    )


def ubicacion_compatible(zona_estudiante: str, zona_vacante: str) -> bool:
    """La proposición de ubicación del filtro 1: traslado <= LIMITE_TRASLADO_MIN minutos.

    Si alguna zona no está en el mapa, se usa la regla de antes: misma zona (así los perfiles con
    zonas raras no se rompen).
    """
    t = tiempo_traslado(zona_estudiante, zona_vacante)
    if not t.conocido:
        return _clave(zona_estudiante) == _clave(zona_vacante)
    return t.compatible


class ResumenAlgoritmo(BaseModel):
    algoritmo: str
    no_optimas: int  # en cuántos pares NO dio la ruta de menos minutos
    expandidos_promedio: float


def resumen_todos_los_pares() -> dict:
    """Corre los 5 algoritmos en TODOS los pares de zonas y los compara (la prueba de que la heurística ayuda)."""
    nombres = {"bfs": "BFS", "dfs": "DFS", "ucs": "UCS", "greedy": "Greedy", "astar": "A*"}
    no_optimas = {k: 0 for k in nombres}
    expandidos = {k: 0 for k in nombres}
    pares = 0
    for a in ZONAS:
        for b in ZONAS:
            if a == b:
                continue
            pares += 1
            optimo = ucs(a, b).costo_real  # UCS siempre da el mínimo, sirve de referencia
            for k, funcion in ALGORITMOS_TRASLADO.items():
                r = funcion(a, b)
                expandidos[k] += r.cantidad_expandidos
                if (r.costo_real or math.inf) > (optimo or 0) + 1e-9:
                    no_optimas[k] += 1
    return {
        "pares": pares,
        "algoritmos": [
            ResumenAlgoritmo(algoritmo=nombres[k], no_optimas=no_optimas[k],
                             expandidos_promedio=round(expandidos[k] / pares, 1)).model_dump()
            for k in nombres
        ],
    }


if __name__ == "__main__":
    # Demo en consola:  python -m app.search.traslado Zinacantepec Lerma
    import sys

    a = sys.argv[1] if len(sys.argv) > 1 else "Zinacantepec"
    b = sys.argv[2] if len(sys.argv) > 2 else "Lerma"
    print("Heurística:", verificar_heuristica())
    print(f"\n{'Algoritmo':8} | {'Ruta':45} | {'Min':>4} | Expandidos")
    for f in ALGORITMOS_TRASLADO.values():
        r = f(a, b)
        print(f"{r.algoritmo:8} | {' → '.join(r.camino):45} | {r.costo_real or 0:>4g} | {r.cantidad_expandidos} ({', '.join(r.expandidos)})")
    print("\nTodas las rutas:")
    for r in todas_las_rutas(a, b, 5).rutas:
        print(f"  {r.minutos:g} min: {' → '.join(r.camino)}")
