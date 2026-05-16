import { supabase } from './supabase'
import type { Budget, BudgetFormData } from '@/types'

export const budgetsService = {
  async list(userId: string, month: number, year: number): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('amount', { ascending: false })

    if (error) throw error
    return data as Budget[]
  },

  async create(userId: string, data: BudgetFormData): Promise<Budget> {
    const { data: budget, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category_id: data.category_id,
        amount: parseFloat(data.amount),
        month: data.month,
        year: data.year,
      })
      .select('*, category:categories(*)')
      .single()

    if (error) throw error
    return budget as Budget
  },

  async update(id: string, amount: number): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .update({ amount })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()

    if (error) throw error
    return data as Budget
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Copia todos os orçamentos de um mês de origem para o destino.
   * Retorna os orçamentos criados.
   */
  async copyFromMonth(
    userId: string,
    fromMonth: number,
    fromYear: number,
    toMonth: number,
    toYear: number,
  ): Promise<Budget[]> {
    const source = await this.list(userId, fromMonth, fromYear)
    if (source.length === 0) return []

    const { data, error } = await supabase
      .from('budgets')
      .insert(
        source.map((b) => ({
          user_id: userId,
          category_id: b.category_id,
          amount: b.amount,
          month: toMonth,
          year: toYear,
        })),
      )
      .select('*, category:categories(*)')

    if (error) throw error
    return (data ?? []) as Budget[]
  },
}
