'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/app/lib/supabase/client'
import { useAuth } from '@/lib/useAuth'
import { createExpense, type ExpenseCategory } from '../services/expenseService'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useActivityLogger } from '@/app/lib/hooks/useActivityLogger'

interface Safe {
  id: string
  name: string
  drawerId: string
  balance: number
}

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  // Pre-fill for recurring expense generation
  prefill?: {
    amount?: number
    description?: string
    categoryId?: string
    recordId?: string
    recurringExpenseId?: string
  }
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess, prefill }: AddExpenseModalProps) {
  const { user } = useAuth()
  const logActivity = useActivityLogger()
  const { categories } = useExpenseCategories()

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSafeId, setSelectedSafeId] = useState('')
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [isSafeDropdownOpen, setIsSafeDropdownOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [safes, setSafes] = useState<Safe[]>([])
  const [isLoadingSafes, setIsLoadingSafes] = useState(true)

  // Load safes with their drawer balances
  useEffect(() => {
    if (!isOpen) return

    const loadSafes = async () => {
      setIsLoadingSafes(true)
      try {
        const { data: records } = await supabase
          .from('records')
          .select('id, name')
          .eq('is_active', true)
          .order('name')

        if (!records) { setIsLoadingSafes(false); return }

        const safeList: Safe[] = []
        for (const record of records as any[]) {
          const { data: drawers } = await supabase
            .from('cash_drawers')
            .select('id, current_balance')
            .eq('record_id', record.id)
            .limit(1)

          if (drawers && drawers.length > 0) {
            safeList.push({
              id: record.id,
              name: record.name,
              drawerId: (drawers[0] as any).id,
              balance: Number((drawers[0] as any).current_balance) || 0,
            })
          }
        }
        setSafes(safeList)

        // Auto-select first safe or prefilled safe
        if (prefill?.recordId) {
          setSelectedSafeId(prefill.recordId)
        } else if (safeList.length > 0 && !selectedSafeId) {
          setSelectedSafeId(safeList[0].id)
        }
      } catch (error) {
        console.error('Error loading safes:', error)
      } finally {
        setIsLoadingSafes(false)
      }
    }

    loadSafes()
  }, [isOpen])

  // Apply prefill
  useEffect(() => {
    if (prefill && isOpen) {
      if (prefill.amount) setAmount(String(prefill.amount))
      if (prefill.description) setDescription(prefill.description)
      if (prefill.categoryId) setSelectedCategoryId(prefill.categoryId)
      if (prefill.recordId) setSelectedSafeId(prefill.recordId)
    }
  }, [prefill, isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setAmount('')
      setDescription('')
      setSelectedCategoryId('')
      setIsCategoryDropdownOpen(false)
      setIsSafeDropdownOpen(false)
    }
  }, [isOpen])

  const selectedSafe = safes.find(s => s.id === selectedSafeId)
  const selectedCategory = categories.find(c => c.id === selectedCategoryId)
  const parsedAmount = parseFloat(amount) || 0

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح')
      return
    }
    if (!description.trim()) {
      alert('يرجى إدخال وصف المصروف')
      return
    }
    if (!selectedCategoryId) {
      alert('يرجى اختيار التصنيف')
      return
    }
    if (!selectedSafe) {
      alert('يرجى اختيار الخزنة')
      return
    }
    if (parsedAmount > selectedSafe.balance) {
      alert('المبلغ أكبر من رصيد الخزنة المتاح')
      return
    }

    setIsProcessing(true)
    try {
      const expense = await createExpense({
        amount: parsedAmount,
        description: description.trim(),
        categoryId: selectedCategoryId,
        recordId: selectedSafe.id,
        drawerId: selectedSafe.drawerId,
        userId: (user as any)?.id || '',
        userName: (user as any)?.name || (user as any)?.email || 'user',
        recurringExpenseId: prefill?.recurringExpenseId,
      })

      logActivity({
        entityType: 'expense' as any,
        actionType: 'create',
        entityId: expense.id,
        entityName: description.trim(),
        description: `تسجيل مصروف: ${description.trim()} - ${parsedAmount}`,
      })

      alert(`تم تسجيل مصروف بمبلغ ${parsedAmount.toFixed(2)} بنجاح`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating expense:', error)
      alert(`خطأ: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Get flat category list with indentation info
  const getCategoryOptions = () => {
    const options: { id: string; name: string; depth: number; color: string | null }[] = []
    const addChildren = (parentId: string | null, depth: number) => {
      categories
        .filter(c => c.parent_id === parentId)
        .forEach(c => {
          options.push({ id: c.id, name: c.name, depth, color: c.color })
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
              <Dialog.Panel className="w-full max-w-md bg-[var(--dash-bg-raised)] rounded-2xl shadow-xl border border-[var(--dash-border-subtle)]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-subtle)]">
                  <Dialog.Title className="text-lg font-semibold text-[var(--dash-text-primary)]">
                    تسجيل مصروف جديد
                  </Dialog.Title>
                  <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">المبلغ</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2.5 text-lg text-[var(--dash-text-primary)] outline-none focus:border-blue-500 text-center font-bold"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">الوصف / السبب</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
                      placeholder="مثال: فاتورة كهرباء مارس"
                    />
                  </div>

                  {/* Category */}
                  <div className="relative">
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">التصنيف</label>
                    <button
                      onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSafeDropdownOpen(false) }}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between"
                    >
                      <span className={selectedCategory ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}>
                        {selectedCategory?.name || 'اختر التصنيف'}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
                    </button>

                    {isCategoryDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getCategoryOptions().map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => { setSelectedCategoryId(opt.id); setIsCategoryDropdownOpen(false) }}
                            className={`w-full text-right px-3 py-2 text-sm hover:bg-[var(--dash-bg-surface)] flex items-center gap-2 ${
                              selectedCategoryId === opt.id ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--dash-text-secondary)]'
                            }`}
                            style={{ paddingRight: `${12 + opt.depth * 16}px` }}
                          >
                            {opt.color && (
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                            )}
                            {opt.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Safe */}
                  <div className="relative">
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">الخزنة</label>
                    <button
                      onClick={() => { setIsSafeDropdownOpen(!isSafeDropdownOpen); setIsCategoryDropdownOpen(false) }}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between"
                      disabled={isLoadingSafes}
                    >
                      <span className={selectedSafe ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}>
                        {isLoadingSafes ? 'جاري التحميل...' : selectedSafe ? `${selectedSafe.name} (${selectedSafe.balance.toFixed(2)})` : 'اختر الخزنة'}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
                    </button>

                    {isSafeDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {safes.map(safe => (
                          <button
                            key={safe.id}
                            onClick={() => { setSelectedSafeId(safe.id); setIsSafeDropdownOpen(false) }}
                            className={`w-full text-right px-3 py-2 text-sm hover:bg-[var(--dash-bg-surface)] flex items-center justify-between ${
                              selectedSafeId === safe.id ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--dash-text-secondary)]'
                            }`}
                          >
                            <span>{safe.name}</span>
                            <span className="text-xs text-[var(--dash-text-muted)]">{safe.balance.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Balance warning */}
                  {selectedSafe && parsedAmount > 0 && parsedAmount > selectedSafe.balance && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">
                      المبلغ أكبر من رصيد الخزنة المتاح ({selectedSafe.balance.toFixed(2)})
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--dash-border-subtle)]">
                  <button
                    onClick={handleSubmit}
                    disabled={isProcessing || parsedAmount <= 0 || !description.trim() || !selectedCategoryId || !selectedSafe}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isProcessing ? 'جاري التسجيل...' : `تسجيل مصروف ${parsedAmount > 0 ? `(${parsedAmount.toFixed(2)})` : ''}`}
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
