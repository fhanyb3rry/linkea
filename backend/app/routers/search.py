from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid
from app.search.busqueda import ALGORITMOS, ResultadoBusqueda, dfs_todas_las_rutas
from app.search.grafo_skills import GRAFO_SKILLS, normalizar

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/grafo")
async def grafo():
    """El grafo de habilidades completo (para dibujarlo en el front)."""
    return GRAFO_SKILLS


@router.get("/rutas", response_model=ResultadoBusqueda)
async def rutas(
    desde: str,
    hasta: str,
    algoritmo: str = Query("dfs_todas", description="dfs | dfs_todas | bfs"),
    limite: int | None = Query(4, ge=0, le=20, description="Límite de profundidad"),
):
    """Corre el algoritmo elegido entre dos habilidades y devuelve orden de exploración, rutas y ciclos evitados."""
    inicio, objetivo = normalizar(desde), normalizar(hasta)
    for skill in (inicio, objetivo):
        if skill not in GRAFO_SKILLS:
            raise HTTPException(status_code=404, detail=f"La habilidad «{skill}» no está en el grafo")
    if algoritmo not in ALGORITMOS:
        raise HTTPException(status_code=400, detail="Algoritmo inválido: usa dfs, dfs_todas o bfs")
    return ALGORITMOS[algoritmo](GRAFO_SKILLS, inicio, objetivo, limite)


# ------------------------------------------------------------
# Integración con el matching: ruta de aprendizaje estudiante -> vacante
# ------------------------------------------------------------


class RutaAprendizaje(BaseModel):
    skill_faltante: str
    desde: str | None  # skill del alumno desde la que conviene partir
    ruta_recomendada: list[str]  # la más corta
    pasos: int
    rutas_alternativas: int  # cuántas rutas existen dentro del límite
    nodos_explorados: int


class PlanAprendizaje(BaseModel):
    limite_profundidad: int
    faltantes_en_grafo: list[RutaAprendizaje]
    sin_ruta: list[str]  # faltantes que el grafo no conoce o que no se alcanzan dentro del límite


@router.get("/aprendizaje/{student_id}/{vacancy_id}", response_model=PlanAprendizaje)
async def plan_aprendizaje(
    student_id: str,
    vacancy_id: str,
    limite: int = Query(4, ge=1, le=10),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Para cada skill que pide la vacante y al alumno le falta, busca cómo llegar a ella desde lo que ya sabe."""
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    student, vacancy = Student(**student_doc), Vacancy(**vacancy_doc)
    sabe = {normalizar(s) for s in student.skills}
    faltan = [normalizar(s) for s in vacancy.requisitos.skills_clave if normalizar(s) not in sabe]

    plan: list[RutaAprendizaje] = []
    sin_ruta: list[str] = []
    for objetivo in faltan:
        # Probamos partir desde cada skill que el alumno ya tiene y nos quedamos con las rutas de todas.
        candidatas: list[list[str]] = []
        explorados = 0
        for origen in sabe & GRAFO_SKILLS.keys():
            res = dfs_todas_las_rutas(GRAFO_SKILLS, origen, objetivo, limite)
            candidatas += res.rutas
            explorados += len(res.nodos_explorados)
        if not candidatas:
            sin_ruta.append(objetivo)
            continue
        mejor = min(candidatas, key=len)
        plan.append(
            RutaAprendizaje(
                skill_faltante=objetivo,
                desde=mejor[0],
                ruta_recomendada=mejor,
                pasos=len(mejor) - 1,
                rutas_alternativas=len(candidatas),
                nodos_explorados=explorados,
            )
        )
    return PlanAprendizaje(limite_profundidad=limite, faltantes_en_grafo=plan, sin_ruta=sin_ruta)
