'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface AddRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onRecordAdded: () => void
}

export default function AddRecordModal({ isOpen, onClose, onRecordAdded }: AddRecordModalProps) {
  const [recordName, setRecordName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!recordName.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('records')
        .insert({
          name: recordName.trim(),
          is_primary: false,
          is_active: true
        })

      if (error) {
        console.error('Error creating record:', error)
        return
      }

      onRecordAdded()
      setRecordName('')
      onClose()
    } catch (error) {
      console.error('Error creating record:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setRecordName('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-[var(--dash-bg-base)] rounded-lg p-6 w-96 max-w-md mx-4 shadow-[var(--dash-shadow-lg)] animate-dash-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">إضافة سجل جديد</h2>
          <button
            onClick={handleClose}
            className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
              اسم السجل
            </label>
            <input
              type="text"
              value={recordName}
              onChange={(e) => setRecordName(e.target.value)}
              placeholder="أدخل اسم السجل..."
              className="w-full bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] px-4 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)]"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-[var(--dash-text-secondary)] bg-[var(--dash-bg-raised)] rounded-lg hover:bg-[var(--dash-bg-overlay)] transition-colors"
            disabled={isLoading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!recordName.trim() || isLoading}
            className="px-4 py-2 bg-dash-accent-green text-[var(--dash-text-primary)] rounded-lg hover:brightness-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}