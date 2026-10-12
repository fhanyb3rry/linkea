import { useRef, useState } from 'react'
import { Check, Download, PenLine, Upload, X } from 'lucide-react'
import useAccion from '../../hooks/useAccion'
import { formatDate } from '../../lib/perfil'
import { ESTADO_DOCUMENTO, FIRMANTE_DE_ROL, FIRMANTES } from '../../lib/seguimiento'
import { descargarDocumento, firmarDocumento, rechazarDocumento, subirDocumento } from '../../services/api'
import { TextInput } from '../forms/FormField'
import { Boton, ErrorTexto, Pill, Seccion, Vacio } from './ui'

function Documento({ d, seg, usuario, onChange }) {
  const inputRef = useRef(null)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const { busy, error, run } = useAccion(onChange)

  const enCurso = seg.estado === 'en_curso'
  const miFirma = FIRMANTE_DE_ROL[usuario.rol]
  const meToca = enCurso && miFirma && d.requiere.includes(miFirma)
  const puedeFirmar = meToca && d.estado === 'subido' && !d.firmas[miFirma]
  const puedeSubir = enCurso && d.estado !== 'completo'
  const ultima = d.versiones[d.versiones.length - 1]

  function elegir(event) {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (archivo) run('subir', () => subirDocumento(seg.id, d.id, archivo))
  }

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-body text-sm font-semibold text-ink">{d.nombre}</span>
        <Pill estado={d.estado} mapa={ESTADO_DOCUMENTO} />
      </div>
      {d.descripcion && <p className="font-body text-xs text-muted">{d.descripcion}</p>}

      <div className="flex flex-wrap gap-2">
        {d.requiere.map((f) => {
          const firma = d.firmas[f]
          return (
            <span
              key={f}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[11px] ${
                firma ? 'border-teal/40 bg-teal/15 text-ink' : 'border-line text-muted'
              }`}
            >
              {firma ? <Check className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
              {FIRMANTES[f]}
              {firma && ` · ${firma.por} · ${formatDate(firma.fecha)}`}
            </span>
          )
        })}
      </div>

      {d.observacion && <p className="font-body text-xs italic text-brand">“{d.observacion}”</p>}
      {ultima && (
        <p className="font-body text-xs text-muted">
          {ultima.nombre} · subido por {ultima.subido_por} el {formatDate(ultima.fecha)}
          {d.versiones.length > 1 && ` · versión ${d.versiones.length}`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {ultima && (
          <Boton onClick={() => run('descargar', () => descargarDocumento(seg.id, d))}>
            <Download className="h-3.5 w-3.5" />
            Descargar
          </Boton>
        )}
        {puedeSubir && (
          <>
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={elegir} />
            <Boton disabled={busy === 'subir'} onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              {busy === 'subir' ? 'Subiendo…' : ultima ? 'Subir nueva versión' : 'Subir PDF firmado'}
            </Boton>
          </>
        )}
        {puedeFirmar && !rechazando && (
          <>
            <Boton variante="verde" disabled={busy === 'firmar'} onClick={() => run('firmar', () => firmarDocumento(seg.id, d.id))}>
              <PenLine className="h-3.5 w-3.5" />
              Marcar como firmado
            </Boton>
            <Boton variante="texto" onClick={() => setRechazando(true)}>
              <X className="h-3.5 w-3.5" />
              Pedir corrección
            </Boton>
          </>
        )}
      </div>

      {rechazando && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Qué hay que corregir?" />
          <Boton
            variante="primario"
            disabled={motivo.trim().length < 3 || busy === 'rechazar'}
            onClick={async () => {
              if (await run('rechazar', () => rechazarDocumento(seg.id, d.id, motivo.trim()))) setRechazando(false)
            }}
          >
            Enviar
          </Boton>
          <Boton onClick={() => setRechazando(false)}>Cancelar</Boton>
        </div>
      )}
      <ErrorTexto>{error}</ErrorTexto>
    </li>
  )
}

export default function Documentos({ seg, usuario, onChange }) {
  return (
    <Seccion
      title="Documentos"
      description="Se firman a mano como siempre: sube el PDF escaneado y cada asesor marca aquí su firma. Si se sube otra versión, las firmas se reinician."
    >
      {seg.documentos.length === 0 ? (
        <Vacio>Esta estadía no tiene documentos. Coordinación administra el catálogo.</Vacio>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {seg.documentos.map((d) => (
            <Documento key={d.id} d={d} seg={seg} usuario={usuario} onChange={onChange} />
          ))}
        </ul>
      )}
    </Seccion>
  )
}
