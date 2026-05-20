import { useEffect, useMemo, useState } from 'react'
import { X, Repeat, CreditCard, Wallet } from 'lucide-react'
import type { Transaction, TransactionType, TransactionFormData } from '@/types'
import {
  transactionsService,
  tagsService,
  recurrencesService,
  cardsService,
  advanceDate,
} from '@/services'
import {
  useAuthStore,
  useTransactionStore,
  useRecurrencesStore,
  useCardsStore,
  useAccountsStore,
} from '@/store'
import { todayISO, parseAmount, formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'
import { MerchantCombobox } from '@/components/shared/MerchantCombobox'

interface RecurrenceSuggestion {
  merchant: string
  amount: number
  categoryId: string | null
  date: string
}

interface TransactionFormModalProps {
  transaction: Transaction | null
  onClose: () => void
}

const emptyForm: TransactionFormData = {
  type: 'expense',
  amount: '',
  description: '',
  merchant_name: '',
  merchant_id: '',
  category_id: '',
  card_id: '',
  account_id: '',
  installment_total: 1,
  date: todayISO(),
  notes: '',
  tags: [],
}

export function TransactionFormModal({ transaction, onClose }: TransactionFormModalProps) {
  const { user } = useAuthStore()
  const { categories, tags, addTransaction, updateTransaction } = useTransactionStore()
  const { addRecurrence } = useRecurrencesStore()
  const { cards } = useCardsStore()
  const { accounts, defaultAccountId, setDefaultAccount } = useAccountsStore()
  const isEdit = transaction !== null

  const activeCards = useMemo(() => cards.filter((c) => c.is_active), [cards])
  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts])

  const [form, setForm] = useState<TransactionFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<RecurrenceSuggestion | null>(null)
  const [creatingRec, setCreatingRec] = useState(false)

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount).replace('.', ','),
        description: transaction.description ?? '',
        merchant_name: transaction.merchant_name ?? '',
        merchant_id: transaction.merchant_id ?? '',
        category_id: transaction.category_id ?? '',
        card_id: transaction.card_id ?? '',
        account_id: transaction.account_id ?? '',
        installment_total: transaction.installment_total ?? 1,
        date: transaction.date,
        notes: transaction.notes ?? '',
        tags: transaction.tags?.map((t) => t.id) ?? [],
      })
    } else {
      setForm({ ...emptyForm, account_id: defaultAccountId ?? '' })
    }
  }, [transaction])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const availableCategories = useMemo(() => {
    return categories.filter((c) => c.type === form.type || c.type === 'both')
  }, [categories, form.type])

  const update = <K extends keyof TransactionFormData>(key: K, value: TransactionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleTypeChange = (type: TransactionType) => {
    setForm((prev) => {
      const current = categories.find((c) => c.id === prev.category_id)
      const keepCategory = current && (current.type === type || current.type === 'both')
      return { ...prev, type, category_id: keepCategory ? prev.category_id : '' }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const amountNum = parseAmount(form.amount)
    if (amountNum <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (!form.date) {
      setError('Informe uma data.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload: TransactionFormData = { ...form, amount: String(amountNum) }
      const category = categories.find((c) => c.id === form.category_id)
      const selectedTags = tags.filter((tg) => form.tags.includes(tg.id))

      // Se pago no cartão, aloca em fatura automaticamente antes de salvar
      let invoiceId: string | null = null
      if (form.card_id && form.type === 'expense') {
        const card = activeCards.find((c) => c.id === form.card_id)
        if (card) {
          const invoice = await cardsService.getOrCreateInvoiceForDate(card, form.date)
          invoiceId = invoice.id
        }
      }

      if (isEdit && transaction) {
        const updated = await transactionsService.update(transaction.id, payload)
        const oldTagIds = transaction.tags?.map((t) => t.id) ?? []
        await tagsService.syncTransactionTags(transaction.id, form.tags, oldTagIds)
        if (invoiceId) await cardsService.recalculateTotal(invoiceId)
        if (transaction.invoice_id && transaction.invoice_id !== invoiceId) {
          await cardsService.recalculateTotal(transaction.invoice_id)
        }
        updateTransaction({
          ...transaction,
          ...updated,
          category,
          tags: selectedTags,
        })
      } else if (form.card_id && form.installment_total > 1 && form.type === 'expense') {
        // Compra parcelada no cartão — gera N transações, cada uma na fatura do mês
        const card = activeCards.find((c) => c.id === form.card_id)
        if (!card) throw new Error('Cartão inválido.')
        const installments = await transactionsService.createWithInstallments(
          user.id,
          payload,
          card,
        )
        if (form.tags.length > 0) {
          // Aplica tags em todas as parcelas
          await Promise.all(
            installments.map((tx) =>
              tagsService.syncTransactionTags(tx.id, form.tags, []),
            ),
          )
        }
        installments.forEach((tx) =>
          addTransaction({ ...tx, category, tags: selectedTags }),
        )
        onClose()
        return
      } else {
        const created = await transactionsService.create(user.id, payload, {
          invoice_id: invoiceId,
        })
        if (form.tags.length > 0) {
          await tagsService.syncTransactionTags(created.id, form.tags, [])
        }
        if (invoiceId) await cardsService.recalculateTotal(invoiceId)
        addTransaction({ ...created, category, tags: selectedTags })

        // Auto-detect padrão de recorrência (apenas em despesas com merchant)
        if (form.type === 'expense' && form.merchant_name.trim()) {
          const merchant = form.merchant_name.trim()
          try {
            const [similar, exists] = await Promise.all([
              recurrencesService.detectSimilar(user.id, merchant, created.id),
              recurrencesService.existsForMerchant(user.id, merchant),
            ])
            if (similar >= 2 && !exists) {
              setSuggestion({
                merchant,
                amount: amountNum,
                categoryId: form.category_id || null,
                date: form.date,
              })
              return
            }
          } catch (e) {
            // Falha silenciosa — não bloqueia o fluxo
            console.warn('detect recurrence failed', e)
          }
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateRecurrence = async () => {
    if (!user || !suggestion) return
    setCreatingRec(true)
    try {
      const created = await recurrencesService.create(user.id, {
        name: suggestion.merchant,
        merchant_name: suggestion.merchant,
        amount: String(suggestion.amount),
        frequency: 'monthly',
        next_due_date: advanceDate(suggestion.date, 'monthly'),
        category_id: suggestion.categoryId ?? '',
      })
      addRecurrence(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar recorrência.')
    } finally {
      setCreatingRec(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }))
  }

  if (suggestion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md card-elevated shadow-2xl animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Padrão detectado</h2>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Você já gastou em <span className="text-text-primary font-medium">{suggestion.merchant}</span>{' '}
            várias vezes nos últimos 90 dias. Quer transformar em uma recorrência mensal de{' '}
            <span className="font-mono text-text-primary">{formatCurrency(suggestion.amount)}</span>?
          </p>
          <p className="text-text-muted text-xs mb-5">
            Próximo vencimento: {advanceDate(suggestion.date, 'monthly')}. Você pode ajustar depois.
          </p>
          {error && <p className="text-sm text-expense mb-3">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={creatingRec}
              className="btn-ghost text-sm"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={handleCreateRecurrence}
              disabled={creatingRec}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Repeat size={14} />
              {creatingRec ? 'Criando...' : 'Criar recorrência'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md card-elevated shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Editar transação' : 'Nova transação'}
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

        <div className="space-y-4">
          {/* Tipo */}
          <div className="inline-flex w-full bg-background-tertiary border border-border rounded-lg p-0.5">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-expense text-white'
                      : 'bg-income text-white'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {t === 'expense' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Valor</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              placeholder="0,00"
              className="input-base w-full font-mono text-lg"
              autoFocus={!isEdit}
            />
          </div>

          {/* Estabelecimento */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Estabelecimento</label>
            <MerchantCombobox
              value={form.merchant_id}
              textValue={form.merchant_name}
              placeholder="Buscar ou cadastrar..."
              onChange={(merchantId, merchantName, suggestedCategoryId) => {
                setForm((prev) => {
                  // Se merchant sugere categoria e usuário não escolheu uma compatível, aplica
                  const current = categories.find((c) => c.id === prev.category_id)
                  const compatible =
                    current && (current.type === prev.type || current.type === 'both')
                  const suggested = suggestedCategoryId
                    ? categories.find((c) => c.id === suggestedCategoryId)
                    : null
                  const shouldApplySuggestion =
                    !compatible &&
                    suggested &&
                    (suggested.type === prev.type || suggested.type === 'both')
                  return {
                    ...prev,
                    merchant_id: merchantId,
                    merchant_name: merchantName,
                    category_id: shouldApplySuggestion
                      ? suggestedCategoryId!
                      : prev.category_id,
                  }
                })
              }}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Almoço, gasolina..."
              className="input-base w-full"
            />
          </div>

          {/* Pago com: Caixa / Cartão (apenas para despesas) */}
          {form.type === 'expense' && activeCards.length > 0 && (
            <div>
              <label className="block text-xs text-text-muted mb-1">Pago com</label>
              <div className="inline-flex w-full bg-background-tertiary border border-border rounded-lg p-0.5 mb-2">
                <button
                  type="button"
                  onClick={() => update('card_id', '')}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5',
                    !form.card_id
                      ? 'bg-background-secondary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Wallet size={13} />
                  Caixa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.card_id) update('card_id', activeCards[0].id)
                  }}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5',
                    form.card_id
                      ? 'bg-background-secondary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <CreditCard size={13} />
                  Cartão
                </button>
              </div>
              {form.card_id && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCards.map((c) => {
                      const selected = form.card_id === c.id
                      const isThird = c.owner_type === 'third_party'
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => update('card_id', c.id)}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 border',
                            selected
                              ? 'text-white border-transparent'
                              : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
                          )}
                          style={selected ? { backgroundColor: c.color ?? '#7c6af7' } : undefined}
                        >
                          <span>{c.name}</span>
                          {c.last_digits && (
                            <span className="font-mono opacity-70">··{c.last_digits}</span>
                          )}
                          {isThird && (
                            <span
                              className={cn(
                                'text-[9px] uppercase font-mono px-1 rounded',
                                selected ? 'bg-white/20' : 'bg-warning/20 text-warning',
                              )}
                            >
                              {c.owner_name?.split(' ')[0] ?? '3º'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Parcelamento */}
                  <div className="mt-3">
                    <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1.5">
                      Parcelar em
                    </label>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {[1, 2, 3, 4, 6, 10, 12].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => update('installment_total', n)}
                          className={cn(
                            'text-xs px-2 py-1 rounded-md font-medium transition-colors border',
                            form.installment_total === n
                              ? 'bg-accent text-white border-accent'
                              : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
                          )}
                        >
                          {n === 1 ? 'À vista' : `${n}×`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={36}
                        value={form.installment_total}
                        onChange={(e) =>
                          update('installment_total', Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="input-base text-xs w-16 py-1 font-mono"
                      />
                    </div>
                    {form.installment_total > 1 && parseAmount(form.amount) > 0 && (
                      <p className="text-[11px] text-text-muted mt-1.5">
                        {form.installment_total}× de{' '}
                        <span className="font-mono text-text-primary">
                          {formatCurrency(parseAmount(form.amount) / form.installment_total)}
                        </span>{' '}
                        · distribuído nas próximas {form.installment_total} faturas
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Conta (para receitas sempre, para despesas quando não-cartão) */}
          {!form.card_id && activeAccounts.length > 0 && (
            <div>
              <label className="block text-xs text-text-muted mb-1">
                {form.type === 'income' ? 'Recebido em' : 'Conta'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {activeAccounts.map((a) => {
                  const selected = form.account_id === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        update('account_id', a.id)
                        setDefaultAccount(a.id)
                      }}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-md font-medium transition-colors border',
                        selected
                          ? 'text-white border-transparent'
                          : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
                      )}
                      style={selected ? { backgroundColor: a.color ?? '#7c6af7' } : undefined}
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
            </div>
          )}

          {/* Categoria + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Categoria</label>
              <select
                value={form.category_id}
                onChange={(e) => update('category_id', e.target.value)}
                className="input-base w-full"
              >
                <option value="">Sem categoria</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          {/* Tags comportamentais */}
          {tags.length > 0 && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tg) => {
                  const selected = form.tags.includes(tg.id)
                  return (
                    <button
                      key={tg.id}
                      type="button"
                      onClick={() => toggleTag(tg.id)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        selected
                          ? 'border-transparent text-white font-medium'
                          : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong',
                      )}
                      style={selected ? { backgroundColor: tg.color ?? '#7c6af7' } : undefined}
                    >
                      {tg.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              placeholder="Observações..."
              className="input-base w-full resize-none"
            />
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost text-sm"
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  )
}
