import { useEffect, useState } from 'react'
import { CheckCheck, RefreshCw } from 'lucide-react'
import { useAuthStore, useInsightsStore } from '@/store'
import { InsightCard } from './InsightCard'
import type { InsightType } from '@/types'

type Filter = 'all' | InsightType

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'budget_overrun', label: 'Orçamentos' },
  { value: 'spike', label: 'Picos' },
  { value: 'recurrence_missed', label: 'Recorrências' },
  { value: 'streak', label: 'Hábitos' },
]

export default function InsightsPage() {
  const { user } = useAuthStore()
  const {
    insights,
    loading,
    generating,
    fetchInsights,
    generateInsights,
    markRead,
    dismiss,
    markAllRead,
  } = useInsightsStore()
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!user) return
    fetchInsights(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered =
    filter === 'all' ? insights : insights.filter((i) => i.type === filter)
  const unread = insights.filter((i) => !i.is_read).length

  const handleGenerate = () => {
    if (!user) return
    generateInsights(user.id)
  }

  const handleMarkAllRead = () => {
    if (!user) return
    markAllRead(user.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Insights</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {insights.length} {insights.length === 1 ? 'aviso ativo' : 'avisos ativos'}
            {unread > 0 && ` · ${unread} não ${unread === 1 ? 'lido' : 'lidos'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-ghost text-sm py-2 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">
              {generating ? 'Analisando...' : 'Atualizar'}
            </span>
          </button>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-primary text-sm py-2 flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Marcar lidos</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count =
            f.value === 'all'
              ? insights.length
              : insights.filter((i) => i.type === f.value).length
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === f.value
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.label} {count > 0 && <span className="opacity-70">· {count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-primary font-medium">
            {filter === 'all' ? 'Nada por aqui' : 'Sem avisos nessa categoria'}
          </p>
          <p className="text-text-muted text-sm mt-1 mb-5">
            {filter === 'all'
              ? 'Suas finanças estão fluindo bem. Use "Atualizar" para reanalisar.'
              : 'Tente outro filtro ou atualize a análise.'}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Analisando...' : 'Analisar agora'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <InsightCard
              key={i.id}
              insight={i}
              onRead={markRead}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}
    </div>
  )
}
