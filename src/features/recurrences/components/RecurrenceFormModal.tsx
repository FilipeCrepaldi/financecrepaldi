import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Recurrence, RecurrenceFrequency } from '@/types'
import { recurrencesService, type RecurrenceFormData } from '@/services'
import { useAuthStore, useTransactionStore, useRecurrencesStore } from '@/store'
import { parseAmount, todayISO } from '@/utils'

interface RecurrenceFormModalProps {
  recurrence: Recurrence | null
  initial?: Partial<RecurrenceFormData>
  onClose: () => void
}

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'daily', label: 'Diária' },
]

export function RecurrenceFormModal({
  recurrence,
  initial,
  onClose,
}: RecurrenceFormModalProps) {
  const { user } = useAuthStore()
  const { categories } = useTransactionStore()
  const { addRecurrence, updateRecurrence } = useRecurrencesStore()
  const isEdit = recurrence !== null

  const [name, setName] = useState(recurrence?.name ?? initial?.name ?? '')
  const [merchant, setMerchant] = useState(
    recurrence?.merchant_name ?? initial?.merchant_name ?? '',
  )
  const [amount, setAmount] = useState(
    recurrence
      ? String(recurrence.amount).replace('.', ',')
      : initial?.amount ?? '',
  )
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    recurrence?.frequency ?? initial?.frequency ?? 'monthly',
  )
  const [nextDue, setNextDue] = useState(
    recurrence?.next_due_date ?? initial?.next_due_date ?? todayISO(),
  )
  const [categoryId, setCategoryId] = useState(
    recurrence?.category_id ?? initial?.category_id ?? '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const amountNum = parseAmount(amount)
    if (!name.trim()) return setError('Informe um nome.')
    if (amountNum <= 0) return setError('Informe um valor maior que zero.')
    if (!nextDue) return setError('Informe a próxima data.')

    setSaving(true)
    setError(null)
    try {
      if (isEdit && recurrence) {
        const updated = await recurrencesService.update(recurrence.id, {
          name: name.trim(),
          merchant_name: merchant.trim(),
          amount: amountNum,
          frequency,
          next_due_date: nextDue,
          category_id: categoryId,
        })
        updateRecurrence(updated)
      } else {
        const created = await recurrencesService.create(user.id, {
          name: name.trim(),
          merchant_name: merchant.trim(),
          amount: String(amountNum),
          frequency,
          next_due_date: nextDue,
          category_id: categoryId,
        })
        addRecurrence(created)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Editar recorrência' : 'Nova recorrência'}
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
          <div>
            <label className="block text-xs text-text-muted mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Netflix, aluguel, salário…"
              className="input-base w-full"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Valor</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="input-base w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Próximo vencimento</label>
              <input
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Frequência</label>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    frequency === f.value
                      ? 'bg-accent text-white'
                      : 'bg-background-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-base w-full"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Estabelecimento (opcional)
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Usado para detectar transações similares"
              className="input-base w-full"
            />
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}
        </div>

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
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
