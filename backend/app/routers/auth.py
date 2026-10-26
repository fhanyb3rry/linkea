from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core import rate_limit
from app.core.database import get_database
from app.core.seguridad import cifrar_password, crear_token, requiere_rol, usuario_actual, verificar_password
from app.models.user import (
    LoginIn,
    PersonalIn,
    RegistroIn,
    Rol,
    TokenOut,
    Usuario,
    UsuarioUpdate,
    normalizar_nombre,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Hash de relleno para comparar también cuando el correo no existe: así la respuesta tarda
# lo mismo y nadie puede adivinar qué correos están registrados midiendo tiempos.
_HASH_NULO = cifrar_password("no-importa-lo-que-pese-esto")


def _sesion(usuario: dict) -> TokenOut:
    return TokenOut(access_token=crear_token(str(usuario["_id"]), usuario["rol"]), usuario=usuario)


def _duplicado(error: DuplicateKeyError) -> HTTPException:
    # El índice único de Mongo protege contra carreras; el mensaje dice qué chocó.
    if "nombre_norm" in str(error):
        return HTTPException(status_code=409, detail="Ya existe una cuenta con ese nombre")
    return HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")


async def _nombre_libre(db: AsyncIOMotorDatabase, nombre: str) -> None:
    """El nombre también es único (además del correo): evita suplantar cuentas a la vista."""
    if await db.users.find_one({"nombre_norm": normalizar_nombre(nombre)}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese nombre")


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(data: RegistroIn, db: AsyncIOMotorDatabase = Depends(get_database)):
    await _nombre_libre(db, data.nombre)
    doc = {
        "nombre": data.nombre.strip(),
        "nombre_norm": normalizar_nombre(data.nombre),
        "email": data.email,
        "password_hash": cifrar_password(data.password),
        "rol": data.rol.value,
        "perfil_id": None,
        "activo": True,
        "creado_en": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError as error:
        raise _duplicado(error)
    return _sesion({**doc, "_id": result.inserted_id})


@router.post("/login", response_model=TokenOut)
async def login(request: Request, data: LoginIn, db: AsyncIOMotorDatabase = Depends(get_database)):
    # Freno contra fuerza bruta: pocos intentos por correo+IP, luego hay que esperar.
    clave = f"{request.client.host if request.client else '?'}:{data.email}"
    espera = rate_limit.segundos_bloqueado(clave)
    if espera:
        raise HTTPException(status_code=429, detail=f"Demasiados intentos. Prueba de nuevo en unos {max(1, espera // 60)} minutos.")

    usuario = await db.users.find_one({"email": data.email})
    # Mismo mensaje si no existe el correo o si la contraseña está mal: no revelamos qué correos hay.
    # Y comparamos aunque no exista (hash de relleno) para que la respuesta tarde lo mismo.
    coincide = verificar_password(data.password, usuario["password_hash"] if usuario else _HASH_NULO)
    if usuario is None or not coincide:
        rate_limit.registrar_fallo(clave)
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not usuario.get("activo", True):
        raise HTTPException(status_code=403, detail="Esta cuenta está desactivada")
    rate_limit.limpiar(clave)
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
    await _nombre_libre(db, data.nombre)
    doc = {
        "nombre": data.nombre.strip(),
        "nombre_norm": normalizar_nombre(data.nombre),
        "email": data.email,
        "password_hash": cifrar_password(data.password),
        "rol": data.rol.value,
        "perfil_id": None,
        "activo": True,
        "creado_en": datetime.now(timezone.utc).isoformat(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError as error:
        raise _duplicado(error)
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
