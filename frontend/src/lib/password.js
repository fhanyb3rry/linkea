// Misma política que el backend (validar_password en app/models/user.py): el servidor sigue siendo
// quien decide; esto solo evita un viaje de ida y vuelta y muestra qué falta mientras se escribe.

export const MIN_PASSWORD = 10

export const REGLAS_PASSWORD = [
  { re: /.{10}/, texto: `Al menos ${MIN_PASSWORD} caracteres` },
  { re: /[a-z]/, texto: 'Una minúscula' },
  { re: /[A-Z]/, texto: 'Una mayúscula' },
  { re: /\d/, texto: 'Un número' },
  { re: /[^A-Za-z0-9]/, texto: 'Un símbolo (!, #, @, ., …)' },
]

// Qué le falta a la contraseña para cumplir la política. Vacío = válida.
export function faltanEnPassword(password) {
  return REGLAS_PASSWORD.filter(({ re }) => !re.test(password)).map(({ texto }) => texto)
}
