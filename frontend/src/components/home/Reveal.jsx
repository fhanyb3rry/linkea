import useInView from '../../hooks/useInView'

// Envuelve un bloque y lo hace aparecer (fade + subida) al entrar en pantalla.
export default function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useInView()

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
