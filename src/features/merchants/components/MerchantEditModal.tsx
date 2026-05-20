import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Merchant, MerchantKind } from '@/types'
import { merchantsService } from '@/services'
import { useAuthStore, useTransactionStore, useMerchantsStore } from '@/store'
import { cn } from '@/lib/utils'

interface MerchantEditModalProps {
  merchant: Merchant | null
  onClose: () => void
}

const KIND_OPTIONS: { value: MerchantKind; label: string }[] = [
  { value: 'business', label: 'Comércio' },
  { value: 'person', label: 'Pessoa' },
  { value: 'employer', label: 'Empregador' },
  { value: 'bank', label: 'Banco' },
  { value: 'self', label: 'Eu mesmo' },
]

const COLOR_PRESETS = [
  '#7c6af7', '#f43f5e', '#22c55e', '#f59e0b', '#3b82f6',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
]

export function MerchantEditModal({ merchant, onClose }: MerchantEditModalProps) {
  const { user } = useAuthStore()
  const { categories } = useTransactionStore()
  const { addMerchant, updateMerchant } = useMerchantsStore()
  const isEdit = merchant !== null

  const [name, setName] = useState(merchant?.name ?? '')
  const [kind, setKind] = useState<MerchantKind | ''>(merchant?.kind ?? '')
  const [categoryId, setCategoryId] = useState(merchant?.default_category_id ?? '')
  const [color, setColor] = useState(merchant?.color ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) {
      setError('Informe um nome.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEdit && merchant) {
        const updated = await merchantsService.update(merchant.id, {
          name,
          kind: kind || null,
          default_category_id: categoryId || null,
          color: color || null,
        })
        updateMerchant(updated)
      } else {
        const created = await merchantsService.create(user.id, {
          name,
          kind: kind || null,
          default_category_id: categoryId || null,
          color: color || null,
        })
        addMerchant(created)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md card-elevated shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Editar estabelecimento' : 'Novo estabelecimento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 rounded"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="iFood, Pecatto, Cacau Show..."
              className="input-base w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Tipo</label>
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

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Categoria padrão
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-base w-full"
            >
              <option value="">Sem categoria padrão</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted mt-1">
              Será sugerida automaticamente ao escolher esse estabelecimento numa transação.
            </p>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Cor</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setColor('')}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-colors text-[10px] text-text-muted',
                  !color ? 'border-accent bg-background-tertiary' : 'border-border',
                )}
                aria-label="Sem cor"
              >
                —
              </button>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform',
                    color === c ? 'border-text-primary scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-ghost text-sm"
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
