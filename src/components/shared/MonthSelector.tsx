import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear } from '@/utils'

interface MonthSelectorProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
}

export function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const goPrev = () => {
    if (month === 1) onChange(12, year - 1)
    else onChange(month - 1, year)
  }

  const goNext = () => {
    if (month === 12) onChange(1, year + 1)
    else onChange(month + 1, year)
  }

  return (
    <div className="inline-flex items-center bg-background-secondary border border-border rounded-xl overflow-hidden">
      <button
        onClick={goPrev}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-tertiary transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={15} />
      </button>
      <span className="px-3 text-sm text-text-primary capitalize min-w-[140px] text-center font-medium">
        {formatMonthYear(month, year)}
      </span>
      <button
        onClick={goNext}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-tertiary transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
