import { create } from 'zustand'
import { insightsService } from '@/services'
import type { Insight } from '@/types'

interface InsightState {
  insights: Insight[]
  loading: boolean
  generating: boolean

  fetchInsights: (userId: string, includeDismissed?: boolean) => Promise<void>
  generateInsights: (userId: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  dismiss: (id: string) => Promise<void>
  markAllRead: (userId: string) => Promise<void>
}

// Indexes ativos via filtragem in-memory (lista de não-dispensados)
// O badge usa `unreadCount` derivado.
export const useInsightsStore = create<InsightState>((set, get) => ({
  insights: [],
  loading: false,
  generating: false,

  fetchInsights: async (userId, includeDismissed = false) => {
    set({ loading: true })
    try {
      const data = await insightsService.list(userId, includeDismissed)
      set({ insights: data })
    } finally {
      set({ loading: false })
    }
  },

  generateInsights: async (userId) => {
    if (get().generating) return
    set({ generating: true })
    try {
      await insightsService.generate(userId)
      const data = await insightsService.list(userId, false)
      set({ insights: data })
    } finally {
      set({ generating: false })
    }
  },

  markRead: async (id) => {
    const updated = await insightsService.markRead(id)
    set((s) => ({
      insights: s.insights.map((i) => (i.id === id ? updated : i)),
    }))
  },

  dismiss: async (id) => {
    await insightsService.dismiss(id)
    set((s) => ({ insights: s.insights.filter((i) => i.id !== id) }))
  },

  markAllRead: async (userId) => {
    await insightsService.markAllRead(userId)
    set((s) => ({
      insights: s.insights.map((i) => ({ ...i, is_read: true })),
    }))
  },
}))
