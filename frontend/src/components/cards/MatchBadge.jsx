export default function MatchBadge({ percentage }) {
  if (percentage === undefined || percentage === null) return null

  return (
    <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 font-body text-xs font-semibold text-on-brand">
      {Math.round(percentage)}% match
    </span>
  )
}
