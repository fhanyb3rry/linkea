import { Info } from 'lucide-react'

// Aviso de las pantallas que son una vista previa del diseño (sin backend todavía).
export default function PreviewNotice({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-canvas p-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
      <p className="font-body text-xs leading-relaxed text-muted">
        <strong className="text-ink">Vista previa del diseño.</strong> {children}
      </p>
    </div>
  )
}
