'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import type { SafeAutomation, CreateAutomationData } from '@/app/lib/hooks/useSafeAutomations'

const ARABIC_DAYS = [
  { index: 0, name: 'الأحد' },
  { index: 1, name: 'الاثنين' },
  { index: 2, name: 'الثلاثاء' },
  { index: 3, name: 'الأربعاء' },
  { index: 4, name: 'الخميس' },
  { index: 5, name: 'الجمعة' },
  { index: 6, name: 'السبت' }
]

interface SafeAutomationDialogProps {
  isOpen: boolean
  onClose: () => void
  safe: any
  childSafes: { id: string; name: string; balance: number }[]
  allSafes: { id: string; name: string }[]
  mainSafeOwnBalance: number
  nonDrawerTransferBalance: number
  editing?: SafeAutomation | null
  onSave: (data: CreateAutomationData) => Promise<void>
  onUpdate?: (id: string, data: Partial<SafeAutomation>) => Promise<void>
  userName?: string
}

export default function SafeAutomationDialog({
  isOpen,
  onClose,
  safe,
  childSafes,
  allSafes,
  mainSafeOwnBalance,
  nonDrawerTransferBalance,
  editing,
  onSave,
  onUpdate,
  userName
}: SafeAutomationDialogProps) {
  const formatPrice = useFormatPrice()

  // Form state
  const [name, setName] = useState('')
  const [operationType, setOperationType] = useState<'withdraw' | 'deposit' | 'transfer'>('withdraw')
  const [sourceId, setSourceId] = useState('')
  const [allMode, setAllMode] = useState<'full' | 'excluding_reserves' | null>(null)
  const [amountType, setAmountType] = useState<'fixed' | 'all_available' | 'all_excluding_reserves'>('all_excluding_reserves')
  const [fixedAmount, setFixedAmount] = useState('')
  const [targetSafeId, setTargetSafeId] = useState('')
  const [notesTemplate, setNotesTemplate] = useState('')
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [scheduleTime, setScheduleTime] = useState('06:00')
  const [scheduleDays, setScheduleDays] = useState<number[]>([])
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  // Pre-fill when editing
  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setOperationType(editing.operation_type)
      setSourceId(editing.source_id)
      setAllMode(editing.all_mode)
      setAmountType(editing.amount_type)
      setFixedAmount(editing.fixed_amount?.toString() || '')
      setTargetSafeId(editing.target_record_id || '')
      setNotesTemplate(editing.notes_template || '')
      setScheduleType(editing.schedule_type)
      setScheduleTime(editing.schedule_time || '06:00')
      setScheduleDays(editing.schedule_days_of_week || [])
      setScheduleDayOfMonth(editing.schedule_day_of_month || 1)
    } else {
      // Defaults for new automation
      setName(`سحب يومي - ${safe?.name || ''}`)
      setOperationType('withdraw')
      setSourceId('all')
      setAllMode('excluding_reserves')
      setAmountType('all_excluding_reserves')
      setFixedAmount('')
      setTargetSafeId('')
      setNotesTemplate('سحب يومية {day_name}')
      setScheduleType('daily')
      setScheduleTime('06:00')
      setScheduleDays([])
      setScheduleDayOfMonth(1)
    }
  }, [editing, safe, isOpen])

  const handleSave = async () => {
    if (!name.trim()) { alert('يرجى إدخال اسم الأتمتة'); return }
    if (amountType === 'fixed' && (!fixedAmount || parseFloat(fixedAmount) <= 0)) { alert('يرجى إدخال مبلغ صحيح'); return }
    if (operationType === 'transfer' && !targetSafeId) { alert('يرجى اختيار الخزنة المستهدفة'); return }
    if (scheduleType === 'weekly' && scheduleDays.length === 0) { alert('يرجى اختيار يوم واحد على الأقل'); return }

    setIsSaving(true)
    try {
      const data: CreateAutomationData = {
        record_id: safe.id,
        name: name.trim(),
        operation_type: operationType,
        source_id: sourceId,
        all_mode: sourceId === 'all' ? allMode : null,
        amount_type: amountType,
        fixed_amount: amountType === 'fixed' ? parseFloat(fixedAmount) : 0,
        target_record_id: operationType === 'transfer' ? targetSafeId : null,
        notes_template: notesTemplate,
        schedule_type: scheduleType,
        schedule_time: scheduleTime,
        schedule_days_of_week: scheduleType === 'weekly' ? scheduleDays : null,
        schedule_day_of_month: scheduleType === 'monthly' ? scheduleDayOfMonth : null,
        created_by: userName || 'system'
      }

      if (editing && onUpdate) {
        await onUpdate(editing.id, data as any)
      } else {
        await onSave(data)
      }
      onClose()
    } catch (err: any) {
      alert(`خطأ: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDay = (day: number) => {
    setScheduleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Preview resolved note
  const previewNote = notesTemplate
    .replace(/\{day_name\}/g, 'الأحد')
    .replace(/\{date\}/g, new Date().toLocaleDateString('ar-EG'))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-[var(--dash-bg-surface)] rounded-lg w-full max-w-md mx-4 shadow-xl animate-dash-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)] shrink-0">
          <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
            <XMarkIcon className="h-5 w-5" />
          </button>
          <h3 className="text-[var(--dash-text-primary)] font-medium text-lg">
            {editing ? 'تعديل الأتمتة' : 'إضافة أتمتة جديدة'}
          </h3>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto scrollbar-hide flex-1">
          {/* Name */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">اسم الأتمتة</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] text-right"
            />
          </div>

          {/* Operation Type */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">نوع العملية</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOperationType('withdraw')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  operationType === 'withdraw'
                    ? 'bg-red-600 text-[var(--dash-text-primary)]'
                    : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                سحب
              </button>
              <button
                onClick={() => setOperationType('deposit')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  operationType === 'deposit'
                    ? 'bg-green-600 text-[var(--dash-text-primary)]'
                    : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                إيداع
              </button>
              <button
                onClick={() => setOperationType('transfer')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  operationType === 'transfer'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                تحويل
              </button>
            </div>
          </div>

          {/* Source Selection - For safes with drawers */}
          {safe?.supports_drawers && childSafes.length > 0 && (
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">
                {operationType === 'deposit' ? 'الإيداع في' : 'السحب من'}
              </label>
              <select
                value={sourceId}
                onChange={(e) => { setSourceId(e.target.value); setAllMode(null) }}
                className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
              >
                <option value="">اختر المصدر...</option>
                <option value="all">الكل</option>
                {childSafes.map(drawer => (
                  <option key={drawer.id} value={drawer.id}>{drawer.name}</option>
                ))}
                <option value="transfers">التحويلات</option>
              </select>
            </div>
          )}

          {/* Source Selection - For non-drawer safes */}
          {!safe?.supports_drawers && safe?.safe_type !== 'sub' && (
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">
                {operationType === 'deposit' ? 'الإيداع في' : 'السحب من'}
              </label>
              <select
                value={sourceId}
                onChange={(e) => { setSourceId(e.target.value); setAllMode(null) }}
                className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
              >
                <option value="">اختر المصدر...</option>
                {operationType !== 'deposit' && <option value="all">الكل</option>}
                <option value="safe-only">الخزنة</option>
                <option value="transfers">التحويلات</option>
              </select>
            </div>
          )}

          {/* All Mode Selection */}
          {sourceId === 'all' && (operationType === 'withdraw' || operationType === 'transfer') && (
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">طريقة السحب</label>
              <div className="space-y-2">
                <button
                  onClick={() => setAllMode('full')}
                  className={`w-full text-right px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                    allMode === 'full'
                      ? 'bg-dash-accent-red-subtle border-dash-accent-red text-dash-accent-red'
                      : 'bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] text-gray-200 hover:bg-[var(--dash-bg-overlay)]'
                  }`}
                >
                  الرصيد بالكامل (مع حذف المجنب)
                </button>
                <button
                  onClick={() => setAllMode('excluding_reserves')}
                  className={`w-full text-right px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                    allMode === 'excluding_reserves'
                      ? 'bg-dash-accent-orange-subtle border-dash-accent-orange text-dash-accent-orange'
                      : 'bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] text-gray-200 hover:bg-[var(--dash-bg-overlay)]'
                  }`}
                >
                  الرصيد بدون المجنب
                </button>
              </div>
            </div>
          )}

          {/* Amount Type */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">المبلغ</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-right flex-row-reverse">
                <input
                  type="radio"
                  name="amountType"
                  checked={amountType === 'all_excluding_reserves'}
                  onChange={() => setAmountType('all_excluding_reserves')}
                  className="accent-[var(--dash-accent-blue)]"
                />
                <span className="text-sm text-[var(--dash-text-primary)]">كل الرصيد بدون المجنب</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-right flex-row-reverse">
                <input
                  type="radio"
                  name="amountType"
                  checked={amountType === 'all_available'}
                  onChange={() => setAmountType('all_available')}
                  className="accent-[var(--dash-accent-blue)]"
                />
                <span className="text-sm text-[var(--dash-text-primary)]">كل الرصيد المتاح</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-right flex-row-reverse">
                <input
                  type="radio"
                  name="amountType"
                  checked={amountType === 'fixed'}
                  onChange={() => setAmountType('fixed')}
                  className="accent-[var(--dash-accent-blue)]"
                />
                <span className="text-sm text-[var(--dash-text-primary)]">مبلغ محدد</span>
              </label>
              {amountType === 'fixed' && (
                <input
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] text-right mt-1"
                  min="0"
                  step="0.01"
                />
              )}
            </div>
          </div>

          {/* Target Safe (for transfers) */}
          {operationType === 'transfer' && (
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">الخزنة المستهدفة</label>
              <select
                value={targetSafeId}
                onChange={(e) => setTargetSafeId(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
              >
                <option value="">اختر الخزنة...</option>
                {allSafes.filter(s => s.id !== safe?.id).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes Template */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm mb-2 text-right">ملاحظات (اختياري)</label>
            <input
              type="text"
              value={notesTemplate}
              onChange={(e) => setNotesTemplate(e.target.value)}
              placeholder="مثال: سحب يومية {day_name}"
              className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] text-right"
            />
            {notesTemplate && (
              <div className="mt-1 text-xs text-[var(--dash-text-muted)] text-right">
                معاينة: <span className="text-dash-accent-blue">{previewNote}</span>
              </div>
            )}
            <div className="mt-1 text-xs text-[var(--dash-text-disabled)] text-right">
              متغيرات: {'{day_name}'} = اسم اليوم، {'{date}'} = التاريخ
            </div>
          </div>

          {/* Schedule Section */}
          <div className="border-t border-[var(--dash-border-default)] pt-4">
            <label className="block text-[var(--dash-text-primary)] text-sm font-medium mb-3 text-right">الجدول الزمني</label>

            {/* Schedule Type */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setScheduleType('daily')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  scheduleType === 'daily'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                يومي
              </button>
              <button
                onClick={() => setScheduleType('weekly')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  scheduleType === 'weekly'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                أسبوعي
              </button>
              <button
                onClick={() => setScheduleType('monthly')}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  scheduleType === 'monthly'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                شهري
              </button>
            </div>

            {/* Time Picker */}
            <div className="mb-3">
              <label className="block text-[var(--dash-text-secondary)] text-xs mb-1 text-right">الوقت</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] text-right"
              />
            </div>

            {/* Weekly Day Selection */}
            {scheduleType === 'weekly' && (
              <div>
                <label className="block text-[var(--dash-text-secondary)] text-xs mb-2 text-right">أيام الأسبوع</label>
                <div className="flex flex-wrap gap-2">
                  {ARABIC_DAYS.map(day => (
                    <button
                      key={day.index}
                      onClick={() => toggleDay(day.index)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        scheduleDays.includes(day.index)
                          ? 'bg-dash-accent-blue text-white'
                          : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                      }`}
                    >
                      {day.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Day Selection */}
            {scheduleType === 'monthly' && (
              <div>
                <label className="block text-[var(--dash-text-secondary)] text-xs mb-1 text-right">يوم الشهر</label>
                <select
                  value={scheduleDayOfMonth}
                  onChange={(e) => setScheduleDayOfMonth(parseInt(e.target.value))}
                  className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] rounded px-3 py-2 text-sm border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Hobby plan notice */}
            <div className="mt-3 bg-dash-accent-orange-subtle border border-dash-accent-orange/30 rounded p-2 text-right">
              <span className="text-xs text-dash-accent-orange">
                ملاحظة: يتم فحص الأتمتة مرة يومياً الساعة 11 مساءً. الأتمتة المستحقة خلال اليوم تُنفذ في هذا الوقت. استخدم "تنفيذ الآن" للتنفيذ فوراً.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-[var(--dash-border-default)] shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-highlight)] text-[var(--dash-text-primary)] py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 dash-btn-primary text-[var(--dash-text-primary)] py-2 px-4 rounded text-sm font-medium transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {isSaving ? 'جاري الحفظ...' : editing ? 'تحديث' : 'إنشاء الأتمتة'}
          </button>
        </div>
      </div>
    </div>
  )
}
