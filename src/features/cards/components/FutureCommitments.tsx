import { useEffect, useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import type { CardInvoice, CreditCard } from '@/types'
import { useAuthStore, useCardsStore } from '@/store'
import { cardsService } from '@/services'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface MonthRow {
  reference_month: string
  due_date: string
  total: number
  paid: number
  cards: Array<{ card: CreditCard; invoice: CardInvoice; remaining: number }>
}

/**
 * Bloco de "Compromissos futuros" — agrega faturas não pagas dos próximos 12 meses
 * agrupadas por mês, mostrando valor remanescente.
 */
export function FutureCommitments() {
  const { user } = useAuthStore()
  const { cards, fetchCards } = useCardsStore()
  const [rows, setRows] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchCards(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCards = useMemo(() => cards.filter((c) => c.is_active), [cards])

  useEffect(() => {
    if (activeCards.length === 0) {
      setRows([])
      return
    }
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setMonth(horizon.getMonth() + 12)

    Promise.all(
      activeCards.map(async (card) => {
        const invoices = await cardsService.listInvoices(card.id)
        const future = invoices.filter((i) => {
          const due = new Date(i.due_date + 'T00:00:00')
          return i.status !== 'paid' && due >= today && due <= horizon
        })
        const withPayments = await Promise.all(
          future.map(async (invoice) => {
            const payments = await cardsService.listPayments(invoice.id)
            const paid = payments.reduce((s, p) => s + Number(p.amount), 0)
            return { card, invoice, paid, remaining: Math.max(0, Number(invoice.total) - paid) }
          }),
        )
        return withPayments
      }),
    )
      .then((arrays) => {
        const flat = arrays.flat()
        const byMonth = new Map<string, MonthRow>()
        for (const { card, invoice, paid, remaining } of flat) {
          const key = invoice.reference_month
          const existing = byMonth.get(key) ?? {
            reference_month: key,
            due_date: invoice.due_date,
            total: 0,
            paid: 0,
            cards: [],
          }
          existing.total += Number(invoice.total)
          existing.paid += paid
          existing.cards.push({ card, invoice, remaining })
          // mantém a menor due_date do mês (caso múltiplos cartões)
          if (invoice.due_date < existing.due_date) existing.due_date = invoice.due_date
          byMonth.set(key, existing)
        }
        const sorted = Array.from(byMonth.values()).sort((a, b) =>
          a.reference_month.localeCompare(b.reference_month),
        )
        setRows(sorted)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeCards])

  if (activeCards.length === 0 || rows.length === 0) return null

  const totalRemaining = rows.reduce((s, r) => s + (r.total - r.paid), 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-text-primary font-medium flex items-center gap-2">
          <CalendarClock size={16} className="text-warning" />
          Compromissos futuros
        </h2>
        <span className="text-text-muted text-xs">
          próximos 12 meses ·{' '}
          <span className="font-mono text-expense">{formatCurrency(totalRemaining)}</span>
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => {
          const remaining = r.total - r.paid
          const cardsLabel = r.cards
            .map((c) => c.card.name)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(' · ')
          const dueLabel = new Date(r.due_date + 'T00:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          })
          return (
            <div
              key={r.reference_month}
              className="flex items-center justify-between gap-2 p-2 rounded-md bg-background-tertiary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary font-mono">{r.reference_month}</p>
                <p className="text-[11px] text-text-muted truncate">
                  Vence {dueLabel} · {cardsLabel}
                </p>
              </div>
              <span
                className={cn(
                  'font-mono text-sm',
                  remaining > 0 ? 'text-expense' : 'text-income',
                )}
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          )
        })}
      </div>

      {loading && (
        <p className="text-text-muted text-xs mt-2 text-center">Atualizando...</p>
      )}
    </div>
  )
}
