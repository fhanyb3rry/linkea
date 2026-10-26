"""Freno contra fuerza bruta en el login.

Cuenta los intentos fallidos por correo + IP en una ventana de tiempo y bloquea con 429
cuando se pasa del máximo. Es en memoria del proceso: para producción con varios workers
habría que moverlo a Redis o a un middleware como slowapi.
"""

import time
from collections import defaultdict

INTENTOS_MAX = 5
VENTANA_SEG = 15 * 60  # 15 minutos

# clave -> marcas de tiempo de los intentos fallidos recientes
_fallos: dict[str, list[float]] = defaultdict(list)


def _podar(marcas: list[float], ahora: float) -> list[float]:
    return [m for m in marcas if ahora - m < VENTANA_SEG]


def segundos_bloqueado(clave: str) -> int:
    """Segundos que faltan para desbloquear la clave; 0 si puede intentar."""
    ahora = time.monotonic()
    marcas = _podar(_fallos[clave], ahora)
    _fallos[clave] = marcas
    if len(marcas) < INTENTOS_MAX:
        return 0
    return int(VENTANA_SEG - (ahora - marcas[0])) + 1


def registrar_fallo(clave: str) -> None:
    _fallos[clave].append(time.monotonic())


def limpiar(clave: str) -> None:
    _fallos.pop(clave, None)
