import { useParams } from 'react-router-dom'
import SeguimientoVista from '../components/seguimiento/SeguimientoVista'

export default function SeguimientoDetalle() {
  const { id } = useParams()
  return <SeguimientoVista id={id} back={{ to: '/seguimientos', label: 'Seguimiento' }} />
}
