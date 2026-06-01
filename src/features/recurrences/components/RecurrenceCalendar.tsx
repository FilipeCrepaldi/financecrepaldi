import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Recurrence, RecurrenceFrequency } from '@/types'
import { formatMonthYear, currentMonth, formatCurrency } from '@/utils'

interface RecurrenceCalendarProps {
  recurrences: Recurrence[]
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function stepDate(d: Date, freq: RecurrenceFrequency, dir: 1 | -1) {
  const n = new Date(d)
  switch (freq) {
    case 'daily':
      n.setDate(n.getDate() + dir)
      break
    case 'weekly':
      n.setDate(n.getDate() + 7 * dir)
      break
    case 'monthly':
      n.setMonth(n.getMonth() + dir)
      break
    case 'yearly':
      n.setFullYear(n.getFullYear() + dir)
      break
  }
  return n
}

function occurrencesInMonth(
  rec: Recurrence,
  year: number,
  month: number,
): number[] {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  end.setHours(23, 59, 59, 999)

  let cur = new Date(rec.next_due_date + 'T00:00:00')

  // back-track to before the start of the month
  while (cur > start) {
    const prev = stepDate(cur, rec.frequency, -1)
    if (prev < start) break
    cur = prev
  }
  // also handle case where next_due_date itself is after the month
  while (cur > end) {
    cur = stepDate(cur, rec.frequency, -1)
  }

  const days: number[] = []
  while (cur <= end) {
    if (cur >= start) days.push(cur.getDate())
    cur = stepDate(cur, rec.frequency, 1)
  }
  return days
}

export function RecurrenceCalendar({ recurrences }: RecurrenceCalendarProps) {
  const { month: cMonth, year: cYear } = currentMonth()
  const [month, setMonth] = useState(cMonth)
  const [year, setYear] = useState(cYear)

  const dayMap = useMemo(() => {
    const map = new Map<number, Recurrence[]>()
    for (const r of recurrences) {
      if (!r.is_active) continue
      const days = occurrencesInMonth(r, year, month)
      for (const d of days) {
        const arr = map.get(d) ?? []
        arr.push(r)
        map.set(d, arr)
      }
    }
    return map
  }, [recurrences, year, month])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayDay =
    cMonth === month && cYear === year ? new Date().getDate() : null

  const prev = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else setMonth(month - 1)
  }
  const next = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else setMonth(month + 1)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-primary font-medium text-sm">Calendário</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="text-text-muted hover:text-text-primary p-1 rounded"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-text-secondary text-xs font-medium min-w-[100px] text-center capitalize">
            {formatMonthYear(month, year)}
          </span>
          <button
            onClick={next}
            className="text-text-muted hover:text-text-primary p-1 rounded"
            aria-label="Próximo mês"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-text-muted font-medium py-1"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const recs = dayMap.get(d)
          const isToday = todayDay === d
          return (
            <div
              key={i}
              className={`aspect-square rounded flex flex-col items-center justify-center text-xs relative ${
                isToday
                  ? 'bg-accent/20 text-accent font-semibold'
                  : recs
                    ? 'text-text-primary'
                    : 'text-text-muted'
              }`}
              title={
                recs
                  ? recs
                      .map((r) => `${r.name} · ${formatCurrency(r.amount)}`)
                      .join('\n')
                  : undefined
              }
            >
              <span>{d}</span>
              {recs && (
                <div className="flex gap-0.5 mt-0.5">
                  {recs.slice(0, 3).map((r, idx) => (
                    <div
                      key={idx}
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: r.category?.color ?? '#7B1E3A',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
