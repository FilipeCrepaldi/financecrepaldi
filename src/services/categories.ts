import { supabase } from './supabase'
import type { Category } from '@/types'

export const categoriesService = {
  async list(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name')

    if (error) throw error
    return data as Category[]
  },

  async create(userId: string, payload: Omit<Category, 'id' | 'user_id' | 'created_at' | 'is_default'>) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...payload, user_id: userId, is_default: false })
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async getMerchantAliases(userId: string) {
    const { data, error } = await supabase
      .from('merchant_aliases')
      .select('*, category:categories(*)')
      .or(`user_id.eq.${userId},is_global.eq.true`)

    if (error) throw error
    return data
  },
}
