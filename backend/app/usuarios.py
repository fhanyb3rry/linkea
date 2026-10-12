"""Alta de cuentas del personal de la universidad (coordinador y asesor académico).

Estos roles no se pueden elegir al registrarse en la app, así que se crean desde aquí:

    python -m app.usuarios coordinador correo@utvt.edu.mx "Nombre Completo"
    python -m app.usuarios asesor_academico correo@utvt.edu.mx "Nombre Completo"

La contraseña se pide en la terminal (no se escribe en el comando para que no quede en el historial).
"""

import asyncio
import getpass
import sys
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.database import crear_indices
from app.core.seguridad import cifrar_password
from app.models.user import EMAIL_RE, Rol

ROLES_PERSONAL = {Rol.COORDINADOR.value, Rol.ASESOR_ACADEMICO.value}


async def crear(rol: str, email: str, nombre: str, password: str) -> None:
    cliente = AsyncIOMotorClient(settings.mongodb_uri)
    db = cliente[settings.mongodb_db_name]
    try:
        await crear_indices(db)
        await db.users.insert_one({
            "nombre": nombre,
            "email": email,
            "password_hash": cifrar_password(password),
            "rol": rol,
            "perfil_id": None,
            "activo": True,
            "creado_en": datetime.now(timezone.utc).isoformat(),
        })
        print(f"Cuenta creada: {rol} {email}")
    except DuplicateKeyError:
        sys.exit(f"Ya existe una cuenta con el correo {email}")
    finally:
        cliente.close()


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[1] not in ROLES_PERSONAL:
        sys.exit(__doc__)
    rol, email, nombre = sys.argv[1], sys.argv[2].strip().lower(), sys.argv[3].strip()
    if not EMAIL_RE.match(email):
        sys.exit("Correo electrónico inválido")
    password = getpass.getpass("Contraseña (mín. 8 caracteres): ")
    if not 8 <= len(password.encode()) <= 72:
        sys.exit("La contraseña debe tener entre 8 y 72 caracteres")
    if getpass.getpass("Repítela: ") != password:
        sys.exit("Las contraseñas no coinciden")
    asyncio.run(crear(rol, email, nombre, password))


if __name__ == "__main__":
    main()
