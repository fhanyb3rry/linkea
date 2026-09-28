export function Label({ children }) {
  return <label className="mb-1.5 block font-body text-sm font-medium text-azul-marino">{children}</label>
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-azul-marino/15 bg-blanco px-4 py-2.5 font-body text-sm text-gris-pizarra placeholder:text-gris-pizarra/50 transition-shadow focus:border-cafe-avellana focus:outline-none focus:ring-2 focus:ring-cafe-avellana/20"
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-azul-marino/15 bg-blanco px-4 py-2.5 font-body text-sm text-gris-pizarra transition-shadow focus:border-cafe-avellana focus:outline-none focus:ring-2 focus:ring-cafe-avellana/20"
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-azul-marino/15 bg-blanco px-4 py-2.5 font-body text-sm text-gris-pizarra placeholder:text-gris-pizarra/50 transition-shadow focus:border-cafe-avellana focus:outline-none focus:ring-2 focus:ring-cafe-avellana/20"
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
