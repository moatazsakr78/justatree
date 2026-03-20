'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface AddPaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentMethodAdded: () => void
}

const suggestedMethods = [
  'نقداً',
  'فيزا',
  'ماستركارد',
  'فودافون كاش',
  'InstaPay',
  'أورانج مني',
  'إتصالات كاش',
  'CIB بنك',
  'البنك الأهلي',
  'بنك مصر',
  'QNB',
  'HSBC',
  'شيك',
  'تحويل بنكي'
]

export default function AddPaymentMethodModal({ 
  isOpen, 
  onClose, 
  onPaymentMethodAdded 
}: AddPaymentMethodModalProps) {
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isPhysical, setIsPhysical] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('يرجى إدخال اسم طريقة الدفع')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('payment_methods')
        .insert([
          {
            name: name.trim(),
            is_default: isDefault,
            is_active: isActive,
            is_physical: isPhysical
          }
        ])

      if (error) {
        console.error('Error adding payment method:', error)
        alert('حدث خطأ أثناء إضافة طريقة الدفع')
        return
      }

      // Reset form
      setName('')
      setIsDefault(false)
      setIsActive(true)
      setIsPhysical(true)
      
      // Close modal and refresh data
      onClose()
      onPaymentMethodAdded()

    } catch (error) {
      console.error('Error adding payment method:', error)
      alert('حدث خطأ أثناء إضافة طريقة الدفع')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion)
    setShowSuggestions(false)
  }

  const filteredSuggestions = suggestedMethods.filter(method =>
    method.toLowerCase().includes(name.toLowerCase()) && method !== name
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--dash-bg-base)] rounded-lg p-6 w-full max-w-md mx-4 shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)]" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">إضافة طريقة دفع جديدة</h2>
          <button
            onClick={onClose}
            className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
              اسم طريقة الدفع *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setShowSuggestions(e.target.value.length > 0)
              }}
              onFocus={() => setShowSuggestions(name.length > 0)}
              placeholder="أدخل اسم طريقة الدفع..."
              className="w-full px-3 py-2 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
              required
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-right text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] rounded focus:ring-[var(--dash-accent-blue)]"
              />
              <span className="text-sm text-[var(--dash-text-secondary)]">نشط</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] rounded focus:ring-purple-500"
              />
              <span className="text-sm text-[var(--dash-text-secondary)]">جعل افتراضية</span>
            </label>

            <div className="pt-2 border-t border-[var(--dash-border-subtle)]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPhysical}
                  onChange={(e) => setIsPhysical(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] rounded focus:ring-green-500"
                />
                <span className="text-sm text-[var(--dash-text-secondary)]">طريقة دفع فعلية</span>
              </label>
              <p className="text-xs text-[var(--dash-text-disabled)] mt-1 mr-6">
                {isPhysical
                  ? 'المدفوعات الفعلية (نقد، فيزا) تذهب للدرج المحدد'
                  : 'المدفوعات الرقمية (تحويل، إنستاباي) تذهب للخزنة الرئيسية مباشرة'}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-lg font-medium hover:bg-[var(--dash-bg-overlay)] transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>

        {/* Suggestions Help */}
        {!showSuggestions && (
          <div className="mt-4 p-3 bg-[var(--dash-bg-raised)] rounded-lg">
            <p className="text-xs text-[var(--dash-text-muted)] mb-2">اقتراحات شائعة:</p>
            <div className="flex flex-wrap gap-1">
              {suggestedMethods.slice(0, 6).map((method, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(method)}
                  className="px-2 py-1 text-xs bg-blue-900 text-blue-300 rounded hover:bg-blue-800 transition-colors"
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}