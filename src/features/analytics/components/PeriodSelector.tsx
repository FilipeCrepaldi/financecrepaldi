import type { Period } from '../utils/aggregations'
import { PERIOD_LABELS } from '../utils/aggregations'

interface PeriodSelectorProps {
  value: Period
  onChange: (p: Period) => void
}

const PERIODS: Period[] = ['1m', '3m', '6m', '1y']

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex bg-background-tertiary border border-border rounded-lg p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            value === p
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  )
}
