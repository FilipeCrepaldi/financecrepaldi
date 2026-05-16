import { useEffect, useMemo, useState } from 'react'
import { X, Repeat } from 'lucide-react'
import type { Transaction, TransactionType, TransactionFormData } from '@/types'
import { transactionsService, tagsService, recurrencesService, advanceDate } from '@/services'
import { useAuthStore, useTransactionStore, useRecurrencesStore } from '@/store'
import { todayISO, parseAmount, formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

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
  category_id: '',
  date: todayISO(),
  notes: '',
  tags: [],
}

export function TransactionFormModal({ transaction, onClose }: TransactionFormModalProps) {
  const { user } = useAuthStore()
  const { categories, tags, addTransaction, updateTransaction } = useTransactionStore()
  const { addRecurrence } = useRecurrencesStore()
  const isEdit = transaction !== null

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
        category_id: transaction.category_id ?? '',
        date: transaction.date,
        notes: transaction.notes ?? '',
        tags: transaction.tags?.map((t) => t.id) ?? [],
      })
    } else {
      setForm(emptyForm)
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

      if (isEdit && transaction) {
        const updated = await transactionsService.update(transaction.id, payload)
        const oldTagIds = transaction.tags?.map((t) => t.id) ?? []
        await tagsService.syncTransactionTags(transaction.id, form.tags, oldTagIds)
        updateTransaction({
          ...transaction,
          ...updated,
          category,
          tags: selectedTags,
        })
      } else {
        const created = await transactionsService.create(user.id, payload)
        if (form.tags.length > 0) {
          await tagsService.syncTransactionTags(created.id, form.tags, [])
        }
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
            <input
              type="text"
              value={form.merchant_name}
              onChange={(e) => update('merchant_name', e.target.value)}
              placeholder="iFood, Uber, Mercado..."
              className="input-base w-full"
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
