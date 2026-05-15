import { useMemo } from 'react'
import type { Transaction } from '@/types'
import { formatDate } from '@/utils'
import { TransactionRow } from './TransactionRow'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => Promise<void>
  onEdit?: (t: Transaction) => void
}

export function TransactionList({ transactions, onDelete, onEdit }: TransactionListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const list = map.get(t.date) ?? []
      list.push(t)
      map.set(t.date, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [transactions])

  return (
    <div className="space-y-5">
      {groups.map(([date, items]) => (
        <div key={date}>
          <h3 className="text-xs uppercase tracking-wider text-text-muted px-2.5 mb-1 font-medium">
            {formatDate(date)}
          </h3>
          <div className="space-y-0.5">
            {items.map((t) => (
              <TransactionRow key={t.id} transaction={t} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
