import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'

export default function PageHeader({ title, subtitle, count, actionTo, actionLabel, search, onSearch, searchPlaceholder }) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-baseline gap-3 text-4xl font-medium">
            {title}
            {count !== undefined && (
              <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 font-body text-xs font-semibold text-brand">
                {count} {count === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
          </h1>
          <p className="mt-2 font-body text-sm text-muted">{subtitle}</p>
        </div>
        {actionTo && (
          <Link
            to={actionTo}
            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-body text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Link>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 font-body text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30"
        />
      </div>
    </header>
  )
}
