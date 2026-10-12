import { useAuth } from '../context/auth'

// Perfil de estudiante de la cuenta con sesión ('' si no es estudiante o aún no crea su perfil).
// Con él se calculan elegibilidad, compatibilidad y postulaciones.
export default function useActiveStudent() {
  const { usuario } = useAuth()
  return [usuario?.rol === 'estudiante' ? (usuario.perfil_id ?? '') : '']
}
