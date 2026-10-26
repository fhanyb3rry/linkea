// Etiquetas y estilos del seguimiento de estadía.

export const FIRMANTES = { academico: 'Asesor académico', empresarial: 'Asesor empresarial' }

// Qué firma le toca a cada rol (coordinación y estudiantes no firman).
export const FIRMANTE_DE_ROL = { asesor_academico: 'academico', empresa: 'empresarial' }

export const ESTADO_SEGUIMIENTO = {
  en_curso: { label: 'En curso', className: 'bg-accent/25 text-ink' },
  concluida: { label: 'Concluida', className: 'bg-teal text-on-teal' },
  cancelada: { label: 'Cancelada', className: 'bg-brand-soft text-brand' },
}

export const ESTADO_BITACORA = {
  pendiente: { label: 'Por validar', className: 'bg-canvas text-muted border border-line' },
  validada: { label: 'Validada', className: 'bg-teal/25 text-ink' },
  rechazada: { label: 'Rechazada', className: 'bg-brand-soft text-brand' },
}

export const ESTADO_DOCUMENTO = {
  pendiente: { label: 'Sin subir', className: 'bg-canvas text-muted border border-line' },
  subido: { label: 'Por firmar', className: 'bg-accent/25 text-ink' },
  completo: { label: 'Completo', className: 'bg-teal/25 text-ink' },
  rechazado: { label: 'Por corregir', className: 'bg-brand-soft text-brand' },
}

export const ESTADO_INCIDENCIA = {
  abierta: { label: 'Abierta', className: 'bg-brand-soft text-brand' },
  resuelta: { label: 'Resuelta', className: 'bg-teal/25 text-ink' },
}

export const TIPOS_INCIDENCIA = ['Horario', 'Actividades', 'Trato', 'Seguridad', 'Documentos', 'Otro']

export function porcentajeHoras(seg) {
  if (!seg.horas_requeridas) return 0
  return Math.min(100, Math.round((seg.horas_validadas / seg.horas_requeridas) * 100))
}

export function hoy() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
