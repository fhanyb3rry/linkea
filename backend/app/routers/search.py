from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.database import get_database
from app.core.permisos import verificar_acceso_par
from app.core.seguridad import usuario_actual
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid
from app.search.busqueda import ALGORITMOS, ResultadoBusqueda, dfs_todas_las_rutas
from app.search import traslado as tr
from app.search.grafo_skills import GRAFO_SKILLS, normalizar

router = APIRouter(prefix="/search", tags=["search"], dependencies=[Depends(usuario_actual)])


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


# ------------------------------------------------------------
# Traslado: búsqueda heurística (BFS, DFS, UCS, Greedy, A*) entre zonas
# ------------------------------------------------------------


def _zona_o_404(texto: str) -> str:
    zona = tr.nombre_zona(texto)
    if zona is None:
        raise HTTPException(status_code=404, detail=f"La zona «{texto}» no está en el mapa")
    return zona


def _tipo_o_400(tipo: str) -> str:
    if tipo not in tr.TIPOS_DISTANCIA:
        raise HTTPException(status_code=400, detail="Heurística inválida: usa euclidiana o manhattan")
    return tipo


@router.get("/traslado/mapa")
async def traslado_mapa():
    """El mapa completo: zonas con coordenadas, tramos con minutos reales, y datos de la heurística."""
    return {
        "zonas": [{"nombre": z, "lat": lat, "lng": lng} for z, (lat, lng) in tr.ZONAS.items()],
        "tramos": [{"a": a, "b": b, "minutos": m} for a, b, m in tr._TRAMOS],
        "limite_traslado_min": tr.LIMITE_TRASLADO_MIN,
        "tipos_distancia": list(tr.TIPOS_DISTANCIA),
        "velocidades_kmh": {t: tr.velocidad_maxima(t) for t in tr.TIPOS_DISTANCIA},
        "heuristicas": {t: tr.verificar_heuristica(t) for t in tr.TIPOS_DISTANCIA},
    }


@router.get("/traslado/heuristica")
async def traslado_heuristica(hacia: str, tipo: str = Query("euclidiana", description="euclidiana | manhattan")):
    """h(n) de cada zona hacia el destino elegido (minutos estimados: distancia en línea recta ÷ velocidad máxima)."""
    return tr.heuristica_hacia(_zona_o_404(hacia), _tipo_o_400(tipo))


@router.get("/traslado/distancia")
async def traslado_distancia(
    desde: str, hasta: str, tipo: str = Query("euclidiana", description="euclidiana | manhattan")
):
    """El procedimiento de la distancia entre dos zonas (tabla, fórmula, pasos) y cómo se vuelve h en minutos."""
    return tr.calculo_distancia(_zona_o_404(desde), _zona_o_404(hasta), _tipo_o_400(tipo))


@router.get("/traslado/buscar", response_model=tr.ResultadoTraslado)
async def traslado_buscar(
    desde: str,
    hasta: str,
    algoritmo: str = Query("astar", description="bfs | dfs | ucs | greedy | astar"),
    limite: int | None = Query(None, ge=0, le=20, description="Límite de profundidad (vacío = sin límite)"),
    heuristica: str = Query("euclidiana", description="euclidiana | manhattan"),
):
    if algoritmo not in tr.ALGORITMOS_TRASLADO:
        raise HTTPException(status_code=400, detail="Algoritmo inválido: usa bfs, dfs, ucs, greedy o astar")
    return tr.ALGORITMOS_TRASLADO[algoritmo](_zona_o_404(desde), _zona_o_404(hasta), limite, _tipo_o_400(heuristica))


@router.get("/traslado/comparar", response_model=list[tr.ResultadoTraslado])
async def traslado_comparar(
    desde: str,
    hasta: str,
    limite: int | None = Query(None, ge=0, le=20),
    heuristica: str = Query("euclidiana", description="euclidiana | manhattan"),
):
    """Los cinco algoritmos sobre el mismo origen y destino."""
    a, b = _zona_o_404(desde), _zona_o_404(hasta)
    tipo = _tipo_o_400(heuristica)
    return [funcion(a, b, limite, tipo) for funcion in tr.ALGORITMOS_TRASLADO.values()]


@router.get("/traslado/todas", response_model=tr.TodasLasRutas)
async def traslado_todas(desde: str, hasta: str, limite: int | None = Query(6, ge=0, le=20)):
    """Todas las rutas posibles (backtracking, sin ciclos, con límite de profundidad), con sus minutos."""
    return tr.todas_las_rutas(_zona_o_404(desde), _zona_o_404(hasta), limite)


@router.get("/traslado/resumen")
async def traslado_resumen(heuristica: str = Query("euclidiana", description="euclidiana | manhattan")):
    """Los 5 algoritmos en TODOS los pares de zonas: cuántas veces no dan la ruta óptima y cuánto exploran."""
    return tr.resumen_todos_los_pares(_tipo_o_400(heuristica))


@router.get("/traslado/usuario", response_model=tr.ResumenTraslado)
async def traslado_usuario(desde: str, hasta: str):
    """Lo que ve el usuario: la ruta más rápida, otras opciones, un resumen en español y los datos del mapa limpio."""
    return tr.resumen_traslado(_zona_o_404(desde), _zona_o_404(hasta))


@router.get("/traslado/{student_id}/{vacancy_id}", response_model=tr.TrasladoPar)
async def traslado_par(
    student_id: str,
    vacancy_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    """Tiempo de traslado de la zona del estudiante a la zona de la vacante."""
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    await verificar_acceso_par(db, usuario, student_id, vacancy_doc)
    return tr.tiempo_traslado(student_doc["ubicacion"]["zona"], vacancy_doc["ubicacion"]["zona"])
