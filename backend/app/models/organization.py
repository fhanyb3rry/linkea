from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PyObjectId
from app.models.student import Ubicacion


class Contacto(BaseModel):
    correo: str = ""
    telefono: str = ""
    sitio: str = ""
    # Asesor empresarial: la persona de la organización que acompaña y firma la estadía.
    responsable: str = ""
    cargo: str = ""


class OrganizationBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: str = ""
    sector: str
    ubicacion: Ubicacion
    contacto: Contacto = Field(default_factory=Contacto)


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    descripcion: str | None = None
    sector: str | None = None
    ubicacion: Ubicacion | None = None
    contacto: Contacto | None = None


class Organization(OrganizationBase):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    user_id: str  # cuenta de empresa que la administra
    creada_en: str

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
