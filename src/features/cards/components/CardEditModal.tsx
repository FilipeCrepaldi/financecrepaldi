import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CardOwnerType, CreditCard } from '@/types'
import { cardsService } from '@/services'
import { useAuthStore, useCardsStore } from '@/store'
import { parseAmount } from '@/utils'
import { cn } from '@/lib/utils'

interface CardEditModalProps {
  card: CreditCard | null
  onClose: () => void
}

const COLOR_PRESETS = [
  '#7c6af7', '#f97316', '#f43f5e', '#22c55e', '#3b82f6',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#eab308',
]

export function CardEditModal({ card, onClose }: CardEditModalProps) {
  const { user } = useAuthStore()
  const { addCard, updateCard } = useCardsStore()
  const isEdit = card !== null

  const [name, setName] = useState(card?.name ?? '')
  const [lastDigits, setLastDigits] = useState(card?.last_digits ?? '')
  const [color, setColor] = useState(card?.color ?? COLOR_PRESETS[0])
  const [limitStr, setLimitStr] = useState(
    card?.limit_amount ? String(card.limit_amount).replace('.', ',') : '',
  )
  const [closingDayStr, setClosingDayStr] = useState(
    card?.closing_day !== null && card?.closing_day !== undefined
      ? String(card.closing_day)
      : '',
  )
  const [dueDayStr, setDueDayStr] = useState(
    card?.due_day !== undefined ? String(card.due_day) : '',
  )
  const [ownerType, setOwnerType] = useState<CardOwnerType>(
    card?.owner_type ?? 'self',
  )
  const [ownerName, setOwnerName] = useState(card?.owner_name ?? '')
  const [isActive, setIsActive] = useState(card?.is_active ?? true)
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
    if (!name.trim()) return setError('Informe um nome.')
    const dueDay = parseInt(dueDayStr, 10)
    if (!dueDayStr || isNaN(dueDay) || dueDay < 1 || dueDay > 31)
      return setError('Vencimento entre 1 e 31.')
    const closingDay = closingDayStr ? parseInt(closingDayStr, 10) : null
    if (closingDay !== null && (isNaN(closingDay) || closingDay < 1 || closingDay > 31))
      return setError('Fechamento entre 1 e 31 (ou vazio).')
    if (ownerType === 'third_party' && !ownerName.trim())
      return setError('Informe o nome do dono do cartão.')

    setSaving(true)
    setError(null)
    try {
      const payload = {
        name,
        last_digits: lastDigits.trim() || null,
        color: color || null,
        limit_amount: limitStr ? parseAmount(limitStr) : null,
        closing_day: closingDay,
        due_day: dueDay,
        owner_type: ownerType,
        owner_name: ownerType === 'third_party' ? ownerName.trim() : null,
        is_active: isActive,
      }
      if (isEdit && card) {
        const updated = await cardsService.update(card.id, payload)
        updateCard(updated)
      } else {
        const created = await cardsService.create(user.id, payload)
        addCard(created)
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
        className="relative w-full max-w-md card-elevated shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Editar cartão' : 'Novo cartão'}
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
          {/* Dono */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Dono</label>
            <div className="inline-flex w-full bg-background-tertiary border border-border rounded-lg p-0.5">
              {(['self', 'third_party'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOwnerType(t)}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    ownerType === t
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {t === 'self' ? 'Meu' : 'De terceiro'}
                </button>
              ))}
            </div>
            {ownerType === 'third_party' && (
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nome do dono (ex: Leonis Agripino)"
                className="input-base w-full mt-2"
              />
            )}
          </div>

          {/* Nome + dígitos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Roxinho, Cartão Pai..."
                className="input-base w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Últimos 4 dígitos
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={lastDigits}
                onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="2982"
                className="input-base w-full font-mono"
              />
            </div>
          </div>

          {/* Fechamento + Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Dia de fechamento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={closingDayStr}
                onChange={(e) => setClosingDayStr(e.target.value)}
                placeholder="Variável"
                className="input-base w-full font-mono"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Deixe vazio se variável
              </p>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Dia de vencimento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDayStr}
                onChange={(e) => setDueDayStr(e.target.value)}
                placeholder="24"
                className="input-base w-full font-mono"
              />
            </div>
          </div>

          {/* Limite */}
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Limite (opcional)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={limitStr}
              onChange={(e) => setLimitStr(e.target.value)}
              placeholder="0,00"
              className="input-base w-full font-mono"
            />
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Cor</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform',
                    color === c
                      ? 'border-text-primary scale-110'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm text-text-secondary">Cartão ativo</span>
          </label>

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
