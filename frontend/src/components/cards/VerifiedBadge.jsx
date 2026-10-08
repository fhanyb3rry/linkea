export default function VerifiedBadge({ label = 'Verificado' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-night px-3 py-1 font-body text-xs font-semibold text-on-brand">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path
          fillRule="evenodd"
          d="M10 1.5a1 1 0 01.894.553l1.315 2.632 2.94.427a1 1 0 01.554 1.706l-2.128 2.074.502 2.928a1 1 0 01-1.451 1.054L10 11.347l-2.626 1.527a1 1 0 01-1.451-1.054l.502-2.928L4.297 6.818a1 1 0 01.554-1.706l2.94-.427L9.106 2.053A1 1 0 0110 1.5z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  )
}
