import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, ChevronRight } from 'lucide-react'
import type { CardInvoice, CreditCard as CreditCardType } from '@/types'
import { useAuthStore, useCardsStore } from '@/store'
import { cardsService } from '@/services'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface CardSummary {
  card: CreditCardType
  openInvoice: CardInvoice | null
  paidOnOpen: number
  nextDue: CardInvoice | null
}

export function CardsBlock() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { cards, fetchCards } = useCardsStore()
  const [summaries, setSummaries] = useState<CardSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchCards(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCards = useMemo(() => cards.filter((c) => c.is_active), [cards])

  useEffect(() => {
    if (activeCards.length === 0) {
      setSummaries([])
      return
    }
    setLoading(true)
    Promise.all(
      activeCards.map(async (card) => {
        const invoices = await cardsService.listInvoices(card.id)
        const openInvoice =
          invoices.find((i) => i.status === 'open') ??
          invoices.find((i) => i.status === 'closed') ??
          null
        const nextDue =
          invoices
            .filter((i) => i.status !== 'paid')
            .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null

        let paidOnOpen = 0
        if (openInvoice) {
          const payments = await cardsService.listPayments(openInvoice.id)
          paidOnOpen = payments.reduce((s, p) => s + Number(p.amount), 0)
        }
        return { card, openInvoice, paidOnOpen, nextDue }
      }),
    )
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeCards])

  if (activeCards.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-text-primary font-medium flex items-center gap-2">
          <CreditCard size={16} className="text-accent" />
          Cartões
        </h2>
        <button
          onClick={() => navigate('/cards')}
          className="text-text-muted hover:text-text-primary text-xs flex items-center gap-0.5"
        >
          Ver todos <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {summaries.map(({ card, openInvoice, paidOnOpen, nextDue }) => {
          const total = Number(openInvoice?.total ?? 0)
          const remaining = Math.max(0, total - paidOnOpen)
          const isThird = card.owner_type === 'third_party'
          const usagePct = card.limit_amount
            ? Math.min(100, Math.round((total / card.limit_amount) * 100))
            : null
          return (
            <button
              key={card.id}
              onClick={() => navigate(`/cards`)}
              className="text-left p-3 rounded-lg bg-background-tertiary/50 hover:bg-background-tertiary transition-colors border border-border"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-5 rounded shrink-0"
                    style={{ backgroundColor: card.color ?? '#7c6af7' }}
                  />
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">
                      {card.name}
                    </p>
                    {card.last_digits && (
                      <p className="text-text-muted text-[10px] font-mono">
                        ···· {card.last_digits}
                      </p>
                    )}
                  </div>
                </div>
                {isThird && (
                  <span className="text-[9px] uppercase font-mono bg-warning/20 text-warning px-1.5 py-0.5 rounded shrink-0">
                    {card.owner_name?.split(' ')[0] ?? '3º'}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-text-muted text-xs">Fatura aberta</span>
                  <span className="font-mono text-sm text-text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
                {paidOnOpen > 0 && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-text-muted text-[10px]">Pago</span>
                    <span className="font-mono text-[11px] text-income">
                      -{formatCurrency(paidOnOpen)}
                    </span>
                  </div>
                )}
                {nextDue && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-text-muted text-xs">
                      Vence {new Date(nextDue.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className={cn(
                      'font-mono text-xs',
                      remaining > 0 ? 'text-expense' : 'text-income',
                    )}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                )}
                {usagePct !== null && card.limit_amount && (
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="text-text-muted text-[10px]">
                        {usagePct}% do limite
                      </span>
                      <span className="text-text-muted text-[10px] font-mono">
                        {formatCurrency(card.limit_amount)}
                      </span>
                    </div>
                    <div className="h-1 bg-background-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          usagePct > 80 ? 'bg-expense' : usagePct > 50 ? 'bg-warning' : 'bg-accent',
                        )}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {loading && (
        <p className="text-text-muted text-xs mt-2 text-center">Carregando...</p>
      )}
    </div>
  )
}
