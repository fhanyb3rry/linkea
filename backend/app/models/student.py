from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PyObjectId


class EstadoEstudiante(str, Enum):
    ACTIVO = "activo"
    EN_PROCESO = "en_proceso"
    COLOCADO = "colocado"


class Ubicacion(BaseModel):
    zona: str
    lat: float | None = None
    lng: float | None = None


class Disponibilidad(BaseModel):
    horas_por_semana: int
    dias: list[str] = Field(default_factory=list)


class StudentBase(BaseModel):
    nombre: str
    carrera: str
    semestre: int
    ubicacion: Ubicacion
    skills: list[str] = Field(default_factory=list)
    disponibilidad: Disponibilidad
    estado: EstadoEstudiante = EstadoEstudiante.ACTIVO


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    nombre: str | None = None
    carrera: str | None = None
    semestre: int | None = None
    ubicacion: Ubicacion | None = None
    skills: list[str] | None = None
    disponibilidad: Disponibilidad | None = None
    estado: EstadoEstudiante | None = None


class Student(StudentBase):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
