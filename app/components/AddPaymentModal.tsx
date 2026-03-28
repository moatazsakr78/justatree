'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import { useAuth } from '@/lib/useAuth'
import { roundMoney } from '../lib/utils/money'
import RecordsSelectionModal from './RecordsSelectionModal'

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  entityId: string
  entityType: 'customer' | 'supplier'
  entityName: string
  currentBalance: number
  onPaymentAdded?: () => void
  initialPaymentType?: 'payment' | 'loan' | 'discount'
}

export default function AddPaymentModal({
  isOpen,
  onClose,
  entityId,
  entityType,
  entityName,
  currentBalance,
  onPaymentAdded,
  initialPaymentType = 'payment'
}: AddPaymentModalProps) {
  const formatPrice = useFormatPrice()
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [recordId, setRecordId] = useState('')
  const [selectedSafeName, setSelectedSafeName] = useState('لا يوجد')
  const [isSafesModalOpen, setIsSafesModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentType, setPaymentType] = useState<'payment' | 'loan' | 'discount'>(initialPaymentType)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false)

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setIsLoadingPaymentMethods(true)
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('id, name, is_default, is_active, is_physical')
          .eq('is_active', true)
          .order('is_default', { ascending: false })

        if (error) {
          console.error('Error fetching payment methods:', error)
          return
        }

        setPaymentMethods(data || [])

        // Set default payment method
        const defaultMethod = data?.find(m => m.is_default)
        if (defaultMethod) {
          setPaymentMethod(defaultMethod.name)
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      } finally {
        setIsLoadingPaymentMethods(false)
      }
    }

    if (isOpen) {
      fetchPaymentMethods()
    }
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setNotes('')
      setPaymentMethod('cash')
      setPaymentType(initialPaymentType)
      setRecordId('')
      setSelectedSafeName('لا يوجد')
    }
  }, [isOpen, initialPaymentType])

  // Derive is_physical from selected payment method
  const selectedMethodIsPhysical = paymentMethods.find(m => m.name === paymentMethod)?.is_physical !== false

  // Reset safe selection when payment method changes (physical vs transfer shows different options)
  const [prevIsPhysical, setPrevIsPhysical] = useState<boolean | null>(null)
  useEffect(() => {
    if (prevIsPhysical !== null && prevIsPhysical !== selectedMethodIsPhysical) {
      setRecordId('')
      setSelectedSafeName('لا يوجد')
    }
    setPrevIsPhysical(selectedMethodIsPhysical)
  }, [selectedMethodIsPhysical])

  const handleRecordSelect = (record: any, subSafe?: any) => {
    if (subSafe) {
      setRecordId(subSafe.id)
      setSelectedSafeName(`${record.name} → ${subSafe.name}`)
    } else if (record.id) {
      setRecordId(record.id)
      setSelectedSafeName(record.name)
    } else {
      setRecordId('')
      setSelectedSafeName('لا يوجد')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح')
      return
    }

    // البيان مطلوب فقط للسلفة والخصم
    if ((paymentType === 'loan' || paymentType === 'discount') && (!notes || notes.trim() === '')) {
      alert('يرجى إدخال البيان')
      return
    }

    // الخزنة اختيارية - يمكن أن تكون "لا يوجد"

    const paymentAmount = parseFloat(amount)

    // المبلغ يُسجّل دائماً كقيمة موجبة في قاعدة البيانات
    // نوع العملية (سلفة/دفعة) يُحدد من خلال حقل الملاحظات
    const actualAmount = paymentAmount

    // Check if payment exceeds balance (فقط للدفعة العادية)
    if (paymentType === 'payment' && paymentAmount > currentBalance) {
      const confirmExceed = confirm(
        `المبلغ المدخل (${formatPrice(paymentAmount)}) أكبر من الرصيد الحالي (${formatPrice(currentBalance)}). هل تريد المتابعة؟`
      )
      if (!confirmExceed) return
    }

    setIsSubmitting(true)

    try {
      if (entityType === 'customer') {
        // إعداد الملاحظات مع توضيح نوع العملية
        const paymentNotes = paymentType === 'loan'
          ? `سلفة${notes ? ` - ${notes}` : ''}`
          : paymentType === 'discount'
            ? `خصم - ${notes}`
            : notes || null

        const { data, error } = await supabase
          .from('customer_payments')
          .insert([
            {
              customer_id: entityId,
              amount: actualAmount,
              payment_method: paymentMethod,
              notes: paymentNotes,
              payment_date: new Date().toISOString().split('T')[0],
              created_by: user?.id || null,
              safe_id: recordId || null,
            }
          ])
          .select()

        if (error) {
          console.error('Error adding payment:', error)
          alert(paymentType === 'loan' ? 'حدث خطأ أثناء إضافة السلفة' : paymentType === 'discount' ? 'حدث خطأ أثناء إضافة الخصم' : 'حدث خطأ أثناء إضافة الدفعة')
          return
        }

        // Record payment in the selected safe (if a safe was selected)
        // للدفعة: إيداع في الخزنة / للسلفة: سحب من الخزنة / للخصم: لا حركة نقدية
        if (recordId && paymentType !== 'discount') {
          try {
            // Get or create drawer for this record
            let { data: drawer, error: drawerError } = await supabase
              .from('cash_drawers')
              .select('*')
              .eq('record_id', recordId)
              .single()

            if (drawerError && drawerError.code === 'PGRST116') {
              // Drawer doesn't exist, create it
              const { data: newDrawer, error: createError } = await supabase
                .from('cash_drawers')
                .insert({ record_id: recordId, current_balance: 0 })
                .select()
                .single()

              if (!createError) {
                drawer = newDrawer
              }
            }

            if (drawer) {
              // للدفعة: إضافة للخزنة / للسلفة: خصم من الخزنة
              const drawerChange = paymentType === 'loan' ? -paymentAmount : paymentAmount

              // Determine transaction type based on is_physical
              // Physical: deposit/withdrawal | Transfer: transfer_in/transfer_out
              let transactionType: string
              if (selectedMethodIsPhysical) {
                transactionType = paymentType === 'loan' ? 'withdrawal' : 'deposit'
              } else {
                transactionType = paymentType === 'loan' ? 'transfer_out' : 'transfer_in'
              }

              // Atomic balance update (prevents race conditions)
              const { data: rpcResult, error: rpcErr } = await supabase.rpc(
                'atomic_adjust_drawer_balance' as any,
                { p_drawer_id: drawer.id, p_change: drawerChange }
              )

              if (rpcErr) {
                console.warn('Failed to atomically update drawer:', rpcErr.message)
              } else {
                const newBalance = rpcResult?.[0]?.new_balance ?? roundMoney((drawer.current_balance || 0) + drawerChange)

                // Create transaction record
                await supabase
                  .from('cash_drawer_transactions')
                  .insert({
                    drawer_id: drawer.id,
                    record_id: recordId,
                    transaction_type: transactionType,
                    amount: paymentAmount,
                    balance_after: roundMoney(newBalance),
                    notes: paymentType === 'loan'
                      ? `سلفة لعميل: ${entityName}${notes ? ` - ${notes}` : ''}`
                      : `دفعة من عميل: ${entityName}${notes ? ` - ${notes}` : ''}`,
                    performed_by: user?.name || 'system',
                    payment_method: paymentMethod,
                  })

                console.log(`✅ Cash drawer updated with customer ${paymentType}: ${drawerChange}, new balance: ${newBalance}`)
              }
            }
          } catch (drawerError) {
            console.warn('Failed to update cash drawer with customer payment:', drawerError)
            // Don't throw error here as the payment was created successfully
          }
        }
      } else {
        // إعداد الملاحظات مع توضيح نوع العملية للمورد
        const supplierPaymentNotes = paymentType === 'loan'
          ? `سلفة${notes ? ` - ${notes}` : ''}`
          : paymentType === 'discount'
            ? `خصم - ${notes}`
            : notes || null

        const { data, error } = await supabase
          .from('supplier_payments')
          .insert([
            {
              supplier_id: entityId,
              amount: paymentAmount,
              payment_method: paymentMethod,
              notes: supplierPaymentNotes,
              payment_date: new Date().toISOString().split('T')[0],
              created_by: user?.id || null,
              safe_id: recordId || null,
            }
          ])
          .select()

        if (error) {
          console.error('Error adding payment:', error)
          alert(paymentType === 'loan' ? 'حدث خطأ أثناء إضافة السلفة' : paymentType === 'discount' ? 'حدث خطأ أثناء إضافة الخصم' : 'حدث خطأ أثناء إضافة الدفعة')
          return
        }

        // Record payment in the selected safe (if a safe was selected)
        // للدفعة: المال يخرج من الخزنة (سلبي) / للسلفة: المال يدخل للخزنة (إيجابي) / للخصم: لا حركة نقدية
        if (recordId && paymentType !== 'discount') {
          try {
            // Get or create drawer for this record
            let { data: drawer, error: drawerError } = await supabase
              .from('cash_drawers')
              .select('*')
              .eq('record_id', recordId)
              .single()

            if (drawerError && drawerError.code === 'PGRST116') {
              // Drawer doesn't exist, create it
              const { data: newDrawer, error: createError } = await supabase
                .from('cash_drawers')
                .insert({ record_id: recordId, current_balance: 0 })
                .select()
                .single()

              if (!createError) {
                drawer = newDrawer
              }
            }

            if (drawer) {
              // للدفعة: خصم من الخزنة / للسلفة: إضافة للخزنة
              const drawerChange = paymentType === 'loan' ? paymentAmount : -paymentAmount

              // Determine transaction type based on is_physical
              // Physical: deposit/withdrawal | Transfer: transfer_in/transfer_out
              let transactionType: string
              if (selectedMethodIsPhysical) {
                transactionType = paymentType === 'loan' ? 'deposit' : 'withdrawal'
              } else {
                transactionType = paymentType === 'loan' ? 'transfer_in' : 'transfer_out'
              }

              // Atomic balance update (prevents race conditions)
              const { data: rpcResult, error: rpcErr } = await supabase.rpc(
                'atomic_adjust_drawer_balance' as any,
                { p_drawer_id: drawer.id, p_change: drawerChange }
              )

              if (rpcErr) {
                console.warn('Failed to atomically update drawer:', rpcErr.message)
              } else {
                const newBalance = rpcResult?.[0]?.new_balance ?? roundMoney((drawer.current_balance || 0) + drawerChange)

                // Create transaction record
                await supabase
                  .from('cash_drawer_transactions')
                  .insert({
                    drawer_id: drawer.id,
                    record_id: recordId,
                    transaction_type: transactionType,
                    amount: paymentAmount,
                    balance_after: roundMoney(newBalance),
                    notes: paymentType === 'loan'
                      ? `سلفة من مورد: ${entityName}${notes ? ` - ${notes}` : ''}`
                      : `دفعة لمورد: ${entityName}${notes ? ` - ${notes}` : ''}`,
                    performed_by: user?.name || 'system',
                    payment_method: paymentMethod,
                  })

                console.log(`✅ Cash drawer updated with supplier ${paymentType}: ${drawerChange}, new balance: ${newBalance}`)
              }
            }
          } catch (drawerError) {
            console.warn('Failed to update cash drawer with supplier payment:', drawerError)
            // Don't throw error here as the payment was created successfully
          }
        }
      }

      // Success - close modal and refresh
      if (onPaymentAdded) {
        onPaymentAdded()
      }
      onClose()

    } catch (error) {
      console.error('Error adding payment:', error)
      alert('حدث خطأ أثناء إضافة الدفعة')
    } finally {
      setIsSubmitting(false)
    }
  }

  const remainingBalance = currentBalance - (parseFloat(amount) || 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-[var(--dash-bg-surface)] rounded-lg shadow-[var(--dash-shadow-lg)] w-full max-w-md">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
            <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">
              {paymentType === 'loan' ? 'إضافة سلفة' : paymentType === 'discount' ? 'إضافة خصم' : 'إضافة دفعة'} - {entityName}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Payment Type Toggle - 3 أزرار متساوية */}
            <div className="flex gap-2 p-1 bg-[var(--dash-bg-base)] rounded-lg border border-[var(--dash-border-default)]">
              <button
                type="button"
                onClick={() => setPaymentType('payment')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  paymentType === 'payment'
                    ? 'bg-dash-accent-blue text-white shadow-sm'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                دفعة
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('discount')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  paymentType === 'discount'
                    ? 'bg-dash-accent-purple text-white shadow-sm'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                خصم
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('loan')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  paymentType === 'loan'
                    ? 'bg-dash-accent-orange text-white shadow-sm'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                إضافة
              </button>
            </div>

            {/* Current Balance Display */}
            <div className={`rounded p-4 text-center ${
              paymentType === 'loan'
                ? 'bg-dash-accent-orange-subtle border border-dash-accent-orange'
                : paymentType === 'discount'
                  ? 'bg-dash-accent-purple-subtle border border-dash-accent-purple'
                  : 'bg-dash-accent-blue-subtle border border-dash-accent-blue'
            }`}>
              <div className={`text-sm mb-1 ${
                paymentType === 'loan' ? 'text-dash-accent-orange' : paymentType === 'discount' ? 'text-dash-accent-purple' : 'text-dash-accent-blue'
              }`}>
                الرصيد الحالي
              </div>
              <div className="text-2xl font-bold text-[var(--dash-text-primary)]">{formatPrice(currentBalance)}</div>
              {paymentType === 'loan' && (
                <div className="text-xs text-dash-accent-orange mt-1">
                  السلفة ستزيد الرصيد المستحق على العميل
                </div>
              )}
              {paymentType === 'discount' && (
                <div className="text-xs text-dash-accent-purple mt-1">
                  الخصم سيقلل الرصيد المستحق على العميل
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2 text-right">
                {paymentType === 'loan' ? 'مبلغ السلفة' : paymentType === 'discount' ? 'مبلغ الخصم' : 'مبلغ الدفعة'} <span className="text-dash-accent-red">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-4 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-right focus:outline-none focus:ring-2 ${
                  paymentType === 'loan' ? 'focus:ring-dash-accent-orange' : paymentType === 'discount' ? 'focus:ring-dash-accent-purple' : 'focus:ring-[var(--dash-accent-blue)]'
                }`}
                placeholder={paymentType === 'loan' ? 'أدخل مبلغ السلفة' : paymentType === 'discount' ? 'أدخل مبلغ الخصم' : 'أدخل مبلغ الدفعة'}
                required
              />
            </div>

            {/* Remaining Balance Display */}
            {amount && parseFloat(amount) > 0 && paymentType === 'payment' && (
              <div className={`rounded p-3 text-center ${
                remainingBalance < 0
                  ? 'bg-dash-accent-red-subtle border border-dash-accent-red'
                  : 'bg-dash-accent-green-subtle border border-dash-accent-green'
              }`}>
                <div className="text-sm mb-1" style={{ color: remainingBalance < 0 ? '#FCA5A5' : '#86EFAC' }}>
                  الرصيد المتبقي
                </div>
                <div className="text-xl font-bold text-[var(--dash-text-primary)]">
                  {formatPrice(Math.abs(remainingBalance))}
                  {remainingBalance < 0 && ' (دفع زائد)'}
                </div>
              </div>
            )}

            {/* New Balance Display for Loan */}
            {amount && parseFloat(amount) > 0 && paymentType === 'loan' && (
              <div className="rounded p-3 text-center bg-dash-accent-orange-subtle border border-dash-accent-orange">
                <div className="text-sm mb-1 text-dash-accent-orange">
                  الرصيد الجديد بعد السلفة
                </div>
                <div className="text-xl font-bold text-[var(--dash-text-primary)]">
                  {formatPrice(currentBalance + parseFloat(amount))}
                </div>
              </div>
            )}

            {/* New Balance Display for Discount */}
            {amount && parseFloat(amount) > 0 && paymentType === 'discount' && (
              <div className="rounded p-3 text-center bg-dash-accent-purple-subtle border border-dash-accent-purple">
                <div className="text-sm mb-1 text-dash-accent-purple">
                  الرصيد الجديد بعد الخصم
                </div>
                <div className="text-xl font-bold text-[var(--dash-text-primary)]">
                  {formatPrice(currentBalance - parseFloat(amount))}
                </div>
              </div>
            )}

            {/* طريقة الدفع والخزنة - طريقة الدفع أولاً */}
            <div className="flex gap-4">
              {/* Payment Method - طريقة الدفع (أولاً) */}
              <div className="flex-1">
                <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2 text-right">
                  طريقة الدفع
                </label>
                {isLoadingPaymentMethods ? (
                  <div className="text-[var(--dash-text-muted)] text-sm text-center py-2">جاري تحميل طرق الدفع...</div>
                ) : (
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-right focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.name}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Record Selection - الخزنة (ثانياً) */}
              <div className="flex-1">
                <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2 text-right">
                  {selectedMethodIsPhysical ? 'الدرج / الخزنة' : 'الخزنة'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsSafesModalOpen(true)}
                  className="w-full px-4 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-right focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] flex items-center justify-between gap-2"
                >
                  <ChevronDownIcon className="h-4 w-4 text-[var(--dash-text-muted)] flex-shrink-0" />
                  <span className="truncate">{selectedSafeName}</span>
                </button>
              </div>
            </div>

            {/* البيان */}
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2 text-right">
                البيان {(paymentType === 'loan' || paymentType === 'discount') && <span className="text-dash-accent-red">*</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-right focus:outline-none focus:ring-2 resize-none ${
                  paymentType === 'loan' ? 'focus:ring-dash-accent-orange' : paymentType === 'discount' ? 'focus:ring-dash-accent-purple' : 'focus:ring-[var(--dash-accent-blue)]'
                }`}
                placeholder="أدخل البيان"
                required={paymentType === 'loan' || paymentType === 'discount'}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded font-medium transition-colors"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || ((paymentType === 'loan' || paymentType === 'discount') && (!notes || notes.trim() === ''))}
                className={`flex-1 px-4 py-2 text-white rounded font-medium transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed ${
                  paymentType === 'loan'
                    ? 'dash-btn-orange'
                    : paymentType === 'discount'
                      ? 'dash-btn-purple'
                      : 'dash-btn-primary'
                }`}
              >
                {isSubmitting
                  ? 'جاري الإضافة...'
                  : paymentType === 'loan'
                    ? 'إضافة السلفة'
                    : paymentType === 'discount'
                      ? 'إضافة الخصم'
                      : 'إضافة الدفعة'
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Safe Selection Modal */}
      <RecordsSelectionModal
        isOpen={isSafesModalOpen}
        onClose={() => setIsSafesModalOpen(false)}
        onSelectRecord={handleRecordSelect}
        paymentIsPhysical={selectedMethodIsPhysical}
      />
    </>
  )
}
