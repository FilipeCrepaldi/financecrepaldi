import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronRight } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type {
  CardInvoice,
  CardInvoicePayment,
  CreditCard as CreditCardType,
  Transaction,
} from '@/types'
import { useAuthStore, useCardsStore } from '@/store'
import { cardsService, transactionsService } from '@/services'
import { formatCurrency, formatDate } from '@/utils'
import { cn } from '@/lib/utils'
import { CardEditModal } from './CardEditModal'
import { PaymentModal } from './PaymentModal'
import { TransactionFormModal } from '@/features/transactions/components/TransactionFormModal'

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-warning/20 text-warning',
  closed: 'bg-accent/20 text-accent',
  paid: 'bg-income/20 text-income',
}

const CHART_STATUS_FILL: Record<string, string> = {
  paid: '#22c55e',
  closed: '#7B1E3A',
  open: '#D4AF37',
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatRefMonth(ym: string): string {
  const [year, month] = ym.split('-')
  return `${MONTH_LABELS[parseInt(month, 10) - 1]}/${year.slice(2)}`
}

// ----------------------------------------------------------------------------
// InvoiceBarChart
// ----------------------------------------------------------------------------

interface InvoiceBarChartProps {
  invoices: CardInvoice[]
}

function InvoiceBarChart({ invoices }: InvoiceBarChartProps) {
  const sorted = [...invoices]
    .sort((a, b) => a.reference_month.localeCompare(b.reference_month))
    .slice(-12)

  if (sorted.length === 0) return null

  const data = sorted.map((inv) => ({
    label: formatRefMonth(inv.reference_month),
    total: Number(inv.total),
    status: inv.status,
    dueDate: inv.due_date,
  }))

  return (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-2">
        Histórico de faturas
      </p>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#8A6F76' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Total']}
            labelFormatter={(label) => `Fatura ${label}`}
            contentStyle={{
              backgroundColor: '#241A1E',
              border: '1px solid #3A2A30',
              borderRadius: 8,
              fontSize: 12,
              color: '#F5EAE5',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={CHART_STATUS_FILL[entry.status] ?? '#7B1E3A'}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1">
        {Object.entries({ paid: 'Paga', closed: 'Fechada', open: 'Aberta' }).map(
          ([status, label]) => (
            <span key={status} className="flex items-center gap-1 text-[10px] text-text-muted">
              <span
                className="inline-block w-2 h-2 rounded-sm"
                style={{ backgroundColor: CHART_STATUS_FILL[status] }}
              />
              {label}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// CardsPage
// ----------------------------------------------------------------------------

export default function CardsPage() {
  const { user } = useAuthStore()
  const { cards, loading, fetchCards, removeCard } = useCardsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCardType | null>(null)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchCards(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (c: CreditCardType) => {
    setEditing(c)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await cardsService.delete(id)
    removeCard(id)
    setConfirmingDelete(null)
  }

  const isEmpty = !loading && cards.length === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Cartões</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {cards.filter((c) => c.is_active).length} ativo
            {cards.filter((c) => c.is_active).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="btn-primary text-sm py-2 flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Novo cartão</span>
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : isEmpty ? (
        <div className="card text-center py-12">
          <CreditCard size={28} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-medium">Nenhum cartão cadastrado</p>
          <p className="text-text-muted text-sm mt-1 mb-5">
            Cadastre seus cartões para controlar faturas e parcelas separadas do
            caixa.
          </p>
          <button
            onClick={handleNew}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            Cadastrar primeiro
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <CardRow
              key={c.id}
              card={c}
              expanded={expandedCardId === c.id}
              confirmingDelete={confirmingDelete === c.id}
              onToggle={() =>
                setExpandedCardId(expandedCardId === c.id ? null : c.id)
              }
              onEdit={() => handleEdit(c)}
              onAskDelete={() => setConfirmingDelete(c.id)}
              onConfirmDelete={() => handleDelete(c.id)}
              onCancelDelete={() => setConfirmingDelete(null)}
            />
          ))}
        </div>
      )}

      {modalOpen && <CardEditModal card={editing} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

// ----------------------------------------------------------------------------
// CardRow
// ----------------------------------------------------------------------------

interface CardRowProps {
  card: CreditCardType
  expanded: boolean
  confirmingDelete: boolean
  onToggle: () => void
  onEdit: () => void
  onAskDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function CardRow({
  card,
  expanded,
  confirmingDelete,
  onToggle,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: CardRowProps) {
  const { invoicesByCard, fetchInvoices } = useCardsStore()
  const invoices = invoicesByCard[card.id] ?? []
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (expanded && !loaded) {
      fetchInvoices(card.id)
        .catch(console.error)
        .finally(() => setLoaded(true))
    }
  }, [expanded, loaded, card.id, fetchInvoices])

  const isThird = card.owner_type === 'third_party'

  return (
    <div className={cn('card', !card.is_active && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="text-text-muted hover:text-text-primary p-1 -ml-1 rounded"
          aria-label={expanded ? 'Fechar' : 'Abrir'}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div
          className="w-10 h-7 rounded shrink-0"
          style={{ backgroundColor: card.color ?? '#7B1E3A' }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-text-primary font-medium">{card.name}</h3>
            {card.last_digits && (
              <span className="text-text-muted text-xs font-mono">
                ···· {card.last_digits}
              </span>
            )}
            {isThird && (
              <span className="text-[9px] uppercase font-mono bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                {card.owner_name?.split(' ')[0] ?? '3º'}
              </span>
            )}
            {!card.is_active && (
              <span className="text-[9px] uppercase font-mono bg-background-tertiary text-text-muted px-1.5 py-0.5 rounded">
                Inativo
              </span>
            )}
          </div>
          <p className="text-text-muted text-xs mt-0.5">
            {card.closing_day !== null
              ? `Fecha dia ${card.closing_day}`
              : 'Fechamento variável'}{' '}
            · Vence dia {card.due_day}
            {card.limit_amount !== null &&
              ` · limite ${formatCurrency(card.limit_amount)}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {confirmingDelete ? (
            <>
              <button
                onClick={onConfirmDelete}
                className="text-xs px-2 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium"
              >
                Excluir
              </button>
              <button
                onClick={onCancelDelete}
                className="text-xs px-2 py-0.5 rounded text-text-muted hover:text-text-primary"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="text-text-muted hover:text-text-primary p-1 rounded"
                aria-label="Editar"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={onAskDelete}
                className="text-text-muted hover:text-expense p-1 rounded"
                aria-label="Excluir"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {!loaded ? (
            <p className="text-text-muted text-xs text-center py-4">Carregando faturas...</p>
          ) : invoices.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-4">
              Nenhuma fatura ainda. Compras lançadas no cartão geram a fatura
              automaticamente.
            </p>
          ) : (
            <>
              <InvoiceBarChart invoices={invoices} />
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} card={card} invoice={inv} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// InvoiceRow
// ----------------------------------------------------------------------------

interface InvoiceRowProps {
  card: CreditCardType
  invoice: CardInvoice
}

function InvoiceRow({ card, invoice }: InvoiceRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payments, setPayments] = useState<CardInvoicePayment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { upsertInvoice, fetchInvoices } = useCardsStore()

  useEffect(() => {
    if (!expanded || loaded) return
    Promise.all([
      cardsService.listInvoiceTransactions(invoice.id),
      cardsService.listPayments(invoice.id),
    ])
      .then(([tx, pay]) => {
        setTransactions(tx)
        setPayments(pay)
      })
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [expanded, loaded, invoice.id])

  const paidTotal = payments.reduce((s, p) => s + Number(p.amount), 0)
  const remaining = Math.max(0, Number(invoice.total) - paidTotal)

  const handlePaymentCreated = async (updated: CardInvoice) => {
    upsertInvoice(updated)
    setLoaded(false)
    await fetchInvoices(card.id)
  }

  const handleDeleteTx = async (txId: string) => {
    setDeletingId(txId)
    try {
      await transactionsService.delete(txId)
      const newTotal = await cardsService.recalculateTotal(invoice.id)
      setTransactions((prev) => prev.filter((t) => t.id !== txId))
      upsertInvoice({ ...invoice, total: newTotal })
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleEditModalClose = () => {
    setEditingTx(null)
    setLoaded(false) // recarrega a lista de transações e pagamentos
  }

  return (
    <div className="rounded-lg border border-border bg-background-tertiary/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center gap-2 hover:bg-background-tertiary/50 rounded-t-lg"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-primary font-medium font-mono">
            {formatRefMonth(invoice.reference_month)}
          </span>
          <span
            className={cn(
              'text-[10px] uppercase font-mono px-1.5 py-0.5 rounded',
              STATUS_COLOR[invoice.status] ?? 'bg-background-tertiary',
            )}
          >
            {STATUS_LABEL[invoice.status] ?? invoice.status}
          </span>
          <span className="text-text-muted text-xs">
            Vence{' '}
            {new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
        </div>
        <span className="font-mono text-sm text-text-primary">
          {formatCurrency(Number(invoice.total))}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3">
          {!loaded ? (
            <p className="text-text-muted text-xs text-center py-3">Carregando...</p>
          ) : (
            <>
              {/* Compras */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">
                  Compras ({transactions.length})
                </p>
                {transactions.length === 0 ? (
                  <p className="text-text-muted text-xs">Nenhuma compra nessa fatura.</p>
                ) : (
                  <div className="space-y-0.5">
                    {transactions.map((t) => (
                      <div
                        key={t.id}
                        className="group flex items-center gap-2 py-1.5 px-1.5 rounded-md hover:bg-background-tertiary/60 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-text-primary truncate">
                            {t.merchant_name ?? t.description ?? 'Sem descrição'}
                            {t.installment_total && t.installment_total > 1 && (
                              <span className="text-text-muted ml-1">
                                {t.installment_number}/{t.installment_total}
                              </span>
                            )}
                          </p>
                          <p className="text-text-muted text-[10px]">
                            {formatDate(t.date)} · {t.category?.name ?? 'Sem categoria'}
                          </p>
                        </div>
                        <span className="font-mono text-text-primary shrink-0">
                          {formatCurrency(t.amount)}
                        </span>
                        {confirmDeleteId === t.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDeleteTx(t.id)}
                              disabled={deletingId === t.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium transition-colors disabled:opacity-50"
                            >
                              {deletingId === t.id ? '...' : 'Excluir'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] px-1.5 py-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                            <button
                              onClick={() => setEditingTx(t)}
                              className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                              aria-label="Editar"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="p-1 rounded text-text-muted hover:text-expense transition-colors"
                              aria-label="Excluir"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagamentos */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">
                  Pagamentos ({payments.length})
                </p>
                {payments.length === 0 ? (
                  <p className="text-text-muted text-xs">Sem pagamentos ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 py-1 text-xs"
                      >
                        <span className="text-text-secondary">
                          {new Date(p.paid_at + 'T00:00:00').toLocaleDateString(
                            'pt-BR',
                            { day: '2-digit', month: 'short' },
                          )}
                        </span>
                        <span className="font-mono text-income">
                          -{formatCurrency(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/40">
                  <span className="text-xs text-text-muted">Restante</span>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold',
                      remaining > 0 ? 'text-expense' : 'text-income',
                    )}
                  >
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>

              {invoice.status !== 'paid' && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="btn-primary text-xs py-1.5 w-full"
                >
                  Registrar pagamento
                </button>
              )}
            </>
          )}
        </div>
      )}

      {showPayment && (
        <PaymentModal
          card={card}
          invoice={invoice}
          remainingAmount={remaining}
          onClose={() => setShowPayment(false)}
          onCreated={handlePaymentCreated}
        />
      )}

      {editingTx && (
        <TransactionFormModal transaction={editingTx} onClose={handleEditModalClose} />
      )}
    </div>
  )
}
