import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Account, AccountKind } from '@/types'
import { accountsService } from '@/services'
import { useAuthStore, useAccountsStore } from '@/store'
import { parseAmount } from '@/utils'
import { cn } from '@/lib/utils'

interface AccountEditModalProps {
  account: Account | null
  onClose: () => void
}

const KIND_OPTIONS: { value: AccountKind; label: string; description: string }[] = [
  { value: 'checking', label: 'Corrente', description: 'Banco / wallet (PicPay, Nubank, Itaú, Caixa)' },
  { value: 'savings', label: 'Poupança', description: 'Conta poupança' },
  { value: 'cash', label: 'Dinheiro', description: 'Cofre / dinheiro físico / saques' },
  { value: 'investment', label: 'Investimento', description: 'CDB / Tesouro / corretora' },
]

const COLOR_PRESETS = [
  '#7c6af7', '#8B5CF6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
  '#3b82f6', '#6366F1',
]

export function AccountEditModal({ account, onClose }: AccountEditModalProps) {
  const { user } = useAuthStore()
  const { addAccount, updateAccount } = useAccountsStore()
  const isEdit = account !== null

  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'checking')
  const [initialBalanceStr, setInitialBalanceStr] = useState(
    account?.initial_balance !== undefined
      ? String(account.initial_balance).replace('.', ',')
      : '',
  )
  const [color, setColor] = useState(account?.color ?? COLOR_PRESETS[0])
  const [isActive, setIsActive] = useState(account?.is_active ?? true)
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
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name,
        kind,
        initial_balance: initialBalanceStr ? parseAmount(initialBalanceStr) : 0,
        color: color || null,
        is_active: isActive,
      }
      if (isEdit && account) {
        const updated = await accountsService.update(account.id, payload)
        updateAccount(updated)
      } else {
        const created = await accountsService.create(user.id, payload)
        addAccount(created)
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
            {isEdit ? 'Editar conta' : 'Nova conta'}
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
              placeholder="Nubank, Caixa, PicPay, Itaú, Cofre..."
              className="input-base w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-1.5">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  className={cn(
                    'text-left p-2 rounded-md text-xs transition-colors border',
                    kind === opt.value
                      ? 'bg-accent/10 border-accent text-text-primary'
                      : 'bg-background-tertiary border-border text-text-secondary hover:text-text-primary',
                  )}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Saldo inicial
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={initialBalanceStr}
              onChange={(e) => setInitialBalanceStr(e.target.value)}
              placeholder="0,00"
              className="input-base w-full font-mono"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Quanto tem nessa conta agora. Saldo no app vai somar receitas e
              subtrair despesas a partir desse valor.
            </p>
          </div>

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

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm text-text-secondary">Conta ativa</span>
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
