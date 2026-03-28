'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Column {
  id: string
  header: string
  visible: boolean
}

interface ColumnsControlModalProps {
  isOpen: boolean
  onClose: () => void
  columns: Column[]
  onColumnsChange: (updatedColumns: Column[]) => void
}

export default function ColumnsControlModal({ 
  isOpen, 
  onClose, 
  columns, 
  onColumnsChange 
}: ColumnsControlModalProps) {
  const [localColumns, setLocalColumns] = useState<Column[]>(columns)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalColumns(columns)
  }, [columns])

  const handleColumnToggle = (columnId: string) => {
    const updatedColumns = localColumns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    setLocalColumns(updatedColumns)
    // Don't apply changes immediately - wait for user to click "Apply"
  }

  const handleSelectAll = () => {
    const updatedColumns = localColumns.map(col => ({ ...col, visible: true }))
    setLocalColumns(updatedColumns)
    // Don't apply changes immediately - wait for user to click "Apply"
  }

  const handleDeselectAll = () => {
    const updatedColumns = localColumns.map(col => ({ ...col, visible: false }))
    setLocalColumns(updatedColumns)
    // Don't apply changes immediately - wait for user to click "Apply"
  }

  const handleApply = async () => {
    setIsSaving(true)
    try {
      // Apply changes
      onColumnsChange(localColumns)

      // Wait a moment to show the saving state
      await new Promise(resolve => setTimeout(resolve, 300))

      onClose()
    } catch (error) {
      console.error('Error saving column configuration:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setLocalColumns(columns)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={handleCancel} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--dash-bg-surface)] rounded-xl shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)] w-full max-w-md max-h-[80vh] overflow-hidden animate-dash-scale-in">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--dash-border-default)] flex items-center justify-between">
            <div className="text-right">
              <h3 className="text-lg font-medium text-[var(--dash-text-primary)]">إدارة الأعمدة</h3>
              <p className="text-sm text-dash-accent-blue mt-1">🎯 اختر الأعمدة ثم اضغط &quot;تطبيق&quot;</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            
            {/* Control Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 dash-btn-primary rounded-md text-sm font-medium transition-colors"
              >
                تحديد الكل
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-4 py-2 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-md text-sm font-medium transition-colors"
              >
                إلغاء تحديد الكل
              </button>
            </div>

            {/* Columns List */}
            <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-2">
              {localColumns.map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-3 p-3 bg-[var(--dash-bg-raised)] hover:bg-[#434E61] rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => handleColumnToggle(column.id)}
                    className="w-4 h-4 text-dash-accent-blue bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] rounded focus:ring-dash-accent-blue focus:ring-2"
                  />
                  <span className="text-[var(--dash-text-primary)] text-sm font-medium flex-1 text-right">
                    {column.header}
                  </span>
                </label>
              ))}
            </div>
            
            {/* Summary */}
            <div className="mt-4 p-3 bg-[var(--dash-bg-raised)] rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-dash-accent-blue font-medium">
                  {localColumns.filter(col => col.visible).length} من أصل {localColumns.length}
                </span>
                <span className="text-[var(--dash-text-muted)]">الأعمدة المعروضة</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--dash-border-default)] flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] bg-transparent hover:bg-[var(--dash-bg-overlay)]/20 border border-[var(--dash-border-default)] hover:border-gray-500 rounded transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleApply}
              disabled={isSaving}
              className="px-4 py-2 dash-btn-primary disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSaving ? 'جاري الحفظ...' : 'تطبيق'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}