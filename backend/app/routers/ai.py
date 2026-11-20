from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.ai.client import ia_configurada, probar_conexion
from app.ai.compatibilidad import ErrorIA, evaluar_con_ia, huella
from app.core.config import settings
from app.core.database import get_database
from app.core.permisos import verificar_acceso_par
from app.core.seguridad import es_rol, requiere_rol, usuario_actual
from app.logic.logic_rules import evaluar_elegibilidad
from app.ml.modelo import predecir as predecir_ml
from app.ml.generar_dataset import ARTEFACTOS as ML_ARTEFACTOS
from app.models.company import Vacancy
from app.models.student import Student
from app.models.user import Rol
from app.routers.companies import _oid as vacancy_oid
from app.routers.students import _oid as student_oid

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(usuario_actual)])


@router.get("/status")
async def status():
    """¿Hay key configurada? No gasta nada ni llama a la API."""
    return {"configurada": ia_configurada(), "modelo": settings.anthropic_model}


@router.get("/modelo")
async def metricas_modelo():
    """Métricas y reglas del modelo propio (para documentación/demo), sin gastar nada."""
    metricas = ML_ARTEFACTOS / "metricas.json"
    arbol = ML_ARTEFACTOS / "arbol.txt"
    if not metricas.exists():
        return {"entrenado": False, "aviso": "Corre `python -m app.ml.entrenar` para generar el modelo."}
    import json
    comparacion = ML_ARTEFACTOS / "comparacion.json"
    return {
        "entrenado": True,
        **json.loads(metricas.read_text(encoding="utf-8")),
        "arbol_aprendido": arbol.read_text(encoding="utf-8") if arbol.exists() else "",
        # Práctica 5: tabla árbol vs bosque vs KNN (si se corrió app.ml.comparar).
        "comparacion_algoritmos": (
            json.loads(comparacion.read_text(encoding="utf-8")) if comparacion.exists() else None
        ),
    }


@router.get("/segmentos")
async def segmentos():
    """Segmentos de estudiantes por K-Means (práctica 8 adaptada a Linkea)."""
    archivo = ML_ARTEFACTOS / "segmentos" / "segmentos.json"
    if not archivo.exists():
        return {"disponible": False,
                "aviso": "Corre `python -m app.ml.segmentar` para generar los segmentos."}
    import json
    return {"disponible": True, **json.loads(archivo.read_text(encoding="utf-8"))}


@router.get("/pca")
async def pca():
    """Proyección PCA del perfil de estudiantes (práctica 9 adaptada a Linkea)."""
    archivo = ML_ARTEFACTOS / "pca" / "pca.json"
    if not archivo.exists():
        return {"disponible": False,
                "aviso": "Corre `python -m app.ml.pca` para generar la proyección."}
    import json
    return {"disponible": True, **json.loads(archivo.read_text(encoding="utf-8"))}


@router.get("/asignacion", dependencies=[Depends(requiere_rol(Rol.COORDINADOR, Rol.ASESOR_ACADEMICO))])
async def asignacion():
    """Reparto óptimo estudiante↔vacante calculado por el algoritmo genético.

    Solo coordinación y asesores: es una herramienta de asignación de plazas."""
    from app.ml.genetico import asignacion_optima
    return await asignacion_optima()


@router.get("/optimizacion")
async def optimizacion():
    """Optimización de hiperparámetros (Grid/Randomized Search, práctica 6)."""
    archivo = ML_ARTEFACTOS / "optimizacion" / "optimizacion.json"
    if not archivo.exists():
        return {"disponible": False,
                "aviso": "Corre `python -m app.ml.optimizar` para generar la optimización."}
    import json
    return {"disponible": True, **json.loads(archivo.read_text(encoding="utf-8"))}


@router.get("/cnn")
async def cnn():
    """Métricas de la CNN 1D sobre las secuencias de estadías (Etapa 16/17)."""
    archivo = ML_ARTEFACTOS / "cnn" / "metricas_cnn.json"
    if not archivo.exists():
        return {"disponible": False,
                "aviso": "Corre `python -m app.ml.cnn_datos` y luego "
                         "`python -m app.ml.cnn` para generar los resultados."}
    import json
    return {"disponible": True, **json.loads(archivo.read_text(encoding="utf-8"))}


@router.get("/estadisticas",
            dependencies=[Depends(requiere_rol(Rol.COORDINADOR, Rol.ASESOR_ACADEMICO))])
async def estadisticas():
    """Agregaciones de la base para coordinación (Etapa 7 adaptada):
    postulaciones por estado/vacante, reportes IA por segmento, consultas
    de compatibilidad por fuente y seguimientos con incidencias abiertas."""
    from app.ml.estadisticas import generar_estadisticas
    return await generar_estadisticas()


@router.get("/reporte/{student_id}")
async def reporte(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    """Reporte integral del motor de recomendaciones: predicción del modelo,
    segmento K-Means, mejores vacantes y recomendaciones en lenguaje llano.

    Permisos: el estudiante solo ve el suyo; una empresa, solo el de quienes
    se postularon a sus vacantes; coordinación y asesores ven cualquiera."""
    if es_rol(usuario, Rol.ESTUDIANTE) and student_id != usuario.get("perfil_id"):
        raise HTTPException(status_code=403, detail="Solo puedes ver tu propio reporte")
    if es_rol(usuario, Rol.EMPRESA):
        # Las postulaciones no guardan empresa: se busca si el estudiante se
        # postuló a alguna de SUS vacantes (por el user_id de la vacante).
        mis_vacantes = [
            str(v["_id"]) async for v in
            db.vacancies.find({"user_id": str(usuario["_id"])}, {"_id": 1})
        ]
        postulo = await db.applications.find_one(
            {"student_id": student_id, "vacancy_id": {"$in": mis_vacantes}})
        if postulo is None:
            raise HTTPException(
                status_code=403,
                detail="Solo puedes ver a quienes se postularon a tus vacantes")
    from app.ml.recomendar import reporte_estudiante
    resultado = await reporte_estudiante(db, student_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return resultado


@router.post("/test", dependencies=[Depends(requiere_rol(Rol.COORDINADOR))])
async def test():
    """Prueba real de conexión con la API de Claude (una llamada mínima, gasta una fracción de centavo).

    Solo coordinación: cada llamada gasta saldo de la cuenta de la API."""
    if not ia_configurada():
        return {
            "ok": False,
            "modelo": settings.anthropic_model,
            "detalle": "Falta ANTHROPIC_API_KEY en backend/.env (y reiniciar el backend).",
        }
    return await probar_conexion()


# ------------------------------------------------------------
# FILTRO 2: compatibilidad con IA
# ------------------------------------------------------------


class CompatibilidadRespuesta(BaseModel):
    fuente: Literal["ia", "modelo", "reglas", "no_aplica"]  # quién calculó el puntaje
    puntaje: int | None = None
    razones_a_favor: list[str] = []
    razones_en_contra: list[str] = []
    resumen: str = ""
    aviso: str = ""  # por qué no se usó la IA, si aplica
    modelo: str | None = None
    desde_cache: bool = False
    # Solo cuando fuente="modelo": qué aspecto pesa más y qué skills faltan.
    importancias: dict[str, float] = {}
    habilidades_por_aprender: list[str] = []


@router.get("/compatibility/{student_id}/{vacancy_id}", response_model=CompatibilidadRespuesta)
async def compatibilidad(
    student_id: str,
    vacancy_id: str,
    refrescar: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    """Filtro 2. Solo evalúa con IA a quien pasó el filtro 1; si la IA falla, responde con las reglas."""
    student_doc = await db.students.find_one({"_id": student_oid(student_id)})
    if student_doc is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    vacancy_doc = await db.vacancies.find_one({"_id": vacancy_oid(vacancy_id)})
    if vacancy_doc is None:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    # Permisos: cada quien solo evalúa lo suyo (la IA gasta saldo y el resultado es información del perfil).
    await verificar_acceso_par(db, usuario, student_id, vacancy_doc)
    if es_rol(usuario, Rol.EMPRESA):
        refrescar = False  # una empresa no puede forzar nuevas llamadas de pago

    student, vacancy = Student(**student_doc), Vacancy(**vacancy_doc)

    # Filtro 1: si no es elegible, aquí termina (no gastamos IA).
    filtro1 = evaluar_elegibilidad(student, vacancy)
    if not filtro1.elegible:
        return CompatibilidadRespuesta(
            fuente="no_aplica",
            aviso="No pasó el filtro de elegibilidad, así que no se evalúa con IA.",
            razones_en_contra=filtro1.razones_descarte,
        )

    def respaldo(aviso: str) -> CompatibilidadRespuesta:
        return CompatibilidadRespuesta(fuente="reglas", puntaje=filtro1.compatibilidad, aviso=aviso)

    # Filtro 2 con nuestro primer modelo propio (árbol de decisión entrenado con los
    # datos de Linkea): gratis e instantáneo, así que va primero. La IA externa queda
    # como opción cuando el archivo del modelo no exista (sin entrenar todavía).
    prediccion = predecir_ml(student, vacancy)
    if prediccion is not None:
        porcentaje = round(prediccion["probabilidad"] * 100)
        resumen = f"El modelo estima {porcentaje}% de compatibilidad para este par."
        if prediccion["habilidades_por_aprender"]:
            resumen += " Habilidades que le sumarían: " + ", ".join(
                prediccion["habilidades_por_aprender"]) + "."
        return CompatibilidadRespuesta(
            fuente="modelo",
            puntaje=porcentaje,
            razones_a_favor=prediccion["a_favor"],
            razones_en_contra=prediccion["en_contra"],
            resumen=resumen,
            modelo=prediccion["version"],
            importancias=prediccion["importancias"],
            habilidades_por_aprender=prediccion["habilidades_por_aprender"],
        )

    if not ia_configurada():
        return respaldo("La IA no está configurada; se muestra el porcentaje por reglas (estimado).")

    # Caché: si el par no cambió desde la última vez, se reutiliza sin llamar a la API.
    clave = f"{student_id}:{vacancy_id}"
    sello = huella(student, vacancy)
    guardado = await db.ai_compatibilidad.find_one({"_id": clave})
    if guardado and guardado["huella"] == sello and not refrescar:
        return CompatibilidadRespuesta(**{**guardado["resultado"], "desde_cache": True})

    try:
        resultado, _uso = await evaluar_con_ia(student, vacancy)
    except ErrorIA as error:
        return respaldo(f"{error} Se muestra el porcentaje por reglas (estimado).")

    respuesta = CompatibilidadRespuesta(fuente="ia", modelo=settings.anthropic_model, **resultado.model_dump())
    await db.ai_compatibilidad.replace_one(
        {"_id": clave}, {"_id": clave, "huella": sello, "resultado": respuesta.model_dump()}, upsert=True
    )
    return respuesta
