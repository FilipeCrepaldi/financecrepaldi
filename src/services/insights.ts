import { supabase } from './supabase'
import { budgetsService } from './budgets'
import { recurrencesService } from './recurrences'
import { transactionsService } from './transactions'
import type { Insight, InsightSeverity, InsightType } from '@/types'
import { currentMonth, formatCurrency } from '@/utils'

interface InsightInput {
  type: InsightType
  severity: InsightSeverity
  title: string
  body: string
  fingerprint: string
  meta?: Record<string, unknown>
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const insightsService = {
  async list(userId: string, includeDismissed = false): Promise<Insight[]> {
    let query = supabase
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!includeDismissed) query = query.eq('is_dismissed', false)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Insight[]
  },

  async markRead(id: string): Promise<Insight> {
    const { data, error } = await supabase
      .from('insights')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Insight
  },

  async dismiss(id: string): Promise<void> {
    const { error } = await supabase
      .from('insights')
      .update({ is_dismissed: true })
      .eq('id', id)
    if (error) throw error
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('insights')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) throw error
  },

  /**
   * Roda todas as regras de detecção e faz upsert.
   * Idempotente via fingerprint — não duplica.
   */
  async generate(userId: string): Promise<number> {
    const insights: InsightInput[] = []

    insights.push(...(await detectBudgetOverrun(userId)))
    insights.push(...(await detectSpikes(userId)))
    insights.push(...(await detectMissedRecurrences(userId)))
    insights.push(...(await detectStreaks(userId)))

    if (insights.length === 0) return 0

    const { error } = await supabase
      .from('insights')
      .upsert(
        insights.map((i) => ({ ...i, user_id: userId })),
        { onConflict: 'user_id,fingerprint', ignoreDuplicates: true },
      )
    if (error) throw error
    return insights.length
  },
}

// ============================================================
// REGRAS DE DETECÇÃO
// ============================================================

async function detectBudgetOverrun(userId: string): Promise<InsightInput[]> {
  const { month, year } = currentMonth()
  const [budgets, txs] = await Promise.all([
    budgetsService.list(userId, month, year),
    transactionsService.list(userId, { month, year }),
  ])
  if (budgets.length === 0) return []

  const spent = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.category_id) continue
    spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + t.amount)
  }

  const results: InsightInput[] = []
  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  for (const b of budgets) {
    const s = spent.get(b.category_id) ?? 0
    const percent = b.amount > 0 ? (s / b.amount) * 100 : 0
    const categoryName = b.category?.name ?? 'categoria'

    if (percent >= 100) {
      results.push({
        type: 'budget_overrun',
        severity: 'critical',
        title: `Orçamento estourado: ${categoryName}`,
        body: `${formatCurrency(s)} de ${formatCurrency(b.amount)} (${Math.round(percent)}%)`,
        fingerprint: `budget_${b.category_id}_${monthKey}_100`,
        meta: { category_id: b.category_id, percent, month: monthKey },
      })
    } else if (percent >= 80) {
      results.push({
        type: 'budget_overrun',
        severity: 'warning',
        title: `${categoryName} chegando ao limite`,
        body: `${Math.round(percent)}% do orçamento usado — ${formatCurrency(b.amount - s)} restantes`,
        fingerprint: `budget_${b.category_id}_${monthKey}_80`,
        meta: { category_id: b.category_id, percent, month: monthKey },
      })
    }
  }

  return results
}

async function detectSpikes(userId: string): Promise<InsightInput[]> {
  // Compara últimos 30 dias vs média dos 90 dias anteriores, por categoria.
  const now = new Date()
  const period30 = new Date(now)
  period30.setDate(period30.getDate() - 30)
  const period120 = new Date(now)
  period120.setDate(period120.getDate() - 120)

  const txs = await transactionsService.list(userId, {
    from: isoDate(period120),
    to: isoDate(now),
  })

  const current = new Map<string, { amount: number; name: string }>()
  const previous = new Map<string, number>()

  for (const t of txs) {
    if (t.type !== 'expense' || !t.category_id) continue
    const d = new Date(t.date + 'T00:00:00')
    if (d >= period30) {
      const cur = current.get(t.category_id)
      if (cur) cur.amount += t.amount
      else
        current.set(t.category_id, {
          amount: t.amount,
          name: t.category?.name ?? 'categoria',
        })
    } else if (d >= period120) {
      previous.set(t.category_id, (previous.get(t.category_id) ?? 0) + t.amount)
    }
  }

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const results: InsightInput[] = []

  for (const [categoryId, c] of current.entries()) {
    const prevTotal = previous.get(categoryId) ?? 0
    if (prevTotal < 50) continue // base muito baixa, ignora pra evitar falsos positivos
    const prevAvg = prevTotal / 3 // média mensal dos 3 meses anteriores
    if (prevAvg === 0) continue
    const ratio = c.amount / prevAvg
    if (ratio < 1.5) continue

    const pctMore = Math.round((ratio - 1) * 100)
    results.push({
      type: 'spike',
      severity: ratio >= 2 ? 'warning' : 'info',
      title: `Pico em ${c.name}`,
      body: `${pctMore}% acima da média dos últimos 3 meses (${formatCurrency(c.amount)} vs ${formatCurrency(prevAvg)})`,
      fingerprint: `spike_${categoryId}_${monthKey}`,
      meta: { category_id: categoryId, ratio, current: c.amount, previous_avg: prevAvg },
    })
  }

  return results
}

async function detectMissedRecurrences(userId: string): Promise<InsightInput[]> {
  const recs = await recurrencesService.list(userId, false)
  if (recs.length === 0) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const results: InsightInput[] = []

  for (const r of recs) {
    const due = new Date(r.next_due_date + 'T00:00:00')
    const diffDays = Math.round((today.getTime() - due.getTime()) / 86_400_000)
    // Se está atrasada há mais de 7 dias, é insight
    if (diffDays >= 7) {
      results.push({
        type: 'recurrence_missed',
        severity: 'warning',
        title: `${r.name} não veio?`,
        body: `Vencimento previsto em ${r.next_due_date} — ${diffDays} dias atrás. Cobrança perdida ou conta cancelada?`,
        fingerprint: `missed_${r.id}_${r.next_due_date}`,
        meta: { recurrence_id: r.id, due_date: r.next_due_date, days_late: diffDays },
      })
    }
  }

  return results
}

async function detectStreaks(userId: string): Promise<InsightInput[]> {
  // Conta dias consecutivos (terminando ontem) sem transação com tag "impulso".
  const now = new Date()
  const lookback = new Date(now)
  lookback.setDate(lookback.getDate() - 60)

  const txs = await transactionsService.list(userId, {
    from: isoDate(lookback),
    to: isoDate(now),
  })

  // Dias com impulso
  const impulseDays = new Set<string>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    if (t.tags?.some((tg) => tg.name.toLowerCase() === 'impulso')) {
      impulseDays.add(t.date)
    }
  }

  if (impulseDays.size === 0 && txs.length < 5) return [] // pouco dado, ignora

  // Conta dias consecutivos até ontem
  let streak = 0
  const cur = new Date(now)
  cur.setDate(cur.getDate() - 1) // começa por ontem
  while (streak < 60) {
    const key = isoDate(cur)
    if (impulseDays.has(key)) break
    streak += 1
    cur.setDate(cur.getDate() - 1)
  }

  const milestones = [7, 14, 30]
  const reached = milestones.filter((m) => streak >= m)
  if (reached.length === 0) return []

  const top = reached[reached.length - 1]
  // Fingerprint usa a data atual + milestone para gerar 1x por dia atingido
  const todayKey = isoDate(now)
  return [
    {
      type: 'streak',
      severity: 'success',
      title: `${top} dias sem compra por impulso`,
      body:
        top >= 30
          ? 'Um mês inteiro sem decisões por impulso. Hábito consolidado.'
          : top >= 14
            ? 'Duas semanas. Você está construindo um padrão.'
            : 'Uma semana limpa. Mantém o ritmo.',
      fingerprint: `streak_impulse_${top}_${todayKey}`,
      meta: { days: streak, milestone: top },
    },
  ]
}
