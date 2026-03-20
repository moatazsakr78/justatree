'use client'

import { useState } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  itemName: string
  isDeleting?: boolean
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  itemName,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--dash-bg-surface)] rounded-lg shadow-[var(--dash-shadow-lg)] max-w-md w-full mx-4 animate-dash-scale-in">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600/20 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-[var(--dash-text-primary)]">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
              disabled={isDeleting}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-[var(--dash-text-secondary)] text-right mb-4">
              {message}
            </p>
            <div className="bg-[var(--dash-bg-surface)] rounded-lg p-3 border border-[var(--dash-border-default)]">
              <p className="text-[var(--dash-text-primary)] font-medium text-right">{itemName}</p>
            </div>
            <p className="text-red-400 text-sm text-right mt-3">
              تحذير: هذا الإجراء لا يمكن التراجع عنه!
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 border-t border-[var(--dash-border-default)]">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-gray-500 hover:bg-[var(--dash-bg-overlay)]/10 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-[var(--dash-text-primary)] rounded transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m12 2a10 10 0 1 0 10 10c0-5.52-4.48-10-10-10zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"></path>
                  </svg>
                  جاري الحذف...
                </>
              ) : (
                'تأكيد الحذف'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}