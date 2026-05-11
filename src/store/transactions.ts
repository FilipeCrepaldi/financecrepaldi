import { create } from 'zustand'
import { transactionsService, categoriesService } from '@/services'
import type { Transaction, Category, MerchantAlias } from '@/types'
import { currentMonth } from '@/utils'

interface TransactionState {
  transactions: Transaction[]
  categories: Category[]
  aliases: MerchantAlias[]
  loading: boolean
  selectedMonth: number
  selectedYear: number

  setMonth: (month: number, year: number) => void
  fetchTransactions: (userId: string) => Promise<void>
  fetchCategories: (userId: string) => Promise<void>
  fetchAliases: (userId: string) => Promise<void>
  addTransaction: (t: Transaction) => void
  removeTransaction: (id: string) => void
  updateTransaction: (t: Transaction) => void
}

const { month, year } = currentMonth()

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  categories: [],
  aliases: [],
  loading: false,
  selectedMonth: month,
  selectedYear: year,

  setMonth: (month, year) => set({ selectedMonth: month, selectedYear: year }),

  fetchTransactions: async (userId) => {
    set({ loading: true })
    try {
      const { selectedMonth, selectedYear } = get()
      const data = await transactionsService.list(userId, {
        month: selectedMonth,
        year: selectedYear,
      })
      set({ transactions: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchCategories: async (userId) => {
    const data = await categoriesService.list(userId)
    set({ categories: data })
  },

  fetchAliases: async (userId) => {
    const data = await categoriesService.getMerchantAliases(userId)
    set({ aliases: (data ?? []) as MerchantAlias[] })
  },

  addTransaction: (t) =>
    set((state) => ({ transactions: [t, ...state.transactions] })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  updateTransaction: (updated) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === updated.id ? updated : t,
      ),
    })),
}))
