'use client'

import React, { useState } from 'react'
import { XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { useCurrentBranch } from '@/lib/contexts/CurrentBranchContext'

interface TransferQuantityModalProps {
  isOpen: boolean
  onClose: () => void
  product: any | null
  branches: any[]
  onConfirm: (quantity: number, reason: string, fromBranchId: string, toBranchId: string) => void
}

export default function TransferQuantityModal({
  isOpen,
  onClose,
  product,
  branches,
  onConfirm
}: TransferQuantityModalProps) {
  const { currentBranch } = useCurrentBranch()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [toBranchId, setToBranchId] = useState('')

  // Get branch info
  const toBranch = branches.find(b => b.id === toBranchId)
  const fromCurrentQuantity = currentBranch ? (product?.inventoryData?.[currentBranch.id]?.quantity || 0) : 0
  const toCurrentQuantity = toBranch ? (product?.inventoryData?.[toBranchId]?.quantity || 0) : 0

  // Filter destination branches (exclude current branch)
  const destinationBranches = branches.filter(b => b.id !== currentBranch?.id)

  // Clear destination if it matches current branch
  React.useEffect(() => {
    if (toBranchId && toBranchId === currentBranch?.id) {
      setToBranchId('')
    }
  }, [currentBranch?.id, toBranchId])

  if (!isOpen || !product) return null

  const numQuantity = parseInt(quantity) || 0
  const fromResult = fromCurrentQuantity - numQuantity
  const toResult = toCurrentQuantity + numQuantity
  const isValid = currentBranch?.id && toBranchId && currentBranch.id !== toBranchId && numQuantity > 0

  const handleSubmit = () => {
    if (!isValid || !currentBranch?.id) return
    onConfirm(numQuantity, reason, currentBranch.id, toBranchId)
    setQuantity('')
    setReason('')
    setToBranchId('')
    onClose()
  }

  const handleClose = () => {
    setQuantity('')
    setReason('')
    setToBranchId('')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)] max-w-md w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--dash-border-default)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dash-accent-purple rounded-full flex items-center justify-center">
                <ArrowsRightLeftIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">تحويل كمية</h2>
                <p className="text-sm text-dash-accent-purple">{product.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">

            {/* Source Branch */}
            {currentBranch && (
              <div>
                <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
                  من فرع (المصدر)
                </label>
                <div className="w-full px-4 py-3 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)]">
                  {currentBranch.name}
                </div>
                <div className="mt-2 flex justify-between items-center text-sm px-1">
                  <span className="text-[var(--dash-text-muted)]">الكمية الحالية</span>
                  <span className={`font-bold ${
                    fromCurrentQuantity < 0 ? 'text-dash-accent-red' :
                    fromCurrentQuantity === 0 ? 'text-gray-400' : 'text-dash-accent-green'
                  }`}>
                    {fromCurrentQuantity}
                  </span>
                </div>
              </div>
            )}

            {/* Arrow separator */}
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-dash-accent-purple-subtle rounded-full flex items-center justify-center">
                <ArrowsRightLeftIcon className="h-4 w-4 text-dash-accent-purple" />
              </div>
            </div>

            {/* Destination Branch */}
            <div>
              <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
                إلى فرع (الوجهة)
              </label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] focus:outline-none focus:ring-2 focus:ring-dash-accent-purple focus:border-transparent"
              >
                <option value="">اختر فرع الوجهة...</option>
                {destinationBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {toBranchId && (
                <div className="mt-2 flex justify-between items-center text-sm px-1">
                  <span className="text-[var(--dash-text-muted)]">الكمية الحالية</span>
                  <span className={`font-bold ${
                    toCurrentQuantity < 0 ? 'text-dash-accent-red' :
                    toCurrentQuantity === 0 ? 'text-gray-400' : 'text-dash-accent-green'
                  }`}>
                    {toCurrentQuantity}
                  </span>
                </div>
              )}
            </div>

            {/* Transfer Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
                كمية التحويل
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] focus:outline-none focus:ring-2 focus:ring-dash-accent-purple focus:border-transparent"
                placeholder="أدخل الكمية المراد تحويلها..."
                min="1"
                autoFocus
              />
            </div>

            {/* Result Preview */}
            {quantity && numQuantity > 0 && currentBranch && toBranchId && (
              <div className="space-y-2">
                {/* Source result */}
                <div className="bg-dash-accent-red-subtle border border-dash-accent-red/20 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-dash-accent-red text-sm">{currentBranch.name} (المصدر)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--dash-text-muted)] text-sm">{fromCurrentQuantity}</span>
                      <span className="text-[var(--dash-text-disabled)]">←</span>
                      <span className={`font-bold ${fromResult < 0 ? 'text-dash-accent-red' : 'text-dash-accent-red'}`}>
                        {fromResult}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Destination result */}
                <div className="bg-dash-accent-green-subtle border border-dash-accent-green/20 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-dash-accent-green text-sm">{toBranch?.name} (الوجهة)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--dash-text-muted)] text-sm">{toCurrentQuantity}</span>
                      <span className="text-[var(--dash-text-disabled)]">←</span>
                      <span className="text-dash-accent-green font-bold">
                        {toResult}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
                السبب (اختياري)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] focus:outline-none focus:ring-2 focus:ring-dash-accent-purple focus:border-transparent resize-none"
                placeholder="اكتب سبب التحويل..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--dash-border-default)] flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="px-6 py-2 dash-btn-purple disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              تأكيد التحويل
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
