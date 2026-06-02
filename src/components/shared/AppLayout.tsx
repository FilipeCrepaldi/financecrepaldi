import { useEffect, useState, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  BarChart3,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Zap,
  Sparkles,
  Store,
  CreditCard,
  Wallet,
  Tags,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react'
import { useAuthStore, useInsightsStore } from '@/store'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { QuickEntryBar } from './QuickEntryBar'
import { WelcomeModal } from './WelcomeModal'
import { TransactionFormModal } from '@/features/transactions/components/TransactionFormModal'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/budgets', icon: Target, label: 'Orçamentos' },
  { to: '/recurrences', icon: RefreshCw, label: 'Recorrências' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/merchants', icon: Store, label: 'Estabelecimentos' },
  { to: '/categories', icon: Tags, label: 'Categorias' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/insights', icon: Sparkles, label: 'Insights', badgeKey: 'insights' as const },
  { to: '/help', icon: HelpCircle, label: 'Como usar?' },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickEntryOpen, setQuickEntryOpen] = useState(false)
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const { signOut, profile } = useAuthStore()

  const closeWelcome = useCallback(() => {
    setWelcomeOpen(false)
    localStorage.removeItem('fm_show_welcome')
  }, [])
  const insights = useInsightsStore((s) => s.insights)
  const unreadCount = insights.filter((i) => !i.is_read).length
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    if (profile && localStorage.getItem('fm_show_welcome') === 'true') {
      setWelcomeOpen(true)
    }
  }, [profile])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        setQuickEntryOpen(true)
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setNewTransactionOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — sempre dark, independente do tema da página */}
      <aside
        data-theme="dark"
        className={cn(
          'fixed top-0 left-0 h-full w-60 z-30',
          'flex flex-col transition-transform duration-200',
          'bg-background-secondary border-r border-border',
          'shadow-lg',
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Finance Mirror" className="w-8 h-8 object-contain" />
            <span className="font-semibold text-text-primary text-sm tracking-tight">
              Finance Mirror
            </span>
          </div>
          <button
            className="lg:hidden p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-background-tertiary transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact, badgeKey }) => {
            const badge = badgeKey === 'insights' ? unreadCount : 0
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-accent/20 text-white font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary',
                  )
                }
              >
                <Icon size={15} strokeWidth={2} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="text-[10px] font-mono font-semibold bg-accent text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-2.5 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-0.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-accent/25 flex items-center justify-center text-accent text-xs font-semibold shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate font-medium">
                {profile?.full_name ?? 'Usuário'}
              </p>
              <p className="text-xs text-text-muted truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-colors duration-150"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-tertiary transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-tertiary transition-colors duration-150"
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Quick entry trigger */}
          <button
            onClick={() => setQuickEntryOpen(true)}
            className="flex items-center gap-2 btn-primary text-sm py-1.5"
          >
            <Zap size={14} />
            <span className="hidden sm:inline">Lançar</span>
            <kbd className="hidden sm:inline text-xs opacity-60 font-mono bg-white/10 px-1 rounded">
              K
            </kbd>
          </button>
          <button
            onClick={() => setNewTransactionOpen(true)}
            className="hidden sm:flex items-center gap-1.5 btn-ghost text-sm py-1.5 text-text-secondary"
            title="Nova transação (N)"
          >
            <ArrowLeftRight size={14} />
            <kbd className="text-xs opacity-60 font-mono bg-background-tertiary px-1 rounded border border-border">
              N
            </kbd>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Modal de boas-vindas (primeira vez) */}
      {welcomeOpen && profile && (
        <WelcomeModal
          userName={profile.full_name ?? 'por aqui'}
          onClose={closeWelcome}
        />
      )}

      {/* Quick Entry Modal */}
      {quickEntryOpen && (
        <QuickEntryBar onClose={() => setQuickEntryOpen(false)} />
      )}

      {/* Nova transação (shortcut N) */}
      {newTransactionOpen && (
        <TransactionFormModal
          transaction={null}
          onClose={() => setNewTransactionOpen(false)}
        />
      )}
    </div>
  )
}
