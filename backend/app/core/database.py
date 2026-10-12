import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure

from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongo_manager = MongoManager()

# Índices de cada colección: (colección, llaves, opciones). Mongo crea las colecciones solas con el
# primer insert; los índices se crean al arrancar y, si ya existen, no pasa nada.
INDICES = [
    # Un estudiante solo puede postularse una vez a cada vacante.
    ("applications", [("student_id", 1), ("vacancy_id", 1)], {"unique": True}),
    ("applications", [("vacancy_id", 1)], {}),
    # Cuentas: un correo por cuenta; un perfil de estudiante por cuenta.
    ("users", [("email", 1)], {"unique": True}),
    ("students", [("user_id", 1)], {"unique": True, "partialFilterExpression": {"user_id": {"$type": "string"}}}),
    ("vacancies", [("user_id", 1)], {}),
]


async def crear_indices(db: AsyncIOMotorDatabase) -> None:
    for coleccion, llaves, opciones in INDICES:
        try:
            await db[coleccion].create_index(llaves, **opciones)
        except OperationFailure as error:
            # Pasa si ya hay datos que lo violan (p. ej. postulaciones duplicadas): avisamos sin tumbar la app.
            logger.warning("No se pudo crear el índice %s en %s: %s", llaves, coleccion, error)


async def connect_to_mongo() -> None:
    mongo_manager.client = AsyncIOMotorClient(settings.mongodb_uri)
    mongo_manager.db = mongo_manager.client[settings.mongodb_db_name]
    await crear_indices(mongo_manager.db)


async def close_mongo_connection() -> None:
    if mongo_manager.client is not None:
        mongo_manager.client.close()


def get_database() -> AsyncIOMotorDatabase:
    if mongo_manager.db is None:
        raise RuntimeError("La conexión a MongoDB no ha sido inicializada.")
    return mongo_manager.db
