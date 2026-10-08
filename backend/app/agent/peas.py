"""Especificación PEAS del agente de vinculación de Linkea.

PEAS = Performance (medida de desempeño), Environment (entorno),
       Actuators (actuadores), Sensors (sensores).
"""

PEAS = {
    "agente": "Agente de vinculación Linkea",
    "tipo": "Agente basado en objetivos con reglas lógicas (decide con lógica proposicional)",
    "performance": [
        "Precisión: proporción de recomendaciones realmente elegibles",
        "Cobertura: proporción de vacantes elegibles que el agente logra recomendar",
        "Trazabilidad: cada decisión incluye las proposiciones que la justifican",
    ],
    "environment": {
        "descripcion": "Perfiles de estudiantes y vacantes de empresas almacenados en MongoDB",
        "propiedades": {
            "observabilidad": "Parcialmente observable (el agente solo ve lo que se registró)",
            "determinismo": "Determinista (misma entrada, mismo resultado)",
            "episodico": "Episódico (cada evaluación estudiante-vacante es independiente)",
            "dinamico": "Dinámico (se crean y borran perfiles y vacantes mientras el agente opera)",
            "discreto": "Discreto (conjunto finito de vacantes y proposiciones)",
            "agentes": "Un agente (los usuarios son parte del entorno, no compiten)",
        },
    },
    "actuators": [
        "Marcar un par estudiante-vacante como elegible o no elegible",
        "Emitir la lista de vacantes recomendadas, ordenada por afinidad",
        "Devolver la explicación de por qué se descartó una vacante",
    ],
    "sensors": [
        "Perfil del estudiante: carrera, skills, horas disponibles, zona",
        "Catálogo de vacantes: carreras aceptadas, skills clave, horas requeridas, zona",
    ],
}
