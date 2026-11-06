"""Predicciones en vivo con el árbol entrenado (app/ml/artefactos/).

`predecir(student, vacancy)` devuelve probabilidad, sí/no y POR QUÉ: el árbol es
un conjunto de decisiones una tras otra, así que se puede leer el camino que
siguió este caso y explicarlo en palabras ("quedó fuera por los minutos",
"sus horas sí alcanzan"). Además dice qué aspecto pesó más en general.

Si el archivo del modelo no existe (aún no se corre entrenar.py), todas las
funciones devuelven None y el API sigue funcionando con reglas/IA externa.
"""

from pathlib import Path

import joblib
import pandas as pd

from app.ml.datos import FEATURES, features_del_par
from app.models.company import Vacancy
from app.models.student import Student

MODELO = Path(__file__).parent / "artefactos" / "modelo_elegibilidad.joblib"
VERSION = "arbol-elegibilidad-v1"

_cache = {"modelo": ...}  # ... = todavía no se intentó cargar


def cargar():
    """Carga el árbol una sola vez; None si todavía no existe el archivo."""
    if _cache["modelo"] is ...:
        _cache["modelo"] = joblib.load(MODELO) if MODELO.exists() else None
    return _cache["modelo"]


def modelo_disponible() -> bool:
    return cargar() is not None


_NOMBRES = {
    "carrera": "la carrera",
    "cobertura_skills": "las habilidades",
    "razon_horas": "las horas disponibles",
    "minutos": "el tiempo de traslado",
}


def _motivo(feature: str, valor: float, umbral: float, paso: bool) -> tuple[str, bool]:
    """Cada pregunta del árbol traducida a palabras + si salió a favor o en contra.

    Ojo con la dirección: "paso" solo significa `valor <= umbral`. En minutos eso
    es bueno (quedó cerca); en horas, skills y carrera es malo (quedó por debajo).
    """
    if feature == "minutos":
        return (
            f"El traslado ({valor:g} min) queda dentro del límite que el modelo aprendió (~{umbral:g} min)."
            if paso else
            f"El traslado ({valor:g} min) supera el límite que el modelo aprendió (~{umbral:g} min).",
            paso,
        )
    if feature == "razon_horas":
        return (
            "Las horas disponibles no alcanzan lo que pide la vacante." if paso
            else "Las horas disponibles sí alcanzan lo que pide la vacante.",
            not paso,
        )
    if feature == "cobertura_skills":
        return (
            "No cubre ninguna de las habilidades clave." if paso
            else f"Cubre el {valor:.0%} de las habilidades clave de la vacante.",
            not paso,
        )
    if feature == "carrera":
        return (
            "La carrera no está entre las aceptadas." if paso
            else "La carrera está entre las aceptadas.",
            not paso,
        )
    return f"{_NOMBRES.get(feature, feature)}: {valor:g} (referencia {umbral:g}).", paso


def predecir(student: Student, vacancy: Vacancy) -> dict | None:
    """Probabilidad de ser elegible según el modelo + por qué llegó a eso."""
    m = cargar()
    if m is None:
        return None

    f = features_del_par(student, vacancy)
    X = pd.DataFrame([f])[FEATURES]
    proba = float(m.predict_proba(X)[0][1])
    pred = int(m.predict(X)[0])

    # El camino de decisión: cada nodo es una pregunta "¿feature <= umbral?".
    # Con eso explicamos el resultado igual que en clase se lee un árbol.
    arbol = m.tree_
    pasos = []
    for nodo in m.decision_path(X).indices:
        feat = arbol.feature[nodo]
        if feat < 0:
            continue  # hoja: ahí ya está la decisión
        nombre, umbral, valor = FEATURES[feat], arbol.threshold[nodo], f[FEATURES[feat]]
        texto, favorable = _motivo(nombre, valor, umbral, valor <= umbral)
        pasos.append({"aspecto": _NOMBRES[nombre], "favorable": favorable, "texto": texto})

    importancias = {
        _NOMBRES[n]: round(float(i), 3) for n, i in zip(FEATURES, m.feature_importances_)
    }
    a_favor = [p["texto"] for p in pasos if p["favorable"]]
    en_contra = [p["texto"] for p in pasos if not p["favorable"]]

    # Skills que le faltan al perfil para esta vacante (lo accionable).
    clave = {s.strip().lower() for s in vacancy.requisitos.skills_clave}
    del_alumno = {s.strip().lower() for s in student.skills}
    por_aprender = sorted(s for s in vacancy.requisitos.skills_clave
                          if s.strip().lower() in clave - del_alumno)

    return {
        "prediccion": pred,
        "probabilidad": round(proba, 3),
        "pasos": pasos,
        "a_favor": a_favor,
        "en_contra": en_contra,
        "importancias": importancias,
        "habilidades_por_aprender": por_aprender,
        "version": VERSION,
    }
