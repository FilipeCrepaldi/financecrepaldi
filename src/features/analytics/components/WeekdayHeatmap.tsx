import { formatCurrency } from '@/utils'
import type { WeekdayCell } from '../utils/aggregations'

interface WeekdayHeatmapProps {
  data: WeekdayCell[]
}

export function WeekdayHeatmap({ data }: WeekdayHeatmapProps) {
  const max = Math.max(...data.map((c) => c.amount), 0)
  const total = data.reduce((s, c) => s + c.amount, 0)

  if (max === 0) {
    return (
      <div className="card h-full">
        <h3 className="text-text-primary font-medium text-sm mb-3">
          Padrão por dia da semana
        </h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-text-muted text-sm">Sem despesas no período</p>
        </div>
      </div>
    )
  }

  // Encontra o pico
  const peak = data.reduce((a, b) => (a.amount > b.amount ? a : b))

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-primary font-medium text-sm">
          Padrão por dia da semana
        </h3>
        <span className="text-text-muted text-xs">
          Pico: <span className="text-text-secondary font-medium">{peak.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {data.map((c) => {
          const intensity = max > 0 ? c.amount / max : 0
          const opacity = 0.15 + intensity * 0.85
          return (
            <div
              key={c.weekday}
              className="flex flex-col items-center gap-1"
              title={`${c.label}: ${formatCurrency(c.amount)} (${c.count} transações)`}
            >
              <div className="text-[10px] text-text-muted font-medium">{c.label}</div>
              <div
                className="w-full aspect-square rounded-md flex items-center justify-center"
                style={{
                  backgroundColor: `rgba(244, 63, 94, ${opacity})`,
                }}
              >
                <span
                  className={`text-xs font-mono font-medium ${
                    intensity > 0.5 ? 'text-white' : 'text-text-primary'
                  }`}
                >
                  {c.count}
                </span>
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {total > 0 ? Math.round((c.amount / total) * 100) : 0}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
