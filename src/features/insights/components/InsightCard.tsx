import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Award,
  X,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import type { Insight, InsightSeverity, InsightType } from '@/types'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  insight: Insight
  onRead: (id: string) => void
  onDismiss: (id: string) => void
  compact?: boolean
}

const TYPE_ICONS: Record<InsightType, LucideIcon> = {
  budget_overrun: AlertCircle,
  spike: TrendingUp,
  recurrence_missed: AlertTriangle,
  streak: Award,
}

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { border: string; bg: string; text: string; iconText: string }
> = {
  info: {
    border: 'border-accent/30',
    bg: 'bg-accent/5',
    text: 'text-accent',
    iconText: 'text-accent',
  },
  warning: {
    border: 'border-warning/40',
    bg: 'bg-warning/5',
    text: 'text-warning',
    iconText: 'text-warning',
  },
  critical: {
    border: 'border-expense/40',
    bg: 'bg-expense/5',
    text: 'text-expense',
    iconText: 'text-expense',
  },
  success: {
    border: 'border-income/40',
    bg: 'bg-income/5',
    text: 'text-income',
    iconText: 'text-income',
  },
}

const ACTION_BY_TYPE: Record<InsightType, { label: string; path: string } | null> = {
  budget_overrun: { label: 'Ver orçamento', path: '/budgets' },
  spike: { label: 'Ver analytics', path: '/analytics' },
  recurrence_missed: { label: 'Ver recorrência', path: '/recurrences' },
  streak: null,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins}m atrás`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.round(hours / 24)
  return `${days}d atrás`
}

export function InsightCard({ insight, onRead, onDismiss, compact }: InsightCardProps) {
  const navigate = useNavigate()
  const Icon = TYPE_ICONS[insight.type]
  const style = SEVERITY_STYLES[insight.severity]
  const action = ACTION_BY_TYPE[insight.type]

  const handleAction = () => {
    if (!insight.is_read) onRead(insight.id)
    if (action) navigate(action.path)
  }

  return (
    <div
      className={cn(
        'card border transition-colors',
        style.border,
        style.bg,
        !insight.is_read && 'ring-1 ring-inset ring-white/5',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={16} className={cn('mt-0.5 shrink-0', style.iconText)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-text-primary font-medium text-sm">
              {insight.title}
            </h3>
            <button
              onClick={() => onDismiss(insight.id)}
              className="text-text-muted hover:text-text-primary p-0.5 rounded shrink-0"
              aria-label="Dispensar"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-text-secondary text-xs mt-1">{insight.body}</p>

          {!compact && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-text-muted text-[10px]">
                {timeAgo(insight.created_at)}
                {!insight.is_read && (
                  <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </span>
              {action && (
                <button
                  onClick={handleAction}
                  className={cn(
                    'text-xs flex items-center gap-1 hover:opacity-80 transition-opacity font-medium',
                    style.text,
                  )}
                >
                  {action.label}
                  <ArrowRight size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
