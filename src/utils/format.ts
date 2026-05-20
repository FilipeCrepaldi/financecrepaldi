import { format, formatRelative, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============================================================
// MOEDA
// ============================================================

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return formatCurrency(value)
}

// ============================================================
// DATAS
// ============================================================

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date

  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'

  return format(d, "d 'de' MMM", { locale: ptBR })
}

export function formatDateFull(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatDateRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatRelative(d, new Date(), { locale: ptBR })
}

export function formatMonthYear(month: number, year: number): string {
  const d = new Date(year, month - 1, 1)
  return format(d, "MMMM 'de' yyyy", { locale: ptBR })
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function currentMonth(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

/**
 * Soma N meses a uma data ISO ('YYYY-MM-DD').
 * Clampa para o último dia do mês alvo se o dia original não existir.
 * Ex: addMonthsISO('2026-01-31', 1) → '2026-02-28' (não '2026-03-03').
 */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const targetMonthIndex = m - 1 + months
  const targetYear = y + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  // último dia do mês alvo
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ============================================================
// NÚMEROS
// ============================================================

export function parseAmount(value: string): number {
  // Aceita "32", "32.50", "32,50", "R$ 32,50"
  const clean = value
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.')
  return parseFloat(clean) || 0
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
