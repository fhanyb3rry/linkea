"""Archivos (CV, reportes, documentos firmados) guardados en MongoDB con GridFS.

GridFS parte cada archivo en pedazos: los datos quedan en `archivos.chunks` y la información del
archivo (nombre, tipo, tamaño) en `archivos.files`. Así todo vive en el clúster y no en el disco
del servidor, y no se pierde al cambiar de máquina o al desplegar.
"""

from urllib.parse import quote

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from fastapi.responses import Response
from gridfs.errors import NoFile
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket

BUCKET = "archivos"


def _bucket(db: AsyncIOMotorDatabase) -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name=BUCKET)


async def guardar(db: AsyncIOMotorDatabase, contenido: bytes, nombre: str, tipo: str, **metadata) -> str:
    """Guarda el archivo y devuelve su id (como texto, para guardarlo en el documento que lo usa)."""
    archivo_id = await _bucket(db).upload_from_stream(
        nombre, contenido, metadata={"tipo": tipo, **metadata}
    )
    return str(archivo_id)


async def borrar(db: AsyncIOMotorDatabase, archivo_id: str | None) -> None:
    if not archivo_id:
        return
    try:
        await _bucket(db).delete(ObjectId(archivo_id))
    except (NoFile, InvalidId):
        pass  # ya no existía: no hay nada que borrar


async def descargar(db: AsyncIOMotorDatabase, archivo_id: str, nombre: str, tipo: str) -> Response:
    """Respuesta HTTP con el archivo listo para descargar."""
    try:
        stream = await _bucket(db).open_download_stream(ObjectId(archivo_id))
    except (NoFile, InvalidId):
        raise HTTPException(status_code=404, detail="No se encontró el archivo")
    contenido = await stream.read()
    return Response(
        contenido,
        media_type=tipo,
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{quote(nombre)}"},
    )
