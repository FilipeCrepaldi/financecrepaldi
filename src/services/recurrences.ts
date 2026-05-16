import { supabase } from './supabase'
import type {
  Recurrence,
  RecurrenceFrequency,
  Transaction,
  TransactionType,
} from '@/types'
import { todayISO } from '@/utils'

export interface RecurrenceFormData {
  name: string
  merchant_name: string
  amount: string
  frequency: RecurrenceFrequency
  next_due_date: string
  category_id: string
}

export function advanceDate(date: string, frequency: RecurrenceFrequency): string {
  const d = new Date(date + 'T00:00:00')
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const recurrencesService = {
  async list(userId: string, includeInactive = false): Promise<Recurrence[]> {
    let query = supabase
      .from('recurrences')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true })

    if (!includeInactive) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Recurrence[]
  },

  async create(userId: string, data: RecurrenceFormData): Promise<Recurrence> {
    const { data: rec, error } = await supabase
      .from('recurrences')
      .insert({
        user_id: userId,
        name: data.name,
        merchant_name: data.merchant_name || null,
        amount: parseFloat(data.amount),
        frequency: data.frequency,
        next_due_date: data.next_due_date,
        category_id: data.category_id || null,
        is_active: true,
      })
      .select('*, category:categories(*)')
      .single()

    if (error) throw error
    return rec as Recurrence
  },

  async update(
    id: string,
    payload: Partial<Omit<RecurrenceFormData, 'amount'> & { amount: number; is_active: boolean }>,
  ): Promise<Recurrence> {
    const update: Record<string, unknown> = {}
    if (payload.name !== undefined) update.name = payload.name
    if (payload.merchant_name !== undefined)
      update.merchant_name = payload.merchant_name || null
    if (payload.amount !== undefined) update.amount = payload.amount
    if (payload.frequency !== undefined) update.frequency = payload.frequency
    if (payload.next_due_date !== undefined) update.next_due_date = payload.next_due_date
    if (payload.category_id !== undefined)
      update.category_id = payload.category_id || null
    if (payload.is_active !== undefined) update.is_active = payload.is_active

    const { data, error } = await supabase
      .from('recurrences')
      .update(update)
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()

    if (error) throw error
    return data as Recurrence
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('recurrences').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Marca a recorrência como paga: cria uma transação na data de hoje
   * e avança next_due_date conforme a frequência.
   */
  async markAsPaid(
    userId: string,
    rec: Recurrence,
  ): Promise<{ transaction: Transaction; recurrence: Recurrence }> {
    const type: TransactionType =
      rec.category?.type === 'income' ? 'income' : 'expense'

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type,
        amount: rec.amount,
        description: rec.name,
        merchant_name: rec.merchant_name,
        category_id: rec.category_id,
        date: todayISO(),
        recurrence_id: rec.id,
      })
      .select('*, category:categories(*)')
      .single()

    if (txError) throw txError

    const updated = await this.update(rec.id, {
      next_due_date: advanceDate(rec.next_due_date, rec.frequency),
    })

    return { transaction: tx as Transaction, recurrence: updated }
  },

  /**
   * Conta transações com merchant parecido nos últimos 90 dias.
   * Usado para sugerir virar transação em recorrência.
   */
  async detectSimilar(
    userId: string,
    merchantName: string,
    excludeId?: string,
  ): Promise<number> {
    if (!merchantName.trim()) return 0

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const since = ninetyDaysAgo.toISOString().slice(0, 10)

    let query = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .ilike('merchant_name', merchantName.trim())
      .gte('date', since)
      .is('recurrence_id', null)

    if (excludeId) query = query.neq('id', excludeId)

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  },

  /**
   * Verifica se já existe recorrência ativa com o mesmo merchant.
   */
  async existsForMerchant(userId: string, merchantName: string): Promise<boolean> {
    if (!merchantName.trim()) return false

    const { count, error } = await supabase
      .from('recurrences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)
      .ilike('merchant_name', merchantName.trim())

    if (error) throw error
    return (count ?? 0) > 0
  },
}
