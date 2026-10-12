// Utilidades y catálogos del perfil de estudiante.

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const SKILL_SUGGESTIONS = [
  'Python',
  'JavaScript',
  'React',
  'SQL',
  'Excel',
  'Power BI',
  'Figma',
  'Photoshop',
  'SEO',
  'Redes sociales',
  'Comunicación',
  'Trabajo en equipo',
  'Liderazgo',
]

export const IDIOMA_SUGGESTIONS = ['Español nativo', 'Inglés B1', 'Inglés B2', 'Inglés C1', 'Francés A2']

export const CARRERAS = [
  'Ingeniería en Sistemas',
  'Ingeniería en Software',
  'Ingeniería Industrial',
  'Mercadotecnia',
  'Administración',
  'Diseño Gráfico',
  'Contaduría',
  'Derecho',
  'Psicología',
  'Medicina',
  'Enfermería',
  'Educación',
]

export const CV_ACCEPT = '.pdf,.doc,.docx'
export const CV_MAX_BYTES = 5 * 1024 * 1024

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Valida un archivo de CV en el navegador (el backend lo vuelve a validar). Devuelve un mensaje o null.
export function validateCV(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!CV_ACCEPT.split(',').includes(ext)) return 'Formato no permitido. Usa PDF, DOC o DOCX.'
  if (file.size > CV_MAX_BYTES) return 'El archivo supera los 5 MB.'
  if (file.size === 0) return 'El archivo está vacío.'
  return null
}

// Qué tan completo está un perfil: porcentaje y lista de pendientes.
export function perfilCompleto(student) {
  const items = [
    { label: 'Datos básicos', ok: Boolean(student.nombre && student.carrera && student.ubicacion?.zona) },
    { label: 'Matrícula', ok: /^\d{9}$/.test(student.matricula ?? '') },
    { label: 'Al menos 3 habilidades', ok: (student.skills?.length ?? 0) >= 3 },
    { label: 'Áreas de interés', ok: (student.intereses?.length ?? 0) > 0 },
    { label: 'Al menos un proyecto', ok: (student.proyectos?.length ?? 0) > 0 },
    { label: 'Disponibilidad con días', ok: (student.disponibilidad?.dias?.length ?? 0) > 0 },
    { label: 'Sobre ti', ok: Boolean(student.bio?.trim()) },
    { label: 'Datos de contacto', ok: Boolean(student.correo?.trim()) },
    { label: 'Enlaces (LinkedIn, GitHub…)', ok: Object.values(student.enlaces ?? {}).some(Boolean) },
    { label: 'Currículum subido', ok: Boolean(student.cv) },
  ]
  const hechos = items.filter((i) => i.ok).length
  return { pct: Math.round((hechos / items.length) * 100), items }
}
