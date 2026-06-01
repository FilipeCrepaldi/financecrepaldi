import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Check, X } from 'lucide-react'
import type { Category, Merchant, MerchantKind } from '@/types'
import { merchantsService } from '@/services'
import { useAuthStore, useMerchantsStore, useTransactionStore } from '@/store'
import { cn } from '@/lib/utils'

interface MerchantComboboxProps {
  /** ID do merchant selecionado (vazio = sem merchant ou texto livre) */
  value: string
  /** Texto exibido quando não há merchant_id (modo legado / texto livre) */
  textValue: string
  /**
   * Chamado quando user seleciona um merchant da lista (id + nome canônico)
   * ou quando troca o texto livre (id = '', name = texto digitado).
   * `suggestedCategoryId` vem do merchant escolhido (se tiver default).
   */
  onChange: (merchantId: string, merchantName: string, suggestedCategoryId?: string | null) => void
  placeholder?: string
  autoFocus?: boolean
}

const KIND_OPTIONS: { value: MerchantKind; label: string }[] = [
  { value: 'business', label: 'Comércio' },
  { value: 'person', label: 'Pessoa' },
  { value: 'employer', label: 'Empregador' },
  { value: 'bank', label: 'Banco' },
  { value: 'self', label: 'Eu mesmo' },
]

export function MerchantCombobox({
  value,
  textValue,
  onChange,
  placeholder = 'Buscar ou cadastrar...',
  autoFocus,
}: MerchantComboboxProps) {
  const { user } = useAuthStore()
  const { merchants } = useMerchantsStore()
  const addMerchant = useMerchantsStore((s) => s.addMerchant)
  const { categories } = useTransactionStore()

  const [query, setQuery] = useState(textValue)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sincroniza quando o pai troca textValue/value externamente
  useEffect(() => {
    setQuery(textValue)
  }, [textValue])

  // Fecha ao clicar fora
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return merchants.slice(0, 12)
    return merchants
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [merchants, query])

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return merchants.find((m) => m.name.toLowerCase() === q) ?? null
  }, [merchants, query])

  const selected = value ? merchants.find((m) => m.id === value) ?? null : null

  const handleSelect = (m: Merchant) => {
    onChange(m.id, m.name, m.default_category_id)
    setQuery(m.name)
    setOpen(false)
  }

  const handleClear = () => {
    onChange('', '', null)
    setQuery('')
  }

  const handleQueryChange = (next: string) => {
    setQuery(next)
    // Se o texto não bate exatamente com nenhum merchant, vira texto livre
    const match = merchants.find((m) => m.name.toLowerCase() === next.trim().toLowerCase())
    if (match) {
      onChange(match.id, match.name, match.default_category_id)
    } else {
      onChange('', next, null)
    }
    setOpen(true)
  }

  const showCreateOption = query.trim().length > 0 && !exactMatch

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn('input-base w-full', selected && 'pr-16')}
        />
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 text-text-muted hover:text-expense p-1 rounded"
            aria-label="Limpar seleção"
            tabIndex={-1}
          >
            <X size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded"
          aria-label="Abrir lista"
          tabIndex={-1}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {selected && (
        <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
          <Check size={10} className="text-income" />
          Vinculado a <span className="font-medium text-text-secondary">{selected.name}</span>
          {selected.category?.name && (
            <span className="text-text-muted">· {selected.category.name}</span>
          )}
        </p>
      )}

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-background-secondary border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 && !showCreateOption && (
            <p className="text-xs text-text-muted px-3 py-2">
              Nenhum estabelecimento cadastrado.
            </p>
          )}

          {filtered.map((m) => {
            const isActive = value === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-background-tertiary flex items-center gap-2 border-b border-border/40 last:border-0',
                  isActive && 'bg-accent/10',
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: m.color ?? m.category?.color ?? '#7B1E3A',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{m.name}</p>
                  {m.category?.name && (
                    <p className="text-[11px] text-text-muted truncate">
                      {m.category.name}
                    </p>
                  )}
                </div>
                {isActive && <Check size={12} className="text-accent shrink-0" />}
              </button>
            )
          })}

          {showCreateOption && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full text-left px-3 py-2 hover:bg-accent/10 flex items-center gap-2 text-accent text-sm font-medium border-t border-border"
            >
              <Plus size={14} />
              Cadastrar &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}

      {creating && user && (
        <MerchantQuickCreate
          initialName={query.trim()}
          categories={categories}
          onCancel={() => setCreating(false)}
          onCreated={(m) => {
            addMerchant(m)
            handleSelect(m)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

interface QuickCreateProps {
  initialName: string
  categories: Category[]
  onCancel: () => void
  onCreated: (m: Merchant) => void
}

function MerchantQuickCreate({
  initialName,
  categories,
  onCancel,
  onCreated,
}: QuickCreateProps) {
  const { user } = useAuthStore()
  const [name, setName] = useState(initialName)
  const [categoryId, setCategoryId] = useState('')
  const [kind, setKind] = useState<MerchantKind | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!user) return
    if (!name.trim()) {
      setError('Informe um nome.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Evita duplicata
      const existing = await merchantsService.findByName(user.id, name)
      if (existing) {
        onCreated(existing)
        return
      }
      const created = await merchantsService.create(user.id, {
        name,
        kind: kind || null,
        default_category_id: categoryId || null,
      })
      onCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleSave()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-sm card-elevated shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            Novo estabelecimento
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-muted hover:text-text-primary p-1 rounded"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Categoria padrão (opcional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-base w-full"
            >
              <option value="">Nenhuma</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Tipo (opcional)</label>
            <div className="flex flex-wrap gap-1.5">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(kind === opt.value ? '' : opt.value)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium transition-colors border',
                    kind === opt.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-background-tertiary text-text-secondary border-border hover:text-text-primary',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn-ghost text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm"
          >
            {saving ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
