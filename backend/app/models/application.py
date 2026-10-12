from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PyObjectId


class EstadoPostulacion(str, Enum):
    ENVIADA = "enviada"
    EN_REVISION = "en_revision"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    # La empresa confirma que el estudiante hará ahí su estadía (empieza el seguimiento).
    ASIGNADA = "asignada"


# A qué estados se puede pasar desde cada uno. "asignada" es final.
TRANSICIONES = {
    EstadoPostulacion.ENVIADA: {EstadoPostulacion.EN_REVISION, EstadoPostulacion.ACEPTADA, EstadoPostulacion.RECHAZADA},
    EstadoPostulacion.EN_REVISION: {EstadoPostulacion.ACEPTADA, EstadoPostulacion.RECHAZADA},
    EstadoPostulacion.ACEPTADA: {EstadoPostulacion.ASIGNADA, EstadoPostulacion.RECHAZADA},
    EstadoPostulacion.RECHAZADA: {EstadoPostulacion.EN_REVISION},
    EstadoPostulacion.ASIGNADA: set(),
}

# El estudiante solo puede retirar su postulación mientras no lo hayan aceptado.
RETIRABLES = {EstadoPostulacion.ENVIADA, EstadoPostulacion.EN_REVISION, EstadoPostulacion.RECHAZADA}


class Movimiento(BaseModel):
    """Un cambio de estado: quién lo hizo y cuándo."""

    estado: EstadoPostulacion
    fecha: str
    por: str = ""  # nombre de quien hizo el cambio
    nota: str = ""


class ApplicationCreate(BaseModel):
    student_id: str
    vacancy_id: str
    mensaje: str = ""


class ApplicationUpdate(BaseModel):
    estado: EstadoPostulacion
    nota: str = Field(default="", max_length=300)


class Application(BaseModel):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    student_id: str
    vacancy_id: str
    mensaje: str = ""
    estado: EstadoPostulacion = EstadoPostulacion.ENVIADA
    creada_en: str
    historial: list[Movimiento] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
