// Datos de ejemplo para la página de inicio (diseño). No provienen de la API.

export const stats = [
  { icon: 'users', value: '+5K', label: 'Estudiantes' },
  { icon: 'briefcase', value: '+1.2K', label: 'Vacantes' },
  { icon: 'building', value: '+300', label: 'Empresas' },
  { icon: 'graduation', value: '+50', label: 'Universidades' },
]

export const suggestedStudents = [
  { nombre: 'Ana Torres', rol: 'Diseño UI/UX', skills: ['UI/UX', 'Figma'], match: 94 },
  { nombre: 'Carlos Rojas', rol: 'Desarrollo Full Stack', skills: ['React', 'Node.js'], match: 91 },
  { nombre: 'Valeria Gómez', rol: 'Marketing Digital', skills: ['Redes Sociales', 'Estrategia'], match: 88 },
  { nombre: 'Diego Ramírez', rol: 'Análisis de Datos', skills: ['Python', 'SQL'], match: 86 },
]

export const suggestedVacancies = [
  { nombre: 'GPP Soluciones', rol: 'Desarrollo Web', skills: ['React', 'Python'], match: 92 },
  { nombre: 'Stellantis', rol: 'Soporte TI', skills: ['Redes', 'Sistemas'], match: 86 },
  { nombre: 'Tecnológico de Monterrey', rol: 'Ciberseguridad', skills: ['Seguridad', 'Python'], match: 84 },
  { nombre: 'Nestlé', rol: 'Análisis de Datos', skills: ['SQL', 'Power BI'], match: 78 },
]

export const suggestedCompanies = [
  { nombre: 'GPP Soluciones', rol: 'Tecnología', skills: ['Toluca', 'Remoto'], match: null },
  { nombre: 'Stellantis', rol: 'Automotriz', skills: ['Toluca', 'Presencial'], match: null },
  { nombre: 'Nestlé', rol: 'Alimentos', skills: ['Lerma', 'Remoto'], match: null },
  { nombre: 'Tec de Monterrey', rol: 'Educación', skills: ['Lerma', 'Híbrido'], match: null },
]

export const featuredVacancies = [
  {
    titulo: 'App educativa',
    area: 'tecnologia',
    empresa: 'GPP Soluciones',
    descripcion: 'Buscamos practicantes de desarrollo para una app de apoyo estudiantil.',
    tags: ['Desarrollo', 'Remoto', 'Estudiantes'],
  },
  {
    titulo: 'Plataforma ambiental',
    area: 'diseno',
    empresa: 'Nestlé',
    descripcion: 'Proyecto para crear conciencia sobre el cuidado del medio ambiente.',
    tags: ['Diseño', 'Colaborativo', 'Social'],
  },
  {
    titulo: 'Red de talentos',
    area: 'administracion',
    empresa: 'Stellantis',
    descripcion: 'Conecta profesionales creativos con oportunidades reales.',
    tags: ['Desarrollo', 'Presencial', 'Empresa'],
  },
]
