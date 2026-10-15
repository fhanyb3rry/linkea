import { useMemo } from 'react'

// Grafo esquemático de las 12 zonas para el detalle técnico. Las posiciones están acomodadas a mano
// (parecidas al mapa real, pero con espacio de sobra) para que los caminos no se crucen ni los
// nombres se enciman. Si algún día se agrega una zona nueva, se acomoda sola según su latitud y longitud.
const ANCHO = 1040
const ALTO = 670

const POSICION = {
  'Almoloya de Juárez': [120, 95],
  Zinacantepec: [120, 280],
  Toluca: [350, 280],
  Xonacatlán: [480, 95],
  Lerma: [700, 205],
  'San Mateo Atenco': [530, 360],
  Metepec: [350, 460],
  Calimaya: [350, 590],
  'Tenango del Valle': [135, 590],
  'Santiago Tianguistenco': [665, 590],
  Ocoyoacac: [860, 370],
  'Ciudad de México': [935, 115],
}

// Dónde va el nombre de cada zona respecto a su círculo.
const ETIQUETA = {
  'Almoloya de Juárez': 'arriba',
  Zinacantepec: 'abajo',
  Toluca: 'abajo-izq',
  Xonacatlán: 'arriba',
  Lerma: 'arriba',
  'San Mateo Atenco': 'abajo-der',
  Metepec: 'izq-abajo',
  Calimaya: 'abajo',
  'Tenango del Valle': 'abajo',
  'Santiago Tianguistenco': 'abajo',
  Ocoyoacac: 'der',
  'Ciudad de México': 'arriba',
}

function renglones(nombre) {
  if (nombre.length <= 13) return [nombre]
  const palabras = nombre.split(' ')
  let mejor = [nombre]
  let diferencia = Infinity
  for (let i = 1; i < palabras.length; i += 1) {
    const a = palabras.slice(0, i).join(' ')
    const b = palabras.slice(i).join(' ')
    if (Math.abs(a.length - b.length) < diferencia) {
      diferencia = Math.abs(a.length - b.length)
      mejor = [a, b]
    }
  }
  return mejor
}

const llave = (a, b) => [a, b].sort().join('|')

// La insignia del orden va del lado contrario al nombre, para que no se tapen.
function posicionInsignia(nombre, x, y) {
  const lado = ETIQUETA[nombre] ?? 'abajo'
  if (lado === 'arriba') return [x + 19, y + 19]
  if (lado === 'der') return [x - 19, y - 19]
  return [x + 19, y - 19]
}

export default function GrafoTecnico({ mapa, h, resultado, todas, desde, hasta, mostrarH }) {
  const pos = useMemo(() => {
    const lats = mapa.zonas.map((z) => z.lat)
    const lngs = mapa.zonas.map((z) => z.lng)
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
    return Object.fromEntries(
      mapa.zonas.map((z) => {
        const fija = POSICION[z.nombre]
        return [
          z.nombre,
          fija
            ? { x: fija[0], y: fija[1] }
            : { x: 90 + ((z.lng - minLng) / (maxLng - minLng)) * (ANCHO - 180), y: 90 + ((maxLat - z.lat) / (maxLat - minLat)) * (ALTO - 220) },
        ]
      }),
    )
  }, [mapa])

  const ruta = resultado?.camino ?? []
  const enRuta = new Set(ruta.slice(1).map((b, i) => llave(ruta[i], b)))
  const orden = Object.fromEntries((resultado?.expandidos ?? []).map((z, i) => [z, i + 1]))
  const alternativas = new Set(
    (todas?.rutas ?? []).slice(0, 5).flatMap((r) => r.camino.slice(1).map((b, i) => llave(r.camino[i], b))),
  )

  const Etiqueta = ({ nombre, x, y, extremo }) => {
    const lado = ETIQUETA[nombre] ?? 'abajo'
    const lineas = renglones(nombre)
    const conH = mostrarH && h
    const total = lineas.length + (conH ? 1 : 0)
    let tx = x
    let ty
    let anchor = 'middle'
    if (lado === 'arriba') ty = y - 30 - (total - 1) * 17
    else if (lado === 'abajo') ty = y + 38
    else if (lado === 'abajo-izq') {
      tx = x - 8
      ty = y + 38
      anchor = 'end'
    } else if (lado === 'abajo-der') {
      tx = x + 8
      ty = y + 38
      anchor = 'start'
    } else if (lado === 'izq-abajo') {
      tx = x - 24
      ty = y + 2
      anchor = 'end'
    } else {
      tx = x + 26
      ty = y - 6
      anchor = 'start'
    }
    return (
      <text textAnchor={anchor} fontSize="16" fontWeight={extremo ? 800 : 600} fill="var(--ink)">
        {lineas.map((l, i) => (
          <tspan key={l} x={tx} y={ty + i * 18}>{l}</tspan>
        ))}
        {conH && (
          <tspan x={tx} y={ty + lineas.length * 18} fontSize="13" fontWeight="500" fill="var(--muted)">
            {`h = ${h[nombre] ?? '–'}`}
          </tspan>
        )}
      </text>
    )
  }

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full" style={{ minWidth: 760 }} role="img" aria-label="Grafo de zonas con los tiempos de traslado">
        {mapa.tramos.map((t) => {
          const k = llave(t.a, t.b)
          const a = pos[t.a]
          const b = pos[t.b]
          const activa = enRuta.has(k)
          const alterna = alternativas.has(k)
          return (
            <line
              key={k}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={activa ? 'var(--brand)' : alterna ? 'var(--caramel)' : 'var(--muted)'}
              strokeWidth={activa ? 7 : alterna ? 3.5 : 2}
              strokeLinecap="round"
              opacity={activa ? 1 : alterna ? 0.85 : 0.35}
            />
          )
        })}

        {mapa.tramos.map((t) => {
          const k = llave(t.a, t.b)
          const a = pos[t.a]
          const b = pos[t.b]
          const activa = enRuta.has(k)
          const w = activa ? 66 : 56
          const x = (a.x + b.x) / 2
          const y = (a.y + b.y) / 2
          return (
            <g key={`m-${k}`}>
              <rect
                x={x - w / 2} y={y - 13} width={w} height="26" rx="13"
                fill={activa ? 'var(--brand)' : 'var(--surface)'} stroke={activa ? 'var(--brand)' : 'var(--muted)'} strokeWidth="1.2"
              />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={activa ? 'var(--on-brand)' : 'var(--ink)'}>
                {`${t.minutos} min`}
              </text>
            </g>
          )
        })}

        {mapa.zonas.map((z) => {
          const { x, y } = pos[z.nombre]
          const extremo = z.nombre === desde || z.nombre === hasta
          const enLaRuta = ruta.includes(z.nombre)
          const explorada = orden[z.nombre]
          return (
            <g key={z.nombre}>
              <circle
                cx={x} cy={y} r={extremo ? 20 : 15}
                fill={extremo ? 'var(--brand)' : enLaRuta ? 'var(--cocoa)' : 'var(--surface)'}
                stroke={explorada ? 'var(--caramel)' : 'var(--muted)'} strokeWidth={explorada ? 5 : 2.5}
              />
              {explorada && (() => {
                const [bx, by] = posicionInsignia(z.nombre, x, y)
                return (
                  <g>
                    <circle cx={bx} cy={by} r="11" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />
                    <text x={bx} y={by + 4.5} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--surface)">{explorada}</text>
                  </g>
                )
              })()}
              <Etiqueta nombre={z.nombre} x={x} y={y} extremo={extremo} />
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 font-body text-sm text-ink">
        <span className="flex items-center gap-2"><i className="inline-block h-1.5 w-7 rounded-full bg-brand" /> Ruta que encontró</span>
        <span className="flex items-center gap-2"><i className="inline-block h-1 w-7 rounded-full bg-caramel" /> Otras rutas posibles</span>
        <span className="flex items-center gap-2">
          <i className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-surface">1</i> Orden en que revisó cada zona
        </span>
        <span className="text-muted">Minutos reales en cada tramo{mostrarH ? ' · h = minutos estimados al destino' : ''}</span>
      </div>
    </div>
  )
}
