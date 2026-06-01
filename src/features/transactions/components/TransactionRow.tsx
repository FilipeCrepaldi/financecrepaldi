import { useState } from 'react'
import { Trash2, Tag as TagIcon, CreditCard } from 'lucide-react'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface TransactionRowProps {
  transaction: Transaction
  onDelete: (id: string) => Promise<void>
  onEdit?: (t: Transaction) => void
}

export function TransactionRow({ transaction: t, onDelete, onEdit }: TransactionRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(true)
    try {
      await onDelete(t.id)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const handleEdit = () => {
    if (!confirming && onEdit) onEdit(t)
  }

  return (
    <div
      onClick={handleEdit}
      className={cn(
        'group flex items-center gap-3 p-2.5 rounded-lg transition-colors',
        onEdit && !confirming
          ? 'cursor-pointer hover:bg-background-tertiary'
          : 'hover:bg-background-tertiary',
      )}
    >
      {/* Indicador de cor da categoria */}
      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{ backgroundColor: t.category?.color ?? '#3A2A30' }}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm truncate">
          {t.merchant_name ?? t.description ?? 'Sem descrição'}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {t.category?.name && (
            <span className="text-text-muted text-xs flex items-center gap-1">
              <TagIcon size={10} />
              {t.category.name}
            </span>
          )}
          {t.description && t.merchant_name && (
            <span className="text-text-muted text-xs truncate">· {t.description}</span>
          )}
          {t.card_id && (
            <span className="text-text-muted text-[10px] flex items-center gap-0.5">
              <CreditCard size={9} />
              cartão
            </span>
          )}
          {t.tags?.map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-1.5 py-0 rounded-full font-medium"
              style={{
                backgroundColor: `${tag.color ?? '#CDAA5E'}22`,
                color: tag.color ?? '#CDAA5E',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      {/* Valor */}
      <span
        className={cn(
          'font-mono font-medium text-sm shrink-0 tabular-nums',
          t.type === 'income' ? 'text-income' : 'text-expense',
        )}
      >
        {t.type === 'income' ? '+' : '-'}
        {formatCurrency(t.amount)}
      </span>

      {/* Ação de delete inline */}
      {confirming ? (
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-2 py-1 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? '...' : 'Excluir'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="text-xs px-2 py-1 rounded text-text-muted hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setConfirming(true)
          }}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-text-muted hover:text-expense p-1.5 rounded transition-all shrink-0"
          aria-label="Excluir transação"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
