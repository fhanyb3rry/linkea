"""Variables (features) que el modelo mide en cada par estudiante-vacante.

Son las entradas X del modelo. Se calculan una sola vez aquí para que el dataset
de entrenamiento y las predicciones en vivo usen exactamente los mismos números.

    carrera            1 si la carrera del alumno está entre las aceptadas, 0 si no
    cobertura_skills   fracción de las skills clave de la vacante que el alumno cubre (0 a 1)
    razon_horas        horas del alumno ÷ horas que pide la vacante (1.0 = justo lo pedido)
    minutos            tiempo real de traslado entre zonas (A* sobre el mapa)

La etiqueta y (elegible) la define la regla del filtro 1, aplicada sobre estas
mismas variables: (carrera O skills) Y horas suficientes Y traslado <= 45 min.
"""

from app.models.company import Vacancy
from app.models.student import Student
from app.search.traslado import LIMITE_TRASLADO_MIN, _clave, tiempo_traslado

FEATURES = ["carrera", "cobertura_skills", "razon_horas", "minutos"]

# Si una zona no está en el mapa no hay minutos reales; se usa la regla de respaldo
# del filtro 1 (misma zona = compatible) codificada como 0 min / 90 min.
MINUTOS_LEJOS = 90.0


def features_del_par(student: Student, vacancy: Vacancy) -> dict:
    """Las cuatro variables de un par concreto, listas para el modelo o el CSV."""
    carrera = 1.0 if student.carrera.strip().lower() in {
        c.strip().lower() for c in vacancy.requisitos.carreras_aceptadas
    } else 0.0

    clave = {s.strip().lower() for s in vacancy.requisitos.skills_clave}
    del_alumno = {s.strip().lower() for s in student.skills}
    cobertura = len(del_alumno & clave) / len(clave) if clave else 1.0

    pedidas = vacancy.horarios.horas_por_semana
    razon = 1.0 if pedidas <= 0 else student.disponibilidad.horas_por_semana / pedidas

    t = tiempo_traslado(student.ubicacion.zona, vacancy.ubicacion.zona)
    if t.conocido:
        minutos = float(t.minutos_reales or 0)
    else:
        misma = _clave(student.ubicacion.zona) == _clave(vacancy.ubicacion.zona)
        minutos = 0.0 if misma else MINUTOS_LEJOS

    return {
        "carrera": carrera,
        "cobertura_skills": round(cobertura, 3),
        "razon_horas": round(min(razon, 2.0), 3),  # tope 2: más del doble no aporta
        "minutos": minutos,
    }


def regla_elegible(f: dict) -> int:
    """La regla del filtro 1 escrita sobre las features: es la "maestra" que pone
    la etiqueta. El árbol tiene que aprenderla viendo ejemplos, no copiándola."""
    return int(
        (f["carrera"] > 0 or f["cobertura_skills"] > 0)
        and f["razon_horas"] >= 1.0
        and f["minutos"] <= LIMITE_TRASLADO_MIN
    )
