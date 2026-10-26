import re
import unicodedata
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.common import PyObjectId

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Rol(str, Enum):
    ESTUDIANTE = "estudiante"
    EMPRESA = "empresa"
    COORDINADOR = "coordinador"
    ASESOR_ACADEMICO = "asesor_academico"


# Roles que cualquiera puede elegir al registrarse. Coordinadores y asesores los da de alta la universidad.
ROLES_REGISTRO = {Rol.ESTUDIANTE, Rol.EMPRESA}


def _normalizar_email(valor: str) -> str:
    valor = valor.strip().lower()
    if not EMAIL_RE.match(valor):
        raise ValueError("Correo electrónico inválido")
    return valor


def normalizar_nombre(valor: str) -> str:
    """Para comparar nombres sin importar mayúsculas ni acentos: 'Ana  Torres ' == 'ana torres'."""
    sin_acentos = unicodedata.normalize("NFD", valor.strip())
    return " ".join("".join(c for c in sin_acentos if unicodedata.category(c) != "Mn").lower().split())


MIN_PASSWORD = 10
# bcrypt solo usa los primeros 72 BYTES, no caracteres: 'ñ' o '…' pesan más de uno.
MAX_PASSWORD_BYTES = 72


def validar_password(valor: str) -> str:
    """Política de contraseñas nuevas (registro y altas): no sirven cortas ni sin símbolos.

    Mínimo 10 caracteres y por lo menos una minúscula, una mayúscula, un número y un símbolo.
    No se aplica al login (para no bloquear cuentas creadas antes de la política).
    """
    if len(valor.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("La contraseña es demasiado larga (máximo 72 bytes).")
    faltan = []
    if len(valor) < MIN_PASSWORD:
        faltan.append(f"al menos {MIN_PASSWORD} caracteres")
    if not re.search(r"[a-z]", valor):
        faltan.append("una minúscula")
    if not re.search(r"[A-Z]", valor):
        faltan.append("una mayúscula")
    if not re.search(r"\d", valor):
        faltan.append("un número")
    if not re.search(r"[^A-Za-z0-9]", valor):
        faltan.append("un símbolo (!, #, @, ., …)")
    if faltan:
        raise ValueError("La contraseña necesita " + ", ".join(faltan) + ".")
    return valor


class RegistroIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=1, max_length=120)
    rol: Rol

    _email = field_validator("email")(_normalizar_email)
    _password = field_validator("password")(validar_password)

    @field_validator("rol")
    @classmethod
    def _rol_publico(cls, rol: Rol) -> Rol:
        if rol not in ROLES_REGISTRO:
            raise ValueError("Solo puedes registrarte como estudiante o empresa")
        return rol


class PersonalIn(BaseModel):
    """Alta de personal de la universidad desde el panel de coordinación."""

    nombre: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=1, max_length=120)
    rol: Rol

    _email = field_validator("email")(_normalizar_email)
    _password = field_validator("password")(validar_password)

    @field_validator("rol")
    @classmethod
    def _rol_personal(cls, rol: Rol) -> Rol:
        if rol in ROLES_REGISTRO:
            raise ValueError("Estudiantes y empresas se registran solos desde la app")
        return rol


class UsuarioUpdate(BaseModel):
    activo: bool


class LoginIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _limpiar(cls, valor: str) -> str:
        return valor.strip().lower()


class Usuario(BaseModel):
    """Lo que la API devuelve de un usuario (nunca el hash de la contraseña)."""

    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    nombre: str
    email: str
    rol: Rol
    # Id del documento con su perfil: el estudiante en `students`, la empresa en `organizations`.
    perfil_id: str | None = None
    activo: bool = True
    creado_en: str

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: Usuario
