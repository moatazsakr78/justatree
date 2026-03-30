'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/app/lib/supabase/client'
import {
  fetchExpenseBudgets,
  createExpenseBudget,
  updateExpenseBudget,
  deleteExpenseBudget,
  type ExpenseBudget,
  type ExpenseCategory,
} from '../services/expenseService'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useFormatPrice } from '@/lib/hooks/useCurrency'

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'أسبوعي',
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  yearly: 'سنوي',
}

interface BudgetWithSpent extends ExpenseBudget {
  category_name: string
  category_color: string
  spent: number
  remaining: number
  percentage: number
}

export default function BudgetsTab() {
  const formatPrice = useFormatPrice()
  const { categories } = useExpenseCategories()
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<BudgetWithSpent | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const rawBudgets = await fetchExpenseBudgets()

      // Get period boundaries for spending calculation
      const now = new Date()
      const periodStarts: Record<string, string> = {
        weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        monthly: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        quarterly: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString(),
        yearly: new Date(now.getFullYear(), 0, 1).toISOString(),
      }

      // Category map
      const catMap: Record<string, { name: string; color: string }> = {}
      categories.forEach(c => { catMap[c.id] = { name: c.name, color: c.color || '#6b7280' } })

      // Calculate spent per budget
      const enriched: BudgetWithSpent[] = []

      for (const budget of rawBudgets) {
        const startDate = periodStarts[budget.period_type] || periodStarts.monthly
        const cat = catMap[budget.category_id] || { name: 'غير معروف', color: '#6b7280' }

        // Get all child category IDs for recursive budget tracking
        const categoryIds = getCategoryAndChildIds(budget.category_id, categories)

        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('status', 'completed')
          .in('category_id', categoryIds)
          .gte('created_at', startDate)
          .lte('created_at', now.toISOString())

        const spent = (expenses as any[] || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        const remaining = budget.budget_amount - spent
        const percentage = budget.budget_amount > 0 ? Math.round((spent / budget.budget_amount) * 100) : 0

        enriched.push({
          ...budget,
          category_name: cat.name,
          category_color: cat.color,
          spent,
          remaining,
          percentage,
        })
      }

      setBudgets(enriched)
    } catch (error) {
      console.error('Error loading budgets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [categories])

  useEffect(() => { load() }, [load])

  const handleDelete = async (budget: BudgetWithSpent) => {
    if (!confirm(`هل أنت متأكد من حذف ميزانية "${budget.category_name}"؟`)) return
    try {
      await deleteExpenseBudget(budget.id)
      load()
    } catch (error: any) {
      alert(`خطأ: ${error.message}`)
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--dash-text-primary)]">الميزانيات</h3>
        <button
          onClick={() => { setEditBudget(null); setIsModalOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          إضافة ميزانية
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[var(--dash-text-muted)]">جاري التحميل...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--dash-text-muted)] mb-3">لا توجد ميزانيات</p>
          <p className="text-xs text-[var(--dash-text-muted)] mb-4">حدد ميزانية لكل تصنيف لتتبع الإنفاق</p>
          <button onClick={() => { setEditBudget(null); setIsModalOpen(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            + إضافة ميزانية
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgets.map(budget => {
            const progressColor = budget.percentage > 90 ? '#ef4444' : budget.percentage > 70 ? '#f59e0b' : '#10b981'
            const isOver = budget.percentage > 100

            return (
              <div key={budget.id} className={`bg-[var(--dash-bg-raised)] border rounded-xl p-4 ${
                isOver ? 'border-red-500/40' : 'border-[var(--dash-border-subtle)]'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.category_color }} />
                    <span className="text-sm font-semibold text-[var(--dash-text-primary)]">{budget.category_name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)]">
                    {PERIOD_LABELS[budget.period_type] || budget.period_type}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--dash-text-muted)]">مصروف</span>
                    <span style={{ color: progressColor }} className="font-medium">{budget.percentage}%</span>
                  </div>
                  <div className="h-2 bg-[var(--dash-bg-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(budget.percentage, 100)}%`, backgroundColor: progressColor }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex justify-between text-xs mt-2">
                  <div>
                    <span className="text-[var(--dash-text-muted)]">مصروف: </span>
                    <span className="text-red-400 font-medium">{formatPrice(budget.spent)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--dash-text-muted)]">الميزانية: </span>
                    <span className="text-[var(--dash-text-primary)] font-medium">{formatPrice(budget.budget_amount)}</span>
                  </div>
                </div>

                {budget.remaining > 0 ? (
                  <div className="text-xs text-green-400 mt-1">متبقي: {formatPrice(budget.remaining)}</div>
                ) : (
                  <div className="text-xs text-red-400 font-medium mt-1">تجاوز بـ {formatPrice(Math.abs(budget.remaining))}</div>
                )}

                {/* Actions */}
                <div className="flex gap-1 mt-3 pt-2 border-t border-[var(--dash-border-subtle)]">
                  <button onClick={() => { setEditBudget(budget); setIsModalOpen(true) }}
                    className="p-1.5 rounded hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-yellow-400">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(budget)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-[var(--dash-text-muted)] hover:text-red-400">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditBudget(null) }}
        onSuccess={load}
        editBudget={editBudget}
        categories={categories}
        existingBudgets={budgets}
      />
    </div>
  )
}

// Helper to get category + all child IDs
function getCategoryAndChildIds(categoryId: string, categories: ExpenseCategory[]): string[] {
  const ids = [categoryId]
  const children = categories.filter(c => c.parent_id === categoryId)
  for (const child of children) {
    ids.push(...getCategoryAndChildIds(child.id, categories))
  }
  return ids
}

// Budget Modal
function BudgetModal({ isOpen, onClose, onSuccess, editBudget, categories, existingBudgets }: {
  isOpen: boolean; onClose: () => void; onSuccess: () => void
  editBudget: BudgetWithSpent | null; categories: ExpenseCategory[]; existingBudgets: BudgetWithSpent[]
}) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [periodType, setPeriodType] = useState('monthly')
  const [isSaving, setIsSaving] = useState(false)
  const [isCatOpen, setIsCatOpen] = useState(false)

  useEffect(() => {
    if (editBudget && isOpen) {
      setCategoryId(editBudget.category_id)
      setAmount(String(editBudget.budget_amount))
      setPeriodType(editBudget.period_type)
    } else if (!editBudget && isOpen) {
      setCategoryId(''); setAmount(''); setPeriodType('monthly')
    }
  }, [editBudget, isOpen])

  const handleSubmit = async () => {
    if (!categoryId) { alert('يرجى اختيار التصنيف'); return }
    if (!parseFloat(amount) || parseFloat(amount) <= 0) { alert('يرجى إدخال مبلغ صحيح'); return }

    setIsSaving(true)
    try {
      if (editBudget) {
        await updateExpenseBudget(editBudget.id, { budgetAmount: parseFloat(amount), periodType })
      } else {
        await createExpenseBudget({ categoryId, budgetAmount: parseFloat(amount), periodType })
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      alert(`خطأ: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCat = categories.find(c => c.id === categoryId)
  // Filter out categories that already have a budget
  const availableCategories = categories.filter(c =>
    editBudget ? true : !existingBudgets.some(b => b.category_id === c.id && b.period_type === periodType)
  )

  const getCategoryOptions = () => {
    const options: { id: string; name: string; depth: number }[] = []
    const addChildren = (parentId: string | null, depth: number) => {
      availableCategories.filter(c => c.parent_id === parentId).forEach(c => {
        options.push({ id: c.id, name: c.name, depth })
        addChildren(c.id, depth + 1)
      })
    }
    addChildren(null, 0)
    return options
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-sm bg-[var(--dash-bg-raised)] rounded-2xl shadow-xl border border-[var(--dash-border-subtle)]">
                <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-subtle)]">
                  <Dialog.Title className="text-lg font-semibold text-[var(--dash-text-primary)]">
                    {editBudget ? 'تعديل الميزانية' : 'إضافة ميزانية'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {/* Category */}
                  <div className="relative">
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">التصنيف</label>
                    <button onClick={() => setIsCatOpen(!isCatOpen)} disabled={!!editBudget}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between disabled:opacity-50">
                      <span className={selectedCat ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}>
                        {selectedCat?.name || 'اختر التصنيف'}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
                    </button>
                    {isCatOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {getCategoryOptions().map(opt => (
                          <button key={opt.id} onClick={() => { setCategoryId(opt.id); setIsCatOpen(false) }}
                            className={`w-full text-right px-3 py-1.5 text-xs hover:bg-[var(--dash-bg-surface)] ${categoryId === opt.id ? 'text-blue-400' : 'text-[var(--dash-text-secondary)]'}`}
                            style={{ paddingRight: `${12 + opt.depth * 14}px` }}>
                            {opt.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">مبلغ الميزانية</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
                      placeholder="0.00" min="0" step="0.01" />
                  </div>

                  {/* Period */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">الفترة</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                        <button key={key} onClick={() => setPeriodType(key)} disabled={!!editBudget}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            periodType === key ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] border border-[var(--dash-border-subtle)]'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-[var(--dash-border-subtle)]">
                  <button onClick={handleSubmit} disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                    {isSaving ? 'جاري الحفظ...' : editBudget ? 'حفظ التعديلات' : 'إضافة الميزانية'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
