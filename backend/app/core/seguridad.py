"""Contraseñas cifradas (bcrypt), sesiones con JWT y los permisos por rol.

Flujo: el usuario hace login -> recibe un token firmado -> lo manda en cada petición con el header
`Authorization: Bearer <token>`. Con `usuario_actual` cualquier endpoint sabe quién lo llama, y con
`requiere_rol(...)` se limita a ciertos roles.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_database
from app.models.user import Rol

logger = logging.getLogger(__name__)

ALGORITMO = "HS256"

if settings.jwt_secret:
    _SECRETO = settings.jwt_secret
else:
    _SECRETO = secrets.token_urlsafe(48)
    logger.warning("JWT_SECRET no está en el .env: las sesiones se cerrarán cada vez que reinicies el servidor.")


def cifrar_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def crear_token(usuario_id: str, rol: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_horas)
    return jwt.encode({"sub": usuario_id, "rol": rol, "exp": expira}, _SECRETO, algorithm=ALGORITMO)


_bearer = HTTPBearer(auto_error=False)

NO_AUTENTICADO = HTTPException(
    status_code=401, detail="Inicia sesión para continuar", headers={"WWW-Authenticate": "Bearer"}
)


async def usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """El usuario que hace la petición (documento de `users`). Responde 401 si no hay sesión válida."""
    if credenciales is None:
        raise NO_AUTENTICADO
    try:
        datos = jwt.decode(credenciales.credentials, _SECRETO, algorithms=[ALGORITMO])
        oid = ObjectId(datos["sub"])
    except (jwt.PyJWTError, KeyError, InvalidId):
        raise NO_AUTENTICADO
    # Se lee de la base en cada petición: si lo desactivan o cambia su perfil, se nota de inmediato.
    usuario = await db.users.find_one({"_id": oid})
    if usuario is None or not usuario.get("activo", True):
        raise NO_AUTENTICADO
    return usuario


def requiere_rol(*roles: Rol):
    """Dependencia que deja pasar solo a los roles indicados (403 a los demás)."""
    permitidos = {r.value for r in roles}

    async def _verificar(usuario: dict = Depends(usuario_actual)) -> dict:
        if usuario["rol"] not in permitidos:
            raise HTTPException(status_code=403, detail="No tienes permiso para hacer esto")
        return usuario

    return _verificar


def es_rol(usuario: dict, *roles: Rol) -> bool:
    return usuario["rol"] in {r.value for r in roles}
