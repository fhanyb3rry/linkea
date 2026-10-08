"""Agente de vinculación: ciclo percibir -> decidir -> actuar.

- Sensores: reciben el estudiante y el catálogo de vacantes.
- Decisión: aplica la fórmula de elegibilidad (lógica proposicional) a cada par.
- Actuadores: emite recomendaciones ordenadas y las razones de cada descarte.
"""

from pydantic import BaseModel

from app.logic.logic_rules import (
    Proposiciones,
    evaluar_proposiciones,
    explicar,
    aplicar_formula,
)
from app.models.company import Vacancy
from app.models.student import Student


class Percepcion(BaseModel):
    estudiante: Student
    vacantes: list[Vacancy]


class Decision(BaseModel):
    vacante_id: str
    empresa: str
    elegible: bool
    afinidad: int
    proposiciones: Proposiciones
    razones_descarte: list[str]


class Accion(BaseModel):
    estudiante_id: str
    recomendadas: list[Decision]
    descartadas: list[Decision]


class AgenteVinculacion:
    def percibir(self, estudiante: Student, vacantes: list[Vacancy]) -> Percepcion:
        return Percepcion(estudiante=estudiante, vacantes=vacantes)

    def decidir(self, percepcion: Percepcion) -> list[Decision]:
        decisiones = []
        for vacante in percepcion.vacantes:
            p = evaluar_proposiciones(percepcion.estudiante, vacante)
            elegible = aplicar_formula(p)
            decisiones.append(
                Decision(
                    vacante_id=str(vacante.id),
                    empresa=vacante.nombre_empresa,
                    elegible=elegible,
                    # Afinidad: cuántas proposiciones se cumplen (0-4), desempata entre elegibles
                    afinidad=sum(p.model_dump().values()),
                    proposiciones=p,
                    razones_descarte=[] if elegible else explicar(p),
                )
            )
        return decisiones

    def actuar(self, estudiante: Student, decisiones: list[Decision]) -> Accion:
        ordenadas = sorted(decisiones, key=lambda d: d.afinidad, reverse=True)
        return Accion(
            estudiante_id=str(estudiante.id),
            recomendadas=[d for d in ordenadas if d.elegible],
            descartadas=[d for d in ordenadas if not d.elegible],
        )

    def recomendar(self, estudiante: Student, vacantes: list[Vacancy]) -> Accion:
        percepcion = self.percibir(estudiante, vacantes)
        return self.actuar(estudiante, self.decidir(percepcion))
