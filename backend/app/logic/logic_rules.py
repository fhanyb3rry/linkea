"""Evaluación de elegibilidad alumno-vacante mediante lógica proposicional.

Fórmula: Elegible = (Carrera ∨ Skill) ∧ Disponibilidad ∧ UbicacionCompatible

Se construye con el motor de formulas.py, por lo que puede imprimirse, generar
su tabla de verdad y compararse con otras formas equivalentes (equivalences.py).
"""

from pydantic import BaseModel, Field

from app.logic.equivalences import de_morgan, son_equivalentes
from app.logic.formulas import And, Formula, Implies, Not, Or, Var, asignaciones
from app.models.company import Vacancy
from app.models.student import Student
from app.search.traslado import LIMITE_TRASLADO_MIN, factor_cercania, ubicacion_compatible

CARRERA = Var("carrera_match")
SKILL = Var("skill_clave")
DISPONIBILIDAD = Var("disponibilidad_horaria")
UBICACION = Var("ubicacion_compatible")

VARIABLES = ["carrera_match", "skill_clave", "disponibilidad_horaria", "ubicacion_compatible"]

# Elegible = (Carrera ∨ Skill) ∧ Disponibilidad ∧ UbicacionCompatible
ELEGIBLE: Formula = And(And(Or(CARRERA, SKILL), DISPONIBILIDAD), UBICACION)

# Forma normal disyuntiva (distributiva): (C ∧ D ∧ U) ∨ (S ∧ D ∧ U)
ELEGIBLE_DNF: Formula = Or(
    And(And(CARRERA, DISPONIBILIDAD), UBICACION),
    And(And(SKILL, DISPONIBILIDAD), UBICACION),
)

# ¬Elegible por De Morgan: (¬C ∧ ¬S) ∨ ¬D ∨ ¬U
NO_ELEGIBLE_DE_MORGAN: Formula = Or(
    Or(And(Not(CARRERA), Not(SKILL)), Not(DISPONIBILIDAD)),
    Not(UBICACION),
)

# Regla del agente: Elegible ⇒ Recomendar. Su contrapositiva (¬Recomendar ⇒ ¬Elegible)
# es equivalente: si el agente no recomienda, es porque no era elegible.
RECOMENDAR = Var("recomendar")
REGLA_AGENTE: Formula = Implies(ELEGIBLE, RECOMENDAR)
REGLA_AGENTE_CONTRAPOSITIVA: Formula = Implies(Not(RECOMENDAR), Not(ELEGIBLE))


class Proposiciones(BaseModel):
    carrera_match: bool
    skill_clave: bool
    disponibilidad_horaria: bool
    ubicacion_compatible: bool


class DesgloseCompatibilidad(BaseModel):
    """Puntos que aporta cada aspecto al puntaje total (cada uno vale hasta 25)."""

    carrera: float = 0
    skills: float = 0
    disponibilidad: float = 0
    ubicacion: float = 0


class EligibilityResult(BaseModel):
    elegible: bool
    proposiciones: Proposiciones
    razones_descarte: list[str] = []
    compatibilidad: int = 0
    desglose: DesgloseCompatibilidad = Field(default_factory=DesgloseCompatibilidad)


def _evaluar_carrera_match(student: Student, vacancy: Vacancy) -> bool:
    return student.carrera.strip().lower() in {
        c.strip().lower() for c in vacancy.requisitos.carreras_aceptadas
    }


def _evaluar_skill_clave(student: Student, vacancy: Vacancy) -> bool:
    skills_alumno = {s.strip().lower() for s in student.skills}
    skills_vacante = {s.strip().lower() for s in vacancy.requisitos.skills_clave}
    return len(skills_alumno & skills_vacante) > 0


def _evaluar_disponibilidad_horaria(student: Student, vacancy: Vacancy) -> bool:
    return student.disponibilidad.horas_por_semana >= vacancy.horarios.horas_por_semana


def _evaluar_ubicacion_compatible(student: Student, vacancy: Vacancy) -> bool:
    # Compatible si el traslado estimado (búsqueda A* sobre el mapa de zonas) cabe en el límite de
    # minutos. Si alguna zona no está en el mapa, se usa la regla de antes: misma zona.
    return ubicacion_compatible(student.ubicacion.zona, vacancy.ubicacion.zona)


def evaluar_proposiciones(student: Student, vacancy: Vacancy) -> Proposiciones:
    return Proposiciones(
        carrera_match=_evaluar_carrera_match(student, vacancy),
        skill_clave=_evaluar_skill_clave(student, vacancy),
        disponibilidad_horaria=_evaluar_disponibilidad_horaria(student, vacancy),
        ubicacion_compatible=_evaluar_ubicacion_compatible(student, vacancy),
    )


def aplicar_formula(p: Proposiciones) -> bool:
    return ELEGIBLE.evaluar(p.model_dump())


# Los 100 puntos se reparten parejo entre los 4 aspectos evaluados: 25 puntos cada uno.
PESO_POR_ASPECTO = 25


def calcular_desglose(student: Student, vacancy: Vacancy) -> DesgloseCompatibilidad:
    """Cuánto aporta cada aspecto al puntaje (25 puntos máximo por aspecto):

    - carrera: 25 si la carrera del alumno está entre las aceptadas, 0 si no.
    - skills: 25 × la fracción de las skills clave de la vacante que el alumno cubre.
    - disponibilidad: 25 × horas del alumno ÷ horas que pide la vacante (tope 1).
    - ubicación: 25 × factor de cercanía por minutos de traslado:
      hasta 30 min → 100%, de 31 a 45 → 50%, de 46 a 60 → 25%, más de una hora → 0.
    """
    p = evaluar_proposiciones(student, vacancy)

    skills_vacante = {s.strip().lower() for s in vacancy.requisitos.skills_clave}
    skills_alumno = {s.strip().lower() for s in student.skills}
    cobertura = len(skills_alumno & skills_vacante) / len(skills_vacante) if skills_vacante else 1.0

    horas_requeridas = vacancy.horarios.horas_por_semana
    horas = (
        1.0 if horas_requeridas <= 0 else min(1.0, student.disponibilidad.horas_por_semana / horas_requeridas)
    )

    return DesgloseCompatibilidad(
        carrera=PESO_POR_ASPECTO * p.carrera_match,
        skills=PESO_POR_ASPECTO * cobertura,
        disponibilidad=PESO_POR_ASPECTO * horas,
        ubicacion=PESO_POR_ASPECTO * factor_cercania(student.ubicacion.zona, vacancy.ubicacion.zona),
    )


def calcular_compatibilidad(student: Student, vacancy: Vacancy) -> int:
    """Puntaje 0-100 de qué tan bien encaja el alumno con la vacante: la suma del desglose.

    Es determinista (NO es el filtro de IA); sirve para ordenar y mostrar un porcentaje.
    La decisión de elegibilidad sigue siendo la fórmula proposicional.
    """
    d = calcular_desglose(student, vacancy)
    return round(d.carrera + d.skills + d.disponibilidad + d.ubicacion)


def evaluar_elegibilidad(student: Student, vacancy: Vacancy) -> EligibilityResult:
    proposiciones = evaluar_proposiciones(student, vacancy)
    elegible = aplicar_formula(proposiciones)
    return EligibilityResult(
        elegible=elegible,
        proposiciones=proposiciones,
        razones_descarte=[] if elegible else explicar(proposiciones),
        compatibilidad=calcular_compatibilidad(student, vacancy),
        desglose=calcular_desglose(student, vacancy),
    )


def explicar(p: Proposiciones) -> list[str]:
    """Razones legibles (vía De Morgan) por las que NO es elegible. Vacío si lo es."""
    razones = []
    if not (p.carrera_match or p.skill_clave):
        razones.append("Ni la carrera ni las habilidades coinciden con lo que pide la vacante.")
    if not p.disponibilidad_horaria:
        razones.append("Las horas disponibles por semana no alcanzan lo que pide la vacante.")
    if not p.ubicacion_compatible:
        razones.append(f"Queda muy lejos: el traslado pasa de {LIMITE_TRASLADO_MIN} minutos.")
    return razones


def generar_tabla_verdad() -> list[dict]:
    """Las 16 combinaciones de las 4 proposiciones atómicas y el resultado de la fórmula."""
    return [{**a, "elegible": ELEGIBLE.evaluar(a)} for a in asignaciones(VARIABLES)]


def verificar_equivalencias() -> dict:
    """Pruebas formales sobre la fórmula de elegibilidad, calculadas por tabla de verdad."""
    no_elegible = Not(ELEGIBLE)
    return {
        "formula": str(ELEGIBLE),
        "dnf": str(ELEGIBLE_DNF),
        "elegible_equivale_a_dnf": son_equivalentes(ELEGIBLE, ELEGIBLE_DNF),
        "no_elegible_de_morgan": str(NO_ELEGIBLE_DE_MORGAN),
        "no_elegible_equivale_a_de_morgan": son_equivalentes(no_elegible, NO_ELEGIBLE_DE_MORGAN),
        "de_morgan_automatico_equivale": son_equivalentes(
            Not(And(CARRERA, SKILL)), de_morgan(Not(And(CARRERA, SKILL)))
        ),
        "regla_del_agente": str(REGLA_AGENTE),
        "contrapositiva": str(REGLA_AGENTE_CONTRAPOSITIVA),
        "regla_equivale_a_contrapositiva": son_equivalentes(
            REGLA_AGENTE, REGLA_AGENTE_CONTRAPOSITIVA
        ),
    }
