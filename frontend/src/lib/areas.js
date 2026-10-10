// Áreas profesionales para filtrar vacantes. El `sector` de la base de datos es texto libre,
// así que cada vacante se asigna a un área por palabras clave (sin acentos ni mayúsculas).

export const AREAS = [
  { id: 'tecnologia', label: 'Tecnología', keywords: ['tecnolog', 'software', 'sistemas', 'informat', 'ciberseg', 'datos'] },
  { id: 'diseno', label: 'Diseño', keywords: ['dise', 'creativ', 'arte'] },
  {
    id: 'administracion',
    label: 'Administración',
    keywords: ['administr', 'financ', 'contab', 'negocio', 'recursos humanos', 'legal', 'banc', 'seguros', 'consultor', 'logistic'],
  },
  { id: 'marketing', label: 'Marketing', keywords: ['marketing', 'mercadotec', 'publicidad', 'comunicaci', 'ventas'] },
  {
    id: 'ingenieria',
    label: 'Ingeniería',
    keywords: ['ingenier', 'manufactur', 'industri', 'automotr', 'construc', 'energ', 'quimic', 'mecan'],
  },
  { id: 'salud', label: 'Salud', keywords: ['salud', 'medic', 'farmac', 'hospital', 'clinic', 'biomed', 'nutric'] },
  { id: 'educacion', label: 'Educación', keywords: ['educaci', 'escuel', 'universidad', 'academ', 'capacitaci'] },
]

export const OTROS = { id: 'otros', label: 'Otros' }

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function areaOf(sector = '') {
  const text = normalize(sector)
  const found = AREAS.find((a) => a.keywords.some((k) => text.includes(k)))
  return found ? found.id : OTROS.id
}

// Cuenta cuántas vacantes (con campo `area`) tiene cada área.
export function countByArea(vacancies) {
  const counts = {}
  for (const v of vacancies) counts[v.area] = (counts[v.area] ?? 0) + 1
  return counts
}
