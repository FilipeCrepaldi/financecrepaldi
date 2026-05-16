import type { Transaction } from '@/types'

export type Period = '1m' | '3m' | '6m' | '1y'

export const PERIOD_LABELS: Record<Period, string> = {
  '1m': 'Mês',
  '3m': '3 meses',
  '6m': '6 meses',
  '1y': '1 ano',
}

export function periodToRange(period: Period): { from: string; to: string } {
  const now = new Date()
  const to = isoDate(now)
  const start = new Date(now)
  switch (period) {
    case '1m':
      start.setMonth(start.getMonth() - 1)
      break
    case '3m':
      start.setMonth(start.getMonth() - 3)
      break
    case '6m':
      start.setMonth(start.getMonth() - 6)
      break
    case '1y':
      start.setFullYear(start.getFullYear() - 1)
      break
  }
  return { from: isoDate(start), to }
}

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface CategorySlice {
  categoryId: string
  name: string
  color: string
  amount: number
  percent: number
}

export function aggregateByCategory(transactions: Transaction[]): CategorySlice[] {
  const map = new Map<string, { name: string; color: string; amount: number }>()
  let total = 0

  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const id = t.category_id ?? '_none'
    const cur = map.get(id)
    if (cur) {
      cur.amount += t.amount
    } else {
      map.set(id, {
        name: t.category?.name ?? 'Sem categoria',
        color: t.category?.color ?? '#6b7280',
        amount: t.amount,
      })
    }
    total += t.amount
  }

  return Array.from(map.entries())
    .map(([categoryId, v]) => ({
      categoryId,
      name: v.name,
      color: v.color,
      amount: v.amount,
      percent: total > 0 ? (v.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export interface MonthlyPoint {
  month: string
  label: string
  income: number
  expense: number
  balance: number
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function aggregateByMonth(
  transactions: Transaction[],
  monthsBack: number,
): MonthlyPoint[] {
  const now = new Date()
  const buckets = new Map<string, MonthlyPoint>()

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, {
      month: key,
      label: MONTH_LABELS[d.getMonth()],
      income: 0,
      expense: 0,
      balance: 0,
    })
  }

  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    const b = buckets.get(key)
    if (!b) continue
    if (t.type === 'income') b.income += t.amount
    else if (t.type === 'expense') b.expense += t.amount
  }

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    balance: b.income - b.expense,
  }))
}

export interface WeekdayCell {
  weekday: number
  label: string
  amount: number
  count: number
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function aggregateByWeekday(transactions: Transaction[]): WeekdayCell[] {
  const cells: WeekdayCell[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    amount: 0,
    count: 0,
  }))

  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const d = new Date(t.date + 'T00:00:00')
    const w = d.getDay()
    cells[w].amount += t.amount
    cells[w].count += 1
  }

  return cells
}

export interface MerchantEntry {
  name: string
  amount: number
  count: number
}

export function topMerchants(transactions: Transaction[], n = 5): MerchantEntry[] {
  const map = new Map<string, MerchantEntry>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.merchant_name) continue
    const key = t.merchant_name
    const cur = map.get(key)
    if (cur) {
      cur.amount += t.amount
      cur.count += 1
    } else {
      map.set(key, { name: key, amount: t.amount, count: 1 })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
}

export interface TagEntry {
  id: string
  name: string
  color: string
  amount: number
  count: number
  percent: number
}

export function aggregateByTag(transactions: Transaction[]): TagEntry[] {
  const map = new Map<string, TagEntry>()
  let total = 0
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.tags || t.tags.length === 0) continue
    total += t.amount
    for (const tag of t.tags) {
      const cur = map.get(tag.id)
      if (cur) {
        cur.amount += t.amount
        cur.count += 1
      } else {
        map.set(tag.id, {
          id: tag.id,
          name: tag.name,
          color: tag.color ?? '#7c6af7',
          amount: t.amount,
          count: 1,
          percent: 0,
        })
      }
    }
  }
  const entries = Array.from(map.values())
  for (const e of entries) e.percent = total > 0 ? (e.amount / total) * 100 : 0
  return entries.sort((a, b) => b.amount - a.amount)
}

export interface StabilityScore {
  score: number
  committedPercent: number
  variationPercent: number
  impulsePercent: number
  trend: 'up' | 'down' | 'flat'
}

/**
 * Calcula score 0-100 baseado em três sinais:
 *  - Comprometido: % da receita comprometida com despesas fixas (recurrence_id)
 *  - Variação: variação absoluta da despesa vs período anterior equivalente
 *  - Impulso: % da despesa marcada com tag "impulso"
 *
 * Cada componente vira sub-score 0-100, depois média ponderada.
 */
export function calculateStabilityScore(
  transactions: Transaction[],
  periodDays: number,
): StabilityScore {
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - periodDays)
  const prevStart = new Date(periodStart)
  prevStart.setDate(prevStart.getDate() - periodDays)

  let income = 0
  let expense = 0
  let fixed = 0
  let impulse = 0
  let prevExpense = 0

  for (const t of transactions) {
    const d = new Date(t.date + 'T00:00:00')
    const inCurrent = d >= periodStart && d <= now
    const inPrev = d >= prevStart && d < periodStart

    if (inCurrent) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') {
        expense += t.amount
        if (t.recurrence_id) fixed += t.amount
        if (t.tags?.some((tg) => tg.name.toLowerCase() === 'impulso')) {
          impulse += t.amount
        }
      }
    } else if (inPrev) {
      if (t.type === 'expense') prevExpense += t.amount
    }
  }

  const committedPercent = income > 0 ? (fixed / income) * 100 : 0
  const variationPercent =
    prevExpense > 0
      ? (Math.abs(expense - prevExpense) / prevExpense) * 100
      : 0
  const impulsePercent = expense > 0 ? (impulse / expense) * 100 : 0

  // Sub-scores (mais alto = melhor)
  const scoreCommit = Math.max(0, 100 - committedPercent)
  const scoreVar = Math.max(0, 100 - Math.min(100, variationPercent))
  // Impulso pesa mais — amplificamos
  const scoreImpulse = Math.max(0, 100 - Math.min(100, impulsePercent * 3))

  const score = Math.round(scoreCommit * 0.4 + scoreVar * 0.3 + scoreImpulse * 0.3)

  const trend: 'up' | 'down' | 'flat' =
    prevExpense === 0
      ? 'flat'
      : expense < prevExpense * 0.95
        ? 'down'
        : expense > prevExpense * 1.05
          ? 'up'
          : 'flat'

  return {
    score: Math.max(0, Math.min(100, score)),
    committedPercent: Math.round(committedPercent),
    variationPercent: Math.round(variationPercent),
    impulsePercent: Math.round(impulsePercent),
    trend,
  }
}

export function periodDays(period: Period): number {
  switch (period) {
    case '1m':
      return 30
    case '3m':
      return 90
    case '6m':
      return 180
    case '1y':
      return 365
  }
}

export function periodMonthsBack(period: Period): number {
  switch (period) {
    case '1m':
      return 1
    case '3m':
      return 3
    case '6m':
      return 6
    case '1y':
      return 12
  }
}
