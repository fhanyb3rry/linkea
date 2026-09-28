import { BadgeCheck } from 'lucide-react'

export default function VerifiedCountBadge({ value = '+120' }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-cafe-avellana/10 px-3 py-1.5">
      <BadgeCheck className="h-4 w-4 text-cafe-avellana" />
      <span className="font-heading text-xs font-bold text-cafe-avellana">{value}</span>
    </div>
  )
}
