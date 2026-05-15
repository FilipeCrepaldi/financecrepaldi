import { supabase } from './supabase'
import type { Tag } from '@/types'

export const tagsService = {
  async list(userId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name')

    if (error) throw error
    return data as Tag[]
  },

  async create(userId: string, name: string, color: string | null = null): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name, color })
      .select()
      .single()

    if (error) throw error
    return data as Tag
  },

  /**
   * Sincroniza tags de uma transação: insere as novas, remove as que saíram.
   */
  async syncTransactionTags(
    transactionId: string,
    newTagIds: string[],
    oldTagIds: string[],
  ): Promise<void> {
    const toAdd = newTagIds.filter((id) => !oldTagIds.includes(id))
    const toRemove = oldTagIds.filter((id) => !newTagIds.includes(id))

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('transaction_tags')
        .insert(toAdd.map((tag_id) => ({ transaction_id: transactionId, tag_id })))
      if (error) throw error
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId)
        .in('tag_id', toRemove)
      if (error) throw error
    }
  },
}
