import { supabase } from './supabase'
import type { CreditCard, Transaction, TransactionFormData } from '@/types'
import { format } from 'date-fns'
import { addMonthsISO } from '@/utils'
import { cardsService } from './cards'

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

  async create(
    userId: string,
    data: TransactionFormData,
    extra?: { invoice_id?: string | null; installment_group_id?: string | null; installment_number?: number | null },
  ) {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description || null,
        merchant_name: data.merchant_name || null,
        merchant_id: data.merchant_id || null,
        category_id: data.category_id || null,
        card_id: data.card_id || null,
        invoice_id: extra?.invoice_id ?? null,
        account_id: data.card_id ? null : (data.account_id || null),
        installment_total: data.installment_total && data.installment_total > 1
          ? data.installment_total
          : null,
        installment_number: extra?.installment_number ?? null,
        installment_group_id: extra?.installment_group_id ?? null,
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
    if (data.merchant_id !== undefined) payload.merchant_id = data.merchant_id || null
    if (data.category_id !== undefined) payload.category_id = data.category_id || null
    const updatedCardId = data.card_id !== undefined ? (data.card_id || null) : undefined
    if (updatedCardId !== undefined) payload.card_id = updatedCardId
    if (data.account_id !== undefined) {
      // Pagamento com cartão → account_id deve ser null para não contar no saldo da conta
      payload.account_id = updatedCardId ? null : (data.account_id || null)
    }
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

  /**
   * Cria uma compra parcelada em N transações no cartão.
   *
   * Cada parcela:
   *   - mesmo `installment_group_id` (uuid) que agrupa todas
   *   - amount = total / N (arredondamento simples)
   *   - parcela K (1..N): data K = data + (K-1) meses, atribuída à fatura
   *     calculada por getOrCreateInvoiceForDate
   *
   * Atualiza o total cacheado de cada fatura afetada ao final.
   */
  async createWithInstallments(
    userId: string,
    data: TransactionFormData,
    card: CreditCard,
  ): Promise<Transaction[]> {
    const n = Math.max(1, Math.floor(data.installment_total || 1))
    if (n < 2) {
      // Não é parcelamento real — caller deve usar create().
      throw new Error('installment_total deve ser >= 2 para parcelamento.')
    }
    const total = parseFloat(data.amount)
    if (!total || total <= 0) throw new Error('Valor inválido.')
    const per = Math.round((total / n) * 100) / 100
    const groupId = crypto.randomUUID()

    const affectedInvoices = new Set<string>()
    const created: Transaction[] = []

    for (let k = 1; k <= n; k++) {
      const date = k === 1 ? data.date : addMonthsISO(data.date, k - 1)
      const invoice = await cardsService.getOrCreateInvoiceForDate(card, date)
      affectedInvoices.add(invoice.id)

      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: data.type,
          amount: per,
          description: data.description || null,
          merchant_name: data.merchant_name || null,
          merchant_id: data.merchant_id || null,
          category_id: data.category_id || null,
          card_id: card.id,
          invoice_id: invoice.id,
          account_id: null, // parcela de cartão não tem account_id direto
          installment_total: n,
          installment_number: k,
          installment_group_id: groupId,
          date,
          notes: data.notes || null,
        })
        .select()
        .single()

      if (error) throw error
      created.push(tx as Transaction)
    }

    // Recalcula totais das faturas afetadas
    await Promise.all(
      Array.from(affectedInvoices).map((id) => cardsService.recalculateTotal(id)),
    )

    return created
  },

  async getSummary(userId: string, month: number, year: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = format(new Date(year, month, 0), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, category_id, recurrence_id, card_id, transfer_pair_id')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)

    if (error) throw error

    // Filtros:
    //   - Compras no cartão (card_id != null) → vão pro cardCommitted, fora do saldo
    //   - Transferências entre contas (transfer_pair_id != null) → não contam como receita/despesa
    const cashFlow = data.filter((t) => !t.card_id && !t.transfer_pair_id)

    const income = cashFlow
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expense = cashFlow
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const fixed = cashFlow
      .filter((t) => t.type === 'expense' && t.recurrence_id)
      .reduce((sum, t) => sum + t.amount, 0)

    // Compromissos em cartão neste mês (independente de quando a fatura vence)
    const cardCommitted = data
      .filter((t) => t.card_id && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      incomeThisMonth: income,
      expenseThisMonth: expense,
      fixedExpenses: fixed,
      variableExpenses: expense - fixed,
      cardCommitted,
      balance: income - expense,
      committedPercent: income > 0 ? Math.round((expense / income) * 100) : 0,
    }
  },
}
