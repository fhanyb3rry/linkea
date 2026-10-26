// Datos de ejemplo para Mensajes (aún no hay backend de mensajería).
// Cada rol ve conversaciones escritas desde su punto de vista.

const soporteEstudiante = {
  id: 's1',
  nombre: 'Equipo Linkea',
  rol: 'Soporte',
  noLeidos: 0,
  mensajes: [{ de: 'ellos', texto: 'Bienvenido a Linkea. Completa tu perfil para mejorar tus coincidencias.', hora: 'Lun' }],
}

const soporteEmpresa = {
  id: 's2',
  nombre: 'Equipo Linkea',
  rol: 'Soporte',
  noLeidos: 0,
  mensajes: [{ de: 'ellos', texto: 'Bienvenida a Linkea. Publica tu primera vacante para empezar a recibir postulaciones.', hora: 'Lun' }],
}

const soporteGeneral = {
  id: 's3',
  nombre: 'Equipo Linkea',
  rol: 'Soporte',
  noLeidos: 0,
  mensajes: [{ de: 'ellos', texto: 'Aquí llegarán los avisos del equipo de Linkea.', hora: 'Lun' }],
}

export const conversacionesPorRol = {
  estudiante: [
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
    soporteEstudiante,
  ],

  empresa: [
    {
      id: 'c1',
      nombre: 'Ana Torres',
      rol: 'Estudiante · Ing. en Software',
      noLeidos: 2,
      mensajes: [
        { de: 'ellos', texto: '¡Hola! Me postulé a la vacante de desarrollo backend.', hora: '10:02' },
        { de: 'ellos', texto: '¿Podrían decirme cuál es el siguiente paso del proceso?', hora: '10:03' },
      ],
    },
    {
      id: 'c2',
      nombre: 'Diego Ramírez',
      rol: 'Estudiante · Ing. Industrial',
      noLeidos: 0,
      mensajes: [
        { de: 'yo', texto: 'Gracias por postularte. ¿Tienes disponibilidad para una entrevista el viernes?', hora: 'Ayer' },
        { de: 'ellos', texto: 'Sí, en la mañana me viene perfecto.', hora: 'Ayer' },
      ],
    },
    soporteEmpresa,
  ],
}

export function conversacionesPara(rol) {
  return conversacionesPorRol[rol] ?? [soporteGeneral]
}
