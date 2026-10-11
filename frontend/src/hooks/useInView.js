import { useEffect, useRef, useState } from 'react'

// Devuelve [ref, visible]: visible pasa a true la primera vez que el elemento entra en pantalla.
export default function useInView({ threshold = 0.15 } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      // Sin soporte: se muestra directamente (microtarea para no hacer setState síncrono)
      queueMicrotask(() => setVisible(true))
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, visible]
}
