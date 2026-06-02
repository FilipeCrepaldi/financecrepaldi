import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/utils'
import type { CategorySlice } from '../utils/aggregations'

interface CategoryPieProps {
  data: CategorySlice[]
}

export function CategoryPie({ data }: CategoryPieProps) {
  if (data.length === 0) {
    return (
      <div className="card h-full">
        <h3 className="text-text-primary font-medium text-sm mb-3">Por categoria</h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-text-muted text-sm">Sem despesas no período</p>
        </div>
      </div>
    )
  }

  const top = data.slice(0, 8)
  const otherAmount = data.slice(8).reduce((s, d) => s + d.amount, 0)
  const otherPercent = data.slice(8).reduce((s, d) => s + d.percent, 0)
  const chartData =
    otherAmount > 0
      ? [
          ...top,
          {
            categoryId: '_other',
            name: 'Outras',
            color: '#6b7280',
            amount: otherAmount,
            percent: otherPercent,
          },
        ]
      : top

  return (
    <div className="card h-full">
      <h3 className="text-text-primary font-medium text-sm mb-3">Por categoria</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#2A1A20',
                  border: '1px solid #5A3A45',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#E7CFC4',
                }}
                labelStyle={{ color: '#CDAA5E', fontWeight: 600 }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 w-full space-y-1.5 min-w-0">
          {chartData.map((d) => (
            <div key={d.categoryId} className="flex items-center gap-2 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-text-primary truncate flex-1">{d.name}</span>
              <span className="font-mono text-text-secondary">
                {d.percent.toFixed(0)}%
              </span>
              <span className="font-mono text-text-muted w-20 text-right">
                {formatCurrency(d.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
