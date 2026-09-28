import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, GraduationCap, Sparkles } from 'lucide-react'
import { FormRow, TextInput } from '../components/forms/FormField'

export default function Register() {
  const [role, setRole] = useState('estudiante')

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-6 flex items-center gap-2 font-heading text-xl font-semibold text-azul-marino">
        <Sparkles className="h-5 w-5 text-cafe-avellana" />
        Linkea
      </div>

      <h1 className="text-2xl">Crea tu cuenta</h1>
      <p className="mt-1 font-body text-sm text-gris-pizarra">Elige cómo quieres usar Linkea.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole('estudiante')}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
            role === 'estudiante'
              ? 'border-cafe-avellana bg-cafe-avellana/10'
              : 'border-azul-marino/15 bg-blanco hover:bg-beige-almendra'
          }`}
        >
          <GraduationCap className={`h-6 w-6 ${role === 'estudiante' ? 'text-cafe-avellana' : 'text-azul-marino'}`} />
          <span className="font-body text-sm font-medium text-azul-marino">Soy estudiante</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('empresa')}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
            role === 'empresa'
              ? 'border-cafe-avellana bg-cafe-avellana/10'
              : 'border-azul-marino/15 bg-blanco hover:bg-beige-almendra'
          }`}
        >
          <Briefcase className={`h-6 w-6 ${role === 'empresa' ? 'text-cafe-avellana' : 'text-azul-marino'}`} />
          <span className="font-body text-sm font-medium text-azul-marino">Soy empresa</span>
        </button>
      </div>

      <form className="mt-6 flex flex-col gap-4">
        <FormRow label="Nombre completo">
          <TextInput type="text" placeholder="Tu nombre" required />
        </FormRow>
        <FormRow label="Correo electrónico">
          <TextInput type="email" placeholder="tucorreo@ejemplo.com" required />
        </FormRow>
        <FormRow label="Contraseña">
          <TextInput type="password" placeholder="••••••••" required />
        </FormRow>

        <Link
          to={role === 'estudiante' ? '/perfil/crear' : '/vacantes/nueva'}
          className="group mt-2 flex items-center justify-center gap-2 rounded-full bg-cafe-avellana px-5 py-3 font-body text-sm font-semibold text-blanco transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-95"
        >
          Crear cuenta
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </form>

      <p className="mt-6 text-center font-body text-sm text-gris-pizarra">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-cafe-avellana hover:underline">
          Inicia sesión
        </Link>
      </p>
    </section>
  )
}
