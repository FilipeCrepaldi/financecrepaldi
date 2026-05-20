// ============================================================
// ENUMS
// ============================================================

export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense' | 'both'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type MerchantKind = 'business' | 'person' | 'employer' | 'bank' | 'self'
export type CardOwnerType = 'self' | 'third_party'
export type InvoiceStatus = 'open' | 'closed' | 'paid'
export type AccountKind = 'checking' | 'savings' | 'cash' | 'investment'

// ============================================================
// ENTIDADES PRINCIPAIS
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  currency: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  is_default: boolean
  type: CategoryType
  created_at: string
}

export interface Tag {
  id: string
  user_id: string | null
  name: string
  color: string | null
  created_at: string
}

export interface Recurrence {
  id: string
  user_id: string
  name: string
  merchant_name: string | null
  merchant_id: string | null
  amount: number
  frequency: RecurrenceFrequency
  next_due_date: string
  category_id: string | null
  card_id: string | null
  account_id: string | null
  installment_total: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
  merchant?: Merchant
  card?: CreditCard
  account?: Account
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string | null
  merchant_name: string | null
  merchant_id: string | null
  category_id: string | null
  recurrence_id: string | null
  card_id: string | null
  invoice_id: string | null
  account_id: string | null
  transfer_pair_id: string | null
  installment_total: number | null
  installment_number: number | null
  installment_group_id: string | null
  date: string
  is_confirmed: boolean
  notes: string | null
  created_at: string
  updated_at: string
  category?: Category
  merchant?: Merchant
  card?: CreditCard
  account?: Account
  tags?: Tag[]
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: number
  year: number
  created_at: string
  updated_at: string
  category?: Category
  spent?: number
}

export interface MerchantAlias {
  id: string
  user_id: string | null
  pattern: string
  merchant_name: string
  category_id: string | null
  is_global: boolean
  created_at: string
}

export interface Merchant {
  id: string
  user_id: string
  name: string
  kind: MerchantKind | null
  default_category_id: string | null
  color: string | null
  aliases: string[] | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  last_digits: string | null
  color: string | null
  limit_amount: number | null
  closing_day: number | null
  due_day: number
  owner_type: CardOwnerType
  owner_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CardInvoice {
  id: string
  card_id: string
  reference_month: string  // 'YYYY-MM'
  closing_date: string     // date
  due_date: string         // date
  total: number
  status: InvoiceStatus
  created_at: string
  updated_at: string
  // joins opcionais
  card?: CreditCard
  payments?: CardInvoicePayment[]
  transactions?: Transaction[]
}

export interface CardInvoicePayment {
  id: string
  invoice_id: string
  amount: number
  paid_at: string
  transaction_id: string | null
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  kind: AccountKind
  initial_balance: number
  color: string | null
  icon: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  /** Saldo calculado (não persistido) — preenchido por getBalance() ou listWithBalances() */
  balance?: number
}

// ============================================================
// QUICK ENTRY
// ============================================================

export interface ParsedEntry {
  amount: number
  merchantRaw: string
  merchantName: string | null
  description: string | null
  categoryId: string | null
  date: string
  type: TransactionType
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardSummary {
  balance: number
  incomeThisMonth: number
  expenseThisMonth: number
  fixedExpenses: number
  variableExpenses: number
  committedPercent: number
  projectedBalance: number
}

export interface CategorySpend {
  category: Category
  amount: number
  percent: number
  transactionCount: number
}

// ============================================================
// FORMULÁRIOS
// ============================================================

export interface TransactionFormData {
  type: TransactionType
  amount: string
  description: string
  merchant_name: string
  merchant_id: string
  category_id: string
  card_id: string
  account_id: string
  installment_total: number
  date: string
  notes: string
  tags: string[]
}

export interface BudgetFormData {
  category_id: string
  amount: string
  month: number
  year: number
}

// ============================================================
// UTILITÁRIOS
// ============================================================

export type InsightType =
  | 'budget_overrun'
  | 'spike'
  | 'recurrence_missed'
  | 'streak'
  | 'card_limit'
  | 'card_commitment'
  | 'card_third_party'
  | 'invoice_due'

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'success'

export interface Insight {
  id: string
  user_id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  body: string
  meta: Record<string, unknown> | null
  is_read: boolean
  is_dismissed: boolean
  fingerprint: string
  created_at: string
}

export interface ApiError {
  message: string
  code?: string
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError }
