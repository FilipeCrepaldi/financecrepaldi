import { useState } from 'react'
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
} from 'lucide-react'
import { useAuthStore, useInsightsStore } from '@/store'
import { cn } from '@/lib/utils'
import { QuickEntryBar } from './QuickEntryBar'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/budgets', icon: Target, label: 'Orçamentos' },
  { to: '/recurrences', icon: RefreshCw, label: 'Recorrências' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/merchants', icon: Store, label: 'Estabelecimentos' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/insights', icon: Sparkles, label: 'Insights', badgeKey: 'insights' as const },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickEntryOpen, setQuickEntryOpen] = useState(false)
  const { signOut, profile } = useAuthStore()
  const insights = useInsightsStore((s) => s.insights)
  const unreadCount = insights.filter((i) => !i.is_read).length
  const navigate = useNavigate()

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

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-60 bg-background-secondary border-r border-border z-30',
          'flex flex-col transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-text-primary tracking-tight">
              Finance Mirror
            </span>
          </div>
          <button
            className="lg:hidden btn-ghost p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
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
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary',
                  )
                }
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="text-[10px] font-mono font-semibold bg-accent text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-medium">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">
                {profile?.full_name ?? 'Usuário'}
              </p>
              <p className="text-xs text-text-muted truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-expense hover:bg-expense/10 rounded-lg transition-colors duration-150"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="flex-1" />

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
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Quick Entry Modal */}
      {quickEntryOpen && (
        <QuickEntryBar onClose={() => setQuickEntryOpen(false)} />
      )}
    </div>
  )
}
