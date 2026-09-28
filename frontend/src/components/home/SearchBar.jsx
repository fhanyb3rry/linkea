import { ArrowRight, ChevronDown, MapPin, Search } from 'lucide-react'

export default function SearchBar() {
  return (
    <form className="flex flex-col gap-2 rounded-2xl bg-blanco p-2 shadow-md ring-1 ring-transparent transition-shadow duration-300 focus-within:shadow-xl focus-within:ring-cafe-avellana/30 hover:shadow-lg sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-gris-pizarra" />
        <input
          type="text"
          placeholder="Buscar vacantes, empresas o habilidades..."
          className="w-full bg-transparent font-body text-sm text-gris-pizarra placeholder:text-gris-pizarra/60 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 border-t border-beige-almendra px-3 py-2 sm:border-l sm:border-t-0">
        <MapPin className="h-4 w-4 shrink-0 text-gris-pizarra" />
        <span className="font-body text-sm text-gris-pizarra">Toluca, Edo. Méx.</span>
        <ChevronDown className="h-3.5 w-3.5 text-gris-pizarra" />
      </div>

      <button
        type="submit"
        aria-label="Buscar"
        className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-cafe-avellana text-blanco transition-all duration-300 hover:scale-105 hover:opacity-90 active:scale-95 sm:self-auto"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  )
}
