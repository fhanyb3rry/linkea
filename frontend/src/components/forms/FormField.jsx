export function Label({ children }) {
  return <label className="mb-1.5 block font-body text-sm font-medium text-ink">{children}</label>
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted/60 transition-shadow focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 font-body text-sm text-ink transition-shadow focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted/60 transition-shadow focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
    />
  )
}

export function FormRow({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
