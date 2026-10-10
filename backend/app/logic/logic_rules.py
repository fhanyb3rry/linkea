"""Evaluación de elegibilidad alumno-vacante mediante lógica proposicional.

Fórmula: Elegible = (Carrera ∨ Skill) ∧ Disponibilidad ∧ UbicacionCompatible

Se construye con el motor de formulas.py, por lo que puede imprimirse, generar
su tabla de verdad y compararse con otras formas equivalentes (equivalences.py).
"""

from pydantic import BaseModel

from app.logic.equivalences import de_morgan, son_equivalentes
from app.logic.formulas import And, Formula, Implies, Not, Or, Var, asignaciones
from app.models.company import Vacancy
from app.models.student import Student

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


class EligibilityResult(BaseModel):
    elegible: bool
    proposiciones: Proposiciones
    razones_descarte: list[str] = []


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
    return student.ubicacion.zona.strip().lower() == vacancy.ubicacion.zona.strip().lower()


def evaluar_proposiciones(student: Student, vacancy: Vacancy) -> Proposiciones:
    return Proposiciones(
        carrera_match=_evaluar_carrera_match(student, vacancy),
        skill_clave=_evaluar_skill_clave(student, vacancy),
        disponibilidad_horaria=_evaluar_disponibilidad_horaria(student, vacancy),
        ubicacion_compatible=_evaluar_ubicacion_compatible(student, vacancy),
    )


def aplicar_formula(p: Proposiciones) -> bool:
    return ELEGIBLE.evaluar(p.model_dump())


def evaluar_elegibilidad(student: Student, vacancy: Vacancy) -> EligibilityResult:
    proposiciones = evaluar_proposiciones(student, vacancy)
    elegible = aplicar_formula(proposiciones)
    return EligibilityResult(
        elegible=elegible,
        proposiciones=proposiciones,
        razones_descarte=[] if elegible else explicar(proposiciones),
    )


def explicar(p: Proposiciones) -> list[str]:
    """Razones legibles (vía De Morgan) por las que NO es elegible. Vacío si lo es."""
    razones = []
    if not (p.carrera_match or p.skill_clave):
        razones.append("Ni la carrera ni las skills coinciden (¬Carrera ∧ ¬Skill)")
    if not p.disponibilidad_horaria:
        razones.append("Las horas disponibles no alcanzan (¬Disponibilidad)")
    if not p.ubicacion_compatible:
        razones.append("La ubicación no es compatible (¬Ubicación)")
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
