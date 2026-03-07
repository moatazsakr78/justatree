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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#2B3544] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-3">
            <CloudArrowUpIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">إنشاء المنتجات في الخلفية</h2>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm rounded-full">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                onClick={dismissAllCompleted}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                مسح المكتملة
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CloudArrowUpIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد عمليات إنشاء في الخلفية</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const statusInfo = getStatusLabel(task.status)
                const colorClasses: Record<string, string> = {
                  yellow: 'bg-yellow-500/20 text-yellow-400',
                  blue: 'bg-blue-500/20 text-blue-400',
                  green: 'bg-green-500/20 text-green-400',
                  red: 'bg-red-500/20 text-red-400'
                }

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg bg-[#1F2937] border border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium truncate">{task.productName}</span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${colorClasses[statusInfo.color]}`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </div>

                        {/* Progress bar for active tasks */}
                        {task.status !== 'completed' && task.status !== 'failed' && task.status !== 'queued' && (
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}

                        {/* Error message */}
                        {task.error && (
                          <p className="text-sm text-red-400 mt-1">{task.error}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mr-2">
                        {task.status === 'failed' && (
                          <button
                            onClick={() => retryTask(task.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                            title="إعادة المحاولة"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        )}
                        {(task.status === 'completed' || task.status === 'failed') && (
                          <button
                            onClick={() => dismissTask(task.id)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
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
        <div className="p-4 border-t border-gray-600 bg-[#1F2937]">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {tasks.some(t => t.status !== 'completed' && t.status !== 'failed') && (
                <span className="text-blue-400">جاري العمل... لا تغلق المتصفح</span>
              )}
            </span>
            <span>
              الإجمالي: {tasks.length} | مكتمل: {completedCount} | فشل: {tasks.filter(t => t.status === 'failed').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
