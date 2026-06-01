import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, Check } from 'lucide-react'
import {
  useAuthStore,
  useRecurrencesStore,
  useTransactionStore,
} from '@/store'
import { recurrencesService, recurrenceType } from '@/services'
import { formatCurrency } from '@/utils'
import type { Recurrence } from '@/types'

export function UpcomingDueBanner() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { recurrences, updateRecurrence } = useRecurrencesStore()
  const { addTransaction } = useTransactionStore()
  const [working, setWorking] = useState<Set<string>>(new Set())

  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return recurrences
      .filter((r) => r.is_active)
      .filter((r) => {
        const t = new Date(r.next_due_date + 'T00:00:00')
        const diff = Math.round((t.getTime() - today.getTime()) / 86_400_000)
        return diff <= 3
      })
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
  }, [recurrences])

  if (upcoming.length === 0) return null

  const total = upcoming.reduce((s, r) => s + r.amount, 0)
  const overdueCount = upcoming.filter((r) => {
    const t = new Date(r.next_due_date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return t < today
  }).length

  const handlePay = async (r: Recurrence) => {
    if (!user) return
    setWorking((s) => new Set(s).add(r.id))
    try {
      const { transaction, recurrence } = await recurrencesService.markAsPaid(
        user.id,
        r,
      )
      updateRecurrence(recurrence)
      addTransaction(transaction)
    } finally {
      setWorking((s) => {
        const next = new Set(s)
        next.delete(r.id)
        return next
      })
    }
  }

  return (
    <div
      className={`card border ${
        overdueCount > 0
          ? 'border-expense/40 bg-expense/5'
          : 'border-warning/40 bg-warning/5'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <AlertCircle
            size={16}
            className={overdueCount > 0 ? 'text-expense' : 'text-warning'}
          />
          <div>
            <p className="text-text-primary font-medium text-sm">
              {overdueCount > 0
                ? `${overdueCount} vencida${overdueCount > 1 ? 's' : ''}`
                : 'Vencimentos próximos'}
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              {upcoming.length} recorrência{upcoming.length > 1 ? 's' : ''} ·{' '}
              {formatCurrency(total)}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/recurrences')}
          className="text-text-muted hover:text-text-primary text-xs flex items-center gap-0.5"
        >
          Ver todas <ChevronRight size={12} />
        </button>
      </div>

      <div className="space-y-1.5">
        {upcoming.slice(0, 3).map((r) => {
          const t = new Date(r.next_due_date + 'T00:00:00')
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const diff = Math.round(
            (t.getTime() - today.getTime()) / 86_400_000,
          )
          const label =
            diff < 0
              ? `Atrasado ${Math.abs(diff)}d`
              : diff === 0
                ? 'Hoje'
                : diff === 1
                  ? 'Amanhã'
                  : `Em ${diff}d`
          const isWorking = working.has(r.id)
          return (
            <div
              key={r.id}
              className="flex items-center gap-2 p-2 rounded-md bg-background-tertiary/50"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: r.category?.color ?? '#7B1E3A' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm truncate">{r.name}</p>
                <p className="text-text-muted text-xs">
                  {label} · {formatCurrency(r.amount)}
                </p>
              </div>
              <button
                onClick={() => handlePay(r)}
                disabled={isWorking}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 disabled:opacity-50 ${
                  recurrenceType(r) === 'income'
                    ? 'bg-income/20 text-income hover:bg-income/30'
                    : 'bg-accent/20 text-accent hover:bg-accent/30'
                }`}
              >
                <Check size={11} />
                {isWorking
                  ? '...'
                  : recurrenceType(r) === 'income'
                    ? 'Receber'
                    : 'Pagar'}
              </button>
            </div>
          )
        })}
        {upcoming.length > 3 && (
          <p className="text-text-muted text-xs pl-2 pt-1">
            + {upcoming.length - 3} mais
          </p>
        )}
      </div>
    </div>
  )
}
