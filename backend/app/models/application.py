from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PyObjectId


class EstadoPostulacion(str, Enum):
    ENVIADA = "enviada"
    EN_REVISION = "en_revision"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"


class ApplicationCreate(BaseModel):
    student_id: str
    vacancy_id: str
    mensaje: str = ""


class ApplicationUpdate(BaseModel):
    estado: EstadoPostulacion


class Application(BaseModel):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    student_id: str
    vacancy_id: str
    mensaje: str = ""
    estado: EstadoPostulacion = EstadoPostulacion.ENVIADA
    creada_en: str

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
