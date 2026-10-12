from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.seguridad import es_rol, requiere_rol, usuario_actual
from app.models.organization import Organization, OrganizationCreate, OrganizationUpdate
from app.models.user import Rol

router = APIRouter(prefix="/organizations", tags=["organizations"], dependencies=[Depends(usuario_actual)])


def _oid(organization_id: str) -> ObjectId:
    try:
        return ObjectId(organization_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de organización inválido")


@router.post("", response_model=Organization, status_code=201)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(requiere_rol(Rol.EMPRESA)),
):
    if usuario.get("perfil_id"):
        raise HTTPException(status_code=409, detail="Tu cuenta ya tiene una organización registrada")
    doc = {
        **data.model_dump(),
        "user_id": str(usuario["_id"]),
        "creada_en": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.organizations.insert_one(doc)
    await db.users.update_one({"_id": usuario["_id"]}, {"$set": {"perfil_id": str(result.inserted_id)}})
    return await db.organizations.find_one({"_id": result.inserted_id})


@router.get("", response_model=list[Organization])
async def list_organizations(db: AsyncIOMotorDatabase = Depends(get_database)):
    return await db.organizations.find().sort("nombre", 1).to_list(length=None)


@router.get("/{organization_id}", response_model=Organization)
async def get_organization(organization_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    org = await db.organizations.find_one({"_id": _oid(organization_id)})
    if org is None:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    return org


@router.put("/{organization_id}", response_model=Organization)
async def update_organization(
    organization_id: str,
    data: OrganizationUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    usuario: dict = Depends(usuario_actual),
):
    oid = _oid(organization_id)
    org = await db.organizations.find_one({"_id": oid}, {"user_id": 1})
    if org is None:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    if not es_rol(usuario, Rol.COORDINADOR) and org["user_id"] != str(usuario["_id"]):
        raise HTTPException(status_code=403, detail="Solo puedes editar tu propia organización")

    cambios = {k: v for k, v in data.model_dump().items() if v is not None}
    if cambios:
        await db.organizations.update_one({"_id": oid}, {"$set": cambios})
        # Las vacantes guardan una copia del nombre (para no consultar la organización en cada
        # listado); si cambia, se actualiza en todas sus vacantes.
        if "nombre" in cambios:
            await db.vacancies.update_many(
                {"organizacion_id": organization_id}, {"$set": {"nombre_empresa": cambios["nombre"]}}
            )
    return await db.organizations.find_one({"_id": oid})
