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
# PARTE 1. EL MAPA 
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
# PARTE 2. LA DISTANCIA Y LA HEURÍSTICA (costos ESTIMADOS)
# ============================================================
# h(zona) = lo que tardaría llegar al destino si pudiera ir en LÍNEA RECTA a la velocidad máxima.
# Y la distancia en línea recta es la DISTANCIA EUCLIDIANA de clase:
#       d = √[ (x1 − x2)² + (y1 − y2)² ]
# (también está la de Manhattan, d = |x1 − x2| + |y1 − y2|, para poder compararlas).
# h es una corazonada: casi nunca es el tiempo real (hay curvas, tráfico, rodeos), pero NUNCA debe
# ser mayor que el real. A eso se le llama heurística admisible, y es lo que hace confiable a A*.

TIPOS_DISTANCIA = ("euclidiana", "manhattan")

# Las zonas vienen en latitud y longitud (grados). Para usar la fórmula de clase las pasamos a un
# plano en kilómetros (x hacia el este, y hacia el norte) con una proyección sencilla alrededor del
# centro del mapa. En una zona tan chica (unos 50 km) el error es mínimo.
_LAT0 = sum(lat for lat, _ in ZONAS.values()) / len(ZONAS)
_LNG0 = sum(lng for _, lng in ZONAS.values()) / len(ZONAS)
_KM_POR_GRADO_LAT = 110.57
_KM_POR_GRADO_LNG = 111.32 * math.cos(math.radians(_LAT0))


def a_plano(zona: str) -> tuple[float, float]:
    """Posición de la zona en el plano (x, y) en kilómetros."""
    lat, lng = ZONAS[zona]
    return (lng - _LNG0) * _KM_POR_GRADO_LNG, (lat - _LAT0) * _KM_POR_GRADO_LAT


def dist_euclidiana(a: str, b: str) -> dict:
    """d = √[ (x1 − x2)² + (y1 − y2)² ], con el procedimiento completo."""
    (x1, y1), (x2, y2) = a_plano(a), a_plano(b)
    difs = [x1 - x2, y1 - y2]
    cuadrados = [d * d for d in difs]
    total = sum(cuadrados)
    valor = math.sqrt(total)
    return {
        "difs": difs, "extra": cuadrados, "suma": total, "valor": valor,
        "formula": "d = √[ (x1 − x2)² + (y1 − y2)² ]",
        "pasos": (f"d = √[ ({x1:.2f} − {x2:.2f})² + ({y1:.2f} − {y2:.2f})² ]\n"
                  f"d = √[ {cuadrados[0]:.2f} + {cuadrados[1]:.2f} ]\n"
                  f"d = √{total:.2f}\n"
                  f"d = {valor:.2f} km"),
    }


def dist_manhattan(a: str, b: str) -> dict:
    """d = |x1 − x2| + |y1 − y2|, con el procedimiento completo."""
    (x1, y1), (x2, y2) = a_plano(a), a_plano(b)
    difs = [x1 - x2, y1 - y2]
    absolutos = [abs(d) for d in difs]
    total = sum(absolutos)
    return {
        "difs": difs, "extra": absolutos, "suma": total, "valor": total,
        "formula": "d = |x1 − x2| + |y1 − y2|",
        "pasos": (f"d = |{x1:.2f} − {x2:.2f}| + |{y1:.2f} − {y2:.2f}|\n"
                  f"d = {absolutos[0]:.2f} + {absolutos[1]:.2f}\n"
                  f"d = {total:.2f} km"),
    }


def distancia_km(a: str, b: str, tipo: str = "euclidiana") -> float:
    return (dist_manhattan if tipo == "manhattan" else dist_euclidiana)(a, b)["valor"]


_VELOCIDADES: dict[str, int] = {}


def velocidad_maxima(tipo: str = "euclidiana") -> int:
    """El tramo más rápido del mapa (km/h), redondeado hacia arriba.

    La heurística usa esta velocidad: como ningún tramo real va más rápido (medido con la misma
    distancia), h no puede ser mayor que el tiempo real de un tramo, y queda lo más pegada posible.
    """
    if tipo not in _VELOCIDADES:
        _VELOCIDADES[tipo] = math.ceil(max(distancia_km(a, b, tipo) / minutos * 60 for a, b, minutos in _TRAMOS))
    return _VELOCIDADES[tipo]


VELOCIDAD_MAX_KMH = velocidad_maxima("euclidiana")


def heuristica_hacia(objetivo: str, tipo: str = "euclidiana") -> dict[str, float]:
    """h(n) de cada zona hacia el objetivo, en minutos: distancia ÷ velocidad máxima."""
    v = velocidad_maxima(tipo)
    return {z: round(distancia_km(z, objetivo, tipo) / v * 60, 1) for z in ZONAS}


def calculo_distancia(a: str, b: str, tipo: str = "euclidiana") -> dict:
    """El procedimiento completo entre dos zonas (como la calculadora de clase): tabla, fórmula,
    pasos, la distancia en km y cómo se convierte en los minutos de h."""
    calc = (dist_manhattan if tipo == "manhattan" else dist_euclidiana)(a, b)
    v = velocidad_maxima(tipo)
    minutos = round(calc["valor"] / v * 60, 1)
    (x1, y1), (x2, y2) = a_plano(a), a_plano(b)
    return {
        "tipo": tipo, "origen": a, "destino": b,
        "tabla": [
            {"eje": eje, "a": round(va, 2), "b": round(vb, 2), "dif": round(calc["difs"][i], 2), "extra": round(calc["extra"][i], 2)}
            for i, (eje, va, vb) in enumerate((("x", x1, x2), ("y", y1, y2)))
        ],
        "extra_titulo": "(A − B)²" if tipo == "euclidiana" else "|A − B|",
        "suma": round(calc["suma"], 2), "formula": calc["formula"], "pasos": calc["pasos"],
        "km": round(calc["valor"], 2), "velocidad_kmh": v, "minutos_h": minutos,
        "paso_minutos": f"h = {calc['valor']:.2f} km ÷ {v} km/h × 60 = {minutos} min",
    }


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


def verificar_heuristica(tipo: str = "euclidiana") -> dict:
    """Comprueba que h nunca sobreestima (admisible) y que es consistente, para TODOS los destinos."""
    admisible = consistente = True
    pares = 0
    mayor_exceso = 0.0  # cuánto se acerca h al costo real en el peor caso (1.0 = lo iguala)
    for objetivo in ZONAS:
        h = heuristica_hacia(objetivo, tipo)
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
        "tipo": tipo,
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
    heuristica: str = "euclidiana"  # con qué distancia se calculó h
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


def _resultado(tipo_h, nombre, inicio, objetivo, limite, h, padres, expandidos, registro, ciclos, mecanismo) -> ResultadoTraslado:
    camino = _reconstruir(padres, inicio, objetivo) if objetivo in expandidos else []
    return ResultadoTraslado(
        algoritmo=nombre, inicio=inicio, objetivo=objetivo, heuristica=tipo_h, limite_profundidad=limite,
        encontrado=bool(camino), camino=camino, costo_real=costo_de(camino),
        costo_estimado=h[inicio], aristas=max(len(camino) - 1, 0),
        expandidos=expandidos, cantidad_expandidos=len(expandidos), ciclos_evitados=ciclos,
        registro=registro, mecanismo_ciclos=mecanismo,
    )


def bfs(inicio: str, objetivo: str, limite: int | None = None, tipo_h: str = "euclidiana") -> ResultadoTraslado:
    """Anchura: por niveles. Da la ruta con MENOS TRAMOS, no la de menos minutos."""
    h = heuristica_hacia(objetivo, tipo_h)
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
    return _resultado(tipo_h, "BFS", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set descubiertos: una zona se mete a la cola una sola vez")


def dfs(inicio: str, objetivo: str, limite: int | None = None, tipo_h: str = "euclidiana") -> ResultadoTraslado:
    """Profundidad: se mete lo más hondo posible. Ni el menor número de tramos ni el menor tiempo."""
    h = heuristica_hacia(objetivo, tipo_h)
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
    return _resultado(tipo_h, "DFS", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set descubiertos: una zona se apila una sola vez")


def ucs(inicio: str, objetivo: str, limite: int | None = None, tipo_h: str = "euclidiana") -> ResultadoTraslado:
    """Costo uniforme: siempre expande lo que MENOS minutos reales lleva gastados, g(n)."""
    h = heuristica_hacia(objetivo, tipo_h)
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
    return _resultado(tipo_h, "UCS", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set cerrados: una zona ya expandida no se vuelve a expandir")


def greedy(inicio: str, objetivo: str, limite: int | None = None, tipo_h: str = "euclidiana") -> ResultadoTraslado:
    """Voraz: solo mira h(n), la corazonada. Rápido, pero puede escoger una ruta peor."""
    h = heuristica_hacia(objetivo, tipo_h)
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
    return _resultado(tipo_h, "Greedy", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
                      "set descubiertos: una zona se agrega una sola vez")


def astar(inicio: str, objetivo: str, limite: int | None = None, tipo_h: str = "euclidiana") -> ResultadoTraslado:
    """A*: f(n) = g(n) + h(n), lo que ya llevo gastado más lo que estimo que falta."""
    h = heuristica_hacia(objetivo, tipo_h)
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
    return _resultado(tipo_h, "A*", inicio, objetivo, limite, h, padres, expandidos, registro, ciclos,
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


# ------------------------------------------------------------
# Resumen para el USUARIO: la misma búsqueda, pero explicada en palabras y con los datos justos para
# dibujar un mapa limpio (solo las zonas por las que pasan las rutas, no las 12 del mapa).
# ------------------------------------------------------------


class PasoTraslado(BaseModel):
    de: str
    a: str
    minutos: float


class NodoMapa(BaseModel):
    nombre: str
    g: float  # minutos desde el origen por el camino más rápido (sirve para acomodar el mapa)
    rol: str  # origen | destino | ruta | alternativa


class TramoMapa(BaseModel):
    a: str
    b: str
    minutos: float
    recomendada: bool  # True si es parte de la ruta más rápida


class ResumenTraslado(BaseModel):
    origen: str
    destino: str
    misma_zona: bool = False
    encontrado: bool = True
    minutos: float | None = None
    compatible: bool = False
    limite_minutos: int = LIMITE_TRASLADO_MIN
    ruta: list[str] = Field(default_factory=list)
    pasos: list[PasoTraslado] = Field(default_factory=list)
    total_rutas: int = 0
    alternativas: list[RutaConCosto] = Field(default_factory=list)
    frase: str = ""  # el resumen en español normal
    nodos: list[NodoMapa] = Field(default_factory=list)
    tramos: list[TramoMapa] = Field(default_factory=list)


def _lista_con_y(zonas: list[str]) -> str:
    """['A'] -> 'A' | ['A', 'B'] -> 'A y B' | ['A', 'B', 'C'] -> 'A, B y C'."""
    if len(zonas) == 1:
        return zonas[0]
    return ", ".join(zonas[:-1]) + " y " + zonas[-1]


def resumen_traslado(origen: str, destino: str, limite_min: int = LIMITE_TRASLADO_MIN) -> ResumenTraslado:
    """La ruta más rápida (A*), las otras opciones y una frase que cualquiera entiende."""
    if origen == destino:
        return ResumenTraslado(
            origen=origen, destino=destino, misma_zona=True, minutos=0, compatible=True, limite_minutos=limite_min,
            ruta=[origen], frase=f"Vives en {origen}, la misma zona de la vacante: no necesitas trasladarte.",
            nodos=[NodoMapa(nombre=origen, g=0, rol="origen")],
        )

    mejor = astar(origen, destino)
    if not mejor.encontrado:
        return ResumenTraslado(origen=origen, destino=destino, encontrado=False, limite_minutos=limite_min,
                               frase="No encontramos una ruta entre esas dos zonas.")

    todas = todas_las_rutas(origen, destino, limite=8)
    alternativas = [r for r in todas.rutas if r.camino != mejor.camino][:2]
    minutos = mejor.costo_real or 0
    compatible = minutos <= limite_min

    pasos = [PasoTraslado(de=a, a=b, minutos=GRAFO_ZONAS[a][b]) for a, b in zip(mejor.camino, mejor.camino[1:])]
    por = mejor.camino[1:-1]
    frase = f"Desde {origen} llegas a {destino} en unos {minutos:g} minutos"
    frase += f", pasando por {_lista_con_y(por)}." if por else ", sin pasar por otras zonas."
    if len(todas.rutas) > 1:
        frase += f" Es la más rápida de las {len(todas.rutas)} rutas posibles."
    if alternativas:
        alt = alternativas[0]
        por_alt = alt.camino[1:-1]
        intro = "Otra opción igual de rápida" if alt.minutos == minutos else f"Otra opción: {alt.minutos:g} minutos"
        frase += f" {intro}" + (f", pasando por {_lista_con_y(por_alt)}." if por_alt else ".")
    if compatible:
        frase += f" Está dentro del límite de {limite_min} minutos que usamos para considerar compatible la ubicación."
    else:
        frase += f" Está {minutos - limite_min:g} minutos por encima del límite de {limite_min} que usamos para considerar compatible la ubicación."

    # Datos para el mapa limpio: solo las zonas y tramos de las rutas que se muestran.
    mostradas = [mejor.camino] + [r.camino for r in alternativas]
    g = _costos_reales(origen)
    en_mejor = set(mejor.camino)
    nodos = []
    for zona in dict.fromkeys(z for camino in mostradas for z in camino):
        rol = "origen" if zona == origen else "destino" if zona == destino else "ruta" if zona in en_mejor else "alternativa"
        nodos.append(NodoMapa(nombre=zona, g=g.get(zona, 0), rol=rol))
    aristas_mejor = {frozenset(par) for par in zip(mejor.camino, mejor.camino[1:])}
    vistos: set[frozenset] = set()
    tramos = []
    for camino in mostradas:
        for a, b in zip(camino, camino[1:]):
            clave = frozenset((a, b))
            if clave in vistos:
                continue
            vistos.add(clave)
            tramos.append(TramoMapa(a=a, b=b, minutos=GRAFO_ZONAS[a][b], recomendada=clave in aristas_mejor))

    return ResumenTraslado(
        origen=origen, destino=destino, minutos=minutos, compatible=compatible, limite_minutos=limite_min,
        ruta=mejor.camino, pasos=pasos, total_rutas=len(todas.rutas), alternativas=alternativas,
        frase=frase, nodos=nodos, tramos=tramos,
    )


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
    frase: str = ""  # el resumen en español normal


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
        frase=resumen_traslado(a, b, limite_min).frase,
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


def resumen_todos_los_pares(tipo_h: str = "euclidiana") -> dict:
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
                r = funcion(a, b, None, tipo_h)
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
