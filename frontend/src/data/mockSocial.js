// Datos de ejemplo para Mensajes y Notificaciones (aún no hay backend para ninguno de los dos).

export const conversaciones = [
  {
    id: 'c1',
    nombre: 'Laura Méndez',
    rol: 'Reclutadora · Acme Tech',
    noLeidos: 2,
    mensajes: [
      { de: 'ellos', texto: '¡Hola! Vimos tu perfil y nos gustó tu portafolio.', hora: '10:02' },
      { de: 'ellos', texto: '¿Podrías tener una entrevista corta esta semana?', hora: '10:03' },
    ],
  },
  {
    id: 'c2',
    nombre: 'Carlos Ibarra',
    rol: 'RR. HH. · Beta Marketing',
    noLeidos: 0,
    mensajes: [
      { de: 'yo', texto: 'Buenas tardes, me interesa la práctica de marketing digital.', hora: 'Ayer' },
      { de: 'ellos', texto: 'Gracias por postularte. Revisaremos tu CV y te avisamos.', hora: 'Ayer' },
    ],
  },
  {
    id: 'c3',
    nombre: 'Equipo Linkea',
    rol: 'Soporte',
    noLeidos: 0,
    mensajes: [{ de: 'ellos', texto: 'Bienvenido a Linkea. Completa tu perfil para mejorar tus coincidencias.', hora: 'Lun' }],
  },
]

export const notificaciones = [
  { id: 'n1', tipo: 'match', titulo: 'Nueva vacante compatible', texto: 'Acme Tech publicó una práctica con 92% de compatibilidad contigo.', hace: 'Hace 5 min', leida: false },
  { id: 'n2', tipo: 'postulacion', titulo: 'Tu postulación está en revisión', texto: 'Beta Marketing marcó tu postulación como «En revisión».', hace: 'Hace 2 h', leida: false },
  { id: 'n3', tipo: 'mensaje', titulo: 'Mensaje de Laura Méndez', texto: '“¿Podrías tener una entrevista corta esta semana?”', hace: 'Hace 3 h', leida: false },
  { id: 'n4', tipo: 'sistema', titulo: 'Completa tu perfil', texto: 'Sube tu currículum para que las empresas puedan descargarlo.', hace: 'Ayer', leida: true },
  { id: 'n5', tipo: 'match', titulo: 'Tres vacantes nuevas en Tecnología', texto: 'Hay nuevas oportunidades en tu área de interés.', hace: 'Lun', leida: true },
]
