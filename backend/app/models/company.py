from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PyObjectId
from app.models.student import Ubicacion


class Estipendio(BaseModel):
    apoyo_economico: bool = False
    monto: float | None = None
    moneda: str = "MXN"


class Requisitos(BaseModel):
    carreras_aceptadas: list[str] = Field(default_factory=list)
    skills_clave: list[str] = Field(default_factory=list)


class Horario(BaseModel):
    horas_por_semana: int
    dias: list[str] = Field(default_factory=list)


class VacancyBase(BaseModel):
    nombre_empresa: str
    sector: str
    ubicacion: Ubicacion
    requisitos: Requisitos
    estipendio: Estipendio
    horarios: Horario


class VacancyCreate(VacancyBase):
    pass


class VacancyUpdate(BaseModel):
    nombre_empresa: str | None = None
    sector: str | None = None
    ubicacion: Ubicacion | None = None
    requisitos: Requisitos | None = None
    estipendio: Estipendio | None = None
    horarios: Horario | None = None


class Vacancy(VacancyBase):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
