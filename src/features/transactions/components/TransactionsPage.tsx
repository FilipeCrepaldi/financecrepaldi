import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuthStore, useTransactionStore } from '@/store'
import { transactionsService } from '@/services'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { TransactionFilters, type TypeFilter } from './TransactionFilters'
import { TransactionList } from './TransactionList'
import { TransactionFormModal } from './TransactionFormModal'
import { formatCurrency } from '@/utils'
import type { Transaction } from '@/types'

export default function TransactionsPage() {
  const { user } = useAuthStore()
  const {
    transactions,
    categories,
    tags,
    loading,
    selectedMonth,
    selectedYear,
    setMonth,
    fetchTransactions,
    removeTransaction,
  } = useTransactionStore()

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  useEffect(() => {
    if (!user) return
    fetchTransactions(user.id)
  }, [user?.id, selectedMonth, selectedYear]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (categoryFilter && t.category_id !== categoryFilter) return false
      if (tagFilter && !t.tags?.some((tg) => tg.id === tagFilter)) return false
      if (term) {
        const hay = `${t.merchant_name ?? ''} ${t.description ?? ''} ${t.category?.name ?? ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [transactions, typeFilter, categoryFilter, tagFilter, search])

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount
        else if (t.type === 'expense') acc.expense += t.amount
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [filtered])

  const handleDelete = async (id: string) => {
    await transactionsService.delete(id)
    removeTransaction(id)
  }

  const handleEdit = (t: Transaction) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const isFiltered =
    typeFilter !== 'all' || categoryFilter !== '' || tagFilter !== '' || search !== ''

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Transações</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'transação' : 'transações'}
            {isFiltered && transactions.length !== filtered.length && (
              <span className="text-text-muted"> · de {transactions.length} no mês</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector month={selectedMonth} year={selectedYear} onChange={setMonth} />
          <button
            onClick={handleCreate}
            className="btn-primary text-sm py-2 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nova</span>
          </button>
        </div>
      </div>

      {/* Totais do filtro atual */}
      <div className="card flex flex-wrap gap-4 sm:gap-8 text-sm">
        <div>
          <p className="text-text-muted text-xs">Receitas</p>
          <p className="text-income font-mono font-medium mt-0.5">
            +{formatCurrency(totals.income)}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Despesas</p>
          <p className="text-expense font-mono font-medium mt-0.5">
            -{formatCurrency(totals.expense)}
          </p>
        </div>
        <div className="sm:ml-auto">
          <p className="text-text-muted text-xs">Saldo</p>
          <p
            className={`font-mono font-medium mt-0.5 ${totals.income - totals.expense >= 0 ? 'text-income' : 'text-expense'}`}
          >
            {formatCurrency(totals.income - totals.expense)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <TransactionFilters
        categories={categories}
        tags={tags}
        typeFilter={typeFilter}
        categoryFilter={categoryFilter}
        tagFilter={tagFilter}
        search={search}
        onTypeChange={setTypeFilter}
        onCategoryChange={setCategoryFilter}
        onTagChange={setTagFilter}
        onSearchChange={setSearch}
      />

      {/* Lista */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            {isFiltered ? (
              <>
                <p className="text-text-muted text-sm">Nenhuma transação encontrada.</p>
                <button
                  onClick={() => {
                    setTypeFilter('all')
                    setCategoryFilter('')
                    setTagFilter('')
                    setSearch('')
                  }}
                  className="text-xs text-accent hover:text-accent-hover mt-2 font-medium"
                >
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-text-muted text-sm">Nenhuma transação neste mês.</p>
                <p className="text-text-muted text-xs mt-1">
                  Use o botão <span className="font-mono text-accent">Lançar</span> para adicionar.
                </p>
              </>
            )}
          </div>
        ) : (
          <TransactionList transactions={filtered} onDelete={handleDelete} onEdit={handleEdit} />
        )}
      </div>

      {modalOpen && (
        <TransactionFormModal transaction={editing} onClose={handleCloseModal} />
      )}
    </div>
  )
}
