export default function MatchBadge({ percentage }) {
  if (percentage === undefined || percentage === null) return null

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-brand-soft px-3 py-1 font-body text-xs font-semibold text-brand">
      {Math.round(percentage)}% match
    </span>
  )
}
