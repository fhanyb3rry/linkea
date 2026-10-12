import re
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


class RegistroIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    email: str
    # bcrypt solo usa los primeros 72 bytes; limitamos para que no haya sorpresas.
    password: str = Field(min_length=8, max_length=72)
    rol: Rol

    _email = field_validator("email")(_normalizar_email)

    @field_validator("rol")
    @classmethod
    def _rol_publico(cls, rol: Rol) -> Rol:
        if rol not in ROLES_REGISTRO:
            raise ValueError("Solo puedes registrarte como estudiante o empresa")
        return rol


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
    # Id del documento con su perfil: el estudiante en `students` (la empresa tendrá su organización).
    perfil_id: str | None = None
    activo: bool = True
    creado_en: str

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: Usuario
