"""Evaluación de elegibilidad alumno-vacante mediante lógica proposicional.

Fórmula: Elegible = (CarreraMatch OR SkillClave) AND DisponibilidadHoraria AND NOT UbicacionIncompatible
"""

from itertools import product

from pydantic import BaseModel

from app.models.company import Vacancy
from app.models.student import Student


def AND(a: bool, b: bool) -> bool:
    return a and b


def OR(a: bool, b: bool) -> bool:
    return a or b


def NOT(a: bool) -> bool:
    return not a


class Proposiciones(BaseModel):
    carrera_match: bool
    skill_clave: bool
    disponibilidad_horaria: bool
    ubicacion_incompatible: bool


class EligibilityResult(BaseModel):
    elegible: bool
    proposiciones: Proposiciones


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


def _evaluar_ubicacion_incompatible(student: Student, vacancy: Vacancy) -> bool:
    return student.ubicacion.zona.strip().lower() != vacancy.ubicacion.zona.strip().lower()


def evaluar_proposiciones(student: Student, vacancy: Vacancy) -> Proposiciones:
    return Proposiciones(
        carrera_match=_evaluar_carrera_match(student, vacancy),
        skill_clave=_evaluar_skill_clave(student, vacancy),
        disponibilidad_horaria=_evaluar_disponibilidad_horaria(student, vacancy),
        ubicacion_incompatible=_evaluar_ubicacion_incompatible(student, vacancy),
    )


def aplicar_formula(p: Proposiciones) -> bool:
    return AND(
        AND(
            OR(p.carrera_match, p.skill_clave),
            p.disponibilidad_horaria,
        ),
        NOT(p.ubicacion_incompatible),
    )


def evaluar_elegibilidad(student: Student, vacancy: Vacancy) -> EligibilityResult:
    proposiciones = evaluar_proposiciones(student, vacancy)
    return EligibilityResult(
        elegible=aplicar_formula(proposiciones),
        proposiciones=proposiciones,
    )


def generar_tabla_verdad() -> list[dict]:
    """Genera las 16 combinaciones posibles de las 4 proposiciones atómicas
    y el resultado de la fórmula de elegibilidad para cada una."""
    filas = []
    for carrera_match, skill_clave, disponibilidad_horaria, ubicacion_incompatible in product(
        [False, True], repeat=4
    ):
        p = Proposiciones(
            carrera_match=carrera_match,
            skill_clave=skill_clave,
            disponibilidad_horaria=disponibilidad_horaria,
            ubicacion_incompatible=ubicacion_incompatible,
        )
        filas.append({**p.model_dump(), "elegible": aplicar_formula(p)})
    return filas
