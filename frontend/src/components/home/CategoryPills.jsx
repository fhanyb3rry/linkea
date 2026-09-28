import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const categories = [
  'Todas',
  'Tecnología',
  'Desarrollo',
  'Diseño',
  'Administración',
  'Ingeniería',
  'Marketing',
  'Operaciones',
]

export default function CategoryPills() {
  const [active, setActive] = useState('Todas')

  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => setActive(category)}
          className={`rounded-full px-4 py-1.5 font-body text-sm font-medium transition-all duration-200 active:scale-95 ${
            active === category
              ? 'scale-105 bg-azul-marino text-blanco shadow-md shadow-azul-marino/20'
              : 'bg-blanco text-gris-pizarra hover:scale-105 hover:bg-beige-almendra'
          }`}
        >
          {category}
        </button>
      ))}
      <button
        type="button"
        className="flex items-center gap-1 rounded-full bg-blanco px-4 py-1.5 font-body text-sm font-medium text-gris-pizarra hover:bg-beige-almendra"
      >
        Más
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
