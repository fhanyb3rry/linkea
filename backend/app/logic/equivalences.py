"""Tautologías, contradicciones y equivalencias entre fórmulas."""

from app.logic.formulas import And, Formula, Iff, Not, Or, asignaciones


def _variables(*formulas: Formula) -> list[str]:
    return sorted(set().union(*(f.variables() for f in formulas)))


def es_tautologia(f: Formula) -> bool:
    return all(f.evaluar(a) for a in asignaciones(_variables(f)))


def es_contradiccion(f: Formula) -> bool:
    return not any(f.evaluar(a) for a in asignaciones(_variables(f)))


def son_equivalentes(a: Formula, b: Formula) -> bool:
    """a ≡ b  si y solo si  (a ⇔ b) es tautología."""
    return es_tautologia(Iff(a, b))


def contraejemplo(a: Formula, b: Formula) -> dict | None:
    """Primera asignación donde a y b difieren (None si son equivalentes)."""
    for asignacion in asignaciones(_variables(a, b)):
        if a.evaluar(asignacion) != b.evaluar(asignacion):
            return asignacion
    return None


def de_morgan(f: Formula) -> Formula:
    """Aplica De Morgan una vez a ¬(p ∧ q) o ¬(p ∨ q); si no aplica, devuelve f."""
    if isinstance(f, Not) and isinstance(f.f, And):
        return Or(Not(f.f.izq), Not(f.f.der))
    if isinstance(f, Not) and isinstance(f.f, Or):
        return And(Not(f.f.izq), Not(f.f.der))
    return f
