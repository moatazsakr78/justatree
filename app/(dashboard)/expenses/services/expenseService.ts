import { supabase } from '@/app/lib/supabase/client'

// ===== Types =====

export interface ExpenseCategory {
  id: string
  name: string
  parent_id: string | null
  icon: string | null
  color: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  amount: number
  description: string
  category_id: string | null
  record_id: string | null
  drawer_id: string | null
  transaction_id: string | null
  branch_id: string | null
  user_id: string
  performed_by: string | null
  receipt_url: string | null
  recurring_expense_id: string | null
  is_recurring: boolean
  payment_method_id: string | null
  status: string
  created_at: string
  updated_at: string
  // Joined fields
  category_name?: string
  category_color?: string
  safe_name?: string
}

export interface RecurringExpense {
  id: string
  name: string
  amount: number
  description: string | null
  category_id: string | null
  record_id: string | null
  frequency: string
  day_of_month: number | null
  day_of_week: number | null
  is_active: boolean
  last_generated_at: string | null
  next_due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  category_name?: string
  safe_name?: string
}

export interface ExpenseBudget {
  id: string
  category_id: string
  budget_amount: number
  period_type: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed
  category_name?: string
  spent?: number
  remaining?: number
  percentage?: number
}

export interface CreateExpenseParams {
  amount: number
  description: string
  categoryId: string
  recordId: string
  drawerId: string
  branchId?: string
  userId: string
  userName: string
  receiptUrl?: string
  recurringExpenseId?: string
  paymentMethodId?: string
}

// ===== Utility =====

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

// ===== Category CRUD =====

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []) as any as ExpenseCategory[]
}

export async function createExpenseCategory(params: {
  name: string
  parentId?: string | null
  icon?: string
  color?: string
}): Promise<ExpenseCategory> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name: params.name,
      parent_id: params.parentId || null,
      icon: params.icon || null,
      color: params.color || null,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data as any as ExpenseCategory
}

export async function updateExpenseCategory(
  id: string,
  params: { name?: string; parentId?: string | null; icon?: string; color?: string; is_active?: boolean }
): Promise<ExpenseCategory> {
  const updateData: any = {}
  if (params.name !== undefined) updateData.name = params.name
  if (params.parentId !== undefined) updateData.parent_id = params.parentId
  if (params.icon !== undefined) updateData.icon = params.icon
  if (params.color !== undefined) updateData.color = params.color
  if (params.is_active !== undefined) updateData.is_active = params.is_active
  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('expense_categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as any as ExpenseCategory
}

const ROOT_CATEGORY_ID = 'a0000001-0000-0000-0000-000000000000'

export async function deleteExpenseCategory(id: string): Promise<void> {
  if (id === ROOT_CATEGORY_ID) {
    throw new Error('لا يمكن حذف التصنيف الرئيسي "مصروفات"')
  }

  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ===== Expense CRUD (Dual-Write) =====

export async function createExpense(params: CreateExpenseParams): Promise<Expense> {
  const balanceDelta = -params.amount

  // Step 1: Atomic balance adjustment
  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    'atomic_adjust_drawer_balance' as any,
    { p_drawer_id: params.drawerId, p_change: balanceDelta }
  )
  if (rpcErr) throw rpcErr
  const newBalance = rpcResult?.[0]?.new_balance ?? 0

  // Step 2: Create cash_drawer_transaction
  const { data: txn, error: txnError } = await supabase
    .from('cash_drawer_transactions')
    .insert({
      drawer_id: params.drawerId,
      record_id: params.recordId,
      transaction_type: 'expense',
      amount: params.amount,
      balance_after: roundMoney(newBalance),
      notes: params.description,
      performed_by: params.userName,
    } as any)
    .select('id')
    .single()

  if (txnError) {
    // Rollback balance
    await supabase.rpc('atomic_adjust_drawer_balance' as any, {
      p_drawer_id: params.drawerId, p_change: -balanceDelta
    })
    throw txnError
  }

  // Step 3: Create expense record
  const { data: expense, error: expError } = await supabase
    .from('expenses')
    .insert({
      amount: params.amount,
      description: params.description,
      category_id: params.categoryId,
      record_id: params.recordId,
      drawer_id: params.drawerId,
      transaction_id: (txn as any).id,
      branch_id: params.branchId || null,
      user_id: params.userId,
      performed_by: params.userName,
      receipt_url: params.receiptUrl || null,
      recurring_expense_id: params.recurringExpenseId || null,
      is_recurring: !!params.recurringExpenseId,
      payment_method_id: params.paymentMethodId || null,
      status: 'completed',
    } as any)
    .select()
    .single()

  if (expError) {
    console.error('Failed to create expense record (transaction was recorded):', expError)
    throw expError
  }

  return expense as any as Expense
}

export async function deleteExpense(expense: Expense): Promise<void> {
  // Step 1: Reverse the balance change
  if (expense.drawer_id) {
    await supabase.rpc('atomic_adjust_drawer_balance' as any, {
      p_drawer_id: expense.drawer_id, p_change: expense.amount
    })
  }

  // Step 2: Delete the cash_drawer_transaction
  if (expense.transaction_id) {
    await supabase
      .from('cash_drawer_transactions')
      .delete()
      .eq('id', expense.transaction_id)
  }

  // Step 3: Delete the expense record
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expense.id)

  if (error) throw error
}

export async function updateExpense(
  id: string,
  params: { description?: string; categoryId?: string; receiptUrl?: string }
): Promise<void> {
  const updateData: any = { updated_at: new Date().toISOString() }
  if (params.description !== undefined) updateData.description = params.description
  if (params.categoryId !== undefined) updateData.category_id = params.categoryId
  if (params.receiptUrl !== undefined) updateData.receipt_url = params.receiptUrl

  const { error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

// ===== Recurring Expenses =====

export async function fetchRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Fetch category names
  const categoryIds = Array.from(new Set((data || []).map((r: any) => r.category_id).filter(Boolean)))
  let categoryMap: Record<string, string> = {}
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from('expense_categories')
      .select('id, name')
      .in('id', categoryIds)
    if (cats) {
      categoryMap = Object.fromEntries((cats as any[]).map(c => [c.id, c.name]))
    }
  }

  // Fetch safe names
  const recordIds = Array.from(new Set((data || []).map((r: any) => r.record_id).filter(Boolean)))
  let safeMap: Record<string, string> = {}
  if (recordIds.length > 0) {
    const { data: safes } = await supabase
      .from('records')
      .select('id, name')
      .in('id', recordIds)
    if (safes) {
      safeMap = Object.fromEntries((safes as any[]).map(s => [s.id, s.name]))
    }
  }

  return ((data || []) as any[]).map(r => ({
    ...r,
    category_name: categoryMap[r.category_id] || '',
    safe_name: safeMap[r.record_id] || '',
  }))
}

export async function createRecurringExpense(params: {
  name: string
  amount: number
  description?: string
  categoryId: string
  recordId: string
  frequency: string
  dayOfMonth?: number
  dayOfWeek?: number
  createdBy: string
}): Promise<RecurringExpense> {
  const nextDueDate = calculateNextDueDate(params.frequency, new Date(), params.dayOfMonth, params.dayOfWeek)

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      name: params.name,
      amount: params.amount,
      description: params.description || null,
      category_id: params.categoryId,
      record_id: params.recordId,
      frequency: params.frequency,
      day_of_month: params.dayOfMonth || null,
      day_of_week: params.dayOfWeek || null,
      next_due_date: nextDueDate.toISOString().split('T')[0],
      created_by: params.createdBy,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data as any as RecurringExpense
}

export async function updateRecurringExpense(
  id: string,
  params: Partial<{
    name: string
    amount: number
    description: string
    categoryId: string
    recordId: string
    frequency: string
    dayOfMonth: number
    isActive: boolean
  }>
): Promise<void> {
  const updateData: any = { updated_at: new Date().toISOString() }
  if (params.name !== undefined) updateData.name = params.name
  if (params.amount !== undefined) updateData.amount = params.amount
  if (params.description !== undefined) updateData.description = params.description
  if (params.categoryId !== undefined) updateData.category_id = params.categoryId
  if (params.recordId !== undefined) updateData.record_id = params.recordId
  if (params.frequency !== undefined) updateData.frequency = params.frequency
  if (params.dayOfMonth !== undefined) updateData.day_of_month = params.dayOfMonth
  if (params.isActive !== undefined) updateData.is_active = params.isActive

  const { error } = await supabase
    .from('recurring_expenses')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function markRecurringGenerated(id: string, frequency: string, dayOfMonth?: number, dayOfWeek?: number): Promise<void> {
  const now = new Date()
  const nextDue = calculateNextDueDate(frequency, now, dayOfMonth, dayOfWeek)

  const { error } = await supabase
    .from('recurring_expenses')
    .update({
      last_generated_at: now.toISOString(),
      next_due_date: nextDue.toISOString().split('T')[0],
      updated_at: now.toISOString(),
    } as any)
    .eq('id', id)

  if (error) throw error
}

// ===== Budget CRUD =====

export async function fetchExpenseBudgets(): Promise<ExpenseBudget[]> {
  const { data, error } = await supabase
    .from('expense_budgets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as any as ExpenseBudget[]
}

export async function createExpenseBudget(params: {
  categoryId: string
  budgetAmount: number
  periodType: string
}): Promise<ExpenseBudget> {
  const { data, error } = await supabase
    .from('expense_budgets')
    .insert({
      category_id: params.categoryId,
      budget_amount: params.budgetAmount,
      period_type: params.periodType,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data as any as ExpenseBudget
}

export async function updateExpenseBudget(
  id: string,
  params: { budgetAmount?: number; periodType?: string; isActive?: boolean }
): Promise<void> {
  const updateData: any = { updated_at: new Date().toISOString() }
  if (params.budgetAmount !== undefined) updateData.budget_amount = params.budgetAmount
  if (params.periodType !== undefined) updateData.period_type = params.periodType
  if (params.isActive !== undefined) updateData.is_active = params.isActive

  const { error } = await supabase
    .from('expense_budgets')
    .update(updateData)
    .eq('id', id)

  if (error) throw error
}

export async function deleteExpenseBudget(id: string): Promise<void> {
  const { error } = await supabase
    .from('expense_budgets')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ===== Helpers =====

export function calculateNextDueDate(
  frequency: string,
  fromDate: Date,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const next = new Date(fromDate)
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      if (dayOfMonth) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(dayOfMonth, maxDay))
      }
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

export function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    yearly: 'سنوي',
  }
  return labels[frequency] || frequency
}

// Build tree from flat categories
export interface CategoryTreeNode {
  id: string
  name: string
  parent_id: string | null
  icon: string | null
  color: string | null
  is_active: boolean
  isExpanded?: boolean
  children: CategoryTreeNode[]
}

export function buildCategoryTree(categories: ExpenseCategory[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()

  // Create nodes
  categories.forEach(cat => {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id,
      icon: cat.icon,
      color: cat.color,
      is_active: cat.is_active,
      isExpanded: false,
      children: [],
    })
  })

  // Build tree
  const roots: CategoryTreeNode[] = []
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}
