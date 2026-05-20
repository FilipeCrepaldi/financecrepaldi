import { supabase } from './supabase'
import type { Merchant, MerchantKind } from '@/types'

export interface MerchantFormData {
  name: string
  kind?: MerchantKind | null
  default_category_id?: string | null
  color?: string | null
}

export const merchantsService = {
  async list(userId: string): Promise<Merchant[]> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*, category:categories!default_category_id(*)')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as Merchant[]
  },

  async create(userId: string, data: MerchantFormData): Promise<Merchant> {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        kind: data.kind ?? null,
        default_category_id: data.default_category_id || null,
        color: data.color || null,
      })
      .select('*, category:categories!default_category_id(*)')
      .single()

    if (error) throw error
    return merchant as Merchant
  },

  async update(id: string, data: Partial<MerchantFormData>): Promise<Merchant> {
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.kind !== undefined) payload.kind = data.kind
    if (data.default_category_id !== undefined)
      payload.default_category_id = data.default_category_id || null
    if (data.color !== undefined) payload.color = data.color || null

    const { data: merchant, error } = await supabase
      .from('merchants')
      .update(payload)
      .eq('id', id)
      .select('*, category:categories!default_category_id(*)')
      .single()

    if (error) throw error
    return merchant as Merchant
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('merchants').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Mescla `sourceId` em `targetId`: move todas as transactions/recurrences
   * vinculadas ao source para o target, depois deleta o source.
   * Também sincroniza merchant_name nas transações migradas com o nome do target
   * (para manter consistência visual em buscas que usam merchant_name).
   */
  async merge(sourceId: string, targetId: string): Promise<void> {
    if (sourceId === targetId) return

    // Busca nome do target para sincronizar merchant_name
    const { data: target, error: targetError } = await supabase
      .from('merchants')
      .select('name')
      .eq('id', targetId)
      .single()

    if (targetError) throw targetError
    const targetName = (target as { name: string }).name

    const { error: txError } = await supabase
      .from('transactions')
      .update({ merchant_id: targetId, merchant_name: targetName })
      .eq('merchant_id', sourceId)

    if (txError) throw txError

    const { error: recError } = await supabase
      .from('recurrences')
      .update({ merchant_id: targetId, merchant_name: targetName })
      .eq('merchant_id', sourceId)

    if (recError) throw recError

    const { error: delError } = await supabase
      .from('merchants')
      .delete()
      .eq('id', sourceId)

    if (delError) throw delError
  },

  /**
   * Procura merchant pelo nome (case-insensitive, exact).
   * Útil para evitar duplicatas na criação inline.
   */
  async findByName(userId: string, name: string): Promise<Merchant | null> {
    const trimmed = name.trim()
    if (!trimmed) return null

    const { data, error } = await supabase
      .from('merchants')
      .select('*, category:categories!default_category_id(*)')
      .eq('user_id', userId)
      .ilike('name', trimmed)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return (data ?? null) as Merchant | null
  },
}
