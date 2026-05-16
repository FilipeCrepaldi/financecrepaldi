import { create } from 'zustand'
import { budgetsService } from '@/services'
import type { Budget } from '@/types'
import { currentMonth } from '@/utils'

interface BudgetState {
  budgets: Budget[]
  loading: boolean
  selectedMonth: number
  selectedYear: number

  setMonth: (month: number, year: number) => void
  fetchBudgets: (userId: string) => Promise<void>
  addBudget: (b: Budget) => void
  addBudgets: (bs: Budget[]) => void
  updateBudget: (b: Budget) => void
  removeBudget: (id: string) => void
}

const { month, year } = currentMonth()

export const useBudgetsStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,
  selectedMonth: month,
  selectedYear: year,

  setMonth: (month, year) => set({ selectedMonth: month, selectedYear: year }),

  fetchBudgets: async (userId) => {
    set({ loading: true })
    try {
      const { selectedMonth, selectedYear } = get()
      const data = await budgetsService.list(userId, selectedMonth, selectedYear)
      set({ budgets: data })
    } finally {
      set({ loading: false })
    }
  },

  addBudget: (b) => set((s) => ({ budgets: [b, ...s.budgets] })),
  addBudgets: (bs) => set((s) => ({ budgets: [...bs, ...s.budgets] })),
  updateBudget: (b) =>
    set((s) => ({ budgets: s.budgets.map((x) => (x.id === b.id ? b : x)) })),
  removeBudget: (id) =>
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
}))
