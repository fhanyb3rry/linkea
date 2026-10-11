import { useRef, useState } from 'react'
import { Download, FileText, Trash2, UploadCloud } from 'lucide-react'
import { CV_ACCEPT, formatDate, formatSize, validateCV } from '../../lib/perfil'

// Carga del currículum. `file` = archivo nuevo elegido; `existing` = CV ya guardado (metadatos del backend).
export default function FileDrop({ file, onFile, existing, removed, onRemoveExisting, downloadHref }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  function pick(candidate) {
    if (!candidate) return
    const problem = validateCV(candidate)
    setError(problem)
    if (!problem) onFile(candidate)
  }

  const showExisting = existing && !removed && !file

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {file || showExisting ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cocoa-soft text-cocoa">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-sm font-semibold text-ink">
              {file ? file.name : existing.nombre_archivo}
            </p>
            <p className="font-body text-xs text-muted">
              {file
                ? `${formatSize(file.size)} · se subirá al guardar`
                : `${formatSize(existing.tamano)} · subido el ${formatDate(existing.subido_en)}`}
            </p>
          </div>
          {showExisting && downloadHref && (
            <a
              href={downloadHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Ver currículum"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-ink"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-line px-3 py-2 font-body text-xs font-semibold text-ink hover:border-cocoa/50"
          >
            Reemplazar
          </button>
          <button
            type="button"
            aria-label="Quitar currículum"
            onClick={() => {
              setError(null)
              if (file) onFile(null)
              else onRemoveExisting?.()
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-brand"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files?.[0])
          }}
          className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? 'border-cocoa bg-cocoa-soft' : 'border-line bg-canvas hover:border-cocoa/50'
          }`}
        >
          <UploadCloud className="h-7 w-7 text-cocoa" />
          <span className="font-body text-sm font-semibold text-ink">Arrastra tu CV o haz clic para elegirlo</span>
          <span className="font-body text-xs text-muted">PDF, DOC o DOCX · máximo 5 MB</span>
        </button>
      )}

      {error && <p className="mt-2 font-body text-xs text-red-600">{error}</p>}
    </div>
  )
}
