import { supabase } from './supabase'
import type { Transaction, TransactionFormData } from '@/types'
import { format } from 'date-fns'

export const transactionsService = {
  async list(userId: string, filters?: {
    month?: number
    year?: number
    from?: string
    to?: string
    type?: string
    categoryId?: string
    limit?: number
  }) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        transaction_tags(tag:tags(*))
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.month && filters?.year) {
      const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
      const end = format(new Date(filters.year, filters.month, 0), 'yyyy-MM-dd')
      query = query.gte('date', start).lte('date', end)
    } else if (filters?.from || filters?.to) {
      if (filters.from) query = query.gte('date', filters.from)
      if (filters.to) query = query.lte('date', filters.to)
    }

    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters?.limit) query = query.limit(filters.limit)

    const { data, error } = await query

    if (error) throw error

    return data.map((t) => ({
      ...t,
      tags: t.transaction_tags?.map((tt: { tag: unknown }) => tt.tag) ?? [],
    })) as Transaction[]
  },

  async create(userId: string, data: TransactionFormData) {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description || null,
        merchant_name: data.merchant_name || null,
        category_id: data.category_id || null,
        date: data.date,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return transaction as Transaction
  },

  async update(id: string, data: Partial<TransactionFormData>) {
    const payload: Record<string, unknown> = {}
    if (data.type) payload.type = data.type
    if (data.amount) payload.amount = parseFloat(data.amount)
    if (data.description !== undefined) payload.description = data.description || null
    if (data.merchant_name !== undefined) payload.merchant_name = data.merchant_name || null
    if (data.category_id !== undefined) payload.category_id = data.category_id || null
    if (data.date) payload.date = data.date
    if (data.notes !== undefined) payload.notes = data.notes || null

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transaction as Transaction
  },

  async delete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },

  async getSummary(userId: string, month: number, year: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = format(new Date(year, month, 0), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, category_id, recurrence_id')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)

    if (error) throw error

    const income = data
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expense = data
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const fixed = data
      .filter((t) => t.type === 'expense' && t.recurrence_id)
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      incomeThisMonth: income,
      expenseThisMonth: expense,
      fixedExpenses: fixed,
      variableExpenses: expense - fixed,
      balance: income - expense,
      committedPercent: income > 0 ? Math.round((expense / income) * 100) : 0,
    }
  },
}
