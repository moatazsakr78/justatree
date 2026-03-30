'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusIcon, PlayIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  fetchRecurringExpenses,
  deleteRecurringExpense,
  markRecurringGenerated,
  getFrequencyLabel,
  type RecurringExpense,
} from '../services/expenseService'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import RecurringExpenseModal from './RecurringExpenseModal'

interface RecurringTabProps {
  onGenerateExpense: (recurring: RecurringExpense) => void
}

export default function RecurringTab({ onGenerateExpense }: RecurringTabProps) {
  const formatPrice = useFormatPrice()
  const { categories } = useExpenseCategories()
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<RecurringExpense | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchRecurringExpenses()
      setItems(data)
    } catch (error) {
      console.error('Error loading recurring expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (item: RecurringExpense) => {
    if (!confirm(`هل أنت متأكد من حذف "${item.name}"؟`)) return
    try {
      await deleteRecurringExpense(item.id)
      load()
    } catch (error: any) {
      alert(`خطأ: ${error.message}`)
    }
  }

  const handleGenerate = (item: RecurringExpense) => {
    onGenerateExpense(item)
  }

  const isOverdue = (nextDue: string | null) => {
    if (!nextDue) return false
    return new Date(nextDue) <= new Date()
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--dash-text-primary)]">المصروفات المتكررة</h3>
        <button
          onClick={() => { setEditItem(null); setIsModalOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          إضافة
        </button>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-[var(--dash-text-muted)]">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <ArrowPathIcon className="h-12 w-12 text-[var(--dash-text-muted)] mx-auto mb-3" />
          <p className="text-[var(--dash-text-muted)] mb-3">لا توجد مصروفات متكررة</p>
          <button
            onClick={() => { setEditItem(null); setIsModalOpen(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            + إضافة مصروف متكرر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => {
            const overdue = isOverdue(item.next_due_date)
            return (
              <div
                key={item.id}
                className={`bg-[var(--dash-bg-raised)] border rounded-xl p-4 ${
                  overdue ? 'border-red-500/40' : item.is_active ? 'border-[var(--dash-border-subtle)]' : 'border-yellow-500/30 opacity-60'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--dash-text-primary)]">{item.name}</h4>
                    {item.description && (
                      <p className="text-xs text-[var(--dash-text-muted)] mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-red-400">{formatPrice(item.amount)}</span>
                </div>

                {/* Info */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                    {getFrequencyLabel(item.frequency)}
                  </span>
                  {item.category_name && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-400">
                      {item.category_name}
                    </span>
                  )}
                  {item.safe_name && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-400">
                      {item.safe_name}
                    </span>
                  )}
                </div>

                {/* Next due */}
                {item.next_due_date && (
                  <div className={`text-xs mb-3 ${overdue ? 'text-red-400 font-medium' : 'text-[var(--dash-text-muted)]'}`}>
                    {overdue ? 'متأخر - ' : 'التالي: '}
                    {new Date(item.next_due_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[var(--dash-border-subtle)]">
                  <button
                    onClick={() => handleGenerate(item)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                  >
                    <PlayIcon className="h-3.5 w-3.5" />
                    سجل دلوقتي
                  </button>
                  <button
                    onClick={() => { setEditItem(item); setIsModalOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-yellow-400"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--dash-text-muted)] hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <RecurringExpenseModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditItem(null) }}
        onSuccess={load}
        editItem={editItem}
        categories={categories}
      />
    </div>
  )
}
