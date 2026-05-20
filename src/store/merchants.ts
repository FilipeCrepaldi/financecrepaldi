import { create } from 'zustand'
import { merchantsService } from '@/services'
import type { Merchant } from '@/types'

interface MerchantState {
  merchants: Merchant[]
  loading: boolean

  fetchMerchants: (userId: string) => Promise<void>
  addMerchant: (m: Merchant) => void
  updateMerchant: (m: Merchant) => void
  removeMerchant: (id: string) => void
  /** Aplica os efeitos de um merge no estado local (sem chamar o backend). */
  applyMerge: (sourceId: string, targetId: string) => void
}

export const useMerchantsStore = create<MerchantState>((set) => ({
  merchants: [],
  loading: false,

  fetchMerchants: async (userId) => {
    set({ loading: true })
    try {
      const data = await merchantsService.list(userId)
      set({ merchants: data })
    } finally {
      set({ loading: false })
    }
  },

  addMerchant: (m) =>
    set((s) => ({
      merchants: [...s.merchants, m].sort((a, b) => a.name.localeCompare(b.name)),
    })),

  updateMerchant: (m) =>
    set((s) => ({
      merchants: s.merchants
        .map((x) => (x.id === m.id ? m : x))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),

  removeMerchant: (id) =>
    set((s) => ({ merchants: s.merchants.filter((m) => m.id !== id) })),

  applyMerge: (sourceId) =>
    set((s) => ({ merchants: s.merchants.filter((m) => m.id !== sourceId) })),
}))
