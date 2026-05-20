import { create } from 'zustand'
import { accountsService } from '@/services'
import type { Account } from '@/types'

interface AccountsState {
  accounts: Account[]
  loading: boolean
  defaultAccountId: string | null

  fetchAccounts: (userId: string) => Promise<void>
  refreshBalances: (userId: string) => Promise<void>
  addAccount: (a: Account) => void
  updateAccount: (a: Account) => void
  removeAccount: (id: string) => void
  setDefaultAccount: (id: string) => void
}

const STORAGE_KEY = 'fm:default_account_id'

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  loading: false,
  defaultAccountId:
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null,

  fetchAccounts: async (userId) => {
    set({ loading: true })
    try {
      const data = await accountsService.listWithBalances(userId)
      set((s) => {
        // Mantém defaultAccountId se válido; senão pega a primeira ativa
        const stored = s.defaultAccountId
        const valid = stored && data.some((a) => a.id === stored && a.is_active)
        const fallback = data.find((a) => a.is_active)?.id ?? null
        return {
          accounts: data,
          defaultAccountId: valid ? stored : fallback,
        }
      })
    } finally {
      set({ loading: false })
    }
  },

  refreshBalances: async (userId) => {
    const data = await accountsService.listWithBalances(userId)
    set({ accounts: data })
  },

  addAccount: (a) =>
    set((s) => ({
      accounts: [...s.accounts, a].sort(
        (x, y) =>
          Number(y.is_active) - Number(x.is_active) || x.name.localeCompare(y.name),
      ),
    })),

  updateAccount: (a) =>
    set((s) => ({
      accounts: s.accounts.map((x) => (x.id === a.id ? { ...x, ...a } : x)),
    })),

  removeAccount: (id) =>
    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
      defaultAccountId: s.defaultAccountId === id ? null : s.defaultAccountId,
    })),

  setDefaultAccount: (id) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id)
    set({ defaultAccountId: id })
  },
}))
