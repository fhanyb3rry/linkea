import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { FormRow, TextInput } from '../components/forms/FormField'

export default function Login() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-6 flex items-center gap-2 font-heading text-xl font-semibold text-azul-marino">
        <Sparkles className="h-5 w-5 text-cafe-avellana" />
        Linkea
      </div>

      <h1 className="text-2xl">Inicia sesión</h1>
      <p className="mt-1 font-body text-sm text-gris-pizarra">
        Accede a tu cuenta para ver tus recomendaciones y vacantes.
      </p>

      <form className="mt-6 flex flex-col gap-4">
        <FormRow label="Correo electrónico">
          <TextInput type="email" placeholder="tucorreo@ejemplo.com" required />
        </FormRow>
        <FormRow label="Contraseña">
          <TextInput type="password" placeholder="••••••••" required />
        </FormRow>

        <button
          type="submit"
          className="group mt-2 flex items-center justify-center gap-2 rounded-full bg-cafe-avellana px-5 py-3 font-body text-sm font-semibold text-blanco transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-95"
        >
          Iniciar sesión
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-gris-pizarra">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-semibold text-cafe-avellana hover:underline">
          Regístrate
        </Link>
      </p>
    </section>
  )
}
