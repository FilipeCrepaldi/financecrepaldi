import { useEffect, useMemo, useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { accountsService } from '@/services'
import {
  useAuthStore,
  useAccountsStore,
  useTransactionStore,
} from '@/store'
import { parseAmount, todayISO, formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface TransferModalProps {
  /** Conta de origem pré-selecionada (opcional) */
  fromAccountId?: string
  onClose: () => void
}

export function TransferModal({ fromAccountId, onClose }: TransferModalProps) {
  const { user } = useAuthStore()
  const { accounts, refreshBalances } = useAccountsStore()
  const { addTransaction } = useTransactionStore()
  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts])

  const [fromId, setFromId] = useState(fromAccountId ?? activeAccounts[0]?.id ?? '')
  const [toId, setToId] = useState(
    activeAccounts.find((a) => a.id !== (fromAccountId ?? activeAccounts[0]?.id))?.id ?? '',
  )
  const [amountStr, setAmountStr] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const from = activeAccounts.find((a) => a.id === fromId)
  const to = activeAccounts.find((a) => a.id === toId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!fromId || !toId) return setError('Escolha as duas contas.')
    if (fromId === toId) return setError('Origem e destino devem ser diferentes.')
    const amount = parseAmount(amountStr)
    if (amount <= 0) return setError('Informe um valor maior que zero.')
    if (!date) return setError('Informe uma data.')

    setSaving(true)
    setError(null)
    try {
      const result = await accountsService.transfer(
        user.id,
        fromId,
        toId,
        amount,
        date,
        notes.trim() || null,
      )
      addTransaction(result.out)
      addTransaction(result.in)
      await refreshBalances(user.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao transferir.')
    } finally {
      setSaving(false)
    }
  }

  if (activeAccounts.length < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md card-elevated shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Transferência</h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1 rounded">
              <X size={16} />
            </button>
          </div>
          <p className="text-text-secondary text-sm">
            Você precisa de pelo menos 2 contas ativas para fazer uma transferência.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md card-elevated shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Transferência</h2>
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
          {/* From → To visual */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1">De</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="input-base w-full"
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {from && typeof from.balance === 'number' && (
                <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                  Saldo: {formatCurrency(from.balance)}
                </p>
              )}
            </div>

            <ArrowRight size={16} className="text-text-muted mt-5" />

            <div>
              <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1">Para</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="input-base w-full"
              >
                <option value="">Escolher</option>
                {activeAccounts
                  .filter((a) => a.id !== fromId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              {to && typeof to.balance === 'number' && (
                <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                  Saldo: {formatCurrency(to.balance)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Valor</label>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="input-base w-full font-mono"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações..."
              className="input-base w-full resize-none"
            />
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}

          <p className="text-[10px] text-text-muted">
            Transferências não contam como receita ou despesa. Apenas movimentam
            o saldo entre as duas contas.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={cn('btn-ghost text-sm')}
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Transferindo...' : 'Transferir'}
          </button>
        </div>
      </form>
    </div>
  )
}
