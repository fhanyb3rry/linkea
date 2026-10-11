"""Motor genérico de lógica proposicional.

Una fórmula es un árbol de nodos (Var, Not, And, Or, Implies, Iff). Se puede
evaluar, imprimir, listar sus variables y generar su tabla de verdad. Con esto
se verifican tautologías, contradicciones y equivalencias (ver equivalences.py).
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import product


class Formula:
    def evaluar(self, valores: dict[str, bool]) -> bool:
        raise NotImplementedError

    def variables(self) -> set[str]:
        raise NotImplementedError

    def __and__(self, otra: Formula) -> Formula:
        return And(self, otra)

    def __or__(self, otra: Formula) -> Formula:
        return Or(self, otra)

    def __invert__(self) -> Formula:
        return Not(self)


@dataclass(frozen=True)
class Var(Formula):
    nombre: str

    def evaluar(self, valores):
        return valores[self.nombre]

    def variables(self):
        return {self.nombre}

    def __str__(self):
        return self.nombre


@dataclass(frozen=True)
class Not(Formula):
    f: Formula

    def evaluar(self, valores):
        return not self.f.evaluar(valores)

    def variables(self):
        return self.f.variables()

    def __str__(self):
        return f"¬{self.f}"


@dataclass(frozen=True)
class _Binaria(Formula):
    izq: Formula
    der: Formula
    simbolo = "?"

    def variables(self):
        return self.izq.variables() | self.der.variables()

    def __str__(self):
        return f"({self.izq} {self.simbolo} {self.der})"


class And(_Binaria):
    simbolo = "∧"

    def evaluar(self, valores):
        return self.izq.evaluar(valores) and self.der.evaluar(valores)


class Or(_Binaria):
    simbolo = "∨"

    def evaluar(self, valores):
        return self.izq.evaluar(valores) or self.der.evaluar(valores)


class Implies(_Binaria):
    """p ⇒ q  es  ¬p ∨ q."""

    simbolo = "⇒"

    def evaluar(self, valores):
        return (not self.izq.evaluar(valores)) or self.der.evaluar(valores)


class Iff(_Binaria):
    """p ⇔ q  es verdadera cuando ambos tienen el mismo valor."""

    simbolo = "⇔"

    def evaluar(self, valores):
        return self.izq.evaluar(valores) == self.der.evaluar(valores)


def asignaciones(variables: list[str]):
    """Todas las combinaciones de valores de verdad (2^n), en orden F..F a V..V."""
    for combo in product([False, True], repeat=len(variables)):
        yield dict(zip(variables, combo))


def tabla_verdad(formula: Formula, variables: list[str] | None = None) -> list[dict]:
    nombres = variables or sorted(formula.variables())
    return [{**a, "resultado": formula.evaluar(a)} for a in asignaciones(nombres)]
