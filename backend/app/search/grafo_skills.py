"""Grafo de habilidades de Linkea (PARTE 1: el espacio de búsqueda).

Igual que en clase, el grafo es un diccionario: cada clave es un estado (aquí, una habilidad)
y su lista son los estados a los que "puedo moverme" (habilidades relacionadas que se aprenden
más fácil si ya sabes esa).

Cómo lo leemos en Linkea:
  - Estado inicial  = una habilidad que el estudiante YA tiene.
  - Estado objetivo = una habilidad que la vacante pide y al estudiante le FALTA.
  - Una ruta        = una ruta de aprendizaje (qué le conviene aprender para llegar a esa skill).
"""

# Pares de habilidades relacionadas. Las relaciones son de ida y vuelta (si Python te acerca a SQL,
# SQL te acerca a Python), y por eso el grafo TIENE CICLOS A <-> B. Justo por eso necesitamos el
# control de ciclos en la búsqueda.
_RELACIONES = [
    # Datos
    ("python", "sql"), ("python", "estadistica"), ("python", "machine learning"),
    ("sql", "excel"), ("sql", "power bi"), ("excel", "power bi"), ("excel", "estadistica"),
    ("estadistica", "machine learning"), ("power bi", "analitica"), ("excel", "analitica"),
    # Web
    ("html", "css"), ("css", "javascript"), ("html", "javascript"), ("javascript", "react"),
    ("javascript", "node"), ("node", "python"), ("react", "diseno ui"), ("node", "sql"),
    # Desarrollo en general
    ("git", "python"), ("git", "javascript"), ("git", "docker"), ("docker", "linux"),
    ("linux", "python"), ("java", "sql"), ("java", "git"),
    # Diseño
    ("figma", "diseno ui"), ("diseno ui", "ux"), ("figma", "photoshop"),
    ("photoshop", "illustrator"), ("illustrator", "figma"), ("ux", "investigacion"),
    # Marketing
    ("marketing digital", "redes sociales"), ("marketing digital", "seo"),
    ("redes sociales", "copywriting"), ("seo", "copywriting"), ("marketing digital", "analitica"),
    ("redes sociales", "photoshop"), ("investigacion", "marketing digital"),
]


def _construir(relaciones: list[tuple[str, str]]) -> dict[str, list[str]]:
    """Arma el diccionario de vecinos, uniendo cada par en los dos sentidos."""
    grafo: dict[str, list[str]] = {}
    for a, b in relaciones:
        grafo.setdefault(a, []).append(b)
        grafo.setdefault(b, []).append(a)
    # Ordenamos los vecinos para que el recorrido siempre salga en el mismo orden (se puede explicar).
    return {skill: sorted(vecinos) for skill, vecinos in sorted(grafo.items())}


GRAFO_SKILLS = _construir(_RELACIONES)


def normalizar(skill: str) -> str:
    """En el grafo todo va en minúsculas y sin espacios de sobra (como en logic_rules)."""
    return skill.strip().lower()
