// ============================================================
// ENUMS
// ============================================================

export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense' | 'both'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

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
  amount: number
  frequency: RecurrenceFrequency
  next_due_date: string
  category_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string | null
  merchant_name: string | null
  category_id: string | null
  recurrence_id: string | null
  date: string
  is_confirmed: boolean
  notes: string | null
  created_at: string
  updated_at: string
  category?: Category
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
  category_id: string
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

export interface ApiError {
  message: string
  code?: string
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError }
