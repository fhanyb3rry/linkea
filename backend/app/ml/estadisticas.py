"""Estadísticas agregadas de la base para coordinación (Etapa 7 adaptada).

    python -m app.ml.estadisticas            genera artefactos (JSON + CSVs)
    desde el endpoint /ai/estadisticas        las mismas agregaciones en vivo

En vez de reportes sueltos en Pandas sobre un CSV, las consultas corren en
MongoDB con el framework de agregación directamente sobre las colecciones
vivas del proyecto:

    applications        postulaciones por estado y por vacante
    ai_reportes         reportes de recomendación por segmento K-Means
    ai_compatibilidad   consultas de compatibilidad por fuente (reglas/IA)
    seguimientos        estadías por estado e incidencias abiertas

Salida en app/ml/artefactos/estadisticas/:
    estadisticas.json           todos los resultados
    postulaciones_estado.csv    conteo por estado
    postulaciones_vacante.csv   conteo y aceptación por vacante
    reportes_segmento.csv       reportes IA por segmento
"""

import asyncio
import json
from pathlib import Path

import pandas as pd

from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.ml.generar_dataset import ARTEFACTOS

RUTA = ARTEFACTOS / "estadisticas"
RUTA.mkdir(parents=True, exist_ok=True)

ARCHIVO_JSON = RUTA / "estadisticas.json"


async def generar_estadisticas() -> dict:
    """Corre las agregaciones y devuelve el resumen completo."""
    db = get_database()

    # 1. Postulaciones por estado ($group + $sort) ----------------------
    por_estado = await db.applications.aggregate([
        {"$group": {"_id": "$estado", "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]).to_list(None)
    total_postulaciones = sum(r["total"] for r in por_estado)

    # 2. Postulaciones y aceptación por vacante ($group + $cond + $sort +
    #    $limit). El título se resuelve aparte porque vacancy_id se guarda
    #    como string y _id es ObjectId.
    por_vacante = await db.applications.aggregate([
        {"$group": {
            "_id": "$vacancy_id",
            "postulaciones": {"$sum": 1},
            "aceptadas": {"$sum": {"$cond": [
                {"$in": ["$estado", ["aceptada", "asignada"]]}, 1, 0]}},
            "rechazadas": {"$sum": {"$cond": [
                {"$eq": ["$estado", "rechazada"]}, 1, 0]}},
        }},
        {"$sort": {"postulaciones": -1}},
        {"$limit": 10},
    ]).to_list(None)
    titulos = {str(v["_id"]): v["titulo"]
               async for v in db.vacancies.find({}, {"titulo": 1})}
    for r in por_vacante:
        r["vacante"] = titulos.get(r["_id"], "(vacante eliminada)")
        r["vacante_id"] = r.pop("_id")
        r["tasa_aceptacion"] = round(
            r["aceptadas"] / r["postulaciones"] * 100, 1)

    # 3. Reportes de IA por segmento ($match + $group + $unwind) --------
    por_segmento = await db.ai_reportes.aggregate([
        {"$match": {"segmento.nombre": {"$exists": True}}},
        {"$group": {
            "_id": "$segmento.nombre",
            "reportes": {"$sum": 1},
            "estudiantes": {"$addToSet": "$estudiante_id"},
        }},
        {"$project": {
            "reportes": 1,
            "estudiantes_unicos": {"$size": "$estudiantes"},
        }},
        {"$sort": {"reportes": -1}},
    ]).to_list(None)
    for r in por_segmento:
        r["segmento"] = r.pop("_id")

    # Probabilidad promedio del modelo sobre las mejores vacantes.
    prob_media = await db.ai_reportes.aggregate([
        {"$unwind": "$mejores_vacantes"},
        {"$group": {"_id": None,
                    "promedio": {"$avg": "$mejores_vacantes.probabilidad_modelo"}}},
    ]).to_list(None)

    # 4. Compatibilidad consultada por fuente (reglas/modelo/IA) --------
    por_fuente = await db.ai_compatibilidad.aggregate([
        {"$group": {
            "_id": "$resultado.fuente",
            "consultas": {"$sum": 1},
            "compatibilidad_media": {"$avg": "$resultado.compatibilidad"},
        }},
        {"$sort": {"consultas": -1}},
    ]).to_list(None)
    for r in por_fuente:
        r["compatibilidad_media"] = round(r["compatibilidad_media"] or 0, 1)

    # 5. Seguimientos por estado + incidencias abiertas ($unwind) -------
    seg_estado = await db.seguimientos.aggregate([
        {"$group": {"_id": "$estado", "total": {"$sum": 1}}},
    ]).to_list(None)
    incidencias = await db.seguimientos.aggregate([
        {"$unwind": "$incidencias"},
        {"$match": {"incidencias.estado": "abierta"}},
        {"$count": "abiertas"},
    ]).to_list(None)

    return {
        "postulaciones": {
            "total": total_postulaciones,
            "por_estado": {r["_id"]: r["total"] for r in por_estado},
            "por_vacante": por_vacante,
        },
        "reportes_ia": {
            "total": await db.ai_reportes.count_documents({}),
            "por_segmento": por_segmento,
            "probabilidad_modelo_media":
                round(prob_media[0]["promedio"], 1) if prob_media else None,
        },
        "compatibilidad": {
            "consultas_guardadas": await db.ai_compatibilidad.count_documents({}),
            "por_fuente": {
                (r["_id"] or "reglas"): {
                    "consultas": r["consultas"],
                    "compatibilidad_media": r["compatibilidad_media"],
                } for r in por_fuente
            },
        },
        "seguimientos": {
            "por_estado": {r["_id"]: r["total"] for r in seg_estado},
            "incidencias_abiertas":
                incidencias[0]["abiertas"] if incidencias else 0,
        },
    }


def _exportar(resumen: dict) -> None:
    """Versión batch: guarda el JSON y los CSVs tipo la práctica 7."""
    ARCHIVO_JSON.write_text(
        json.dumps(resumen, indent=2, ensure_ascii=False), encoding="utf-8")

    pd.DataFrame(
        [{"estado": k, "total": v}
         for k, v in resumen["postulaciones"]["por_estado"].items()]
    ).to_csv(RUTA / "postulaciones_estado.csv", index=False, encoding="utf-8-sig")

    pd.DataFrame(resumen["postulaciones"]["por_vacante"]).to_csv(
        RUTA / "postulaciones_vacante.csv", index=False, encoding="utf-8-sig")

    pd.DataFrame(resumen["reportes_ia"]["por_segmento"]).to_csv(
        RUTA / "reportes_segmento.csv", index=False, encoding="utf-8-sig")


async def main() -> None:
    await connect_to_mongo()
    try:
        resumen = await generar_estadisticas()
    finally:
        await close_mongo_connection()
    _exportar(resumen)
    print(json.dumps(resumen, indent=2, ensure_ascii=False))
    print(f"\nArtefactos -> {RUTA}")


if __name__ == "__main__":
    asyncio.run(main())
