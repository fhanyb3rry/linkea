"""Carga datos de ejemplo en la base (pensado para el clúster de Atlas recién creado y vacío).

Se corre desde la carpeta backend, con el venv activo:

    python -m app.seed            # solo si la base está vacía
    python -m app.seed --reset    # BORRA todo lo de Linkea y vuelve a cargar los ejemplos

Crea también una cuenta por estudiante y por empresa, más un coordinador y un asesor académico;
todas con la contraseña de PASSWORD_DEMO (los correos se imprimen al terminar).

Usa la MONGODB_URI y MONGODB_DB_NAME del .env. Los datos pasan por los mismos modelos que la API,
así que tienen exactamente la forma que espera la app.
"""

import asyncio
import sys
import unicodedata
from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.database import crear_indices
from app.core.estadias import crear_seguimiento, nuevo_id
from app.core.seguridad import cifrar_password
from app.models.company import VacancyCreate
from app.models.organization import OrganizationCreate
from app.models.student import StudentCreate

# Todo lo que --reset borra (incluye los archivos de GridFS).
COLECCIONES = ["users", "organizations", "students", "seguimientos", "catalogo_documentos", "vacancies", "applications", "ai_compatibilidad", "archivos.files", "archivos.chunks"]

ESTUDIANTES = [
    {
        "nombre": "Ana Torres Reyes",
        "matricula": "222411101",
        "intereses": ["Tecnología"],
        "proyectos": [{"nombre": "Tablero de asistencia", "descripcion": "API en FastAPI y tablero con React para registrar asistencia del grupo.", "tecnologias": ["Python", "React", "SQL"], "enlace": "https://github.com/ejemplo/asistencia"}],
        "carrera": "Ingeniería en Software",
        "semestre": 7,
        "ubicacion": {"zona": "Toluca"},
        "skills": ["Python", "SQL", "Git", "React"],
        "disponibilidad": {"horas_por_semana": 30, "dias": ["Lun", "Mar", "Mié", "Jue", "Vie"]},
        "correo": "ana.torres@ejemplo.com",
        "bio": "Me gusta construir APIs y tableros de datos.",
        "idiomas": ["Español nativo", "Inglés B2"],
    },
    {
        "nombre": "Carlos Rojas Medina",
        "matricula": "222411102",
        "intereses": ["Tecnología"],
        "proyectos": [{"nombre": "Tienda en línea", "descripcion": "Catálogo y carrito con Node y React, desplegado en Docker.", "tecnologias": ["Node", "React", "Docker"], "enlace": ""}],
        "carrera": "Ingeniería en Sistemas",
        "semestre": 8,
        "ubicacion": {"zona": "Metepec"},
        "skills": ["JavaScript", "Node", "React", "Docker"],
        "disponibilidad": {"horas_por_semana": 25, "dias": ["Lun", "Mié", "Vie"]},
        "correo": "carlos.rojas@ejemplo.com",
        "idiomas": ["Español nativo", "Inglés B1"],
    },
    {
        "nombre": "Valeria Gómez Díaz",
        "matricula": "222411103",
        "intereses": ["Marketing", "Diseño"],
        "proyectos": [{"nombre": "Campaña cafetería local", "descripcion": "Estrategia de redes sociales que duplicó seguidores en 3 meses.", "tecnologias": ["Redes sociales", "Copywriting"], "enlace": ""}],
        "carrera": "Mercadotecnia",
        "semestre": 6,
        "ubicacion": {"zona": "Toluca"},
        "skills": ["Marketing digital", "Redes sociales", "Copywriting"],
        "disponibilidad": {"horas_por_semana": 20, "dias": ["Mar", "Jue", "Sáb"]},
        "correo": "valeria.gomez@ejemplo.com",
        "idiomas": ["Español nativo"],
    },
    {
        "nombre": "Diego Ramírez Soto",
        "matricula": "222411104",
        "intereses": ["Ingeniería", "Administración"],
        "proyectos": [],
        "carrera": "Ingeniería Industrial",
        "semestre": 7,
        "ubicacion": {"zona": "Lerma"},
        "skills": ["Excel", "Power BI", "Estadistica"],
        "disponibilidad": {"horas_por_semana": 35, "dias": ["Lun", "Mar", "Mié", "Jue", "Vie"]},
        "correo": "diego.ramirez@ejemplo.com",
        "idiomas": ["Español nativo", "Inglés B1"],
    },
    {
        "nombre": "Fernanda López Cruz",
        "matricula": "222411105",
        "intereses": ["Diseño"],
        "proyectos": [{"nombre": "Identidad para panadería", "descripcion": "Logotipo, paleta y empaques.", "tecnologias": ["Illustrator", "Photoshop"], "enlace": ""}],
        "carrera": "Diseño Gráfico",
        "semestre": 5,
        "ubicacion": {"zona": "Zinacantepec"},
        "skills": ["Figma", "Photoshop", "Illustrator"],
        "disponibilidad": {"horas_por_semana": 15, "dias": ["Lun", "Mié"]},
        "correo": "fernanda.lopez@ejemplo.com",
        "idiomas": ["Español nativo", "Inglés C1"],
    },
    {
        "nombre": "Jorge Hernández Vega",
        "matricula": "222411106",
        "intereses": ["Administración"],
        "proyectos": [],
        "carrera": "Administración",
        "semestre": 8,
        "ubicacion": {"zona": "Metepec"},
        "skills": ["Excel", "Comunicación", "Liderazgo"],
        "disponibilidad": {"horas_por_semana": 30, "dias": ["Lun", "Mar", "Mié", "Jue", "Vie"]},
        "correo": "jorge.hernandez@ejemplo.com",
        "idiomas": ["Español nativo"],
    },
]


def _vacante(empresa, titulo, sector, zona, carreras, skills, horas, dias, apoyo, monto, modalidad, descripcion):
    return {
        "nombre_empresa": empresa,
        "titulo": titulo,
        "sector": sector,
        "ubicacion": {"zona": zona},
        "requisitos": {"carreras_aceptadas": carreras, "skills_clave": skills},
        "estipendio": {"apoyo_economico": apoyo, "monto": monto},
        "horarios": {"horas_por_semana": horas, "dias": dias},
        "modalidad": modalidad,
        "descripcion": descripcion,
    }


LV = ["Lun", "Mar", "Mié", "Jue", "Vie"]
VACANTES = [
    _vacante("Soluciones Nevado", "Desarrollo backend con Python", "Tecnología", "Toluca", ["Ingeniería en Software", "Ingeniería en Sistemas"],
             ["Python", "SQL"], 25, LV, True, 4500, "hibrido",
             "Apoyo en el desarrollo de una API interna y reportes de datos."),
    _vacante("Valle Digital", "Desarrollo front-end con React", "Tecnología", "Metepec", ["Ingeniería en Sistemas", "Ingeniería en Software"],
             ["React", "JavaScript"], 20, ["Lun", "Mié", "Vie"], True, 4000, "remoto",
             "Desarrollo de componentes front-end para la plataforma de clientes."),
    _vacante("Manufacturas del Centro", "Analista de indicadores de producción", "Ingeniería", "Lerma", ["Ingeniería Industrial"],
             ["Excel", "Power BI"], 30, LV, True, 5000, "presencial",
             "Análisis de indicadores de producción y mejora continua."),
    _vacante("Agencia Xinantécatl", "Community manager", "Marketing", "Toluca", ["Mercadotecnia", "Diseño Gráfico"],
             ["Redes sociales", "Copywriting"], 20, ["Mar", "Jue"], False, None, "hibrido",
             "Gestión de redes sociales y campañas para clientes locales."),
    _vacante("Estudio Matlatzinca", "Diseño de identidad y UI", "Diseño", "Toluca", ["Diseño Gráfico"],
             ["Figma", "Illustrator"], 15, ["Lun", "Mié"], True, 3000, "presencial",
             "Diseño de identidad visual y prototipos de interfaces."),
    _vacante("Grupo Administrativo Lerma", "Auxiliar administrativo", "Administración", "Lerma", ["Administración", "Contaduría"],
             ["Excel", "Comunicación"], 30, LV, True, 4000, "presencial",
             "Apoyo en procesos administrativos y control de proveedores."),
]

PASSWORD_DEMO = "Linkea#2026"

# Personal de la universidad (no se puede registrar desde la app).
PERSONAL = [
    ("Coordinación de Estadías", "coordinador@linkea.test", "coordinador"),
    ("Mtra. Laura Sánchez", "asesor@linkea.test", "asesor_academico"),
]

# Documentos de ejemplo de la estadía (la lista real de la UTVT la ajusta coordinación en la app).
CATALOGO = [
    ("Carta de presentación", "La emite la universidad para presentar al estudiante.", ["academico"]),
    ("Carta de aceptación", "La organización confirma que recibe al estudiante.", ["empresarial"]),
    ("Plan de trabajo", "Actividades y entregables acordados para la estadía.", ["academico", "empresarial"]),
    ("Evaluación final", "Calificación del desempeño del estudiante.", ["academico", "empresarial"]),
    ("Carta de liberación", "La organización confirma que el estudiante concluyó sus horas.", ["empresarial"]),
]

# (índice de estudiante, índice de vacante, estado)
POSTULACIONES = [(0, 0, "en_revision"), (1, 1, "enviada"), (3, 2, "aceptada"), (2, 3, "enviada"), (5, 5, "asignada")]


async def main(reset: bool) -> None:
    cliente = AsyncIOMotorClient(settings.mongodb_uri)
    db = cliente[settings.mongodb_db_name]
    try:
        if reset:
            for nombre in COLECCIONES:
                await db.drop_collection(nombre)
            print(f"Base «{settings.mongodb_db_name}» limpiada.")
        elif await db.students.count_documents({}) or await db.vacancies.count_documents({}):
            print("La base ya tiene datos. Usa --reset para borrarlos y volver a cargar los ejemplos.")
            sys.exit(1)

        await crear_indices(db)

        ahora = datetime.now(timezone.utc).isoformat()
        password_hash = cifrar_password(PASSWORD_DEMO)

        def cuenta(nombre, email, rol):
            return {"nombre": nombre, "email": email, "password_hash": password_hash, "rol": rol,
                    "perfil_id": None, "activo": True, "creado_en": ahora}

        await db.users.insert_many([cuenta(*p) for p in PERSONAL])

        # Cada estudiante con su cuenta (el correo de la cuenta es el de su perfil).
        ids_est = []
        for e in ESTUDIANTES:
            user_id = (await db.users.insert_one(cuenta(e["nombre"], e["correo"], "estudiante"))).inserted_id
            perfil = {**StudentCreate(**e).model_dump(mode="json"), "user_id": str(user_id)}
            sid = (await db.students.insert_one(perfil)).inserted_id
            await db.users.update_one({"_id": user_id}, {"$set": {"perfil_id": str(sid)}})
            ids_est.append(sid)

        # Cada empresa con su cuenta y su organización, dueña de su vacante.
        ids_vac = []
        for v in [dict(v) for v in VACANTES]:
            empresa = v.pop("nombre_empresa")
            sin_acentos = unicodedata.normalize("NFKD", empresa.lower()).encode("ascii", "ignore").decode()
            dominio = "".join(c for c in sin_acentos if c.isalnum()) + ".test"
            email = "rh@" + dominio
            user_id = str((await db.users.insert_one(cuenta(empresa, email, "empresa"))).inserted_id)
            org = OrganizationCreate(
                nombre=empresa,
                sector=v["sector"],
                ubicacion=v["ubicacion"],
                descripcion=f"{empresa} recibe practicantes de la UTVT en el área de {v['sector'].lower()}.",
                contacto={"correo": email, "sitio": f"https://{dominio[:-5]}.mx", "responsable": "Lic. Andrea Ruiz", "cargo": "Recursos Humanos"},
            )
            org_id = (await db.organizations.insert_one({**org.model_dump(mode="json"), "user_id": user_id, "creada_en": ahora})).inserted_id
            await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"perfil_id": str(org_id)}})
            vacante = {**VacancyCreate(**v).model_dump(mode="json"), "nombre_empresa": empresa,
                       "organizacion_id": str(org_id), "user_id": user_id}
            ids_vac.append((await db.vacancies.insert_one(vacante)).inserted_id)

        # El historial repite el camino normal hasta llegar al estado de ejemplo.
        camino = {"enviada": ["enviada"], "en_revision": ["enviada", "en_revision"],
                  "aceptada": ["enviada", "en_revision", "aceptada"],
                  "asignada": ["enviada", "en_revision", "aceptada", "asignada"]}
        await db.applications.insert_many([
            {"student_id": str(ids_est[e]), "vacancy_id": str(ids_vac[v]), "mensaje": "", "estado": estado, "creada_en": ahora,
             "historial": [{"estado": paso, "fecha": ahora, "por": "Datos de ejemplo", "nota": ""} for paso in camino[estado]]}
            for e, v, estado in POSTULACIONES
        ])
        for e, _, estado in POSTULACIONES:
            if estado in ("aceptada", "asignada"):
                await db.students.update_one({"_id": ids_est[e]}, {"$set": {"estado": "en_proceso" if estado == "aceptada" else "colocado"}})

        await db.catalogo_documentos.insert_many([
            {"nombre": n, "descripcion": d, "requiere": r, "orden": i, "activo": True} for i, (n, d, r) in enumerate(CATALOGO)
        ])

        # Estadía en curso de ejemplo: con asesor académico y unas bitácoras.
        asesor = await db.users.find_one({"rol": "asesor_academico"})
        for postulacion in await db.applications.find({"estado": "asignada"}).to_list(length=None):
            sid = await crear_seguimiento(db, postulacion)
            bitacoras = [
                {"id": nuevo_id(), "fecha": f"2026-09-{d:02d}", "horas": 8, "actividades": act, "estado": est,
                 "revisada_por": "Grupo Administrativo Lerma" if est != "pendiente" else "", "revisada_en": ahora if est != "pendiente" else "",
                 "observacion": "", "creada_en": ahora}
                for d, act, est in [
                    (21, "Inducción y recorrido por las áreas administrativas.", "validada"),
                    (22, "Captura y conciliación de facturas de proveedores.", "validada"),
                    (23, "Apoyo en el control de inventario de papelería.", "pendiente"),
                ]
            ]
            await db.seguimientos.update_one({"_id": sid}, {"$set": {
                "asesor_academico_id": str(asesor["_id"]), "asesor_academico_nombre": asesor["nombre"],
                "fecha_inicio": "2026-09-21", "bitacoras": bitacoras,
            }})

        print(f"Listo: {len(ids_est)} estudiantes, {len(ids_vac)} organizaciones con una vacante cada una y {len(POSTULACIONES)} postulaciones.")
        print(f"\nCuentas (contraseña de todas: {PASSWORD_DEMO}):")
        async for u in db.users.find({}, {"email": 1, "rol": 1}).sort("rol"):
            print(f"  {u['rol']:<17} {u['email']}")
    finally:
        cliente.close()


if __name__ == "__main__":
    asyncio.run(main(reset="--reset" in sys.argv))
