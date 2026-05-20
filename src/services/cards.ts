import { supabase } from './supabase'
import type {
  CardInvoice,
  CardInvoicePayment,
  CardOwnerType,
  CreditCard,
  InvoiceStatus,
  Transaction,
} from '@/types'

export interface CreditCardFormData {
  name: string
  last_digits?: string | null
  color?: string | null
  limit_amount?: number | null
  closing_day?: number | null
  due_day: number
  owner_type: CardOwnerType
  owner_name?: string | null
  is_active?: boolean
}

// ============================================================================
// Helpers de data
// ============================================================================

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(s: string): Date {
  return new Date(s + 'T00:00:00')
}

/**
 * Dado um dia D e um cartão com closing_day/due_day, calcula a fatura onde
 * uma compra em D deve cair. Retorna { reference_month, closing_date, due_date }.
 *
 * Regras:
 *   - Se closing_day != null: fechamento = primeiro day=closing_day >= D.
 *     Vencimento = primeiro day=due_day >= closing_date.
 *   - Se closing_day == null: fechamento = D + 7 dias (heurística para cartões
 *     com fechamento variável). Vencimento = primeiro day=due_day após fechamento.
 *   - reference_month = mês/ano de due_date (convenção: a fatura "de junho"
 *     é a que vence em junho).
 */
export function computeInvoiceWindow(
  purchaseDate: string,
  closingDay: number | null,
  dueDay: number,
): { reference_month: string; closing_date: string; due_date: string } {
  const d = parseISO(purchaseDate)

  let closing: Date
  if (closingDay !== null) {
    closing = new Date(d.getFullYear(), d.getMonth(), closingDay)
    if (closing < d) {
      closing = new Date(d.getFullYear(), d.getMonth() + 1, closingDay)
    }
  } else {
    closing = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
  }

  let due = new Date(closing.getFullYear(), closing.getMonth(), dueDay)
  if (due < closing) {
    due = new Date(closing.getFullYear(), closing.getMonth() + 1, dueDay)
  }

  const ref = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`

  return {
    reference_month: ref,
    closing_date: toISO(closing),
    due_date: toISO(due),
  }
}

// ============================================================================
// CRUD de cartões
// ============================================================================

export const cardsService = {
  async list(userId: string): Promise<CreditCard[]> {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return (data ?? []) as CreditCard[]
  },

  async create(userId: string, data: CreditCardFormData): Promise<CreditCard> {
    const { data: card, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        last_digits: data.last_digits || null,
        color: data.color || null,
        limit_amount: data.limit_amount ?? null,
        closing_day: data.closing_day ?? null,
        due_day: data.due_day,
        owner_type: data.owner_type,
        owner_name: data.owner_name || null,
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return card as CreditCard
  },

  async update(id: string, data: Partial<CreditCardFormData>): Promise<CreditCard> {
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.last_digits !== undefined) payload.last_digits = data.last_digits || null
    if (data.color !== undefined) payload.color = data.color || null
    if (data.limit_amount !== undefined) payload.limit_amount = data.limit_amount
    if (data.closing_day !== undefined) payload.closing_day = data.closing_day
    if (data.due_day !== undefined) payload.due_day = data.due_day
    if (data.owner_type !== undefined) payload.owner_type = data.owner_type
    if (data.owner_name !== undefined) payload.owner_name = data.owner_name || null
    if (data.is_active !== undefined) payload.is_active = data.is_active

    const { data: card, error } = await supabase
      .from('credit_cards')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return card as CreditCard
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id)
    if (error) throw error
  },

  // ==========================================================================
  // Faturas
  // ==========================================================================

  async listInvoices(cardId: string): Promise<CardInvoice[]> {
    const { data, error } = await supabase
      .from('card_invoices')
      .select('*')
      .eq('card_id', cardId)
      .order('reference_month', { ascending: false })

    if (error) throw error
    return (data ?? []) as CardInvoice[]
  },

  async getInvoice(invoiceId: string): Promise<CardInvoice | null> {
    const { data, error } = await supabase
      .from('card_invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle()

    if (error) throw error
    return (data ?? null) as CardInvoice | null
  },

  /**
   * Encontra a fatura aberta do cartão onde uma compra na data D deve cair.
   * Se não existe, cria uma nova com base no closing_day/due_day do cartão.
   */
  async getOrCreateInvoiceForDate(
    card: CreditCard,
    purchaseDate: string,
  ): Promise<CardInvoice> {
    const window = computeInvoiceWindow(
      purchaseDate,
      card.closing_day,
      card.due_day,
    )

    // Procura fatura existente desse cartão para o mesmo reference_month
    const { data: existing, error: existingError } = await supabase
      .from('card_invoices')
      .select('*')
      .eq('card_id', card.id)
      .eq('reference_month', window.reference_month)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) return existing as CardInvoice

    // Cria fatura nova
    const { data: created, error: createError } = await supabase
      .from('card_invoices')
      .insert({
        card_id: card.id,
        reference_month: window.reference_month,
        closing_date: window.closing_date,
        due_date: window.due_date,
        total: 0,
        status: 'open',
      })
      .select()
      .single()

    if (createError) throw createError
    return created as CardInvoice
  },

  /**
   * Recalcula o `total` da fatura somando as transações vinculadas.
   * Chamado depois de inserir/remover transação com invoice_id.
   */
  async recalculateTotal(invoiceId: string): Promise<number> {
    const { data: rows, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('invoice_id', invoiceId)

    if (error) throw error
    const total = (rows ?? []).reduce(
      (s, r: { amount: number }) => s + Number(r.amount),
      0,
    )

    await supabase
      .from('card_invoices')
      .update({ total })
      .eq('id', invoiceId)

    return total
  },

  /**
   * Fecha a fatura manualmente (para cartões de fechamento variável).
   * Não cria a próxima — a próxima vai surgir quando uma nova compra cair fora.
   */
  async closeInvoice(invoiceId: string, closingDate?: string): Promise<CardInvoice> {
    const payload: Record<string, unknown> = { status: 'closed' }
    if (closingDate) payload.closing_date = closingDate
    const { data, error } = await supabase
      .from('card_invoices')
      .update(payload)
      .eq('id', invoiceId)
      .select()
      .single()
    if (error) throw error
    return data as CardInvoice
  },

  async listInvoiceTransactions(invoiceId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*), merchant:merchants(*)')
      .eq('invoice_id', invoiceId)
      .order('date', { ascending: true })

    if (error) throw error
    return (data ?? []) as Transaction[]
  },

  // ==========================================================================
  // Pagamentos de fatura
  // ==========================================================================

  async listPayments(invoiceId: string): Promise<CardInvoicePayment[]> {
    const { data, error } = await supabase
      .from('card_invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as CardInvoicePayment[]
  },

  /**
   * Registra um pagamento parcial ou total na fatura.
   *
   * Para cartão `self`: gera também uma transação de saída de caixa (despesa)
   * vinculada via payment.transaction_id.
   *
   * Para cartão `third_party`:
   *   - reimburse=true: gera transação de "Reembolso ao [owner_name]" (sai do caixa)
   *   - reimburse=false: só registra o pagamento sem mexer no caixa
   */
  async registerPayment(
    userId: string,
    card: CreditCard,
    invoice: CardInvoice,
    options: {
      amount: number
      paid_at: string
      reimburse?: boolean              // só usado quando owner_type='third_party'
      category_id?: string | null      // categoria da transação de saída
      account_id?: string | null       // conta de onde sai o dinheiro
      notes?: string | null
    },
  ): Promise<{ payment: CardInvoicePayment; transaction: Transaction | null; invoice: CardInvoice }> {
    let transactionId: string | null = null
    let transaction: Transaction | null = null

    const shouldCreateTransaction =
      card.owner_type === 'self' || options.reimburse === true

    if (shouldCreateTransaction) {
      const description =
        card.owner_type === 'third_party'
          ? `Reembolso fatura ${card.name}${card.owner_name ? ` (${card.owner_name})` : ''}`
          : `Pagamento fatura ${card.name} · ${invoice.reference_month}`

      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'expense',
          amount: options.amount,
          description,
          category_id: options.category_id ?? null,
          account_id: options.account_id ?? null,
          date: options.paid_at,
          notes: options.notes ?? null,
        })
        .select('*, category:categories(*)')
        .single()

      if (txError) throw txError
      transaction = tx as Transaction
      transactionId = transaction.id
    }

    const { data: payment, error: payError } = await supabase
      .from('card_invoice_payments')
      .insert({
        invoice_id: invoice.id,
        amount: options.amount,
        paid_at: options.paid_at,
        transaction_id: transactionId,
      })
      .select()
      .single()

    if (payError) throw payError

    // Verifica se quitou a fatura
    const { data: allPayments } = await supabase
      .from('card_invoice_payments')
      .select('amount')
      .eq('invoice_id', invoice.id)

    const paidTotal = (allPayments ?? []).reduce(
      (s, p: { amount: number }) => s + Number(p.amount),
      0,
    )

    let nextStatus: InvoiceStatus = invoice.status
    if (paidTotal >= invoice.total && invoice.total > 0) nextStatus = 'paid'
    else if (paidTotal > 0 && invoice.status === 'open') nextStatus = 'closed'

    let updatedInvoice = invoice
    if (nextStatus !== invoice.status) {
      const { data: upd, error: updError } = await supabase
        .from('card_invoices')
        .update({ status: nextStatus })
        .eq('id', invoice.id)
        .select()
        .single()
      if (updError) throw updError
      updatedInvoice = upd as CardInvoice
    }

    return {
      payment: payment as CardInvoicePayment,
      transaction,
      invoice: updatedInvoice,
    }
  },

  async deletePayment(paymentId: string): Promise<void> {
    // Busca o payment para limpar a transação vinculada (se houver) e
    // re-avaliar status da fatura depois.
    const { data: pay, error: payErr } = await supabase
      .from('card_invoice_payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (payErr) throw payErr
    const payment = pay as CardInvoicePayment

    if (payment.transaction_id) {
      await supabase.from('transactions').delete().eq('id', payment.transaction_id)
    }

    const { error: delErr } = await supabase
      .from('card_invoice_payments')
      .delete()
      .eq('id', paymentId)
    if (delErr) throw delErr

    // Re-avalia status da fatura
    const { data: remaining } = await supabase
      .from('card_invoice_payments')
      .select('amount')
      .eq('invoice_id', payment.invoice_id)

    const total = (remaining ?? []).reduce(
      (s, p: { amount: number }) => s + Number(p.amount),
      0,
    )

    const { data: inv } = await supabase
      .from('card_invoices')
      .select('total, status')
      .eq('id', payment.invoice_id)
      .single()

    let nextStatus: InvoiceStatus = (inv as { status: InvoiceStatus }).status
    const invTotal = (inv as { total: number }).total
    if (total >= invTotal && invTotal > 0) nextStatus = 'paid'
    else if (total === 0) nextStatus = 'open'
    else nextStatus = 'closed'

    await supabase
      .from('card_invoices')
      .update({ status: nextStatus })
      .eq('id', payment.invoice_id)
  },
}
