import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { CardInvoice, CreditCard } from '@/types'
import { cardsService } from '@/services'
import {
  useAuthStore,
  useTransactionStore,
  useCardsStore,
  useAccountsStore,
} from '@/store'
import { parseAmount, todayISO, formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface PaymentModalProps {
  card: CreditCard
  invoice: CardInvoice
  remainingAmount: number
  onClose: () => void
  onCreated: (invoice: CardInvoice) => void
}

export function PaymentModal({
  card,
  invoice,
  remainingAmount,
  onClose,
  onCreated,
}: PaymentModalProps) {
  const { user } = useAuthStore()
  const { categories, addTransaction } = useTransactionStore()
  const { upsertInvoice } = useCardsStore()
  const { accounts, defaultAccountId } = useAccountsStore()
  const isThird = card.owner_type === 'third_party'
  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts])

  const [amountStr, setAmountStr] = useState(
    remainingAmount > 0 ? String(remainingAmount).replace('.', ',') : '',
  )
  const [paidAt, setPaidAt] = useState(todayISO())
  const [reimburse, setReimburse] = useState(isThird) // por padrão reembolsa
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId ?? '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense' || c.type === 'both'),
    [categories],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const createsTransaction = !isThird || reimburse

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const amount = parseAmount(amountStr)
    if (amount <= 0) return setError('Informe um valor maior que zero.')
    if (!paidAt) return setError('Informe uma data.')

    setSaving(true)
    setError(null)
    try {
      const result = await cardsService.registerPayment(user.id, card, invoice, {
        amount,
        paid_at: paidAt,
        reimburse: isThird ? reimburse : false,
        category_id: createsTransaction ? categoryId || null : null,
        account_id: createsTransaction ? accountId || null : null,
        notes: notes.trim() || null,
      })
      if (result.transaction) addTransaction(result.transaction)
      upsertInvoice(result.invoice)
      onCreated(result.invoice)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md card-elevated shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Registrar pagamento
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 rounded"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-text-secondary text-sm mb-4">
          Fatura <span className="font-mono">{invoice.reference_month}</span> ·{' '}
          {card.name}
          {remainingAmount > 0 ? (
            <>
              {' · '}
              <span className="text-expense font-mono">
                {formatCurrency(remainingAmount)}
              </span>{' '}
              restante
            </>
          ) : (
            <span className="text-income"> · quitada</span>
          )}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Valor</label>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="input-base w-full font-mono"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Data</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          {isThird && (
            <label className="flex items-start gap-2 cursor-pointer select-none p-3 rounded-lg bg-background-tertiary/50 border border-border">
              <input
                type="checkbox"
                checked={reimburse}
                onChange={(e) => setReimburse(e.target.checked)}
                className="accent-accent mt-0.5"
              />
              <div>
                <p className="text-sm text-text-primary">
                  Reembolsar {card.owner_name?.split(' ')[0] ?? 'o dono'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Gera transação de saída do seu caixa no valor pago. Desmarque
                  se o pagamento não sai do seu dinheiro.
                </p>
              </div>
            </label>
          )}

          {createsTransaction && (
            <>
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  Sai da conta
                </label>
                {activeAccounts.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    Sem contas cadastradas. Crie uma em <span className="font-mono">/accounts</span>.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activeAccounts.map((a) => {
                      const selected = accountId === a.id
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setAccountId(a.id)}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded-md font-medium transition-colors border',
                            selected
                              ? 'text-white border-transparent'
                              : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
                          )}
                          style={selected ? { backgroundColor: a.color ?? '#7B1E3A' } : undefined}
                        >
                          {a.name}
                          {typeof a.balance === 'number' && (
                            <span className={cn('ml-1.5 font-mono opacity-70', selected ? 'text-white' : 'text-text-muted')}>
                              {formatCurrency(a.balance)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">
                  Categoria da despesa (opcional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-base w-full"
                >
                  <option value="">Sem categoria</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-text-muted mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações..."
              className="input-base w-full resize-none"
            />
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}

          {!createsTransaction && (
            <p className="text-[11px] text-text-muted">
              Sem reembolso: vai marcar como pago na fatura sem mexer no seu caixa.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={cn('btn-ghost text-sm')}
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
