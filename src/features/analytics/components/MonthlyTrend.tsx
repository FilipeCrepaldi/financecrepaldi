import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { formatCurrencyCompact, formatCurrency } from '@/utils'
import type { MonthlyPoint } from '../utils/aggregations'

interface MonthlyTrendProps {
  data: MonthlyPoint[]
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  const hasAny = data.some((d) => d.income > 0 || d.expense > 0)
  if (!hasAny) {
    return (
      <div className="card h-full">
        <h3 className="text-text-primary font-medium text-sm mb-3">Evolução mensal</h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-text-muted text-sm">Sem dados no período</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card h-full">
      <h3 className="text-text-primary font-medium text-sm mb-3">Evolução mensal</h3>
      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9999a8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#9999a8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrencyCompact(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a24',
                border: '1px solid #2a2a38',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelStyle={{ color: '#e5e5ea' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Receita"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Despesa"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="#7c6af7"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
