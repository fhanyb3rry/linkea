"""Algoritmo genético para la asignación óptima estudiante ↔ vacante.

    python -m app.ml.genetico

El problema de coordinación: dadas N vacantes y M estudiantes, ¿cómo
repartir las plazas para que la compatibilidad total sea la mayor posible,
sin repetir vacante ni estudiante? Es un problema combinatorio — con solo
6 vacantes ya hay 720 repartos posibles, y el brute-force no escala.

El genético evoluciona una población de repartos completos:

    Cromosoma   lista de largo M: a cada estudiante le toca una vacante
                (índice) o -1 (sin asignar); ninguna vacante se repite
    Fitness     suma del puntaje de compatibilidad (0-100) de los pares
                asignados; un par que no pasa el filtro 1 aporta 0, así
                que el genético solo combina a quienes SÍ son elegibles
    Selección   torneo de 3: gana el reparto con mejor fitness
    Cruce       cada gen (estudiante) hereda de un padre al azar;
                luego se reparan las vacantes duplicadas
    Mutación    cambiar la vacante de un estudiante por una libre
                (o dejarlo sin asignar), con poca probabilidad
    Elitismo    los 2 mejores repartos pasan intactos a la siguiente
                generación

Para dar contexto al resultado también se calcula el reparto voraz
(asignar siempre el par con mayor puntaje disponible): el genético debe
igualarlo o superarlo, nunca quedarse debajo de lo obvio.

Uso en vivo: el endpoint GET /ai/asignacion corre el genético al momento
(población y generaciones chicas porque la base es chica). La corrida
offline con más generaciones queda en app/ml/artefactos/genetico/.
"""

import asyncio
import json
import random
from dataclasses import dataclass

from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.logic.logic_rules import evaluar_elegibilidad
from app.ml.generar_dataset import ARTEFACTOS
from app.models.company import Vacancy
from app.models.student import Student

SEMILLA = 42
POBLACION = 60
GENERACIONES = 200
P_MUTACION = 0.08          # probabilidad de mutar cada gen
TORNEO = 3
ELITE = 2

CARPETA = ARTEFACTOS / "genetico"


@dataclass
class Contexto:
    """Los datos del problema: quiénes son y cuánto vale cada pareja."""
    students: list[Student]
    vacancies: list[Vacancy]
    puntaje: list[list[int]]  # puntaje[i][j] = compatibilidad del par (0 si no elegible)


def _matriz_puntajes(students: list[Student], vacancies: list[Vacancy]) -> list[list[int]]:
    """Cada celda: 0-100 si el par pasa el filtro 1, 0 si no es elegible.
    Así el genético nunca premia asignar a alguien que no cumple requisitos."""
    return [
        [
            (r.compatibilidad if r.elegible else 0)
            for r in (evaluar_elegibilidad(s, v) for v in vacancies)
        ]
        for s in students
    ]


def _individuo_aleatorio(n_est: int, n_vac: int, rng: random.Random) -> list[int]:
    """Reparto al azar válido: a cada estudiante una vacante distinta o -1."""
    orden = list(range(n_vac))
    rng.shuffle(orden)
    return [orden[i] if i < n_vac else -1 for i in range(n_est)]


def _fitness(individuo: list[int], puntaje: list[list[int]]) -> int:
    return sum(puntaje[i][v] for i, v in enumerate(individuo) if v >= 0)


def _reparar(hijo: list[int], n_vac: int, rng: random.Random) -> list[int]:
    """Tras el cruce pueden repetirse vacantes: se conserva la primera
    aparición y los repetidos pasan a sin-asignar; después, con suerte,
    reciben una vacante libre al azar."""
    usadas: set[int] = set()
    for i, v in enumerate(hijo):
        if v >= 0:
            if v in usadas:
                hijo[i] = -1
            else:
                usadas.add(v)
    libres = [v for v in range(n_vac) if v not in usadas]
    rng.shuffle(libres)
    for i, v in enumerate(hijo):
        if v == -1 and libres and rng.random() < 0.5:
            hijo[i] = libres.pop()
    return hijo


def _torneo(poblacion: list[list[int]], puntaje: list[list[int]], rng: random.Random) -> list[int]:
    aspirantes = rng.sample(poblacion, min(TORNEO, len(poblacion)))
    return max(aspirantes, key=lambda ind: _fitness(ind, puntaje))


def correr_genetico(
    puntaje: list[list[int]],
    semilla: int = SEMILLA,
    poblacion: int = POBLACION,
    generaciones: int = GENERACIONES,
) -> dict:
    """Evolve repartos durante `generaciones`. Devuelve el mejor individuo,
    su fitness y la curva de convergencia (mejor y promedio por generación)."""
    rng = random.Random(semilla)
    n_est, n_vac = len(puntaje), len(puntaje[0])

    pob = [_individuo_aleatorio(n_est, n_vac, rng) for _ in range(poblacion)]
    curva = []
    for _ in range(generaciones):
        ordenada = sorted(pob, key=lambda ind: _fitness(ind, puntaje), reverse=True)
        mejor, peor = ordenada[0], ordenada[-1]
        curva.append({
            "mejor": _fitness(mejor, puntaje),
            "promedio": round(sum(_fitness(i, puntaje) for i in pob) / len(pob), 2),
        })

        nueva = ordenada[:ELITE]  # elitismo
        while len(nueva) < poblacion:
            p1, p2 = _torneo(pob, puntaje, rng), _torneo(pob, puntaje, rng)
            # Cruce uniforme: cada estudiante hereda su vacante de un padre.
            hijo = [p1[i] if rng.random() < 0.5 else p2[i] for i in range(n_est)]
            hijo = _reparar(hijo, n_vac, rng)
            # Mutación: mover a un estudiante a una vacante libre o dejarlo fuera.
            for i in range(n_est):
                if rng.random() < P_MUTACION:
                    usadas = {v for k, v in enumerate(hijo) if v >= 0 and k != i}
                    libres = [v for v in range(n_vac) if v not in usadas]
                    hijo[i] = rng.choice(libres + [-1])
            nueva.append(hijo)
        pob = nueva
        # Corte temprano si el mejor no cambia y toda la población ya es igual.
        if _fitness(mejor, puntaje) == _fitness(peor, puntaje):
            break

    ordenada = sorted(pob, key=lambda ind: _fitness(ind, puntaje), reverse=True)
    return {
        "individuo": ordenada[0],
        "fitness": _fitness(ordenada[0], puntaje),
        "generaciones_corridas": len(curva),
        "curva": curva,
    }


def _voraz(puntaje: list[list[int]]) -> dict:
    """Referencia: asignar iterando del mejor par disponible al peor."""
    n_est, n_vac = len(puntaje), len(puntaje[0])
    pares = sorted(
        ((puntaje[i][j], i, j) for i in range(n_est) for j in range(n_vac)),
        reverse=True,
    )
    asignacion = [-1] * n_est
    usados_e, usados_v = set(), set()
    for p, i, j in pares:
        if p == 0:
            break
        if i in usados_e or j in usados_v:
            continue
        asignacion[i], usados_e, usados_v = j, usados_e | {i}, usados_v | {j}
    return {"individuo": asignacion, "fitness": _fitness(asignacion, puntaje)}


def _resultado(ctx: Contexto, genetico: dict, voraz: dict) -> dict:
    """El reparto final con nombres legibles + estadísticas de la corrida."""
    mejor = genetico if genetico["fitness"] >= voraz["fitness"] else voraz
    asignaciones = []
    for i, v in enumerate(mejor["individuo"]):
        s = ctx.students[i]
        if v >= 0:
            vac = ctx.vacancies[v]
            asignaciones.append({
                "estudiante_id": str(s.id), "estudiante": s.nombre,
                "vacante_id": str(vac.id), "vacante": vac.titulo,
                "empresa": vac.nombre_empresa,
                "puntaje": ctx.puntaje[i][v],
            })
        else:
            asignaciones.append({
                "estudiante_id": str(s.id), "estudiante": s.nombre,
                "vacante_id": None, "vacante": None,
                "puntaje": 0,
            })
    return {
        "metodo_ganador": "genetico" if genetico["fitness"] >= voraz["fitness"] else "voraz",
        "fitness_genetico": genetico["fitness"],
        "fitness_voraz": voraz["fitness"],
        "generaciones": genetico["generaciones_corridas"],
        "curva_fitness": genetico["curva"],
        "asignaciones": asignaciones,
        "estudiantes": len(ctx.students),
        "vacantes": len(ctx.vacancies),
    }


async def asignacion_optima() -> dict:
    """Corre el genético con los datos actuales de Mongo (para el endpoint)."""
    db = get_database()
    students = [Student(**d) async for d in db.students.find()]
    vacancies = [Vacancy(**d) async for d in db.vacancies.find()]
    if not students or not vacancies:
        return {"disponible": False, "aviso": "No hay estudiantes o vacantes para asignar."}
    ctx = Contexto(students, vacancies, _matriz_puntajes(students, vacancies))
    # En vivo la población es chica: corre un poco menos que el modo offline.
    gen = correr_genetico(ctx.puntaje, generaciones=120)
    return {"disponible": True, **_resultado(ctx, gen, _voraz(ctx.puntaje))}


async def main() -> None:
    print("=== ASIGNACIÓN ÓPTIMA (algoritmo genético) ===")
    await connect_to_mongo()
    try:
        db = get_database()
        students = [Student(**d) async for d in db.students.find()]
        vacancies = [Vacancy(**d) async for d in db.vacancies.find()]
    finally:
        await close_mongo_connection()

    ctx = Contexto(students, vacancies, _matriz_puntajes(students, vacancies))
    print(f"Estudiantes: {len(students)} | Vacantes: {len(vacancies)}")

    gen = correr_genetico(ctx.puntaje)
    vor = _voraz(ctx.puntaje)
    resultado = _resultado(ctx, gen, vor)

    print(f"\nFitness genético: {gen['fitness']} ({gen['generaciones_corridas']} generaciones)")
    print(f"Fitness voraz:    {vor['fitness']}")
    print(f"Ganador: {resultado['metodo_ganador']}")
    print("\nAsignación:")
    for a in resultado["asignaciones"]:
        destino = f"{a['vacante']} ({a['puntaje']}%)" if a["vacante"] else "sin asignar"
        print(f"  {a['estudiante']:30s} -> {destino}")

    CARPETA.mkdir(exist_ok=True)
    (CARPETA / "asignacion.json").write_text(
        json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nResultado -> {CARPETA / 'asignacion.json'}")


if __name__ == "__main__":
    asyncio.run(main())
