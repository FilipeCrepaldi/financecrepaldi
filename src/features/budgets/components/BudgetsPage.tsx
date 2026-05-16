import { useEffect, useMemo, useState } from 'react'
import { Plus, Copy } from 'lucide-react'
import { useAuthStore, useBudgetsStore, useTransactionStore } from '@/store'
import { budgetsService } from '@/services'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { BudgetCard } from './BudgetCard'
import { BudgetFormModal } from './BudgetFormModal'
import { formatCurrency, currentMonth } from '@/utils'
import type { Budget } from '@/types'

export default function BudgetsPage() {
  const { user } = useAuthStore()
  const {
    budgets,
    loading,
    selectedMonth,
    selectedYear,
    setMonth,
    fetchBudgets,
    addBudgets,
    removeBudget,
  } = useBudgetsStore()
  const {
    transactions,
    selectedMonth: txMonth,
    selectedYear: txYear,
    setMonth: setTxMonth,
    fetchTransactions,
  } = useTransactionStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [copying, setCopying] = useState(false)

  // Sincroniza o mês de transactions com o de budgets para reuso
  useEffect(() => {
    if (!user) return
    if (selectedMonth !== txMonth || selectedYear !== txYear) {
      setTxMonth(selectedMonth, selectedYear)
    }
  }, [selectedMonth, selectedYear]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    fetchBudgets(user.id)
    fetchTransactions(user.id)
  }, [user?.id, selectedMonth, selectedYear]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mapa de gasto por categoria (no mês selecionado, só despesas)
  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.category_id) continue
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
    }
    return map
  }, [transactions])

  const totals = useMemo(() => {
    const budgeted = budgets.reduce((s, b) => s + b.amount, 0)
    const spent = budgets.reduce(
      (s, b) => s + (spentByCategory.get(b.category_id) ?? 0),
      0,
    )
    return { budgeted, spent }
  }, [budgets, spentByCategory])

  // Dias restantes — só faz sentido se o mês selecionado for o atual
  const daysRemaining = useMemo(() => {
    const now = currentMonth()
    if (now.month !== selectedMonth || now.year !== selectedYear) return null
    const last = new Date(selectedYear, selectedMonth, 0).getDate()
    const today = new Date().getDate()
    return Math.max(last - today, 0)
  }, [selectedMonth, selectedYear])

  const handleEdit = (b: Budget) => {
    setEditing(b)
    setModalOpen(true)
  }

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    await budgetsService.delete(id)
    removeBudget(id)
  }

  const handleCopyPrevious = async () => {
    if (!user) return
    setCopying(true)
    try {
      const prev =
        selectedMonth === 1
          ? { month: 12, year: selectedYear - 1 }
          : { month: selectedMonth - 1, year: selectedYear }
      const created = await budgetsService.copyFromMonth(
        user.id,
        prev.month,
        prev.year,
        selectedMonth,
        selectedYear,
      )
      if (created.length > 0) addBudgets(created)
    } finally {
      setCopying(false)
    }
  }

  const isEmpty = !loading && budgets.length === 0
  const totalPercent = totals.budgeted > 0 ? (totals.spent / totals.budgeted) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Orçamentos</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {budgets.length} {budgets.length === 1 ? 'categoria orçada' : 'categorias orçadas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector month={selectedMonth} year={selectedYear} onChange={setMonth} />
          <button
            onClick={handleNew}
            className="btn-primary text-sm py-2 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Orçar</span>
          </button>
        </div>
      </div>

      {/* Resumo agregado */}
      {budgets.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
            <div>
              <p className="text-text-muted text-xs">Total gasto</p>
              <p className="font-mono text-xl font-semibold text-text-primary mt-0.5">
                {formatCurrency(totals.spent)}
                <span className="text-text-muted text-sm font-normal">
                  {' / '}
                  {formatCurrency(totals.budgeted)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs">Geral</p>
              <p
                className={`font-mono text-xl font-semibold mt-0.5 ${
                  totalPercent >= 100
                    ? 'text-expense'
                    : totalPercent >= 80
                      ? 'text-warning'
                      : 'text-text-primary'
                }`}
              >
                {Math.round(totalPercent)}%
              </p>
            </div>
          </div>
          <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalPercent >= 100
                  ? 'bg-expense'
                  : totalPercent >= 80
                    ? 'bg-warning'
                    : 'bg-accent'
              }`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : isEmpty ? (
        <div className="card text-center py-12">
          <p className="text-text-primary font-medium">Nenhum orçamento neste mês</p>
          <p className="text-text-muted text-sm mt-1 mb-5">
            Defina limites por categoria para acompanhar seus gastos.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={handleNew} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14} />
              Orçar categoria
            </button>
            <button
              onClick={handleCopyPrevious}
              disabled={copying}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              <Copy size={14} />
              {copying ? 'Copiando...' : 'Copiar do mês anterior'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              spent={spentByCategory.get(b.category_id) ?? 0}
              daysRemaining={daysRemaining}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <BudgetFormModal
          budget={editing}
          month={selectedMonth}
          year={selectedYear}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
