import { useEffect, useMemo, useState } from 'react'
import { Wallet, CreditCard } from 'lucide-react'
import { useAuthStore, useCardsStore } from '@/store'
import { transactionsService } from '@/services'
import type { Transaction } from '@/types'
import { cn } from '@/lib/utils'
import { PeriodSelector } from './PeriodSelector'
import { StabilityScoreCard } from './StabilityScoreCard'
import { CategoryPie } from './CategoryPie'
import { MonthlyTrend } from './MonthlyTrend'
import { WeekdayHeatmap } from './WeekdayHeatmap'
import { TopMerchantsTags } from './TopMerchantsTags'
import {
  aggregateByCategory,
  aggregateByMonth,
  aggregateByTag,
  aggregateByWeekday,
  calculateStabilityScore,
  isoDate,
  periodDays,
  periodMonthsBack,
  periodToRange,
  topMerchants,
  type Period,
} from '../utils/aggregations'

type SourceFilter = 'all' | 'cash' | string // string = card_id específico

export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const { cards } = useCardsStore()
  const [period, setPeriod] = useState<Period>('3m')
  const [source, setSource] = useState<SourceFilter>('all')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCards = useMemo(() => cards.filter((c) => c.is_active), [cards])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { from, to } = periodToRange(period)
        // Para o "score" precisamos do dobro do período (atual + anterior)
        const days = periodDays(period)
        const extendedFrom = new Date(from + 'T00:00:00')
        extendedFrom.setDate(extendedFrom.getDate() - days)
        const data = await transactionsService.list(user.id, {
          from: isoDate(extendedFrom),
          to,
        })
        if (!cancelled) setTransactions(data)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, period])

  // Aplica filtro de fonte (Todos / Só caixa / cartão específico)
  const sourceFiltered = useMemo(() => {
    if (source === 'all') return transactions
    if (source === 'cash') return transactions.filter((t) => !t.card_id)
    return transactions.filter((t) => t.card_id === source)
  }, [transactions, source])

  // Filtra para o período atual (sem o extra do score)
  const inPeriod = useMemo(() => {
    const { from } = periodToRange(period)
    return sourceFiltered.filter((t) => t.date >= from)
  }, [sourceFiltered, period])

  const categoryData = useMemo(() => aggregateByCategory(inPeriod), [inPeriod])
  const monthlyData = useMemo(
    () => aggregateByMonth(sourceFiltered, periodMonthsBack(period)),
    [sourceFiltered, period],
  )
  const weekdayData = useMemo(() => aggregateByWeekday(inPeriod), [inPeriod])
  const merchantData = useMemo(() => topMerchants(inPeriod, 5), [inPeriod])
  const tagData = useMemo(() => aggregateByTag(inPeriod), [inPeriod])
  const score = useMemo(
    () => calculateStabilityScore(sourceFiltered, periodDays(period)),
    [sourceFiltered, period],
  )

  const hasData = inPeriod.length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {hasData
              ? `${inPeriod.length} transações no período`
              : 'Sem transações no período'}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Filtro de fonte */}
      {activeCards.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSource('all')}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md font-medium transition-colors border',
              source === 'all'
                ? 'bg-accent text-white border-accent'
                : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
            )}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setSource('cash')}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 border',
              source === 'cash'
                ? 'bg-accent text-white border-accent'
                : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
            )}
          >
            <Wallet size={11} /> Caixa
          </button>
          {activeCards.map((c) => {
            const selected = source === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSource(c.id)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 border',
                  selected
                    ? 'text-white border-transparent'
                    : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
                )}
                style={selected ? { backgroundColor: c.color ?? '#7c6af7' } : undefined}
              >
                <CreditCard size={11} />
                {c.name}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="card border border-expense/40 bg-expense/5">
          <p className="text-expense text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : !hasData ? (
        <div className="card text-center py-12">
          <p className="text-text-primary font-medium">Nenhum dado no período</p>
          <p className="text-text-muted text-sm mt-1">
            Lance transações ou aumente o intervalo para ver insights.
          </p>
        </div>
      ) : (
        <>
          <StabilityScoreCard score={score} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <MonthlyTrend data={monthlyData} />
            <CategoryPie data={categoryData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <WeekdayHeatmap data={weekdayData} />
            <TopMerchantsTags merchants={merchantData} tags={tagData} />
          </div>
        </>
      )}
    </div>
  )
}
