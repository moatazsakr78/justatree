'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/app/lib/supabase/client'
import {
  createRecurringExpense,
  updateRecurringExpense,
  getFrequencyLabel,
  type RecurringExpense,
  type ExpenseCategory,
} from '../services/expenseService'

interface RecurringExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editItem?: RecurringExpense | null
  categories: ExpenseCategory[]
}

const FREQUENCIES = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'yearly', label: 'سنوي' },
]

export default function RecurringExpenseModal({ isOpen, onClose, onSuccess, editItem, categories }: RecurringExpenseModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [safeId, setSafeId] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [isSaving, setIsSaving] = useState(false)
  const [safes, setSafes] = useState<{ id: string; name: string }[]>([])
  const [isCatOpen, setIsCatOpen] = useState(false)
  const [isSafeOpen, setIsSafeOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const loadSafes = async () => {
      const { data } = await supabase.from('records').select('id, name').eq('is_active', true).order('name')
      setSafes((data as any[]) || [])
    }
    loadSafes()
  }, [isOpen])

  useEffect(() => {
    if (editItem && isOpen) {
      setName(editItem.name)
      setAmount(String(editItem.amount))
      setDescription(editItem.description || '')
      setCategoryId(editItem.category_id || '')
      setSafeId(editItem.record_id || '')
      setFrequency(editItem.frequency)
      setDayOfMonth(String(editItem.day_of_month || 1))
    } else if (!editItem && isOpen) {
      setName(''); setAmount(''); setDescription(''); setCategoryId(''); setFrequency('monthly'); setDayOfMonth('1')
    }
  }, [editItem, isOpen])

  const handleSubmit = async () => {
    if (!name.trim()) { alert('يرجى إدخال اسم المصروف'); return }
    if (!parseFloat(amount) || parseFloat(amount) <= 0) { alert('يرجى إدخال مبلغ صحيح'); return }
    if (!categoryId) { alert('يرجى اختيار التصنيف'); return }
    if (!safeId) { alert('يرجى اختيار الخزنة'); return }

    setIsSaving(true)
    try {
      if (editItem) {
        await updateRecurringExpense(editItem.id, {
          name: name.trim(),
          amount: parseFloat(amount),
          description: description.trim(),
          categoryId,
          recordId: safeId,
          frequency,
          dayOfMonth: parseInt(dayOfMonth) || undefined,
        })
      } else {
        await createRecurringExpense({
          name: name.trim(),
          amount: parseFloat(amount),
          description: description.trim() || undefined,
          categoryId,
          recordId: safeId,
          frequency,
          dayOfMonth: parseInt(dayOfMonth) || undefined,
          createdBy: 'admin',
        })
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      alert(`خطأ: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const getCategoryOptions = () => {
    const options: { id: string; name: string; depth: number; color: string | null }[] = []
    const addChildren = (parentId: string | null, depth: number) => {
      categories.filter(c => c.parent_id === parentId).forEach(c => {
        options.push({ id: c.id, name: c.name, depth, color: c.color })
        addChildren(c.id, depth + 1)
      })
    }
    addChildren(null, 0)
    return options
  }

  const selectedCat = categories.find(c => c.id === categoryId)
  const selectedSafe = safes.find(s => s.id === safeId)

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
                <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-subtle)]">
                  <Dialog.Title className="text-lg font-semibold text-[var(--dash-text-primary)]">
                    {editItem ? 'تعديل مصروف متكرر' : 'إضافة مصروف متكرر'}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">الاسم</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
                      placeholder="مثال: مرتب أحمد" />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">المبلغ</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
                      placeholder="0.00" min="0" step="0.01" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">وصف (اختياري)</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
                      placeholder="تفاصيل إضافية..." />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">التكرار</label>
                    <div className="flex gap-2">
                      {FREQUENCIES.map(f => (
                        <button key={f.value} onClick={() => setFrequency(f.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            frequency === f.value ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] border border-[var(--dash-border-subtle)]'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day of month (for monthly) */}
                  {frequency === 'monthly' && (
                    <div>
                      <label className="block text-xs text-[var(--dash-text-muted)] mb-1">يوم الشهر</label>
                      <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)}
                        className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
                        min="1" max="28" />
                    </div>
                  )}

                  {/* Category */}
                  <div className="relative">
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">التصنيف</label>
                    <button onClick={() => { setIsCatOpen(!isCatOpen); setIsSafeOpen(false) }}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between">
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

                  {/* Safe */}
                  <div className="relative">
                    <label className="block text-xs text-[var(--dash-text-muted)] mb-1">الخزنة</label>
                    <button onClick={() => { setIsSafeOpen(!isSafeOpen); setIsCatOpen(false) }}
                      className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between">
                      <span className={selectedSafe ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}>
                        {selectedSafe?.name || 'اختر الخزنة'}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
                    </button>
                    {isSafeOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {safes.map(s => (
                          <button key={s.id} onClick={() => { setSafeId(s.id); setIsSafeOpen(false) }}
                            className={`w-full text-right px-3 py-1.5 text-xs hover:bg-[var(--dash-bg-surface)] ${safeId === s.id ? 'text-blue-400' : 'text-[var(--dash-text-secondary)]'}`}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-[var(--dash-border-subtle)]">
                  <button onClick={handleSubmit} disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                    {isSaving ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'إضافة مصروف متكرر'}
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
