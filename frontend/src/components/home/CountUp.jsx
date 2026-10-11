import { useEffect, useState } from 'react'
import useInView from '../../hooks/useInView'

function parse(value) {
  const match = /^(\D*)([\d.]+)(\D*)$/.exec(value)
  if (!match) return null
  const [, prefix, digits, suffix] = match
  return {
    prefix,
    suffix,
    target: Number(digits),
    decimals: digits.includes('.') ? digits.split('.')[1].length : 0,
  }
}

// Anima "+1.2K" contando desde 0 cuando entra en pantalla. Conserva prefijo, decimales y sufijo.
export default function CountUp({ value, duration = 1200 }) {
  const [ref, visible] = useInView({ threshold: 0.4 })
  const [progress, setProgress] = useState(0)
  const parsed = parse(value)

  useEffect(() => {
    if (!visible) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => setProgress(1))
      return undefined
    }
    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      setProgress(1 - (1 - t) ** 3) // ease-out cúbico
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, duration])

  if (!parsed) return <span>{value}</span>

  return (
    <span ref={ref}>
      {parsed.prefix}
      {(parsed.target * progress).toFixed(parsed.decimals)}
      {parsed.suffix}
    </span>
  )
}
