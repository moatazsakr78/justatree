'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ClockIcon,
  TruckIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import {
  getProductPurchaseHistory,
  PurchaseHistoryItem
} from '../lib/utils/purchase-cost-management'

interface PurchaseHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
}

export default function PurchaseHistoryModal({
  isOpen,
  onClose,
  productId,
  productName
}: PurchaseHistoryModalProps) {
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && productId) {
      loadHistory()
    }
  }, [isOpen, productId])

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const data = await getProductPurchaseHistory(productId)
      setHistory(data)
    } catch (error) {
      console.error('Error loading purchase history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    // Format date in Arabic but with English numbers
    const day = date.getDate()
    const year = date.getFullYear()
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    const month = months[date.getMonth()]
    return `${day} ${month} ${year}`
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[var(--dash-bg-base)] shadow-[var(--dash-shadow-lg)] transition-all border border-[var(--dash-border-default)]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)] bg-gradient-to-r from-blue-900/30 to-purple-900/30">
                  <Dialog.Title className="text-lg font-bold text-[var(--dash-text-primary)] flex items-center gap-2">
                    <ClockIcon className="h-6 w-6 text-dash-accent-blue" />
                    تاريخ أسعار الشراء
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-overlay)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Product Name */}
                <div className="px-4 py-3 bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)]">
                  <p className="text-[var(--dash-text-muted)] text-sm">المنتج:</p>
                  <p className="text-[var(--dash-text-primary)] font-medium">{productName}</p>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dash-accent-blue mx-auto"></div>
                      <p className="mt-4 text-[var(--dash-text-muted)]">جاري التحميل...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12">
                      <DocumentTextIcon className="h-16 w-16 mx-auto text-[var(--dash-text-disabled)] mb-4" />
                      <p className="text-[var(--dash-text-muted)] text-lg">لا توجد فواتير شراء لهذا المنتج</p>
                      <p className="text-[var(--dash-text-disabled)] text-sm mt-2">
                        ستظهر هنا جميع عمليات الشراء عند إضافة فواتير شراء
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-dash-accent-blue-subtle border border-blue-700/50 rounded-lg p-3 text-center">
                          <p className="text-dash-accent-blue text-xs mb-1">إجمالي الفواتير</p>
                          <p className="text-white text-xl font-bold">{history.length}</p>
                        </div>
                        <div className="bg-dash-accent-green-subtle/20 border border-green-700/50 rounded-lg p-3 text-center">
                          <p className="text-dash-accent-green text-xs mb-1">إجمالي الكمية</p>
                          <p className="text-white text-xl font-bold">
                            {history.reduce((sum, h) => sum + h.quantity, 0)}
                          </p>
                        </div>
                        <div className="bg-dash-accent-purple-subtle/20 border border-purple-700/50 rounded-lg p-3 text-center">
                          <p className="text-dash-accent-purple text-xs mb-1">متوسط السعر</p>
                          <p className="text-white text-xl font-bold">
                            {formatPrice(
                              history.reduce((sum, h) => sum + h.unitPrice, 0) / history.length
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[var(--dash-bg-surface)] rounded-lg text-[var(--dash-text-muted)] text-sm">
                        <div className="col-span-3">التاريخ</div>
                        <div className="col-span-3">المورد</div>
                        <div className="col-span-2 text-center">الكمية</div>
                        <div className="col-span-2 text-center">سعر الوحدة</div>
                        <div className="col-span-2 text-center">الإجمالي</div>
                      </div>

                      {/* History Items */}
                      {history.map((item, index) => (
                        <div
                          key={item.id}
                          className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-lg text-sm ${
                            index === 0
                              ? 'bg-dash-accent-green-subtle/20 border border-green-700/50'
                              : 'bg-[var(--dash-bg-surface)]/50 hover:bg-[var(--dash-bg-surface)]'
                          } transition-colors`}
                        >
                          <div className="col-span-3 text-[var(--dash-text-secondary)] flex items-center gap-1">
                            {index === 0 && (
                              <span className="text-dash-accent-green text-xs">(آخر)</span>
                            )}
                            {formatDate(item.invoiceDate)}
                          </div>
                          <div className="col-span-3 text-[var(--dash-text-primary)] flex items-center gap-1">
                            <TruckIcon className="h-4 w-4 text-[var(--dash-text-disabled)]" />
                            {item.supplierName}
                          </div>
                          <div className="col-span-2 text-center text-dash-accent-blue font-medium">
                            {item.quantity}
                          </div>
                          <div className="col-span-2 text-center text-dash-accent-green font-medium flex items-center justify-center gap-1">
                            <CurrencyDollarIcon className="h-4 w-4" />
                            {formatPrice(item.unitPrice)}
                          </div>
                          <div className="col-span-2 text-center text-dash-accent-purple font-medium">
                            {formatPrice(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--dash-border-default)] bg-[#1a1f2e]">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2.5 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-lg transition-colors font-medium"
                  >
                    إغلاق
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
