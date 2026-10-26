// Estados de una postulación y cómo se muestran.
export const ESTADOS = {
  enviada: { label: 'Enviada', className: 'bg-canvas text-muted border border-line' },
  en_revision: { label: 'En revisión', className: 'bg-accent/25 text-ink' },
  aceptada: { label: 'Aceptada', className: 'bg-teal/25 text-ink' },
  asignada: { label: 'Estadía asignada', className: 'bg-teal text-on-teal' },
  rechazada: { label: 'No seleccionada', className: 'bg-brand-soft text-brand' },
}

// A qué estados puede pasar la empresa desde cada uno (igual que en el backend).
export const TRANSICIONES = {
  enviada: ['en_revision', 'aceptada', 'rechazada'],
  en_revision: ['aceptada', 'rechazada'],
  aceptada: ['asignada', 'rechazada'],
  rechazada: ['en_revision'],
  asignada: [],
}

// El estudiante solo retira su postulación mientras no lo hayan aceptado.
export const RETIRABLES = ['enviada', 'en_revision', 'rechazada']
