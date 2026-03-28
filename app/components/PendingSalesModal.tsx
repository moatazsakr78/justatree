'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  XMarkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import {
  getAllPendingSales,
  deletePendingSale
} from '@/app/lib/offline/db'
import type { PendingSale, PendingSaleItem } from '@/app/lib/offline/types'
import { triggerManualSync, isSyncInProgress } from '@/app/lib/offline/syncManager'

interface PendingSalesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PendingSalesModal({ isOpen, onClose }: PendingSalesModalProps) {
  const [sales, setSales] = useState<PendingSale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null)

  // Load pending sales
  const loadSales = useCallback(async () => {
    setIsLoading(true)
    try {
      const pendingSales = await getAllPendingSales()
      // Sort by created_at (newest first)
      pendingSales.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setSales(pendingSales)
    } catch (error) {
      console.error('Failed to load pending sales:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadSales()
    }
  }, [isOpen, loadSales])

  // Handle sync
  const handleSync = async () => {
    if (isSyncInProgress()) return

    setIsSyncing(true)
    try {
      await triggerManualSync()
      await loadSales()
    } finally {
      setIsSyncing(false)
    }
  }

  // Handle delete
  const handleDelete = async (localId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة المعلقة؟')) return

    try {
      await deletePendingSale(localId)
      await loadSales()
    } catch (error) {
      console.error('Failed to delete sale:', error)
      alert('فشل في حذف الفاتورة')
    }
  }

  // Get status badge
  const getStatusBadge = (status: PendingSale['sync_status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-dash-accent-orange-subtle text-dash-accent-orange text-xs rounded-full">
            <ClockIcon className="h-3 w-3" />
            في الانتظار
          </span>
        )
      case 'syncing':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-dash-accent-blue-subtle text-dash-accent-blue text-xs rounded-full">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
            جاري المزامنة
          </span>
        )
      case 'synced':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-dash-accent-green-subtle text-dash-accent-green text-xs rounded-full">
            <CheckCircleIcon className="h-3 w-3" />
            تمت المزامنة
          </span>
        )
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-dash-accent-red-subtle text-dash-accent-red text-xs rounded-full">
            <ExclamationCircleIcon className="h-3 w-3" />
            فشلت
          </span>
        )
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--dash-bg-surface)] rounded-lg shadow-[var(--dash-shadow-lg)] w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)]">
          <div className="flex items-center gap-3">
            <CloudArrowUpIcon className="h-6 w-6 text-dash-accent-orange" />
            <h2 className="text-lg font-semibold text-white">الفواتير المعلقة</h2>
            <span className="px-2 py-0.5 bg-dash-accent-orange-subtle text-dash-accent-orange text-sm rounded-full">
              {sales.filter(s => s.sync_status === 'pending').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing || !navigator.onLine}
              className="flex items-center gap-2 px-3 py-1.5 bg-dash-accent-blue hover:bg-dash-accent-blue disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
            </button>
            <button onClick={onClose} className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-[var(--dash-text-muted)]">
              <CloudArrowUpIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد فواتير معلقة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.local_id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedSale?.local_id === sale.local_id
                      ? 'bg-[var(--dash-bg-raised)] border-dash-accent-blue'
                      : 'bg-[var(--dash-bg-base)] border-[var(--dash-border-default)] hover:border-[var(--dash-border-subtle)]'
                  }`}
                  onClick={() => setSelectedSale(
                    selectedSale?.local_id === sale.local_id ? null : sale
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {sale.temp_invoice_number}
                        </span>
                        {sale.invoice_number && (
                          <span className="text-dash-accent-green text-sm">
                            ({sale.invoice_number})
                          </span>
                        )}
                        {getStatusBadge(sale.sync_status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--dash-text-muted)]">
                        <span>{sale.branch_name}</span>
                        <span>{sale.customer_name}</span>
                        <span>{formatDate(sale.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`text-lg font-semibold ${
                        sale.total_amount >= 0 ? 'text-dash-accent-green' : 'text-dash-accent-red'
                      }`}>
                        {Math.abs(sale.total_amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        {sale.invoice_type === 'Sale Return' ? 'مرتجع' : 'بيع'}
                      </p>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {selectedSale?.local_id === sale.local_id && (
                    <div className="mt-4 pt-4 border-t border-[var(--dash-border-default)]">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-[var(--dash-text-secondary)]">المنتجات:</h4>
                        <div className="space-y-1">
                          {sale.items.map((item: PendingSaleItem, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-[var(--dash-text-muted)]">
                                {item.product_name} x {Math.abs(item.quantity)}
                              </span>
                              <span className="text-white">
                                {(item.unit_price * Math.abs(item.quantity)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {sale.sync_error && (
                        <div className="mt-3 p-2 bg-dash-accent-red-subtle border border-dash-accent-red/20 rounded text-sm text-dash-accent-red">
                          خطأ: {sale.sync_error}
                        </div>
                      )}

                      <div className="mt-4 flex justify-end gap-2">
                        {sale.sync_status !== 'synced' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(sale.local_id)
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-dash-accent-red-subtle hover:bg-dash-accent-red/30 text-dash-accent-red text-sm rounded-lg transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                            حذف
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-base)]">
          <div className="flex items-center justify-between text-sm text-[var(--dash-text-muted)]">
            <span>
              {!navigator.onLine && (
                <span className="text-dash-accent-red">غير متصل - المزامنة ستتم تلقائياً عند عودة الاتصال</span>
              )}
            </span>
            <span>
              إجمالي: {sales.length} | في الانتظار: {sales.filter(s => s.sync_status === 'pending').length} | تمت المزامنة: {sales.filter(s => s.sync_status === 'synced').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
