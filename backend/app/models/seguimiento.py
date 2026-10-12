"""Seguimiento de la estadía: un documento por estudiante asignado.

Todo lo que pasa durante la estadía (bitácoras, reportes, incidencias y documentos firmados) va
EMBEBIDO en el documento del seguimiento: son pocas decenas de registros en unos meses, siempre se
consultan junto con su estadía y así una sola lectura trae todo. Los archivos (PDF) viven en GridFS
y aquí solo se guarda su id.
"""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import PyObjectId


class Firmante(str, Enum):
    ACADEMICO = "academico"  # asesor académico (UTVT)
    EMPRESARIAL = "empresarial"  # asesor empresarial (la organización)


class EstadoSeguimiento(str, Enum):
    EN_CURSO = "en_curso"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"


class EstadoRevision(str, Enum):
    PENDIENTE = "pendiente"
    VALIDADA = "validada"
    RECHAZADA = "rechazada"


class EstadoDocumento(str, Enum):
    PENDIENTE = "pendiente"  # aún no se sube el PDF
    SUBIDO = "subido"  # hay PDF, faltan firmas
    COMPLETO = "completo"  # lo firmaron todos los que debían
    RECHAZADO = "rechazado"  # un asesor pidió corregirlo (se sube otra versión)


class Archivo(BaseModel):
    archivo_id: str
    nombre: str
    tipo: str
    tamano: int
    subido_por: str = ""
    fecha: str


# ---- Catálogo de documentos (lo administra coordinación) ----------------------------------

class DocumentoCatalogoIn(BaseModel):
    nombre: str = Field(min_length=3, max_length=120)
    descripcion: str = Field(default="", max_length=400)
    requiere: list[Firmante] = Field(min_length=1)
    orden: int = 0
    activo: bool = True


class DocumentoCatalogo(DocumentoCatalogoIn):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


# ---- Piezas del seguimiento ----------------------------------------------------------------

class BitacoraIn(BaseModel):
    fecha: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    horas: float = Field(gt=0, le=60)
    actividades: str = Field(min_length=5, max_length=1500)


class Bitacora(BitacoraIn):
    id: str
    estado: EstadoRevision = EstadoRevision.PENDIENTE
    revisada_por: str = ""
    revisada_en: str = ""
    observacion: str = ""
    creada_en: str


class RevisionIn(BaseModel):
    estado: EstadoRevision
    observacion: str = Field(default="", max_length=400)


class Reporte(BaseModel):
    id: str
    titulo: str
    periodo: str = ""
    contenido: str = ""
    archivo: Archivo | None = None
    por: str = ""
    fecha: str


class IncidenciaIn(BaseModel):
    tipo: str = Field(min_length=3, max_length=60)
    descripcion: str = Field(min_length=5, max_length=1500)


class Incidencia(IncidenciaIn):
    id: str
    estado: str = "abierta"  # abierta | resuelta
    reportada_por: str = ""
    rol: str = ""
    fecha: str
    resolucion: str = ""
    resuelta_por: str = ""
    resuelta_en: str = ""


class ResolucionIn(BaseModel):
    resolucion: str = Field(min_length=3, max_length=800)


class Firma(BaseModel):
    por: str
    fecha: str


class Documento(BaseModel):
    id: str
    catalogo_id: str = ""
    nombre: str
    descripcion: str = ""
    requiere: list[Firmante]
    estado: EstadoDocumento = EstadoDocumento.PENDIENTE
    versiones: list[Archivo] = Field(default_factory=list)
    firmas: dict[Firmante, Firma] = Field(default_factory=dict)
    observacion: str = ""


class RechazoIn(BaseModel):
    observacion: str = Field(min_length=3, max_length=400)


class Seguimiento(BaseModel):
    id: PyObjectId = Field(validation_alias="_id", serialization_alias="id")
    postulacion_id: str
    student_id: str
    vacancy_id: str
    organizacion_id: str | None = None
    empresa_user_id: str | None = None
    asesor_academico_id: str | None = None

    # Copias para listar sin consultar otras colecciones.
    estudiante_nombre: str
    matricula: str = ""
    carrera: str = ""
    vacante_titulo: str = ""
    organizacion_nombre: str = ""
    asesor_academico_nombre: str = ""
    asesor_empresarial: str = ""  # nombre y cargo del asesor de la organización

    estado: EstadoSeguimiento = EstadoSeguimiento.EN_CURSO
    fecha_inicio: str
    horas_requeridas: int = 600
    bitacoras: list[Bitacora] = Field(default_factory=list)
    reportes: list[Reporte] = Field(default_factory=list)
    incidencias: list[Incidencia] = Field(default_factory=list)
    documentos: list[Documento] = Field(default_factory=list)
    creado_en: str

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class SeguimientoOut(Seguimiento):
    """Lo que devuelve la API: el seguimiento más los totales ya calculados."""

    horas_validadas: float = 0
    horas_pendientes: float = 0
    documentos_completos: int = 0
    incidencias_abiertas: int = 0


class SeguimientoUpdate(BaseModel):
    estado: EstadoSeguimiento | None = None
    horas_requeridas: int | None = Field(default=None, ge=1, le=2000)


class AsesorIn(BaseModel):
    asesor_id: str
