'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
  title?: string
  message?: string
  itemName?: string
  variant?: 'delete' | 'cancel'
  confirmButtonText?: string
  loadingText?: string
  warningText?: string
}

export default function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting = false,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد أنك تريد حذف هذه الفاتورة؟',
  itemName = '',
  variant = 'delete',
  confirmButtonText,
  loadingText,
  warningText
}: ConfirmDeleteModalProps) {
  const isCancel = variant === 'cancel'
  const btnText = confirmButtonText || (isCancel ? 'نعم، الغِ' : 'نعم، احذف')
  const btnLoadingText = loadingText || (isCancel ? 'جاري الإلغاء...' : 'جاري الحذف...')
  const warnText = warningText || (isCancel ? 'تحذير: سيتم إرجاع المخزون وعكس معاملات الخزنة' : 'تحذير: لا يمكن التراجع عن هذا الإجراء')
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center">
        <div className="bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg shadow-[var(--dash-shadow-lg)] w-full max-w-md mx-4 animate-dash-scale-in">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-[var(--dash-border-default)]">
            <ExclamationTriangleIcon className={`h-6 w-6 flex-shrink-0 ${isCancel ? 'text-dash-accent-orange' : 'text-dash-accent-red'}`} />
            <h3 className="text-lg font-medium text-[var(--dash-text-primary)] text-right flex-1">
              {title}
            </h3>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-[var(--dash-text-secondary)] text-right leading-6">
              {message}
            </p>
            {itemName && (
              <div className={`mt-3 p-3 bg-[var(--dash-bg-raised)]/50 rounded border-r-4 ${isCancel ? 'border-dash-accent-orange' : 'border-dash-accent-red'}`}>
                <p className="text-[var(--dash-text-primary)] text-sm text-right font-medium">
                  {itemName}
                </p>
              </div>
            )}
            <p className={`text-sm text-right mt-4 ${isCancel ? 'text-dash-accent-orange' : 'text-dash-accent-red'}`}>
              {warnText}
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-[var(--dash-border-default)]">
            {/* Cancel Button */}
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-[var(--dash-text-secondary)] bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] border border-[var(--dash-border-default)] rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
            
            {/* Confirm Delete Button */}
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className={`flex-1 px-4 py-2 text-[var(--dash-text-primary)] rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isCancel ? 'bg-dash-accent-orange hover:brightness-90' : 'dash-btn-red'}`}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{btnLoadingText}</span>
                </>
              ) : (
                btnText
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}