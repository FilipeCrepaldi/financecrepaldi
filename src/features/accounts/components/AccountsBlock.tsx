import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  PiggyBank,
  Banknote,
  TrendingUp,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react'
import { useState } from 'react'
import type { AccountKind } from '@/types'
import { useAccountsStore } from '@/store'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'
import { TransferModal } from './TransferModal'

const KIND_ICONS: Record<AccountKind, typeof Wallet> = {
  checking: Wallet,
  savings: PiggyBank,
  cash: Banknote,
  investment: TrendingUp,
}

export function AccountsBlock() {
  const navigate = useNavigate()
  const { accounts } = useAccountsStore()
  const [transferOpen, setTransferOpen] = useState(false)

  const active = accounts.filter((a) => a.is_active)
  if (active.length === 0) return null

  const total = active.reduce((s, a) => s + (a.balance ?? 0), 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-text-primary font-medium flex items-center gap-2">
          <Wallet size={16} className="text-accent" />
          Contas
          <span className="text-text-muted text-xs font-normal">
            ·{' '}
            <span className={cn('font-mono', total < 0 ? 'text-expense' : 'text-text-primary')}>
              {formatCurrency(total)}
            </span>{' '}
            total
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {active.length >= 2 && (
            <button
              onClick={() => setTransferOpen(true)}
              className="text-text-muted hover:text-text-primary text-xs flex items-center gap-1"
            >
              <ArrowLeftRight size={12} />
              Transferir
            </button>
          )}
          <button
            onClick={() => navigate('/accounts')}
            className="text-text-muted hover:text-text-primary text-xs flex items-center gap-0.5"
          >
            Ver todas <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {active.map((a) => {
          const Icon = KIND_ICONS[a.kind] ?? Wallet
          const balance = a.balance ?? 0
          return (
            <button
              key={a.id}
              onClick={() => navigate('/accounts')}
              className="text-left p-2.5 rounded-lg bg-background-tertiary/50 hover:bg-background-tertiary transition-colors border border-border"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-white"
                  style={{ backgroundColor: a.color ?? '#7c6af7' }}
                >
                  <Icon size={11} />
                </div>
                <p className="text-text-primary text-xs font-medium truncate">
                  {a.name}
                </p>
              </div>
              <p
                className={cn(
                  'font-mono text-sm font-semibold',
                  balance < 0 ? 'text-expense' : 'text-text-primary',
                )}
              >
                {formatCurrency(balance)}
              </p>
            </button>
          )
        })}
      </div>

      {transferOpen && <TransferModal onClose={() => setTransferOpen(false)} />}
    </div>
  )
}
