"""Motor inteligente de recomendaciones — prácticas 14 y 15 adaptadas.

    GET /ai/reporte/{student_id}   (desde app/routers/ai.py)

En SmartAcademy el motor combinaba Random Forest + K-Means + PCA para dar
un reporte del estudiante. En Linkea integra nuestros tres equivalentes:

    supervisado       el árbol entrenado (probabilidad de ser elegible por
                      vacante, con razones y skills faltantes)
    no supervisado    el segmento K-Means del estudiante (de segmentos.json)
    reglas            recomendaciones en lenguaje llano según su perfil:
                      qué aprender, por dónde empezar, qué mejorar

Además persiste cada reporte generado en la colección `ai_reportes` de
Mongo (el equivalente de la práctica 15: el análisis queda guardado con
su fecha e identificador para consulta posterior).
"""

import json
import uuid
from datetime import datetime, timezone

import pandas as pd
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.logic.logic_rules import evaluar_elegibilidad
from app.ml.generar_dataset import ARTEFACTOS
from app.ml.modelo import predecir
from app.models.company import Vacancy
from app.models.student import Student
from app.routers.students import _oid as student_oid
from app.search.busqueda import bfs_ruta_corta
from app.search.grafo_skills import GRAFO_SKILLS, normalizar


async def reporte_estudiante(db: AsyncIOMotorDatabase, student_id: str) -> dict | None:
    """Genera (y guarda en Mongo) el reporte integral de un estudiante."""
    doc = await db.students.find_one({"_id": student_oid(student_id)})
    if doc is None:
        return None
    student = Student(**doc)
    vacancies = [Vacancy(**v) async for v in db.vacancies.find()]

    # ------------------------------------------------------------
    # 1. Aprendizaje supervisado: puntaje del árbol por cada vacante
    # ------------------------------------------------------------
    evaluaciones = []
    for v in vacancies:
        filtro1 = evaluar_elegibilidad(student, v)
        prediccion = predecir(student, v) if filtro1.elegible else None
        evaluaciones.append({
            "vacante": v, "filtro1": filtro1, "modelo": prediccion,
            "puntaje": round((prediccion["probabilidad"] if prediccion else 0) * 100),
        })
    evaluaciones.sort(key=lambda e: (e["filtro1"].elegible, e["puntaje"]), reverse=True)

    mejores = [{
        "vacante_id": str(e["vacante"].id),
        "vacante": e["vacante"].titulo,
        "empresa": e["vacante"].nombre_empresa,
        "elegible": e["filtro1"].elegible,
        "probabilidad_modelo": e["puntaje"],
        "habilidades_por_aprender": (e["modelo"] or {}).get("habilidades_por_aprender", []),
        "razones_en_contra": [] if e["filtro1"].elegible else e["filtro1"].razones_descarte,
    } for e in evaluaciones[:3]]

    # ------------------------------------------------------------
    # 2. Aprendizaje no supervisado: su segmento K-Means (si existe)
    # ------------------------------------------------------------
    segmento = None
    archivo_seg = ARTEFACTOS / "segmentos" / "reporte_integral.csv"
    if archivo_seg.exists():
        perfiles = pd.read_csv(archivo_seg)
        fila = perfiles[perfiles["id"] == student_id]
        if not fila.empty:
            fila = fila.iloc[0]
            segmento = {
                "nombre": fila["segmento"],
                "silhouette": float(fila["silhouette"]),
                "posible_atipico": bool(fila["posible_atipico"]),
            }

    # ------------------------------------------------------------
    # 3. Reglas de recomendación en lenguaje llano
    # ------------------------------------------------------------
    recomendaciones: list[str] = []

    if segmento:
        nombre = segmento["nombre"]
        if "fuerte" in nombre.lower():
            recomendaciones.append(
                f"Tu perfil está en «{nombre}»: puedes apuntar a las vacantes "
                "más exigentes sin problema de encuadre.")
        elif "acompa" in nombre.lower():
            recomendaciones.append(
                f"Tu perfil está en «{nombre}»: conviene fortalecer las "
                "habilidades clave antes de postular a más plazas.")
        else:
            recomendaciones.append(
                f"Tu perfil está en «{nombre}»: tienes buena base; un par de "
                "habilidades más te acercaría al segmento más fuerte.")

    top = evaluaciones[0] if evaluaciones else None
    if top and top["filtro1"].elegible and top["modelo"]:
        faltan = top["modelo"].get("habilidades_por_aprender", [])
        if faltan:
            sabe = {normalizar(s) for s in student.skills} & GRAFO_SKILLS.keys()
            sugeridas = []
            for objetivo in faltan[:3]:
                origen = normalizar(objetivo)
                for base in sabe:
                    ruta = bfs_ruta_corta(GRAFO_SKILLS, base, origen)
                    if ruta.rutas:
                        sugeridas.append(" → ".join(ruta.rutas[0]))
                        break
                else:
                    sugeridas.append(f"{objetivo} (sin ruta conocida en el grafo)")
            recomendaciones.append(
                f"Para «{top['vacante'].titulo}» te convendría aprender: "
                + "; ".join(sugeridas) + ".")
    elif top and not top["filtro1"].elegible:
        recomendaciones += top["filtro1"].razones_descarte[:2]
        recomendaciones.append(
            "Trabaja primero en lo que bloquea las vacantes cercanas; "
            "cada habilidad clave que agregues abre más opciones.")

    if student.disponibilidad.horas_por_semana < 20:
        recomendaciones.append(
            f"Ofreces {student.disponibilidad.horas_por_semana} h/semana; "
            "ampliar tu disponibilidad desbloquearía más vacantes.")

    if not recomendaciones:
        recomendaciones.append(
            "Tu perfil ya encaja con las vacantes disponibles; postúlate a "
            "las que mejor te queden.")

    # ------------------------------------------------------------
    # 4. Reporte + persistencia en Mongo (práctica 15)
    # ------------------------------------------------------------
    reporte = {
        "id_analisis": str(uuid.uuid4()),
        "sistema": "Linkea",
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "estudiante_id": student_id,
        "estudiante": student.nombre,
        "carrera": student.carrera,
        "segmento": segmento,
        "mejores_vacantes": mejores,
        "recomendaciones": recomendaciones,
        "resumen": (
            f"{student.nombre} — segmento «{segmento['nombre']}». " if segmento
            else f"{student.nombre} — ") +
            (f"Mejor opción: «{mejores[0]['vacante']}» ({mejores[0]['empresa']}) "
             f"con {mejores[0]['probabilidad_modelo']}% estimado por el modelo."
             if mejores else "Sin vacantes disponibles para evaluar."),
    }
    await db.ai_reportes.insert_one(reporte)
    reporte.pop("_id", None)
    return reporte
