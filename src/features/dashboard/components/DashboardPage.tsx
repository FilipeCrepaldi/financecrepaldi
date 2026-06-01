import { useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, Zap, CreditCard } from 'lucide-react'
import { useAuthStore, useTransactionStore } from '@/store'
import { transactionsService } from '@/services'
import { formatCurrency, formatMonthYear, currentMonth } from '@/utils'
import { useState } from 'react'
import { UpcomingDueBanner } from '@/features/recurrences/components/UpcomingDueBanner'
import { InsightsBlock } from '@/features/insights/components/InsightsBlock'
import { CardsBlock } from '@/features/cards/components/CardsBlock'
import { FutureCommitments } from '@/features/cards/components/FutureCommitments'
import { AccountsBlock } from '@/features/accounts/components/AccountsBlock'

interface Summary {
  balance: number
  incomeThisMonth: number
  expenseThisMonth: number
  cardCommitted: number
  committedPercent: number
}

export default function DashboardPage() {
  const { user, profile } = useAuthStore()
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
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {firstName ? `Olá, ${firstName}!` : 'Dashboard'}
        </h1>
        <p className="text-text-secondary text-sm mt-0.5 capitalize">
          {formatMonthYear(month, year)}
        </p>
      </div>

      <UpcomingDueBanner />
      <InsightsBlock />
      <AccountsBlock />
      <CardsBlock />
      <FutureCommitments />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs uppercase tracking-wide font-medium">
              Saldo
            </span>
            <div className="w-7 h-7 rounded-lg bg-background-tertiary flex items-center justify-center">
              <Wallet size={14} className="text-text-secondary" />
            </div>
          </div>
          <p className={`text-2xl font-mono font-semibold leading-none ${
            (summary?.balance ?? 0) >= 0 ? 'text-income' : 'text-expense'
          }`}>
            {formatCurrency(summary?.balance ?? 0)}
          </p>
        </div>

        {/* Receitas */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs uppercase tracking-wide font-medium">
              Receitas
            </span>
            <div className="w-7 h-7 rounded-lg bg-income/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-income" />
            </div>
          </div>
          <p className="text-2xl font-mono font-semibold leading-none text-income">
            {formatCurrency(summary?.incomeThisMonth ?? 0)}
          </p>
        </div>

        {/* Despesas */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs uppercase tracking-wide font-medium">
              Despesas
            </span>
            <div className="w-7 h-7 rounded-lg bg-expense/10 flex items-center justify-center">
              <TrendingDown size={14} className="text-expense" />
            </div>
          </div>
          <p className="text-2xl font-mono font-semibold leading-none text-expense">
            {formatCurrency(summary?.expenseThisMonth ?? 0)}
          </p>
        </div>

        {/* Comprometido */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs uppercase tracking-wide font-medium">
              Comprometido
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              (summary?.committedPercent ?? 0) > 80 ? 'bg-expense/10' : 'bg-warning/10'
            }`}>
              <Zap size={14} className={
                (summary?.committedPercent ?? 0) > 80 ? 'text-expense' : 'text-warning'
              } />
            </div>
          </div>
          <p className={`text-2xl font-mono font-semibold leading-none ${
            (summary?.committedPercent ?? 0) > 80 ? 'text-expense' : 'text-text-primary'
          }`}>
            {summary?.committedPercent ?? 0}%
          </p>
          <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (summary?.committedPercent ?? 0) > 80 ? 'bg-expense' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(summary?.committedPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Transações recentes */}
      <div className="card">
        <h2 className="text-text-primary font-medium mb-4 text-sm uppercase tracking-wide">
          Transações recentes
        </h2>

        {recent.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm">Nenhuma transação ainda.</p>
            <p className="text-text-muted text-xs mt-1">
              Use{' '}
              <span className="font-mono text-accent">Lançar</span>{' '}
              para adicionar.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm truncate">
                    {t.merchant_name ?? t.description ?? 'Sem descrição'}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1.5">
                    <span>{t.category?.name ?? 'Sem categoria'}</span>
                    <span>·</span>
                    <span>{t.date}</span>
                    {t.card_id && <CreditCard size={10} className="text-text-muted" />}
                  </p>
                </div>
                <span className={`font-mono font-medium text-sm ${
                  t.type === 'income' ? 'text-income' : 'text-expense'
                }`}>
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
