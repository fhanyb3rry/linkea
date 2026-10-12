from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.seguridad import cifrar_password, crear_token, usuario_actual, verificar_password
from app.models.user import LoginIn, RegistroIn, TokenOut, Usuario

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
