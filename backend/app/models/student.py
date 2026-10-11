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


class Enlaces(BaseModel):
    linkedin: str = ""
    github: str = ""
    portafolio: str = ""


class Curriculum(BaseModel):
    """Metadatos del CV subido; el archivo vive en backend/uploads/cv/."""

    nombre_archivo: str
    tipo: str
    tamano: int
    subido_en: str


class StudentBase(BaseModel):
    nombre: str
    carrera: str
    semestre: int
    ubicacion: Ubicacion
    skills: list[str] = Field(default_factory=list)
    disponibilidad: Disponibilidad
    estado: EstadoEstudiante = EstadoEstudiante.ACTIVO
    correo: str = ""
    telefono: str = ""
    bio: str = ""
    enlaces: Enlaces = Field(default_factory=Enlaces)
    idiomas: list[str] = Field(default_factory=list)


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
    correo: str | None = None
    telefono: str | None = None
    bio: str | None = None
    enlaces: Enlaces | None = None
    idiomas: list[str] | None = None


class Student(StudentBase):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    cv: Curriculum | None = None

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
