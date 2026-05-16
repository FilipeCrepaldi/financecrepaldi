import { useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, Zap } from 'lucide-react'
import { useAuthStore, useTransactionStore } from '@/store'
import { transactionsService } from '@/services'
import { formatCurrency, formatMonthYear, currentMonth } from '@/utils'
import { useState } from 'react'
import { UpcomingDueBanner } from '@/features/recurrences/components/UpcomingDueBanner'

interface Summary {
  balance: number
  incomeThisMonth: number
  expenseThisMonth: number
  committedPercent: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { transactions, fetchTransactions } = useTransactionStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const { month, year } = currentMonth()

  useEffect(() => {
    if (!user) return
    fetchTransactions(user.id)
    transactionsService
      .getSummary(user.id, month, year)
      .then(setSummary)
      .catch(console.error)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const recent = transactions.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          {formatMonthYear(month, year)}
        </p>
      </div>

      <UpcomingDueBanner />

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-muted text-sm">Saldo</span>
            <Wallet size={16} className="text-text-muted" />
          </div>
          <p className={`text-2xl font-mono font-semibold ${(summary?.balance ?? 0) >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(summary?.balance ?? 0)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-muted text-sm">Receitas</span>
            <TrendingUp size={16} className="text-income" />
          </div>
          <p className="text-2xl font-mono font-semibold text-income">
            {formatCurrency(summary?.incomeThisMonth ?? 0)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-muted text-sm">Despesas</span>
            <TrendingDown size={16} className="text-expense" />
          </div>
          <p className="text-2xl font-mono font-semibold text-expense">
            {formatCurrency(summary?.expenseThisMonth ?? 0)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-muted text-sm">Comprometido</span>
            <Zap size={16} className="text-warning" />
          </div>
          <p className={`text-2xl font-mono font-semibold ${(summary?.committedPercent ?? 0) > 80 ? 'text-expense' : 'text-text-primary'}`}>
            {summary?.committedPercent ?? 0}%
          </p>
          <div className="mt-2 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${(summary?.committedPercent ?? 0) > 80 ? 'bg-expense' : 'bg-accent'}`}
              style={{ width: `${Math.min(summary?.committedPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Transações recentes */}
      <div className="card">
        <h2 className="text-text-primary font-medium mb-4">Transações recentes</h2>

        {recent.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">Nenhuma transação ainda.</p>
            <p className="text-text-muted text-xs mt-1">
              Use o botão <span className="font-mono text-accent">Lançar</span> para adicionar.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm truncate">
                    {t.merchant_name ?? t.description ?? 'Sem descrição'}
                  </p>
                  <p className="text-text-muted text-xs">
                    {t.category?.name ?? 'Sem categoria'} · {t.date}
                  </p>
                </div>
                <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
