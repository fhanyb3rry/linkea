// Bloque de un formulario largo: título, descripción y contenido en una tarjeta.
export default function FormSection({ title, description, children }) {
  return (
    <section className="panel p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="mt-1 font-body text-xs text-muted">{description}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  )
}
