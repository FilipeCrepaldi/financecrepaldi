import { create } from 'zustand'
import { recurrencesService } from '@/services'
import type { Recurrence } from '@/types'

interface RecurrenceState {
  recurrences: Recurrence[]
  loading: boolean
  showInactive: boolean

  setShowInactive: (v: boolean) => void
  fetchRecurrences: (userId: string) => Promise<void>
  addRecurrence: (r: Recurrence) => void
  updateRecurrence: (r: Recurrence) => void
  removeRecurrence: (id: string) => void
}

export const useRecurrencesStore = create<RecurrenceState>((set, get) => ({
  recurrences: [],
  loading: false,
  showInactive: false,

  setShowInactive: (v) => set({ showInactive: v }),

  fetchRecurrences: async (userId) => {
    set({ loading: true })
    try {
      const data = await recurrencesService.list(userId, get().showInactive)
      set({ recurrences: data })
    } finally {
      set({ loading: false })
    }
  },

  addRecurrence: (r) =>
    set((s) => ({ recurrences: [r, ...s.recurrences] })),

  updateRecurrence: (r) =>
    set((s) => ({
      recurrences: s.recurrences.map((x) => (x.id === r.id ? r : x)),
    })),

  removeRecurrence: (id) =>
    set((s) => ({ recurrences: s.recurrences.filter((r) => r.id !== id) })),
}))
