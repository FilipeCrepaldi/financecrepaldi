import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  Banknote,
  TrendingUp,
  Star,
} from 'lucide-react'
import type { Account, AccountKind } from '@/types'
import { useAuthStore, useAccountsStore } from '@/store'
import { accountsService } from '@/services'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'
import { AccountEditModal } from './AccountEditModal'
import { TransferModal } from './TransferModal'

const KIND_ICONS: Record<AccountKind, typeof Wallet> = {
  checking: Wallet,
  savings: PiggyBank,
  cash: Banknote,
  investment: TrendingUp,
}

const KIND_LABEL: Record<AccountKind, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  investment: 'Investimento',
}

export default function AccountsPage() {
  const { user } = useAuthStore()
  const {
    accounts,
    loading,
    defaultAccountId,
    fetchAccounts,
    removeAccount,
    setDefaultAccount,
  } = useAccountsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchAccounts(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (a: Account) => {
    setEditing(a)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await accountsService.delete(id)
    removeAccount(id)
    setConfirmingDelete(null)
  }

  const totalBalance = accounts
    .filter((a) => a.is_active)
    .reduce((s, a) => s + (a.balance ?? 0), 0)

  const isEmpty = !loading && accounts.length === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Contas</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {accounts.filter((a) => a.is_active).length} ativa
            {accounts.filter((a) => a.is_active).length !== 1 ? 's' : ''} ·{' '}
            <span className="font-mono">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferOpen(true)}
            disabled={accounts.filter((a) => a.is_active).length < 2}
            className="btn-ghost text-sm py-2 flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowLeftRight size={14} />
            <span className="hidden sm:inline">Transferir</span>
          </button>
          <button
            onClick={handleNew}
            className="btn-primary text-sm py-2 flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nova</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : isEmpty ? (
        <div className="card text-center py-12">
          <Wallet size={28} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-medium">Nenhuma conta cadastrada</p>
          <p className="text-text-muted text-sm mt-1 mb-5">
            Cadastre suas contas para acompanhar o saldo separadamente.
          </p>
          <button
            onClick={handleNew}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            Cadastrar primeira
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((a) => {
            const Icon = KIND_ICONS[a.kind] ?? Wallet
            const isDefault = defaultAccountId === a.id
            const isConfirming = confirmingDelete === a.id
            const balance = a.balance ?? 0
            return (
              <div
                key={a.id}
                className={cn(
                  'card group transition-colors',
                  !a.is_active && 'opacity-60',
                  isDefault && 'border-accent/40',
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white"
                    style={{ backgroundColor: a.color ?? '#7B1E3A' }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-text-primary font-medium truncate">
                        {a.name}
                      </h3>
                      {isDefault && (
                        <span className="text-[9px] uppercase font-mono bg-accent/20 text-accent px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Star size={8} />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">
                      {KIND_LABEL[a.kind]}
                      {!a.is_active && ' · pausada'}
                    </p>
                  </div>
                </div>

                <p
                  className={cn(
                    'font-mono text-xl font-semibold mb-1',
                    balance < 0 ? 'text-expense' : 'text-text-primary',
                  )}
                >
                  {formatCurrency(balance)}
                </p>
                <p className="text-[10px] text-text-muted">
                  Saldo inicial: {formatCurrency(Number(a.initial_balance))}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                  {!isDefault && a.is_active ? (
                    <button
                      onClick={() => setDefaultAccount(a.id)}
                      className="text-text-muted hover:text-accent text-[11px] flex items-center gap-1"
                    >
                      <Star size={10} />
                      Tornar padrão
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1">
                    {isConfirming ? (
                      <>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-xs px-2 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          className="text-xs px-2 py-0.5 rounded text-text-muted hover:text-text-primary"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(a)}
                          className="text-text-muted hover:text-text-primary p-1 rounded"
                          aria-label="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(a.id)}
                          className="text-text-muted hover:text-expense p-1 rounded"
                          aria-label="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && <AccountEditModal account={editing} onClose={() => setModalOpen(false)} />}
      {transferOpen && <TransferModal onClose={() => setTransferOpen(false)} />}
    </div>
  )
}
