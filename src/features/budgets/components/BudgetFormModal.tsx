import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Budget, BudgetFormData } from '@/types'
import { budgetsService } from '@/services'
import { useAuthStore, useTransactionStore, useBudgetsStore } from '@/store'
import { parseAmount } from '@/utils'

interface BudgetFormModalProps {
  budget: Budget | null
  month: number
  year: number
  onClose: () => void
}

export function BudgetFormModal({ budget, month, year, onClose }: BudgetFormModalProps) {
  const { user } = useAuthStore()
  const { categories } = useTransactionStore()
  const { budgets, addBudget, updateBudget } = useBudgetsStore()
  const isEdit = budget !== null

  const [categoryId, setCategoryId] = useState(budget?.category_id ?? '')
  const [amount, setAmount] = useState(
    budget ? String(budget.amount).replace('.', ',') : '',
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

  const availableCategories = useMemo(() => {
    const orcadas = new Set(budgets.map((b) => b.category_id))
    return categories.filter(
      (c) => c.type !== 'income' && (isEdit ? c.id === budget?.category_id || !orcadas.has(c.id) : !orcadas.has(c.id)),
    )
  }, [categories, budgets, isEdit, budget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const amountNum = parseAmount(amount)
    if (amountNum <= 0) return setError('Informe um valor maior que zero.')
    if (!categoryId) return setError('Escolha uma categoria.')

    setSaving(true)
    setError(null)
    try {
      if (isEdit && budget) {
        const updated = await budgetsService.update(budget.id, amountNum)
        updateBudget(updated)
      } else {
        const payload: BudgetFormData = {
          category_id: categoryId,
          amount: String(amountNum),
          month,
          year,
        }
        const created = await budgetsService.create(user.id, payload)
        addBudget(created)
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
            {isEdit ? 'Editar orçamento' : 'Novo orçamento'}
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
            <label className="block text-xs text-text-muted mb-1">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-base w-full"
              disabled={isEdit}
            >
              <option value="">Escolher categoria</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!isEdit && availableCategories.length === 0 && (
              <p className="text-xs text-text-muted mt-1">
                Todas as categorias de despesa já têm orçamento neste mês.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Limite mensal</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="input-base w-full font-mono text-lg"
              autoFocus
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
