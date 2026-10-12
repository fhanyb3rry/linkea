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


# Matrícula de la UTVT: 9 dígitos (p. ej. 222411176).
MATRICULA = r"^\d{9}$"


class Proyecto(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: str = Field(default="", max_length=500)
    tecnologias: list[str] = Field(default_factory=list)
    enlace: str = ""


class Curriculum(BaseModel):
    """Metadatos del CV subido; el archivo vive en MongoDB (GridFS, ver app/core/archivos.py)."""

    archivo_id: str | None = None
    nombre_archivo: str
    tipo: str
    tamano: int
    subido_en: str


class StudentBase(BaseModel):
    nombre: str
    matricula: str = ""
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
    proyectos: list[Proyecto] = Field(default_factory=list)
    # Áreas que le interesan (las mismas del filtro de vacantes: Tecnología, Diseño, …).
    intereses: list[str] = Field(default_factory=list)


class StudentCreate(StudentBase):
    matricula: str = Field(pattern=MATRICULA)


class StudentUpdate(BaseModel):
    nombre: str | None = None
    matricula: str | None = Field(default=None, pattern=MATRICULA)
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
    proyectos: list[Proyecto] | None = None
    intereses: list[str] | None = None


class Student(StudentBase):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    user_id: str | None = None  # cuenta dueña del perfil
    cv: Curriculum | None = None

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
