'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { XMarkIcon, ArrowsRightLeftIcon, CalendarDaysIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
import SimpleDateFilterModal, { DateFilter } from './SimpleDateFilterModal'

interface TransferRecord {
  id: string
  invoice_number: string
  notes: string
  created_at: string
  time: string | null
  record: { name: string } | null
  creator: { full_name: string } | null
  items: TransferItem[]
}

interface TransferItem {
  id: string
  quantity: number
  notes: string | null
  product: { id: string; name: string; barcode: string | null } | null
}

interface TransferHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

const PAGE_SIZE = 20

export default function TransferHistoryModal({ isOpen, onClose }: TransferHistoryModalProps) {
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const getDateRange = useCallback(() => {
    if (dateFilter.type === 'all') return { start: null, end: null }

    const now = new Date()
    let start: Date | null = null
    let end: Date | null = null

    switch (dateFilter.type) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'current_week': {
        const dayOfWeek = now.getDay()
        start = new Date(now)
        start.setDate(now.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        end = new Date(now)
        end.setHours(23, 59, 59, 999)
        break
      }
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now)
        end.setHours(23, 59, 59, 999)
        break
      case 'last_week': {
        const dayOfWeek2 = now.getDay()
        end = new Date(now)
        end.setDate(now.getDate() - dayOfWeek2 - 1)
        end.setHours(23, 59, 59, 999)
        start = new Date(end)
        start.setDate(end.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        break
      }
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case 'custom':
        start = dateFilter.startDate || null
        end = dateFilter.endDate || null
        if (end) {
          end = new Date(end)
          end.setHours(23, 59, 59, 999)
        }
        break
    }
    return { start, end }
  }, [dateFilter])

  const fetchTransfers = useCallback(async (pageNum: number, reset = false) => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange()

      let query = supabase
        .from('purchase_invoices')
        .select(`
          id,
          invoice_number,
          notes,
          created_at,
          time,
          record:records(name),
          creator:user_profiles(full_name)
        `)
        .like('notes', '[TRANSFER]%')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (start) query = query.gte('created_at', start.toISOString())
      if (end) query = query.lte('created_at', end.toISOString())

      const { data: invoices, error } = await query

      if (error) throw error

      if (!invoices || invoices.length === 0) {
        if (reset) setTransfers([])
        setHasMore(false)
        setIsLoading(false)
        return
      }

      // Fetch items for these invoices
      const invoiceIds = invoices.map(inv => inv.id)
      const { data: items, error: itemsError } = await supabase
        .from('purchase_invoice_items')
        .select(`
          id,
          purchase_invoice_id,
          quantity,
          notes,
          product:products(id, name, barcode)
        `)
        .in('purchase_invoice_id', invoiceIds)

      if (itemsError) throw itemsError

      // Group items by invoice
      const itemsByInvoice: Record<string, TransferItem[]> = {}
      for (const item of (items || [])) {
        const invId = (item as any).purchase_invoice_id
        if (!itemsByInvoice[invId]) itemsByInvoice[invId] = []
        itemsByInvoice[invId].push(item as any)
      }

      const transferRecords: TransferRecord[] = invoices.map(inv => ({
        ...inv,
        record: inv.record as any,
        creator: inv.creator as any,
        items: itemsByInvoice[inv.id] || [],
      }))

      if (reset) {
        setTransfers(transferRecords)
      } else {
        setTransfers(prev => [...prev, ...transferRecords])
      }
      setHasMore(invoices.length === PAGE_SIZE)
    } catch (error) {
      console.error('Error fetching transfers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getDateRange])

  // Reload when modal opens or filter changes
  useEffect(() => {
    if (isOpen) {
      setPage(0)
      setHasMore(true)
      fetchTransfers(0, true)
    }
  }, [isOpen, dateFilter, fetchTransfers])

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchTransfers(nextPage)
    }
  }

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadMore()
    }
  }

  const parseTransferDirection = (notes: string) => {
    // Parse: [TRANSFER] نقل من {from} إلى {to}
    const match = notes.match(/نقل من (.+?) إلى (.+?)(?:\s*\[|$)/)
    if (match) return { from: match[1], to: match[2] }
    return { from: '—', to: '—' }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  const formatTime = (dateStr: string, time: string | null) => {
    if (time) return time
    const d = new Date(dateStr)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }

  const getFilterLabel = () => {
    switch (dateFilter.type) {
      case 'today': return 'اليوم'
      case 'current_week': return 'هذا الأسبوع'
      case 'current_month': return 'هذا الشهر'
      case 'last_week': return 'الأسبوع الماضي'
      case 'last_month': return 'الشهر الماضي'
      case 'custom': return 'فترة مخصصة'
      default: return 'الكل'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#374151] rounded-lg w-[95vw] max-w-[900px] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-5 w-5 text-green-400" />
            <h2 className="text-white text-lg font-semibold">حركة النقل</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDateFilter(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateFilter.type !== 'all'
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : 'bg-gray-600 text-gray-300 hover:text-white'
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4" />
              <span>{getFilterLabel()}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scrollbar-hide"
          onScroll={handleScroll}
        >
          {transfers.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <ArrowsRightLeftIcon className="h-16 w-16 text-gray-500 mb-4" />
              <p className="text-gray-400 text-lg mb-2">لا توجد عمليات نقل</p>
              <p className="text-gray-500 text-sm">لم يتم العثور على عمليات نقل في الفترة المحددة</p>
            </div>
          ) : isMobile ? (
            /* Mobile: Card Layout */
            <div className="p-4 space-y-3">
              {transfers.map((transfer) => {
                const { from, to } = parseTransferDirection(transfer.notes)
                const totalQty = transfer.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <div key={transfer.id} className="bg-[#2B3544] rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-green-400 font-medium text-sm">{transfer.invoice_number}</span>
                      <span className="text-gray-400 text-xs">
                        {formatDate(transfer.created_at)} • {formatTime(transfer.created_at, transfer.time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-white text-sm font-medium">{from}</span>
                      <span className="text-green-400">→</span>
                      <span className="text-white text-sm font-medium">{to}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {transfer.items.slice(0, 3).map((item) => (
                          <span key={item.id} className="bg-gray-600/50 px-2 py-0.5 rounded text-xs text-gray-300">
                            {item.product?.name || '—'} × {item.quantity}
                          </span>
                        ))}
                        {transfer.items.length > 3 && (
                          <span className="bg-gray-600/50 px-2 py-0.5 rounded text-xs text-gray-400">
                            +{transfer.items.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                        {totalQty} قطعة
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Desktop: Table Layout */
            <table className="w-full text-sm">
              <thead className="bg-[#2B3544] sticky top-0 z-10">
                <tr>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">#</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">التاريخ</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الساعة</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">من</th>
                  <th className="text-center text-gray-400 font-medium px-2 py-3"></th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">إلى</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">المنتجات</th>
                  <th className="text-center text-gray-400 font-medium px-4 py-3">عدد القطع</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">رقم الفاتورة</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer, index) => {
                  const { from, to } = parseTransferDirection(transfer.notes)
                  const totalQty = transfer.items.reduce((sum, item) => sum + item.quantity, 0)
                  return (
                    <tr key={transfer.id} className="border-b border-gray-700 hover:bg-[#2B3544]/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-white">{formatDate(transfer.created_at)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatTime(transfer.created_at, transfer.time)}</td>
                      <td className="px-4 py-3 text-white font-medium">{from}</td>
                      <td className="px-2 py-3 text-center text-green-400">→</td>
                      <td className="px-4 py-3 text-white font-medium">{to}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {transfer.items.slice(0, 3).map((item) => (
                            <span key={item.id} className="bg-gray-600/50 px-2 py-0.5 rounded text-xs text-gray-300">
                              {item.product?.name || '—'} × {item.quantity}
                            </span>
                          ))}
                          {transfer.items.length > 3 && (
                            <span className="bg-gray-600/50 px-2 py-0.5 rounded text-xs text-gray-400">
                              +{transfer.items.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                          {totalQty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-400 text-xs">{transfer.invoice_number}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {isLoading && (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          )}

          {!hasMore && transfers.length > 0 && (
            <div className="text-center text-gray-500 text-xs py-4">
              تم عرض جميع عمليات النقل ({transfers.length})
            </div>
          )}
        </div>
      </div>

      {/* Date Filter Modal */}
      <SimpleDateFilterModal
        isOpen={showDateFilter}
        onClose={() => setShowDateFilter(false)}
        onDateFilterChange={(filter) => setDateFilter(filter)}
        currentFilter={dateFilter}
      />
    </div>
  )
}
