from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class MongoManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongo_manager = MongoManager()


async def connect_to_mongo() -> None:
    mongo_manager.client = AsyncIOMotorClient(settings.mongodb_uri)
    mongo_manager.db = mongo_manager.client[settings.mongodb_db_name]


async def close_mongo_connection() -> None:
    if mongo_manager.client is not None:
        mongo_manager.client.close()


def get_database() -> AsyncIOMotorDatabase:
    if mongo_manager.db is None:
        raise RuntimeError("La conexión a MongoDB no ha sido inicializada.")
    return mongo_manager.db
