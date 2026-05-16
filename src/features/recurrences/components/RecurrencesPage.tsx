import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  useAuthStore,
  useRecurrencesStore,
  useTransactionStore,
} from '@/store'
import { recurrencesService, recurrenceType } from '@/services'
import { RecurrenceCard } from './RecurrenceCard'
import { RecurrenceFormModal } from './RecurrenceFormModal'
import { RecurrenceCalendar } from './RecurrenceCalendar'
import { formatCurrency } from '@/utils'
import type { Recurrence } from '@/types'

export default function RecurrencesPage() {
  const { user } = useAuthStore()
  const {
    recurrences,
    loading,
    showInactive,
    setShowInactive,
    fetchRecurrences,
    updateRecurrence,
    removeRecurrence,
  } = useRecurrencesStore()
  const { addTransaction, fetchTransactions } = useTransactionStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Recurrence | null>(null)

  useEffect(() => {
    if (!user) return
    fetchRecurrences(user.id)
  }, [user?.id, showInactive]) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const oneDay = 86_400_000

    const overdue: Recurrence[] = []
    const thisWeek: Recurrence[] = []
    const thisMonth: Recurrence[] = []
    const later: Recurrence[] = []
    const paused: Recurrence[] = []

    for (const r of recurrences) {
      if (!r.is_active) {
        paused.push(r)
        continue
      }
      const target = new Date(r.next_due_date + 'T00:00:00')
      const diff = Math.round((target.getTime() - today.getTime()) / oneDay)
      if (diff < 0) overdue.push(r)
      else if (diff <= 7) thisWeek.push(r)
      else if (diff <= 30) thisMonth.push(r)
      else later.push(r)
    }
    return { overdue, thisWeek, thisMonth, later, paused }
  }, [recurrences])

  const totals = useMemo(() => {
    const active = recurrences.filter((r) => r.is_active)
    const monthlyOf = (r: (typeof active)[number]) => {
      switch (r.frequency) {
        case 'daily':
          return r.amount * 30
        case 'weekly':
          return r.amount * 4.33
        case 'monthly':
          return r.amount
        case 'yearly':
          return r.amount / 12
      }
    }
    let income = 0
    let expense = 0
    for (const r of active) {
      if (recurrenceType(r) === 'income') income += monthlyOf(r)
      else expense += monthlyOf(r)
    }
    return { count: active.length, income, expense, net: income - expense }
  }, [recurrences])

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (r: Recurrence) => {
    setEditing(r)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    await recurrencesService.delete(id)
    removeRecurrence(id)
  }

  const handlePay = async (r: Recurrence) => {
    if (!user) return
    const { transaction, recurrence } = await recurrencesService.markAsPaid(
      user.id,
      r,
    )
    updateRecurrence(recurrence)
    addTransaction(transaction)
    // garante que a transação apareça nas demais telas se o usuário trocar de mês
    fetchTransactions(user.id)
  }

  const handleToggleActive = async (r: Recurrence) => {
    const updated = await recurrencesService.update(r.id, {
      is_active: !r.is_active,
    })
    updateRecurrence(updated)
  }

  const isEmpty = !loading && recurrences.length === 0

  const Section = ({ title, items }: { title: string; items: Recurrence[] }) =>
    items.length === 0 ? null : (
      <div>
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
          {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((r) => (
            <RecurrenceCard
              key={r.id}
              recurrence={r}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPay={handlePay}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      </div>
    )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Recorrências</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {totals.count} ativas
            {totals.income > 0 && (
              <>
                {' · '}
                <span className="text-income">+{formatCurrency(totals.income)}</span>
              </>
            )}
            {totals.expense > 0 && (
              <>
                {' · '}
                <span className="text-expense">-{formatCurrency(totals.expense)}</span>
              </>
            )}
            <span className="text-text-muted"> /mês equivalente</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-xs flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-accent"
            />
            Mostrar pausadas
          </label>
          <button
            onClick={handleNew}
            className="btn-primary text-sm py-2 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nova</span>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : isEmpty ? (
        <div className="card text-center py-12">
          <p className="text-text-primary font-medium">Nenhuma recorrência ainda</p>
          <p className="text-text-muted text-sm mt-1 mb-5">
            Cadastre assinaturas, contas fixas e parcelas para acompanhar vencimentos.
          </p>
          <button
            onClick={handleNew}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            Cadastrar primeira
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Section title="Atrasadas" items={grouped.overdue} />
            <Section title="Esta semana" items={grouped.thisWeek} />
            <Section title="Este mês" items={grouped.thisMonth} />
            <Section title="Mais tarde" items={grouped.later} />
            <Section title="Pausadas" items={grouped.paused} />
          </div>
          <div>
            <RecurrenceCalendar recurrences={recurrences} />
          </div>
        </div>
      )}

      {modalOpen && (
        <RecurrenceFormModal recurrence={editing} onClose={handleClose} />
      )}
    </div>
  )
}
