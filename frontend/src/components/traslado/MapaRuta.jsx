// Mapa "de metro" de la ruta, pensado para leerse de un vistazo:
//   - la ruta más rápida va en UNA LÍNEA recta, de tu zona (izquierda) a la vacante (derecha);
//   - la mejor alternativa va como un desvío en una segunda línea, arriba;
//   - los minutos de cada tramo van en pastillas sobre su camino; los nombres, siempre completos.
// Las demás opciones se muestran en la lista de abajo, no en el mapa, para que nada se amontone.

const MARGEN = 100
const BASE_GAP = 200 // separación mínima entre zonas de la línea principal
const GAP_DESVIO = 150 // separación entre zonas del desvío
const FILA = 130 // distancia entre la línea principal y la del desvío

// Parte un nombre largo en dos renglones ("Santiago Tianguistenco" -> "Santiago" / "Tianguistenco").
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

function calcular(ruta, alternativa, tramos) {
  const minutosDe = (a, b) => tramos.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a))?.minutos
  const indice = Object.fromEntries(ruta.map((z, i) => [z, i]))

  // 1) El desvío: lo que la alternativa hace entre dos zonas que también están en la ruta principal.
  const desvios = [] // con zonas propias en medio (van en la segunda línea)
  const arcos = [] // salto directo entre dos zonas de la línea principal que no son vecinas
  if (alternativa && alternativa.length > 1) {
    let previo = 0 // posición (dentro de la alternativa) de la última zona compartida
    for (let k = 1; k < alternativa.length; k += 1) {
      if (indice[alternativa[k]] === undefined) continue
      const desde = alternativa[previo]
      const hasta = alternativa[k]
      const unicas = alternativa.slice(previo + 1, k)
      if (unicas.length > 0) desvios.push({ desde, hasta, unicas, cadena: alternativa.slice(previo, k + 1) })
      else if (Math.abs(indice[desde] - indice[hasta]) > 1) arcos.push({ desde, hasta })
      previo = k
    }
  }

  // 2) Separación entre zonas de la línea principal: crece donde el desvío necesita más espacio.
  const gaps = ruta.slice(1).map(() => BASE_GAP)
  desvios.forEach((d) => {
    const p = Math.min(indice[d.desde], indice[d.hasta])
    const q = Math.max(indice[d.desde], indice[d.hasta])
    const necesario = (d.unicas.length + 1) * GAP_DESVIO
    const actual = gaps.slice(p, q).reduce((s, g) => s + g, 0)
    if (actual < necesario) for (let i = p; i < q; i += 1) gaps[i] = (gaps[i] * necesario) / actual
  })
  const xs = [MARGEN]
  gaps.forEach((g) => xs.push(xs[xs.length - 1] + g))
  const ancho = xs[xs.length - 1] + MARGEN

  const hayDesvio = desvios.length > 0 || arcos.length > 0
  const yPrincipal = (hayDesvio ? FILA : 0) + 95
  const alto = yPrincipal + 150

  const pos = {}
  ruta.forEach((z, i) => {
    pos[z] = { x: xs[i], y: yPrincipal, linea: 'principal' }
  })
  desvios.forEach((d) => {
    const xa = pos[d.desde].x
    const xb = pos[d.hasta].x
    d.unicas.forEach((z, t) => {
      pos[z] = { x: xa + ((t + 1) / (d.unicas.length + 1)) * (xb - xa), y: yPrincipal - FILA, linea: 'desvio' }
    })
  })

  // 3) Tramos a dibujar
  const principal = ruta.slice(1).map((z, i) => ({ a: ruta[i], b: z, minutos: minutosDe(ruta[i], z), tipo: 'principal' }))
  const delDesvio = desvios.flatMap((d) =>
    d.cadena.slice(1).map((z, i) => ({ a: d.cadena[i], b: z, minutos: minutosDe(d.cadena[i], z), tipo: 'desvio' })),
  )
  const saltos = arcos.map((a) => ({ a: a.desde, b: a.hasta, minutos: minutosDe(a.desde, a.hasta), tipo: 'arco' }))
  return { pos, ancho, alto, lineas: [...delDesvio, ...saltos, ...principal] }
}

export default function MapaRuta({ ruta, alternativa, tramos, origen, destino }) {
  const { pos, ancho, alto, lineas } = calcular(ruta, alternativa, tramos)
  const hayAlternativa = lineas.some((t) => t.tipo !== 'principal')

  const Pastilla = ({ x, y, minutos, fuerte }) => {
    const w = fuerte ? 76 : 68
    return (
      <g>
        <rect
          x={x - w / 2} y={y - 15} width={w} height="30" rx="15"
          fill={fuerte ? 'var(--brand)' : 'var(--surface)'}
          stroke={fuerte ? 'var(--brand)' : 'var(--muted)'} strokeWidth="1.5"
        />
        <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill={fuerte ? 'var(--on-brand)' : 'var(--ink)'}>
          {`${minutos} min`}
        </text>
      </g>
    )
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full"
        style={{ minWidth: Math.round(ancho * 0.78) }}
        role="img"
        aria-label="Mapa de la ruta de traslado"
      >
        {/* desvío y saltos (atrás, punteados) */}
        {lineas.filter((t) => t.tipo !== 'principal').map((t) => {
          const a = pos[t.a]
          const b = pos[t.b]
          return t.tipo === 'arco' ? (
            <path
              key={`${t.a}-${t.b}`}
              d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${a.y - FILA * 1.6} ${b.x} ${b.y}`}
              fill="none" stroke="var(--muted)" strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round"
            />
          ) : (
            <line
              key={`${t.a}-${t.b}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--muted)" strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round"
            />
          )
        })}
        {/* ruta más rápida (adelante) */}
        {lineas.filter((t) => t.tipo === 'principal').map((t) => (
          <line
            key={`${t.a}-${t.b}`}
            x1={pos[t.a].x} y1={pos[t.a].y} x2={pos[t.b].x} y2={pos[t.b].y}
            stroke="var(--brand)" strokeWidth="8" strokeLinecap="round"
          />
        ))}

        {lineas.map((t) => {
          const a = pos[t.a]
          const b = pos[t.b]
          const alturaArco = t.tipo === 'arco' ? FILA * 0.8 : 0
          return (
            <Pastilla key={`p-${t.a}-${t.b}`} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - alturaArco} minutos={t.minutos} fuerte={t.tipo === 'principal'} />
          )
        })}

        {Object.entries(pos).map(([nombre, { x, y, linea }]) => {
          const extremo = nombre === origen || nombre === destino
          const enPrincipal = linea === 'principal'
          const renglonesNombre = renglones(nombre)
          // Línea principal: el nombre va debajo. Desvío: arriba (lejos de los caminos).
          const base = enPrincipal ? y + (extremo ? 58 : 40) : y - 32 - (renglonesNombre.length - 1) * 18
          return (
            <g key={nombre}>
              <circle
                cx={x} cy={y} r={extremo ? 21 : 16}
                fill={extremo ? 'var(--brand)' : enPrincipal ? 'var(--cocoa)' : 'var(--surface)'}
                stroke={enPrincipal ? 'var(--surface)' : 'var(--muted)'} strokeWidth={enPrincipal ? 4 : 3}
              />
              {extremo && (
                <text x={x} y={y + 40} textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="1.2" fill="var(--brand)">
                  {nombre === origen ? 'TU ZONA' : 'VACANTE'}
                </text>
              )}
              <text textAnchor="middle" fontSize="16" fontWeight={enPrincipal ? 700 : 500} fill="var(--ink)">
                {renglonesNombre.map((l, i) => (
                  <tspan key={l} x={x} y={base + 4 + i * 18}>{l}</tspan>
                ))}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-2 pt-2 font-body text-sm text-ink">
        <span className="flex items-center gap-2"><i className="inline-block h-4 w-4 rounded-full bg-brand" /> Tu zona y la vacante</span>
        <span className="flex items-center gap-2"><i className="inline-block h-1.5 w-8 rounded-full bg-brand" /> Ruta más rápida</span>
        {hayAlternativa && (
          <span className="flex items-center gap-2"><i className="inline-block h-0 w-8 border-t-[3px] border-dotted border-muted" /> Otra opción</span>
        )}
      </div>
    </div>
  )
}
