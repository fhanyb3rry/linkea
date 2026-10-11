import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { FormRow, TextInput } from '../components/forms/FormField'

export default function Recuperar() {
  const [sent, setSent] = useState(false)

  // Prototipo: no hay cuentas ni envío de correos todavía.
  function onSubmit(event) {
    event.preventDefault()
    setSent(true)
  }

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Link to="/login" className="mb-6 flex w-fit items-center gap-1.5 font-body text-sm text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" />
        Volver a iniciar sesión
      </Link>

      <h1 className="text-3xl">Recupera tu contraseña</h1>
      <p className="mt-2 font-body text-sm text-muted">
        Escribe tu correo y te enviaremos las instrucciones para crear una contraseña nueva.
      </p>

      {sent ? (
        <div className="panel mt-6 flex items-start gap-3 p-5">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-cocoa" />
          <div>
            <p className="font-body text-sm font-semibold text-ink">Revisa tu correo</p>
            <p className="mt-1 font-body text-xs leading-relaxed text-muted">
              Si existe una cuenta con ese correo, recibirás un enlace en unos minutos. (Pantalla de ejemplo: todavía no se
              envía ningún correo.)
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <FormRow label="Correo electrónico">
            <TextInput type="email" placeholder="tucorreo@ejemplo.com" required />
          </FormRow>
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            Enviar instrucciones
          </button>
        </form>
      )}
    </section>
  )
}
