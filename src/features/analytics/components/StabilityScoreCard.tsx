import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { StabilityScore } from '../utils/aggregations'

interface StabilityScoreCardProps {
  score: StabilityScore
}

function scoreColor(score: number) {
  if (score >= 75) return { text: 'text-income', bg: 'bg-income', label: 'Estável' }
  if (score >= 50) return { text: 'text-accent', bg: 'bg-accent', label: 'Atento' }
  if (score >= 25) return { text: 'text-warning', bg: 'bg-warning', label: 'Tensionado' }
  return { text: 'text-expense', bg: 'bg-expense', label: 'Crítico' }
}

export function StabilityScoreCard({ score }: StabilityScoreCardProps) {
  const c = scoreColor(score.score)
  const TrendIcon =
    score.trend === 'up' ? TrendingUp : score.trend === 'down' ? TrendingDown : Minus
  const trendLabel =
    score.trend === 'up'
      ? 'Despesa subiu vs período anterior'
      : score.trend === 'down'
        ? 'Despesa caiu vs período anterior'
        : 'Despesa estável vs período anterior'
  const trendColor =
    score.trend === 'up'
      ? 'text-expense'
      : score.trend === 'down'
        ? 'text-income'
        : 'text-text-muted'

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide">
            Score de estabilidade
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-mono font-semibold ${c.text}`}>
              {score.score}
            </span>
            <span className="text-text-muted text-sm">/100</span>
            <span className={`text-sm font-medium ml-1 ${c.text}`}>{c.label}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${trendColor}`}>
          <TrendIcon size={14} />
          <span>{trendLabel}</span>
        </div>
      </div>

      <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all ${c.bg}`}
          style={{ width: `${score.score}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Metric
          label="Comprometido"
          value={score.committedPercent}
          suffix="%"
          hint="Fixos / receita"
          warn={score.committedPercent > 60}
        />
        <Metric
          label="Variação"
          value={score.variationPercent}
          suffix="%"
          hint="vs período anterior"
          warn={score.variationPercent > 30}
        />
        <Metric
          label="Impulso"
          value={score.impulsePercent}
          suffix="%"
          hint="Tag impulso / despesa"
          warn={score.impulsePercent > 20}
        />
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  suffix,
  hint,
  warn,
}: {
  label: string
  value: number
  suffix: string
  hint: string
  warn: boolean
}) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p
        className={`font-mono text-lg font-semibold mt-0.5 ${
          warn ? 'text-warning' : 'text-text-primary'
        }`}
      >
        {value}
        {suffix}
      </p>
      <p className="text-text-muted text-[10px] mt-0.5">{hint}</p>
    </div>
  )
}
