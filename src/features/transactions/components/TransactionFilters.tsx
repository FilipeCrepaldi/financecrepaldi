import { Search, X } from 'lucide-react'
import type { Category, Tag, TransactionType } from '@/types'
import { cn } from '@/lib/utils'

export type TypeFilter = 'all' | TransactionType

interface TransactionFiltersProps {
  categories: Category[]
  tags: Tag[]
  typeFilter: TypeFilter
  categoryFilter: string
  tagFilter: string
  search: string
  onTypeChange: (type: TypeFilter) => void
  onCategoryChange: (categoryId: string) => void
  onTagChange: (tagId: string) => void
  onSearchChange: (value: string) => void
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Despesas' },
  { value: 'income', label: 'Receitas' },
]

export function TransactionFilters({
  categories,
  tags,
  typeFilter,
  categoryFilter,
  tagFilter,
  search,
  onTypeChange,
  onCategoryChange,
  onTagChange,
  onSearchChange,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Tipo — pills */}
      <div className="inline-flex bg-background-secondary border border-border rounded-lg p-0.5">
        {TYPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onTypeChange(value)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              typeFilter === value
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categoria — select */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="input-base text-sm py-1.5 min-w-[140px]"
      >
        <option value="">Todas categorias</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Tag — select */}
      {tags.length > 0 && (
        <select
          value={tagFilter}
          onChange={(e) => onTagChange(e.target.value)}
          className="input-base text-sm py-1.5 min-w-[120px]"
        >
          <option value="">Todas tags</option>
          {tags.map((tg) => (
            <option key={tg.id} value={tg.id}>
              {tg.name}
            </option>
          ))}
        </select>
      )}

      {/* Busca */}
      <div className="relative flex-1 min-w-[180px]">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar..."
          className="input-base text-sm py-1.5 pl-9 pr-9 w-full"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
            aria-label="Limpar busca"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
