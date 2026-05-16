import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Budget } from '@/types'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface BudgetCardProps {
  budget: Budget
  spent: number
  daysRemaining: number | null // null se não for mês atual
  onEdit: (b: Budget) => void
  onDelete: (id: string) => Promise<void>
}

function getStatus(percent: number) {
  if (percent >= 100) return { color: 'expense', label: 'Estourou' }
  if (percent >= 80) return { color: 'warning', label: 'Atenção' }
  if (percent >= 60) return { color: 'accent', label: 'No ritmo' }
  return { color: 'income', label: 'Tranquilo' }
}

export function BudgetCard({ budget, spent, daysRemaining, onEdit, onDelete }: BudgetCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
  const remaining = budget.amount - spent
  const status = getStatus(percent)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(budget.id)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="card group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: budget.category?.color ?? '#7c6af7' }}
          />
          <h3 className="text-text-primary font-medium truncate">
            {budget.category?.name ?? 'Sem categoria'}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              status.color === 'expense' && 'bg-expense/20 text-expense',
              status.color === 'warning' && 'bg-warning/20 text-warning',
              status.color === 'accent' && 'bg-accent/20 text-accent',
              status.color === 'income' && 'bg-income/20 text-income',
            )}
          >
            {Math.round(percent)}%
          </span>
        </div>
      </div>

      {/* Valores */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-lg font-semibold text-text-primary">
          {formatCurrency(spent)}
        </span>
        <span className="text-text-muted text-sm font-mono">
          / {formatCurrency(budget.amount)}
        </span>
      </div>

      {/* Barra */}
      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            status.color === 'expense' && 'bg-expense',
            status.color === 'warning' && 'bg-warning',
            status.color === 'accent' && 'bg-accent',
            status.color === 'income' && 'bg-income',
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {remaining >= 0 ? (
            <>
              Restam <span className="text-text-secondary font-medium">{formatCurrency(remaining)}</span>
              {daysRemaining !== null && (
                <span> · {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</span>
              )}
            </>
          ) : (
            <span className="text-expense">
              Excedeu em {formatCurrency(Math.abs(remaining))}
            </span>
          )}
        </span>

        {/* Ações */}
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? '...' : 'Excluir'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-xs px-2 py-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={() => onEdit(budget)}
              className="text-text-muted hover:text-text-primary p-1 rounded"
              aria-label="Editar orçamento"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="text-text-muted hover:text-expense p-1 rounded"
              aria-label="Excluir orçamento"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
