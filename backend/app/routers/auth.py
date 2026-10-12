from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.seguridad import cifrar_password, crear_token, requiere_rol, usuario_actual, verificar_password
from app.models.user import LoginIn, PersonalIn, RegistroIn, Rol, TokenOut, Usuario, UsuarioUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def _sesion(usuario: dict) -> TokenOut:
    return TokenOut(access_token=crear_token(str(usuario["_id"]), usuario["rol"]), usuario=usuario)


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(data: RegistroIn, db: AsyncIOMotorDatabase = Depends(get_database)):
    doc = {
        "nombre": data.nombre.strip(),
        "email": data.email,
        "password_hash": cifrar_password(data.password),
        "rol": data.rol.value,
        "perfil_id": None,
        "activo": True,
        "creado_en": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")
    return _sesion({**doc, "_id": result.inserted_id})


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, db: AsyncIOMotorDatabase = Depends(get_database)):
    usuario = await db.users.find_one({"email": data.email})
    # Mismo mensaje si no existe el correo o si la contraseña está mal: no revelamos qué correos hay.
    if usuario is None or not verificar_password(data.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not usuario.get("activo", True):
        raise HTTPException(status_code=403, detail="Esta cuenta está desactivada")
    return _sesion(usuario)


@router.get("/me", response_model=Usuario)
async def me(usuario: dict = Depends(usuario_actual)):
    return usuario


@router.get("/usuarios", response_model=list[Usuario])
async def list_usuarios(
    rol: Rol | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: dict = Depends(requiere_rol(Rol.COORDINADOR)),
):
    """Cuentas registradas (solo coordinación), p. ej. ?rol=asesor_academico para asignar asesores."""
    filtro = {"rol": rol.value} if rol else {}
    return await db.users.find(filtro).sort("nombre", 1).to_list(length=None)


@router.post("/usuarios", response_model=Usuario, status_code=201)
async def create_personal(
    data: PersonalIn,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: dict = Depends(requiere_rol(Rol.COORDINADOR)),
):
    """Coordinación da de alta asesores académicos u otros coordinadores."""
    doc = {
        "nombre": data.nombre.strip(),
        "email": data.email,
        "password_hash": cifrar_password(data.password),
        "rol": data.rol.value,
        "perfil_id": None,
        "activo": True,
        "creado_en": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")
    return {**doc, "_id": result.inserted_id}


@router.patch("/usuarios/{usuario_id}", response_model=Usuario)
async def update_usuario(
    usuario_id: str,
    data: UsuarioUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    yo: dict = Depends(requiere_rol(Rol.COORDINADOR)),
):
    """Activar o desactivar una cuenta (una cuenta desactivada ya no puede entrar)."""
    try:
        oid = ObjectId(usuario_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    if oid == yo["_id"]:
        raise HTTPException(status_code=409, detail="No puedes desactivar tu propia cuenta")
    result = await db.users.update_one({"_id": oid}, {"$set": {"activo": data.activo}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return await db.users.find_one({"_id": oid})
