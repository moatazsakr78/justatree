'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  XMarkIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
import SimpleDateFilterModal, { DateFilter } from './SimpleDateFilterModal'
import ResizableTable from './tables/ResizableTable'
import { useScrollDetection } from '../lib/hooks/useScrollDetection'

// Types
interface TransferItem {
  id: string
  quantity: number
  notes: string | null
  product: { id: string; name: string; barcode: string | null } | null
}

interface TransferInvoice {
  id: string
  invoice_number: string
  notes: string
  created_at: string
  time: string | null
  invoice_date: string | null
  record: { name: string } | null
  creator: { full_name: string } | null
  items: TransferItem[]
}

interface LocationOption {
  id: string
  name: string
  type: 'branch' | 'warehouse'
}

interface TransferHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

type ActiveTab = 'invoices' | 'summary'
type ViewMode = 'split' | 'list-only' | 'details-only'

const PAGE_SIZE = 50

// Helpers
const parseTransferDirection = (notes: string) => {
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

const getFilterLabel = (dateFilter: DateFilter) => {
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

export default function TransferHistoryModal({ isOpen, onClose }: TransferHistoryModalProps) {
  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('invoices')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [showSidebar, setShowSidebar] = useState(true)
  const [dividerPosition, setDividerPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const topPanelRef = useRef<HTMLDivElement>(null)

  // Device detection
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [isTabletDevice, setIsTabletDevice] = useState(false)

  // Data
  const [transfers, setTransfers] = useState<TransferInvoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedTransferIndex, setSelectedTransferIndex] = useState(0)
  const [locations, setLocations] = useState<LocationOption[]>([])

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [selectedLocations, setSelectedLocations] = useState<Set<string> | null>(null)
  const [directionFilter, setDirectionFilter] = useState<'all' | 'outgoing' | 'incoming'>('all')

  // Mobile
  const [showMobileDetails, setShowMobileDetails] = useState(false)
  const [mobileSelectedTransfer, setMobileSelectedTransfer] = useState<TransferInvoice | null>(null)
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [isMobileInfoExpanded, setIsMobileInfoExpanded] = useState(true)

  // Device detection
  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth < 768
      const isTablet = window.innerWidth < 1024 && window.innerWidth >= 768
      setIsMobileDevice(isMobile)
      setIsTabletDevice(isTablet)
      if (isTablet) setShowSidebar(false)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  // Divider drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== 'split' || activeTab !== 'invoices') return
    setIsDragging(true)
    e.preventDefault()
  }, [viewMode, activeTab])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current || viewMode !== 'split') return
    const rect = containerRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const percentage = Math.max(20, Math.min(80, (y / rect.height) * 100))
    setDividerPosition(percentage)
  }, [isDragging, viewMode])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Date range helper
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

  // Fetch locations
  useEffect(() => {
    if (!isOpen) return
    const fetchLocations = async () => {
      const [branchRes, warehouseRes] = await Promise.all([
        supabase.from('branches').select('id, name').eq('is_active', true),
        supabase.from('warehouses').select('id, name')
      ])
      const locs: LocationOption[] = []
      if (branchRes.data) {
        locs.push(...branchRes.data.map(b => ({ id: b.id, name: b.name, type: 'branch' as const })))
      }
      if (warehouseRes.data) {
        locs.push(...warehouseRes.data.map(w => ({ id: w.id, name: w.name, type: 'warehouse' as const })))
      }
      setLocations(locs)
    }
    fetchLocations()
  }, [isOpen])

  // Fetch transfers
  const fetchTransfers = useCallback(async (pageNum: number, reset = false) => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange()

      let query = supabase
        .from('purchase_invoices')
        .select(`
          id, invoice_number, notes, created_at, time, invoice_date,
          branch_id, warehouse_id, record_id, created_by,
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

      // Fetch items in batch
      const invoiceIds = invoices.map(inv => inv.id)
      const { data: items } = await supabase
        .from('purchase_invoice_items')
        .select(`id, purchase_invoice_id, quantity, notes, product:products(id, name, barcode)`)
        .in('purchase_invoice_id', invoiceIds)

      // Group items by invoice
      const itemsByInvoice: Record<string, TransferItem[]> = {}
      for (const item of (items || [])) {
        const invId = (item as any).purchase_invoice_id
        if (!itemsByInvoice[invId]) itemsByInvoice[invId] = []
        itemsByInvoice[invId].push(item as any)
      }

      const transferRecords: TransferInvoice[] = invoices.map(inv => ({
        ...inv,
        record: inv.record as any,
        creator: inv.creator as any,
        items: itemsByInvoice[inv.id] || [],
      }))

      if (reset) {
        setTransfers(transferRecords)
        setSelectedTransferIndex(0)
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

  // Load on open / filter change
  useEffect(() => {
    if (isOpen) {
      setPage(0)
      setHasMore(true)
      fetchTransfers(0, true)
    }
  }, [isOpen, dateFilter, fetchTransfers])

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchTransfers(nextPage)
    }
  }, [isLoading, hasMore, page, fetchTransfers])

  // Infinite scroll for desktop — attach scroll listener to ResizableTable's inner scroll container
  useEffect(() => {
    if (isMobileDevice || !topPanelRef.current || isLoading || !hasMore) return

    const scrollEl = topPanelRef.current.querySelector('.overflow-y-auto, .custom-scrollbar') as HTMLElement
    if (!scrollEl) return

    const handleScroll = () => {
      if (scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 200) {
        loadMore()
      }
    }

    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [isMobileDevice, isLoading, hasMore, loadMore, transfers.length])

  // Mobile infinite scroll via sentinel
  const { sentinelRef } = useScrollDetection({
    onLoadMore: loadMore,
    enabled: hasMore && !isLoading && isMobileDevice,
    isLoading
  })

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const { from, to } = parseTransferDirection(t.notes)

      if (selectedLocations && selectedLocations.size > 0) {
        const matchesFrom = selectedLocations.has(from)
        const matchesTo = selectedLocations.has(to)

        if (directionFilter === 'outgoing') {
          if (!matchesFrom) return false
        } else if (directionFilter === 'incoming') {
          if (!matchesTo) return false
        } else {
          if (!matchesFrom && !matchesTo) return false
        }
      }

      return true
    })
  }, [transfers, selectedLocations, directionFilter])

  // Selected transfer
  const selectedTransfer = filteredTransfers[selectedTransferIndex] || null

  // Table data for invoices
  const invoiceTableData = useMemo(() => {
    return filteredTransfers.map((t, idx) => {
      const { from, to } = parseTransferDirection(t.notes)
      return {
        id: t.id,
        index: idx + 1,
        invoice_number: t.invoice_number,
        date: formatDate(t.created_at),
        time: formatTime(t.created_at, t.time),
        from,
        to,
        items_count: t.items.length,
        total_qty: t.items.reduce((sum, item) => sum + item.quantity, 0),
        record: t.record?.name || '—',
        creator: t.creator?.full_name || '—',
      }
    })
  }, [filteredTransfers])

  // Table data for detail items
  const itemTableData = useMemo(() => {
    if (!selectedTransfer) return []
    return selectedTransfer.items.map((item, idx) => ({
      id: item.id,
      index: idx + 1,
      product_name: item.product?.name || '—',
      barcode: item.product?.barcode || '—',
      quantity: item.quantity,
      notes: item.notes || '',
    }))
  }, [selectedTransfer])

  // Invoice columns
  const invoiceColumns = useMemo(() => [
    { id: 'index', header: '#', accessor: 'index', width: 50, minWidth: 40 },
    { id: 'invoice_number', header: 'رقم الفاتورة', accessor: 'invoice_number', width: 150, minWidth: 100,
      render: (value: string) => <span className="text-green-400 text-xs">{value}</span>
    },
    { id: 'date', header: 'التاريخ', accessor: 'date', width: 110, minWidth: 80 },
    { id: 'time', header: 'الساعة', accessor: 'time', width: 80, minWidth: 60 },
    { id: 'from', header: 'من', accessor: 'from', width: 120, minWidth: 80,
      render: (value: string) => <span className="text-[var(--dash-text-primary)] font-medium">{value}</span>
    },
    { id: 'to', header: 'إلى', accessor: 'to', width: 120, minWidth: 80,
      render: (value: string) => <span className="text-[var(--dash-text-primary)] font-medium">{value}</span>
    },
    { id: 'items_count', header: 'عدد الأصناف', accessor: 'items_count', width: 90, minWidth: 70 },
    { id: 'total_qty', header: 'إجمالي القطع', accessor: 'total_qty', width: 100, minWidth: 70,
      render: (value: number) => (
        <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">{value}</span>
      )
    },
    { id: 'record', header: 'الخزنة', accessor: 'record', width: 100, minWidth: 70 },
    { id: 'creator', header: 'بواسطة', accessor: 'creator', width: 100, minWidth: 70 },
  ], [])

  // Items columns
  const itemColumns = useMemo(() => [
    { id: 'index', header: '#', accessor: 'index', width: 50, minWidth: 40 },
    { id: 'product_name', header: 'المنتج', accessor: 'product_name', width: 250, minWidth: 150 },
    { id: 'barcode', header: 'الباركود', accessor: 'barcode', width: 150, minWidth: 100 },
    { id: 'quantity', header: 'الكمية', accessor: 'quantity', width: 80, minWidth: 60,
      render: (value: number) => (
        <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">{value}</span>
      )
    },
    { id: 'notes', header: 'ملاحظات', accessor: 'notes', width: 200, minWidth: 100 },
  ], [])

  // Location filter handlers
  const handleLocationToggle = (name: string) => {
    setSelectedLocations(prev => {
      if (!prev) {
        return new Set([name])
      }
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
        if (next.size === 0) return null
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleSelectAllLocations = () => {
    setSelectedLocations(null)
    setDirectionFilter('all')
  }

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalTransfers = filteredTransfers.length
    const totalItems = filteredTransfers.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0)
    const uniqueProducts = new Set(filteredTransfers.flatMap(t => t.items.map(i => i.product?.id).filter(Boolean))).size
    const avgItemsPerTransfer = totalTransfers > 0 ? Math.round(totalItems / totalTransfers * 10) / 10 : 0

    return { totalTransfers, totalItems, uniqueProducts, avgItemsPerTransfer }
  }, [filteredTransfers])

  // Branch flow data
  const branchFlowData = useMemo(() => {
    const flowMap: Record<string, { name: string; outCount: number; outQty: number; inCount: number; inQty: number }> = {}

    for (const t of filteredTransfers) {
      const { from, to } = parseTransferDirection(t.notes)
      const totalQty = t.items.reduce((sum, i) => sum + i.quantity, 0)

      if (from !== '—') {
        if (!flowMap[from]) flowMap[from] = { name: from, outCount: 0, outQty: 0, inCount: 0, inQty: 0 }
        flowMap[from].outCount++
        flowMap[from].outQty += totalQty
      }
      if (to !== '—') {
        if (!flowMap[to]) flowMap[to] = { name: to, outCount: 0, outQty: 0, inCount: 0, inQty: 0 }
        flowMap[to].inCount++
        flowMap[to].inQty += totalQty
      }
    }

    return Object.values(flowMap)
  }, [filteredTransfers])

  if (!isOpen) return null

  // ===================== MOBILE LAYOUT =====================
  if (isMobileDevice) {
    return (
      <div className="fixed inset-0 bg-[var(--dash-bg-base)] z-50 flex flex-col">
        {showMobileDetails && mobileSelectedTransfer ? (
          /* ---- Mobile Detail View ---- */
          <div className="flex flex-col h-full">
            <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowMobileDetails(false)}>
                <ChevronRightIcon className="h-5 w-5 text-[var(--dash-text-secondary)]" />
              </button>
              <h2 className="text-[var(--dash-text-primary)] font-semibold text-sm flex-1 text-right">
                تفاصيل فاتورة النقل {mobileSelectedTransfer.invoice_number}
              </h2>
            </div>
            {/* Summary info */}
            <div className="p-4 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-surface)]">
              {(() => {
                const { from, to } = parseTransferDirection(mobileSelectedTransfer.notes)
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm justify-end">
                      <span className="text-[var(--dash-text-primary)] font-medium">{to}</span>
                      <span className="text-green-400">←</span>
                      <span className="text-[var(--dash-text-primary)] font-medium">{from}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--dash-text-muted)] justify-end">
                      <span>{formatDate(mobileSelectedTransfer.created_at)}</span>
                      <span>{formatTime(mobileSelectedTransfer.created_at, mobileSelectedTransfer.time)}</span>
                      {mobileSelectedTransfer.record && <span>الخزنة: {mobileSelectedTransfer.record.name}</span>}
                      {mobileSelectedTransfer.creator && <span>بواسطة: {mobileSelectedTransfer.creator.full_name}</span>}
                    </div>
                  </div>
                )
              })()}
            </div>
            {/* Items cards */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
              {mobileSelectedTransfer.items.map((item, idx) => (
                <div key={item.id} className="bg-[var(--dash-bg-surface)] rounded-lg p-3 border border-[var(--dash-border-default)]">
                  <div className="flex items-center justify-between">
                    <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                      {item.quantity} قطعة
                    </span>
                    <span className="text-[var(--dash-text-primary)] text-sm font-medium">{item.product?.name || '—'}</span>
                  </div>
                  {item.product?.barcode && (
                    <div className="text-[var(--dash-text-muted)] text-xs mt-1 text-right">{item.product.barcode}</div>
                  )}
                  {item.notes && (
                    <div className="text-[var(--dash-text-disabled)] text-xs mt-1 text-right">{item.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : showMobileFilter ? (
          /* ---- Mobile Filter View ---- */
          <div className="flex flex-col h-full">
            <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowMobileFilter(false)}>
                <ChevronRightIcon className="h-5 w-5 text-[var(--dash-text-secondary)]" />
              </button>
              <h2 className="text-[var(--dash-text-primary)] font-semibold text-sm flex-1 text-right">الفلاتر</h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
              {/* Location filter */}
              <div>
                <h4 className="text-[var(--dash-text-primary)] font-medium mb-3 text-sm text-right">تصفية حسب الموقع</h4>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded hover:bg-[var(--dash-bg-surface)] transition-colors">
                    <input
                      type="checkbox"
                      checked={!selectedLocations}
                      onChange={handleSelectAllLocations}
                      className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-green-500 focus:ring-green-500 focus:ring-offset-0"
                    />
                    <span className="text-[var(--dash-text-secondary)] text-sm">الكل</span>
                  </label>
                  {locations.map(loc => (
                    <label key={loc.id} className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded hover:bg-[var(--dash-bg-surface)] transition-colors">
                      <input
                        type="checkbox"
                        checked={!selectedLocations || selectedLocations.has(loc.name)}
                        onChange={() => handleLocationToggle(loc.name)}
                        className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-green-500 focus:ring-green-500 focus:ring-offset-0"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--dash-text-disabled)] text-xs">({loc.type === 'branch' ? 'فرع' : 'مخزن'})</span>
                        <span className="text-[var(--dash-text-secondary)] text-sm">{loc.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Direction filter */}
              <div>
                <h4 className="text-[var(--dash-text-primary)] font-medium mb-3 text-sm text-right">تصفية حسب الاتجاه</h4>
                <div className="flex gap-2">
                  {(['all', 'outgoing', 'incoming'] as const).map(dir => (
                    <button
                      key={dir}
                      onClick={() => setDirectionFilter(dir)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        directionFilter === dir
                          ? 'bg-green-600 text-white'
                          : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-highlight)]'
                      }`}
                    >
                      {dir === 'all' ? 'الكل' : dir === 'outgoing' ? 'صادر' : 'وارد'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date filter */}
              <div>
                <h4 className="text-[var(--dash-text-primary)] font-medium mb-3 text-sm text-right">تصفية حسب التاريخ</h4>
                <button
                  onClick={() => setShowDateFilter(true)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    dateFilter.type !== 'all'
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-secondary)]'
                  }`}
                >
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>{getFilterLabel(dateFilter)}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ---- Mobile Main View ---- */
          <div className="flex flex-col h-full">
            <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-3 flex items-center justify-between flex-shrink-0">
              <button onClick={() => setShowMobileFilter(true)} className="text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]">
                <FunnelIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <ArrowsRightLeftIcon className="h-5 w-5 text-green-400" />
                <h2 className="text-[var(--dash-text-primary)] font-semibold text-sm">حركة النقل</h2>
              </div>
              <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Collapsible summary */}
            <div className="bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-subtle)]">
              <button
                onClick={() => setIsMobileInfoExpanded(!isMobileInfoExpanded)}
                className="w-full px-4 py-2 flex items-center justify-between"
              >
                <ChevronLeftIcon className={`h-4 w-4 text-[var(--dash-text-muted)] transition-transform ${isMobileInfoExpanded ? 'rotate-[-90deg]' : ''}`} />
                <span className="text-[var(--dash-text-secondary)] text-sm">ملخص ({filteredTransfers.length} عملية نقل)</span>
              </button>
              {isMobileInfoExpanded && (
                <div className="px-4 pb-3">
                  <div className="bg-green-600 rounded p-3 text-center">
                    <div className="text-xl font-bold text-white">{summaryStats.totalTransfers}</div>
                    <div className="text-green-200 text-xs">عمليات نقل &bull; {summaryStats.totalItems} قطعة</div>
                  </div>
                </div>
              )}
            </div>

            {/* Transfer cards list */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
              {filteredTransfers.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <ArrowsRightLeftIcon className="h-16 w-16 text-[var(--dash-text-disabled)] mb-4" />
                  <p className="text-[var(--dash-text-muted)] text-lg mb-2">لا توجد عمليات نقل</p>
                  <p className="text-[var(--dash-text-disabled)] text-sm">لم يتم العثور على عمليات نقل في الفترة المحددة</p>
                </div>
              ) : (
                filteredTransfers.map((transfer) => {
                  const { from, to } = parseTransferDirection(transfer.notes)
                  const totalQty = transfer.items.reduce((sum, item) => sum + item.quantity, 0)
                  return (
                    <div
                      key={transfer.id}
                      onClick={() => {
                        setMobileSelectedTransfer(transfer)
                        setShowMobileDetails(true)
                      }}
                      className="bg-[var(--dash-bg-surface)] rounded-lg p-4 border border-[var(--dash-border-default)] active:bg-[var(--dash-bg-raised)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[var(--dash-text-muted)] text-xs">
                          {formatDate(transfer.created_at)} &bull; {formatTime(transfer.created_at, transfer.time)}
                        </span>
                        <span className="text-green-400 font-medium text-sm">{transfer.invoice_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3 justify-end">
                        <span className="text-[var(--dash-text-primary)] text-sm font-medium">{to}</span>
                        <span className="text-green-400">←</span>
                        <span className="text-[var(--dash-text-primary)] text-sm font-medium">{from}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="bg-green-600/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                          {totalQty} قطعة
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {transfer.items.slice(0, 3).map((item) => (
                            <span key={item.id} className="bg-[var(--dash-bg-overlay)]/50 px-2 py-0.5 rounded text-xs text-[var(--dash-text-secondary)]">
                              {item.product?.name || '—'} &times; {item.quantity}
                            </span>
                          ))}
                          {transfer.items.length > 3 && (
                            <span className="bg-[var(--dash-bg-overlay)]/50 px-2 py-0.5 rounded text-xs text-[var(--dash-text-muted)]">
                              +{transfer.items.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[var(--dash-text-disabled)] text-xs mt-2 text-center">اضغط لعرض التفاصيل</div>
                    </div>
                  )
                })
              )}

              {isLoading && (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              )}
              {!hasMore && filteredTransfers.length > 0 && (
                <div className="text-center text-[var(--dash-text-disabled)] text-xs py-4">
                  تم عرض جميع عمليات النقل ({filteredTransfers.length})
                </div>
              )}
              <div ref={sentinelRef as any} className="h-1" />
            </div>
          </div>
        )}

        <SimpleDateFilterModal
          isOpen={showDateFilter}
          onClose={() => setShowDateFilter(false)}
          onDateFilterChange={(filter) => setDateFilter(filter)}
          currentFilter={dateFilter}
        />
      </div>
    )
  }

  // ===================== DESKTOP LAYOUT =====================
  return (
    <div className="fixed inset-0 bg-[var(--dash-bg-base)] z-50 flex flex-col" style={{ userSelect: isDragging ? 'none' : 'auto' }}>
      {/* Header */}
      <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Tab Navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 rounded-t-lg transition-all duration-200 ${
                  activeTab === 'invoices'
                    ? 'text-green-400 border-green-400 bg-green-600/10'
                    : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] border-transparent hover:border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]/20'
                }`}
              >
                فواتير النقل ({filteredTransfers.length})
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 rounded-t-lg transition-all duration-200 ${
                  activeTab === 'summary'
                    ? 'text-green-400 border-green-400 bg-green-600/10'
                    : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] border-transparent hover:border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]/20'
                }`}
              >
                ملخص
              </button>
            </div>

            {/* View Mode Toggle — invoices tab only */}
            {activeTab === 'invoices' && (
              <div className="flex gap-1 bg-[var(--dash-bg-overlay)]/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list-only')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                    viewMode === 'list-only'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50'
                  }`}
                  title="عرض القائمة فقط"
                >
                  📋
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                    viewMode === 'split'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50'
                  }`}
                  title="عرض مقسم"
                >
                  ⬌
                </button>
                <button
                  onClick={() => setViewMode('details-only')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                    viewMode === 'details-only'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/50'
                  }`}
                  title="عرض التفاصيل فقط"
                >
                  📄
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--dash-bg-overlay)]/30 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar Toggle Button */}
        <div className="flex">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="w-6 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] border-l border-[var(--dash-border-default)] flex items-center justify-center transition-colors duration-200"
            title={showSidebar ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}
          >
            {showSidebar ? (
              <ChevronLeftIcon className="h-4 w-4 text-[var(--dash-text-secondary)]" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-[var(--dash-text-secondary)]" />
            )}
          </button>
        </div>

        {/* Right Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-[var(--dash-bg-surface)] border-l border-[var(--dash-border-default)] flex flex-col overflow-y-auto scrollbar-hide">
            {/* Summary Card */}
            <div className="p-4 border-b border-[var(--dash-border-default)]">
              <div className="bg-green-600 rounded p-4 text-center">
                <div className="text-2xl font-bold text-white">{summaryStats.totalTransfers}</div>
                <div className="text-green-200 text-sm">إجمالي حركات النقل</div>
                <div className="text-green-100 text-xs mt-1">{summaryStats.totalItems} قطعة</div>
              </div>
            </div>

            {/* Location Filter */}
            <div className="p-4 border-b border-[var(--dash-border-default)]">
              <h4 className="text-[var(--dash-text-primary)] font-medium mb-3 text-sm text-right">تصفية حسب الموقع</h4>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[var(--dash-bg-raised)] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--dash-text-secondary)] text-sm">الكل</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!selectedLocations}
                    onChange={handleSelectAllLocations}
                    className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                  />
                </label>
                {locations.map(loc => (
                  <label key={loc.id} className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[var(--dash-bg-raised)] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--dash-text-secondary)] text-sm">{loc.name}</span>
                      <span className="text-[var(--dash-text-disabled)] text-xs">({loc.type === 'branch' ? 'فرع' : 'مخزن'})</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={!selectedLocations || selectedLocations.has(loc.name)}
                      onChange={() => handleLocationToggle(loc.name)}
                      className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Direction Filter */}
            <div className="p-4 border-b border-[var(--dash-border-default)]">
              <h4 className="text-[var(--dash-text-primary)] font-medium mb-3 text-sm text-right">تصفية حسب الاتجاه</h4>
              <div className="space-y-1.5">
                {(['all', 'outgoing', 'incoming'] as const).map(dir => (
                  <button
                    key={dir}
                    onClick={() => setDirectionFilter(dir)}
                    className={`w-full px-3 py-2 rounded text-sm font-medium text-right transition-colors ${
                      directionFilter === dir
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                    }`}
                  >
                    {dir === 'all' ? 'الكل' : dir === 'outgoing' ? 'صادر (من الموقع المحدد)' : 'وارد (إلى الموقع المحدد)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filter */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-green-400 text-sm">{getFilterLabel(dateFilter)}</span>
                <span className="text-[var(--dash-text-muted)] text-xs">الفترة</span>
              </div>
              {dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate && (
                <div className="flex justify-between items-center">
                  <span className="text-[var(--dash-text-primary)] text-sm">
                    {new Date(dateFilter.startDate).toLocaleDateString('en-GB')} - {new Date(dateFilter.endDate).toLocaleDateString('en-GB')}
                  </span>
                  <span className="text-[var(--dash-text-muted)] text-xs">من - إلى</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[var(--dash-text-primary)] text-sm">{new Date().toLocaleDateString('en-GB')}</span>
                <span className="text-[var(--dash-text-muted)] text-xs">التاريخ</span>
              </div>
              <button
                onClick={() => setShowDateFilter(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <CalendarDaysIcon className="h-5 w-5" />
                <span>التاريخ</span>
              </button>
              {dateFilter.type !== 'all' && (
                <div className="mt-2 text-center">
                  <span className="text-xs text-green-400">
                    {dateFilter.type === 'today' ? 'عرض فواتير اليوم' :
                     dateFilter.type === 'current_week' ? 'عرض فواتير الأسبوع الحالي' :
                     dateFilter.type === 'current_month' ? 'عرض فواتير الشهر الحالي' :
                     dateFilter.type === 'last_week' ? 'عرض فواتير الأسبوع الماضي' :
                     dateFilter.type === 'last_month' ? 'عرض فواتير الشهر الماضي' :
                     dateFilter.type === 'custom' ? 'عرض فواتير الفترة المحددة' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative" ref={containerRef}>
          {activeTab === 'invoices' ? (
            <>
              {/* Top Panel: Invoice List */}
              <div
                ref={topPanelRef}
                className={`absolute inset-0 bg-[var(--dash-bg-surface)] transition-all duration-300 ${
                  viewMode === 'details-only' ? 'z-0 opacity-20' : 'z-10'
                }`}
                style={{
                  height: viewMode === 'split' ? `${dividerPosition}%` : '100%',
                  zIndex: viewMode === 'list-only' ? 20 : viewMode === 'split' ? 10 : 5
                }}
              >
                {isLoading && transfers.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mr-3"></div>
                    <span className="text-[var(--dash-text-muted)]">جاري تحميل فواتير النقل...</span>
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <ArrowsRightLeftIcon className="h-16 w-16 text-[var(--dash-text-disabled)] mb-4" />
                    <p className="text-[var(--dash-text-muted)] text-lg mb-2">لا توجد عمليات نقل</p>
                    <p className="text-[var(--dash-text-disabled)] text-sm">لم يتم العثور على عمليات نقل في الفترة المحددة</p>
                  </div>
                ) : (
                  <ResizableTable
                    className="h-full w-full"
                    columns={invoiceColumns}
                    data={invoiceTableData}
                    selectedRowId={selectedTransfer?.id || null}
                    onRowClick={(_item: any, index: number) => setSelectedTransferIndex(index)}
                    reportType="TRANSFER_INVOICES_REPORT"
                  />
                )}
              </div>

              {/* Resizable Divider */}
              {viewMode === 'split' && (
                <div
                  className="absolute left-0 right-0 h-2 bg-[var(--dash-bg-overlay)] hover:bg-green-500 cursor-row-resize z-30 flex items-center justify-center transition-colors duration-200"
                  style={{ top: `${dividerPosition}%`, transform: 'translateY(-50%)' }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="w-12 h-1 bg-[var(--dash-text-muted)] rounded-full"></div>
                </div>
              )}

              {/* Bottom Panel: Selected Invoice Details */}
              <div
                className={`absolute inset-0 bg-[var(--dash-bg-surface)] flex flex-col transition-all duration-300 ${
                  viewMode === 'list-only' ? 'z-0 opacity-20' : 'z-10'
                }`}
                style={{
                  top: viewMode === 'split' ? `${dividerPosition}%` : '0',
                  height: viewMode === 'split' ? `${100 - dividerPosition}%` : '100%',
                  zIndex: viewMode === 'details-only' ? 20 : viewMode === 'split' ? 10 : 5
                }}
              >
                {selectedTransfer ? (
                  <>
                    {/* Detail Header */}
                    <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0 border-b border-[var(--dash-border-default)]">
                      <div />
                      <h3 className="text-green-400 font-medium text-lg">
                        تفاصيل فاتورة النقل {selectedTransfer.invoice_number}
                      </h3>
                    </div>
                    {/* Info Row */}
                    <div className="flex items-center justify-end gap-4 px-4 py-2 text-sm border-b border-[var(--dash-border-subtle)] flex-shrink-0 flex-wrap">
                      {selectedTransfer.creator && (
                        <span className="text-[var(--dash-text-muted)]">بواسطة: <span className="text-[var(--dash-text-primary)]">{selectedTransfer.creator.full_name}</span></span>
                      )}
                      {selectedTransfer.record && (
                        <span className="text-[var(--dash-text-muted)]">الخزنة: <span className="text-[var(--dash-text-primary)]">{selectedTransfer.record.name}</span></span>
                      )}
                      <span className="text-[var(--dash-text-muted)]">
                        {formatDate(selectedTransfer.created_at)} {formatTime(selectedTransfer.created_at, selectedTransfer.time)}
                      </span>
                      {(() => {
                        const { from, to } = parseTransferDirection(selectedTransfer.notes)
                        return (
                          <span className="text-[var(--dash-text-primary)] font-medium">
                            {from} <span className="text-green-400 mx-1">→</span> {to}
                          </span>
                        )
                      })()}
                    </div>
                    {/* Items Table */}
                    <div className="flex-1 overflow-hidden">
                      <ResizableTable
                        className="h-full w-full"
                        columns={itemColumns}
                        data={itemTableData}
                        reportType="TRANSFER_ITEMS_REPORT"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[var(--dash-text-disabled)]">اختر فاتورة نقل لعرض التفاصيل</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* =================== Summary Tab =================== */
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 border border-[var(--dash-border-default)] text-center">
                  <div className="text-2xl font-bold text-green-400">{summaryStats.totalTransfers}</div>
                  <div className="text-[var(--dash-text-muted)] text-sm mt-1">إجمالي فواتير النقل</div>
                </div>
                <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 border border-[var(--dash-border-default)] text-center">
                  <div className="text-2xl font-bold text-green-400">{summaryStats.totalItems}</div>
                  <div className="text-[var(--dash-text-muted)] text-sm mt-1">إجمالي القطع المنقولة</div>
                </div>
                <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 border border-[var(--dash-border-default)] text-center">
                  <div className="text-2xl font-bold text-green-400">{summaryStats.uniqueProducts}</div>
                  <div className="text-[var(--dash-text-muted)] text-sm mt-1">منتجات فريدة</div>
                </div>
                <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 border border-[var(--dash-border-default)] text-center">
                  <div className="text-2xl font-bold text-green-400">{summaryStats.avgItemsPerTransfer}</div>
                  <div className="text-[var(--dash-text-muted)] text-sm mt-1">متوسط القطع لكل عملية</div>
                </div>
              </div>

              {/* Branch Flow Table */}
              <h3 className="text-[var(--dash-text-primary)] font-semibold text-lg mb-4 text-right">حركة المواقع</h3>
              {branchFlowData.length > 0 ? (
                <div className="bg-[var(--dash-bg-surface)] rounded-lg border border-[var(--dash-border-default)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--dash-bg-raised)]">
                      <tr>
                        <th className="text-right text-[var(--dash-text-muted)] font-medium px-4 py-3">الموقع</th>
                        <th className="text-center text-[var(--dash-text-muted)] font-medium px-4 py-3">صادر (عدد)</th>
                        <th className="text-center text-[var(--dash-text-muted)] font-medium px-4 py-3">صادر (قطع)</th>
                        <th className="text-center text-[var(--dash-text-muted)] font-medium px-4 py-3">وارد (عدد)</th>
                        <th className="text-center text-[var(--dash-text-muted)] font-medium px-4 py-3">وارد (قطع)</th>
                        <th className="text-center text-[var(--dash-text-muted)] font-medium px-4 py-3">صافي الحركة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchFlowData.map((flow, idx) => (
                        <tr key={flow.name} className={`border-b border-[var(--dash-border-subtle)] ${idx % 2 === 0 ? '' : 'bg-[var(--dash-bg-raised)]/30'}`}>
                          <td className="px-4 py-3 text-[var(--dash-text-primary)] font-medium text-right">{flow.name}</td>
                          <td className="px-4 py-3 text-center text-red-400">{flow.outCount}</td>
                          <td className="px-4 py-3 text-center text-red-400">{flow.outQty}</td>
                          <td className="px-4 py-3 text-center text-green-400">{flow.inCount}</td>
                          <td className="px-4 py-3 text-center text-green-400">{flow.inQty}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={flow.inQty - flow.outQty >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {flow.inQty - flow.outQty >= 0 ? '+' : ''}{flow.inQty - flow.outQty}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-[var(--dash-text-disabled)] py-8">لا توجد بيانات لعرض حركة المواقع</div>
              )}

              {isLoading && (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              )}
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
