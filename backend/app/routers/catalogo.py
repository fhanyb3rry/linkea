from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.seguridad import requiere_rol, usuario_actual
from app.models.seguimiento import DocumentoCatalogo, DocumentoCatalogoIn
from app.models.user import Rol

# Catálogo de documentos de estadía (carta de aceptación, plan de trabajo, …). Lo administra
# coordinación; cada estadía nueva copia los documentos activos al asignarse.
router = APIRouter(prefix="/catalogo-documentos", tags=["catalogo"], dependencies=[Depends(usuario_actual)])

solo_coordinacion = requiere_rol(Rol.COORDINADOR)


def _oid(doc_id: str) -> ObjectId:
    try:
        return ObjectId(doc_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de documento inválido")


@router.get("", response_model=list[DocumentoCatalogo])
async def list_catalogo(db: AsyncIOMotorDatabase = Depends(get_database)):
    return await db.catalogo_documentos.find().sort("orden", 1).to_list(length=None)


@router.post("", response_model=DocumentoCatalogo, status_code=201, dependencies=[Depends(solo_coordinacion)])
async def create_documento(data: DocumentoCatalogoIn, db: AsyncIOMotorDatabase = Depends(get_database)):
    result = await db.catalogo_documentos.insert_one(data.model_dump(mode="json"))
    return await db.catalogo_documentos.find_one({"_id": result.inserted_id})


@router.put("/{doc_id}", response_model=DocumentoCatalogo, dependencies=[Depends(solo_coordinacion)])
async def update_documento(doc_id: str, data: DocumentoCatalogoIn, db: AsyncIOMotorDatabase = Depends(get_database)):
    result = await db.catalogo_documentos.update_one({"_id": _oid(doc_id)}, {"$set": data.model_dump(mode="json")})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return await db.catalogo_documentos.find_one({"_id": _oid(doc_id)})


@router.delete("/{doc_id}", status_code=204, dependencies=[Depends(solo_coordinacion)])
async def delete_documento(doc_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    # Las estadías que ya lo tienen lo conservan (es su copia); solo deja de agregarse a las nuevas.
    result = await db.catalogo_documentos.delete_one({"_id": _oid(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
