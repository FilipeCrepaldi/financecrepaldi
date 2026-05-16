import { useState } from 'react'
import { Pencil, Trash2, Check, Pause, Play, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { Recurrence } from '@/types'
import { formatCurrency } from '@/utils'
import { recurrenceType } from '@/services'
import { cn } from '@/lib/utils'

interface RecurrenceCardProps {
  recurrence: Recurrence
  onEdit: (r: Recurrence) => void
  onDelete: (id: string) => Promise<void>
  onPay: (r: Recurrence) => Promise<void>
  onToggleActive: (r: Recurrence) => Promise<void>
}

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'diária',
  weekly: 'semanal',
  monthly: 'mensal',
  yearly: 'anual',
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function dueLabel(diff: number): { text: string; color: string } {
  if (diff < 0) return { text: `Atrasado ${Math.abs(diff)}d`, color: 'expense' }
  if (diff === 0) return { text: 'Hoje', color: 'warning' }
  if (diff === 1) return { text: 'Amanhã', color: 'warning' }
  if (diff <= 7) return { text: `Em ${diff}d`, color: 'accent' }
  return { text: `Em ${diff}d`, color: 'muted' }
}

export function RecurrenceCard({
  recurrence,
  onEdit,
  onDelete,
  onPay,
  onToggleActive,
}: RecurrenceCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)

  const diff = daysUntil(recurrence.next_due_date)
  const due = dueLabel(diff)
  const inactive = !recurrence.is_active
  const canPay = !inactive && diff <= 7
  const type = recurrenceType(recurrence)
  const isIncome = type === 'income'

  const handleDelete = async () => {
    setWorking(true)
    try {
      await onDelete(recurrence.id)
    } finally {
      setWorking(false)
      setConfirming(false)
    }
  }

  const handlePay = async () => {
    setWorking(true)
    try {
      await onPay(recurrence)
    } finally {
      setWorking(false)
    }
  }

  const handleToggle = async () => {
    setWorking(true)
    try {
      await onToggleActive(recurrence)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className={cn('card group', inactive && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-full shrink-0 flex items-center justify-center',
              isIncome ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense',
            )}
          >
            {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-text-primary font-medium truncate">{recurrence.name}</h3>
            <p className="text-text-muted text-xs truncate flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: recurrence.category?.color ?? '#7c6af7' }}
              />
              {recurrence.category?.name ?? 'Sem categoria'} ·{' '}
              {FREQUENCY_LABEL[recurrence.frequency]}
            </p>
          </div>
        </div>

        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
            due.color === 'expense' && 'bg-expense/20 text-expense',
            due.color === 'warning' && 'bg-warning/20 text-warning',
            due.color === 'accent' && 'bg-accent/20 text-accent',
            due.color === 'muted' && 'bg-background-tertiary text-text-muted',
          )}
        >
          {inactive ? 'Pausada' : due.text}
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <span
          className={cn(
            'font-mono text-lg font-semibold',
            isIncome ? 'text-income' : 'text-text-primary',
          )}
        >
          {isIncome ? '+' : ''}
          {formatCurrency(recurrence.amount)}
        </span>
        <span className="text-text-muted text-xs">
          {new Date(recurrence.next_due_date + 'T00:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {canPay ? (
          <button
            onClick={handlePay}
            disabled={working}
            className={cn(
              'text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50',
              isIncome
                ? 'bg-income/20 text-income hover:bg-income/30'
                : 'bg-accent/20 text-accent hover:bg-accent/30',
            )}
          >
            <Check size={12} />
            {working ? '...' : isIncome ? 'Confirmar recebimento' : 'Marcar pago'}
          </button>
        ) : (
          <span />
        )}

        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={working}
              className="text-xs px-2 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium transition-colors disabled:opacity-50"
            >
              {working ? '...' : 'Excluir'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={working}
              className="text-xs px-2 py-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={handleToggle}
              disabled={working}
              className="text-text-muted hover:text-text-primary p-1 rounded"
              aria-label={inactive ? 'Retomar' : 'Pausar'}
            >
              {inactive ? <Play size={12} /> : <Pause size={12} />}
            </button>
            <button
              onClick={() => onEdit(recurrence)}
              className="text-text-muted hover:text-text-primary p-1 rounded"
              aria-label="Editar recorrência"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="text-text-muted hover:text-expense p-1 rounded"
              aria-label="Excluir recorrência"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
