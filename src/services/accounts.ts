import { supabase } from './supabase'
import type { Account, AccountKind, Transaction } from '@/types'

export interface AccountFormData {
  name: string
  kind: AccountKind
  initial_balance?: number
  color?: string | null
  icon?: string | null
  is_active?: boolean
}

export const accountsService = {
  async list(userId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as Account[]
  },

  /**
   * Lista contas com saldo calculado.
   * Saldo = initial_balance + sum(income) - sum(expense) — incluindo as pernas
   * de transferência (que são income/expense com transfer_pair_id setado).
   */
  async listWithBalances(userId: string): Promise<Account[]> {
    const accounts = await this.list(userId)
    if (accounts.length === 0) return []

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('account_id, type, amount')
      .eq('user_id', userId)
      .not('account_id', 'is', null)

    if (error) throw error

    const sumByAccount = new Map<string, number>()
    for (const t of txs ?? []) {
      const row = t as { account_id: string; type: string; amount: number }
      const cur = sumByAccount.get(row.account_id) ?? 0
      const amt = Number(row.amount)
      if (row.type === 'income') sumByAccount.set(row.account_id, cur + amt)
      else if (row.type === 'expense') sumByAccount.set(row.account_id, cur - amt)
    }

    return accounts.map((a) => ({
      ...a,
      balance: Number(a.initial_balance) + (sumByAccount.get(a.id) ?? 0),
    }))
  },

  async getBalance(accountId: string, initialBalance: number): Promise<number> {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('account_id', accountId)

    if (error) throw error
    let delta = 0
    for (const t of data ?? []) {
      const row = t as { type: string; amount: number }
      if (row.type === 'income') delta += Number(row.amount)
      else if (row.type === 'expense') delta -= Number(row.amount)
    }
    return Number(initialBalance) + delta
  },

  async create(userId: string, data: AccountFormData): Promise<Account> {
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        kind: data.kind,
        initial_balance: data.initial_balance ?? 0,
        color: data.color || null,
        icon: data.icon || null,
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return account as Account
  },

  async update(id: string, data: Partial<AccountFormData>): Promise<Account> {
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.kind !== undefined) payload.kind = data.kind
    if (data.initial_balance !== undefined)
      payload.initial_balance = data.initial_balance
    if (data.color !== undefined) payload.color = data.color || null
    if (data.icon !== undefined) payload.icon = data.icon || null
    if (data.is_active !== undefined) payload.is_active = data.is_active

    const { data: account, error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return account as Account
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Transfere valor entre duas contas. Cria par de transações:
   *   - out: type='expense' + transfer_pair_id=X + account_id=fromId
   *   - in:  type='income'  + transfer_pair_id=X + account_id=toId
   *
   * Ambas com mesmo transfer_pair_id (UUID novo). Filtros de receita/despesa
   * no resto do app ignoram transactions com transfer_pair_id != null.
   */
  async transfer(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    notes?: string | null,
  ): Promise<{ out: Transaction; in: Transaction }> {
    if (fromAccountId === toAccountId)
      throw new Error('Contas de origem e destino devem ser diferentes.')
    if (amount <= 0) throw new Error('Valor da transferência deve ser positivo.')

    const pairId = crypto.randomUUID()
    const description = 'Transferência'

    const { data: outTx, error: outError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'expense',
        amount,
        description,
        account_id: fromAccountId,
        transfer_pair_id: pairId,
        date,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (outError) throw outError

    const { data: inTx, error: inError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'income',
        amount,
        description,
        account_id: toAccountId,
        transfer_pair_id: pairId,
        date,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (inError) throw inError

    return { out: outTx as Transaction, in: inTx as Transaction }
  },

  /**
   * Move todas as transações/recorrências de uma conta para outra
   * (útil para limpar a 'Principal' após cadastrar contas reais).
   */
  async moveAllFrom(sourceId: string, targetId: string): Promise<void> {
    if (sourceId === targetId) return
    const { error: txErr } = await supabase
      .from('transactions')
      .update({ account_id: targetId })
      .eq('account_id', sourceId)
    if (txErr) throw txErr

    const { error: recErr } = await supabase
      .from('recurrences')
      .update({ account_id: targetId })
      .eq('account_id', sourceId)
    if (recErr) throw recErr
  },
}
