import { Briefcase, Cpu, GraduationCap, HeartPulse, Layers, Megaphone, PenTool, Wrench } from 'lucide-react'

// Áreas profesionales. El formulario de vacantes guarda en `sector` el nombre de un área; las
// vacantes antiguas con texto libre se asignan a un área por palabras clave (sin acentos ni mayúsculas).

export const AREAS = [
  { id: 'tecnologia', label: 'Tecnología', icon: Cpu, keywords: ['tecnolog', 'software', 'sistemas', 'informat', 'ciberseg', 'datos'] },
  { id: 'diseno', label: 'Diseño', icon: PenTool, keywords: ['dise', 'creativ', 'arte'] },
  {
    id: 'administracion',
    label: 'Administración',
    icon: Briefcase,
    keywords: ['administr', 'financ', 'contab', 'negocio', 'recursos humanos', 'legal', 'banc', 'seguros', 'consultor', 'logistic'],
  },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, keywords: ['marketing', 'mercadotec', 'publicidad', 'comunicaci', 'ventas'] },
  {
    id: 'ingenieria',
    label: 'Ingeniería',
    icon: Wrench,
    keywords: ['ingenier', 'manufactur', 'industri', 'automotr', 'construc', 'energ', 'quimic', 'mecan'],
  },
  { id: 'salud', label: 'Salud', icon: HeartPulse, keywords: ['salud', 'medic', 'farmac', 'hospital', 'clinic', 'biomed', 'nutric'] },
  { id: 'educacion', label: 'Educación', icon: GraduationCap, keywords: ['educaci', 'escuel', 'universidad', 'academ', 'capacitaci'] },
]

export const OTROS = { id: 'otros', label: 'Otros', icon: Layers }

// Opciones del selector del formulario (valor guardado = nombre del área).
export const AREA_OPTIONS = [...AREAS, OTROS].map((a) => a.label)

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function areaOf(sector = '') {
  const text = normalize(sector)
  const found = AREAS.find((a) => a.keywords.some((k) => text.includes(k)))
  return found ? found.id : OTROS.id
}

export function areaInfo(sector = '') {
  const id = areaOf(sector)
  return AREAS.find((a) => a.id === id) ?? OTROS
}

// Cuenta cuántas vacantes tiene cada área según su `sector`.
export function countByArea(vacancies) {
  const counts = {}
  for (const v of vacancies) {
    const id = areaOf(v.sector)
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
