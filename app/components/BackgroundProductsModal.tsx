'use client'

import {
  XMarkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useBackgroundProduct } from '@/lib/contexts/BackgroundProductContext'
import type { BackgroundTaskStatus } from '@/app/lib/services/backgroundProductService'

interface BackgroundProductsModalProps {
  isOpen: boolean
  onClose: () => void
}

function getStatusLabel(status: BackgroundTaskStatus): { text: string, color: string, icon: React.ReactNode } {
  switch (status) {
    case 'queued':
      return {
        text: 'في الانتظار',
        color: 'yellow',
        icon: <ClockIcon className="h-3 w-3" />
      }
    case 'creating':
      return {
        text: 'جاري الإنشاء',
        color: 'blue',
        icon: <ArrowPathIcon className="h-3 w-3 animate-spin" />
      }
    case 'updating':
      return {
        text: 'جاري التحديث',
        color: 'blue',
        icon: <ArrowPathIcon className="h-3 w-3 animate-spin" />
      }
    case 'uploading-variants':
    case 'uploading-images':
    case 'uploading-videos':
      return {
        text: 'جاري رفع الملفات',
        color: 'blue',
        icon: <CloudArrowUpIcon className="h-3 w-3 animate-pulse" />
      }
    case 'creating-inventory':
      return {
        text: 'جاري إنشاء المخزون',
        color: 'blue',
        icon: <ArrowPathIcon className="h-3 w-3 animate-spin" />
      }
    case 'saving-definitions':
      return {
        text: 'جاري حفظ البيانات',
        color: 'blue',
        icon: <ArrowPathIcon className="h-3 w-3 animate-spin" />
      }
    case 'finalizing':
      return {
        text: 'جاري الإنهاء',
        color: 'blue',
        icon: <ArrowPathIcon className="h-3 w-3 animate-spin" />
      }
    case 'completed':
      return {
        text: 'مكتمل',
        color: 'green',
        icon: <CheckCircleIcon className="h-3 w-3" />
      }
    case 'failed':
      return {
        text: 'فشل',
        color: 'red',
        icon: <ExclamationCircleIcon className="h-3 w-3" />
      }
  }
}

export default function BackgroundProductsModal({ isOpen, onClose }: BackgroundProductsModalProps) {
  const { tasks, retryTask, dismissTask, dismissAllCompleted } = useBackgroundProduct()

  if (!isOpen) return null

  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[var(--dash-bg-surface)] rounded-lg shadow-[var(--dash-shadow-lg)] w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)]">
          <div className="flex items-center gap-3">
            <CloudArrowUpIcon className="h-6 w-6 text-dash-accent-blue" />
            <h2 className="text-lg font-semibold text-white">عمليات المنتجات في الخلفية</h2>
            <span className="px-2 py-0.5 bg-dash-accent-blue-subtle text-dash-accent-blue text-sm rounded-full">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                onClick={dismissAllCompleted}
                className="px-3 py-1.5 text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-raised)] rounded-lg transition-colors"
              >
                مسح المكتملة
              </button>
            )}
            <button onClick={onClose} className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-[var(--dash-text-muted)]">
              <CloudArrowUpIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد عمليات في الخلفية</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const statusInfo = getStatusLabel(task.status)
                const colorClasses: Record<string, string> = {
                  yellow: 'bg-dash-accent-orange-subtle text-dash-accent-orange',
                  blue: 'bg-dash-accent-blue-subtle text-dash-accent-blue',
                  green: 'bg-dash-accent-green-subtle text-dash-accent-green',
                  red: 'bg-dash-accent-red-subtle text-dash-accent-red'
                }

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium truncate">{task.productName}</span>
                          <span className={`px-1.5 py-0.5 text-xs rounded ${task.type === 'update' ? 'bg-dash-accent-orange-subtle text-dash-accent-orange' : 'bg-dash-accent-green-subtle text-dash-accent-green'}`}>
                            {task.type === 'update' ? 'تعديل' : 'إنشاء'}
                          </span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${colorClasses[statusInfo.color]}`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </div>

                        {/* Progress bar for active tasks */}
                        {task.status !== 'completed' && task.status !== 'failed' && task.status !== 'queued' && (
                          <div className="w-full bg-[var(--dash-bg-raised)] rounded-full h-1.5">
                            <div
                              className="bg-dash-accent-blue h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}

                        {/* Error message */}
                        {task.error && (
                          <p className="text-sm text-dash-accent-red mt-1">{task.error}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mr-2">
                        {task.status === 'failed' && (
                          <button
                            onClick={() => retryTask(task.id)}
                            className="p-1.5 text-dash-accent-red hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded transition-colors"
                            title="إعادة المحاولة"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        )}
                        {(task.status === 'completed' || task.status === 'failed') && (
                          <button
                            onClick={() => dismissTask(task.id)}
                            className="p-1.5 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-raised)] rounded transition-colors"
                            title="إزالة"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-base)]">
          <div className="flex items-center justify-between text-sm text-[var(--dash-text-muted)]">
            <span>
              {tasks.some(t => t.status !== 'completed' && t.status !== 'failed') && (
                <span className="text-dash-accent-blue">جاري العمل... لا تغلق المتصفح</span>
              )}
            </span>
            <span>
              الإجمالي: {tasks.length} | مكتمل: {completedCount} | فشل: {tasks.filter(t => t.status === 'failed').length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="mt-3 w-full py-2.5 text-sm font-medium text-white bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-border-default)] rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
