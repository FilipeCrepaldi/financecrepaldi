import { formatCurrency } from '@/utils'
import type { MerchantEntry, TagEntry } from '../utils/aggregations'

interface TopMerchantsTagsProps {
  merchants: MerchantEntry[]
  tags: TagEntry[]
}

export function TopMerchantsTags({ merchants, tags }: TopMerchantsTagsProps) {
  const merchantMax = Math.max(...merchants.map((m) => m.amount), 0)

  return (
    <div className="card h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Top merchants */}
        <div>
          <h3 className="text-text-primary font-medium text-sm mb-3">
            Top estabelecimentos
          </h3>
          {merchants.length === 0 ? (
            <p className="text-text-muted text-sm">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {merchants.map((m) => {
                const width = merchantMax > 0 ? (m.amount / merchantMax) * 100 : 0
                return (
                  <div key={m.name}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="text-text-primary truncate flex-1 mr-2">
                        {m.name}
                      </span>
                      <span className="font-mono text-text-secondary">
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                    <div className="h-1 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {m.count} {m.count === 1 ? 'transação' : 'transações'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tags comportamentais */}
        <div>
          <h3 className="text-text-primary font-medium text-sm mb-3">
            Comportamento
          </h3>
          {tags.length === 0 ? (
            <p className="text-text-muted text-sm">Sem tags aplicadas</p>
          ) : (
            <div className="space-y-2">
              {tags.map((t) => (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-text-primary truncate">{t.name}</span>
                    </div>
                    <span className="font-mono text-text-secondary">
                      {Math.round(t.percent)}%
                    </span>
                  </div>
                  <div className="h-1 bg-background-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${t.percent}%`,
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                    {formatCurrency(t.amount)} · {t.count}{' '}
                    {t.count === 1 ? 'transação' : 'transações'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
