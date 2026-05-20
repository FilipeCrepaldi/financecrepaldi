import { create } from 'zustand'
import { cardsService } from '@/services'
import type { CardInvoice, CreditCard } from '@/types'

interface CardsState {
  cards: CreditCard[]
  invoicesByCard: Record<string, CardInvoice[]>
  loading: boolean

  fetchCards: (userId: string) => Promise<void>
  fetchInvoices: (cardId: string) => Promise<CardInvoice[]>
  addCard: (c: CreditCard) => void
  updateCard: (c: CreditCard) => void
  removeCard: (id: string) => void
  upsertInvoice: (invoice: CardInvoice) => void
}

export const useCardsStore = create<CardsState>((set) => ({
  cards: [],
  invoicesByCard: {},
  loading: false,

  fetchCards: async (userId) => {
    set({ loading: true })
    try {
      const data = await cardsService.list(userId)
      set({ cards: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchInvoices: async (cardId) => {
    const data = await cardsService.listInvoices(cardId)
    set((s) => ({ invoicesByCard: { ...s.invoicesByCard, [cardId]: data } }))
    return data
  },

  addCard: (c) =>
    set((s) => ({
      cards: [...s.cards, c].sort(
        (a, b) =>
          Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name),
      ),
    })),

  updateCard: (c) =>
    set((s) => ({
      cards: s.cards.map((x) => (x.id === c.id ? c : x)),
    })),

  removeCard: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.invoicesByCard
      void _removed
      return {
        cards: s.cards.filter((c) => c.id !== id),
        invoicesByCard: rest,
      }
    }),

  upsertInvoice: (invoice) =>
    set((s) => {
      const list = s.invoicesByCard[invoice.card_id] ?? []
      const exists = list.some((i) => i.id === invoice.id)
      const next = exists
        ? list.map((i) => (i.id === invoice.id ? invoice : i))
        : [invoice, ...list]
      return {
        invoicesByCard: { ...s.invoicesByCard, [invoice.card_id]: next },
      }
    }),
}))
