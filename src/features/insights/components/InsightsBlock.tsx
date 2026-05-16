import { useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'
import { useInsightsStore } from '@/store'
import { InsightCard } from './InsightCard'

const SEVERITY_ORDER = { critical: 0, warning: 1, success: 2, info: 3 } as const

export function InsightsBlock() {
  const navigate = useNavigate()
  const { insights, markRead, dismiss } = useInsightsStore()

  if (insights.length === 0) return null

  const sorted = [...insights].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (sevDiff !== 0) return sevDiff
    return b.created_at.localeCompare(a.created_at)
  })
  const top = sorted.slice(0, 3)
  const remaining = insights.length - top.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <h2 className="text-text-primary font-medium text-sm">Insights</h2>
        </div>
        <button
          onClick={() => navigate('/insights')}
          className="text-text-muted hover:text-text-primary text-xs flex items-center gap-0.5"
        >
          Ver todos ({insights.length}) <ChevronRight size={12} />
        </button>
      </div>

      <div className="space-y-2">
        {top.map((i) => (
          <InsightCard
            key={i.id}
            insight={i}
            onRead={markRead}
            onDismiss={dismiss}
            compact
          />
        ))}
        {remaining > 0 && (
          <button
            onClick={() => navigate('/insights')}
            className="w-full text-center text-text-muted hover:text-text-primary text-xs py-1.5"
          >
            + {remaining} mais
          </button>
        )}
      </div>
    </div>
  )
}
