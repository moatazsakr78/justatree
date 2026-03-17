'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, PrinterIcon, EllipsisVerticalIcon, XCircleIcon } from '@heroicons/react/24/outline'
import ResizableTable from './tables/ResizableTable'
import { supabase } from '../lib/supabase/client'
import { roundMoney } from '../lib/utils/money'
import { getSignedAmount } from '../lib/utils/transactionTypes'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { cancelSalesInvoice } from '../lib/invoices/cancelSalesInvoice'
import SimpleDateFilterModal, { DateFilter } from './SimpleDateFilterModal'
import ContextMenu, { createEditContextMenuItems } from './ContextMenu'
import EditInvoiceModal from './EditInvoiceModal'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import { useAuth } from '@/lib/useAuth'
import { useInfiniteStatements, type StatementItem } from '../lib/hooks/useInfiniteStatements'
import { useInfiniteTransactions } from '../lib/hooks/useInfiniteTransactions'
import { useScrollDetection } from '../lib/hooks/useScrollDetection'

interface SafeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  safe: any
  additionalSafeIds?: string[]
  onSafeUpdated?: () => void
}

type ViewMode = 'split' | 'safes-only' | 'details-only'

export default function SafeDetailsModal({ isOpen, onClose, safe, additionalSafeIds = [], onSafeUpdated }: SafeDetailsModalProps) {
  const formatPrice = useFormatPrice();
  const { user } = useAuth();
  const [selectedTransaction, setSelectedTransaction] = useState(0) // First row selected (index 0)
  const [showSafeDetails, setShowSafeDetails] = useState(true)
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions', 'payments', 'statement'
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [dividerPosition, setDividerPosition] = useState(50) // Percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Device Detection - Mobile and Tablet
  const [isTabletDevice, setIsTabletDevice] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [isMobileInfoExpanded, setIsMobileInfoExpanded] = useState(true)

  // Mobile Transaction Details View
  const [showMobileTransactionDetails, setShowMobileTransactionDetails] = useState(false)
  const [mobileSelectedTransaction, setMobileSelectedTransaction] = useState<any>(null)
  const [mobileTransactionItems, setMobileTransactionItems] = useState<any[]>([])
  const [isLoadingMobileTransactionItems, setIsLoadingMobileTransactionItems] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)

  // Real-time state for sales and sale items
  const [sales, setSales] = useState<any[]>([])
  const [allSalesData, setAllSalesData] = useState<any[]>([]) // Store all loaded sales for client-side filtering
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [saleItemsCache, setSaleItemsCache] = useState<{[saleId: string]: any[]}>({}) // Cache for sale items
  const [isLoadingSales, setIsLoadingSales] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  // Real-time state for purchase invoices and purchase invoice items
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([])
  const [allPurchasesData, setAllPurchasesData] = useState<any[]>([]) // Store all loaded purchases for client-side filtering
  const [purchaseInvoiceItems, setPurchaseInvoiceItems] = useState<any[]>([])
  const [purchaseItemsCache, setPurchaseItemsCache] = useState<{[invoiceId: string]: any[]}>({}) // Cache for purchase items
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false)
  const [isLoadingPurchaseItems, setIsLoadingPurchaseItems] = useState(false)

  // Child safe IDs for main safe aggregation
  const [childSafeIds, setChildSafeIds] = useState<string[]>([])

  // Drawer filter state (for safes with drawers)
  const [childSafes, setChildSafes] = useState<{id: string; name: string; balance: number}[]>([])
  const [mainSafeOwnBalance, setMainSafeOwnBalance] = useState<number>(0)
  const [selectedDrawerFilters, setSelectedDrawerFilters] = useState<Set<string> | null>(null) // null = "all"
  const [nonDrawerTransferBalance, setNonDrawerTransferBalance] = useState<number>(0)

  // Compute all record IDs: safe.id + childSafeIds (drawers) + additionalSafeIds (multi-select)
  const allRecordIds = useMemo(() => {
    if (!safe?.id) return []
    const ids = [safe.id, ...childSafeIds, ...additionalSafeIds]
    return Array.from(new Set(ids)) // deduplicate
  }, [safe?.id, childSafeIds, additionalSafeIds])

  // Filtered record IDs based on drawer filter selection
  const filteredRecordIds = useMemo(() => {
    if (!safe?.id) return allRecordIds
    if (!selectedDrawerFilters || selectedDrawerFilters.size === 0) return allRecordIds
    const ids: string[] = []
    selectedDrawerFilters.forEach(f => {
      if (f === 'transfers' || (f === 'safe' && !safe.supports_drawers)) {
        ids.push(safe.id)
      } else {
        ids.push(f)
      }
    })
    return Array.from(new Set(ids))
  }, [selectedDrawerFilters, allRecordIds, safe?.id])

  // Non-drawer safe filter flags (filter by transaction_type instead of record_id)
  const nonDrawerExcludeTransfers = useMemo(() => {
    if (safe?.supports_drawers || !selectedDrawerFilters) return false
    return selectedDrawerFilters.has('safe') && !selectedDrawerFilters.has('transfers')
  }, [safe?.supports_drawers, selectedDrawerFilters])

  const nonDrawerTransfersOnly = useMemo(() => {
    if (safe?.supports_drawers || !selectedDrawerFilters) return false
    return selectedDrawerFilters.has('transfers') && !selectedDrawerFilters.has('safe')
  }, [safe?.supports_drawers, selectedDrawerFilters])

  // Display name for combined view
  const displayName = additionalSafeIds.length > 0
    ? `${safe?.name} + ${additionalSafeIds.length} خزن أخرى`
    : safe?.name || 'الخزنة'

  // Cash drawer balance (actual paid amounts, not invoice totals)
  const [cashDrawerBalance, setCashDrawerBalance] = useState<number | null>(null)

  // Payment method breakdown from RPC
  const [paymentBreakdown, setPaymentBreakdown] = useState<{method: string, amount: number}[]>([])

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Date filter state
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'today' })
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true)

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState<string>('')
  const [withdrawType, setWithdrawType] = useState<'withdraw' | 'transfer' | 'deposit'>('withdraw')
  const [targetSafeId, setTargetSafeId] = useState<string>('')
  const [allSafes, setAllSafes] = useState<any[]>([])
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawNotes, setWithdrawNotes] = useState('')
  const [withdrawSourceId, setWithdrawSourceId] = useState<string>('')
  const [showWithdrawSuggestions, setShowWithdrawSuggestions] = useState(false)
  const [withdrawAllMode, setWithdrawAllMode] = useState<'full' | 'excluding_reserves' | null>(null)

  // Operations tab state
  const [operationsTypeFilter, setOperationsTypeFilter] = useState<string>('all')

  // Reserve (تجنيب) state
  const [reserves, setReserves] = useState<{id: string; record_id: string; amount: number; notes: string; created_at: string}[]>([])
  const [isLoadingReserves, setIsLoadingReserves] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [reserveModalMode, setReserveModalMode] = useState<'add' | 'edit'>('add')
  const [editingReserve, setEditingReserve] = useState<any>(null)
  const [reserveAmount, setReserveAmount] = useState<string>('')
  const [reserveNotes, setReserveNotes] = useState<string>('')
  const [reserveSourceId, setReserveSourceId] = useState<string>('')
  const [isSavingReserve, setIsSavingReserve] = useState(false)
  const [showDeleteReserveModal, setShowDeleteReserveModal] = useState(false)
  const [reserveToDelete, setReserveToDelete] = useState<any>(null)
  const [isDeletingReserve, setIsDeletingReserve] = useState(false)

  // Account statement - using infinite scroll hook
  // The old state-based approach is replaced with the hook
  // const [accountStatementData, setAccountStatementData] = useState<any[]>([])
  // const [isLoadingStatement, setIsLoadingStatement] = useState(false)
  const {
    statements: accountStatementData,
    isLoading: isLoadingStatement,
    isLoadingMore: isLoadingMoreStatements,
    hasMore: hasMoreStatements,
    loadMore: loadMoreStatements,
    refresh: refreshStatements
  } = useInfiniteStatements({
    recordIds: filteredRecordIds.length > 0 ? filteredRecordIds : undefined,
    dateFilter,
    enabled: isOpen && activeTab === 'statement' && !isLoadingPreferences,
    pageSize: 200,
    excludeTransferTypes: nonDrawerExcludeTransfers,
    transferTypesOnly: nonDrawerTransfersOnly
  })

  // Scroll detection for infinite scroll
  const { sentinelRef: statementSentinelRef } = useScrollDetection({
    onLoadMore: loadMoreStatements,
    enabled: hasMoreStatements && !isLoadingMoreStatements && activeTab === 'statement',
    isLoading: isLoadingMoreStatements
  })

  // Statement invoice details state
  const [showStatementInvoiceDetails, setShowStatementInvoiceDetails] = useState(false)
  const [selectedStatementInvoice, setSelectedStatementInvoice] = useState<any>(null)
  const [statementInvoiceItems, setStatementInvoiceItems] = useState<any[]>([])
  const [isLoadingStatementInvoiceItems, setIsLoadingStatementInvoiceItems] = useState(false)
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(0)

  // Get list of invoice statements for navigation (only invoices, not payments)
  const invoiceStatements = accountStatementData.filter(s => s.type === 'فاتورة بيع' || s.type === 'مرتجع بيع')

  // Transfers state - using infinite scroll hook (deposits and withdrawals from cash_drawer_transactions)
  const {
    transactions: transfers,
    isLoading: isLoadingTransfers,
    isLoadingMore: isLoadingMoreTransfers,
    hasMore: hasMoreTransfers,
    loadMore: loadMoreTransfers,
    refresh: refreshTransfers
  } = useInfiniteTransactions({
    recordIds: filteredRecordIds.length > 0 ? filteredRecordIds : undefined,
    transactionType: nonDrawerTransfersOnly ? 'transfer' : undefined,
    dateFilter,
    enabled: isOpen && activeTab === 'payments' && !isLoadingPreferences,
    pageSize: 200,
    excludeSales: true, // Only get non-sale transactions (transfers, deposits, withdrawals)
    excludeTransferTypes: nonDrawerExcludeTransfers
  })

  // Scroll detection for transfers infinite scroll
  const { sentinelRef: transfersSentinelRef } = useScrollDetection({
    onLoadMore: loadMoreTransfers,
    enabled: hasMoreTransfers && !isLoadingMoreTransfers && activeTab === 'payments',
    isLoading: isLoadingMoreTransfers
  })

  // Operations tab - reuse same data source as payments (non-sale transactions)
  // Build safes list for name mapping (childSafes + main safe + allSafes)
  const safesForMapping = useMemo(() => {
    const list: Array<{ id: string; name: string }> = []
    if (safe?.id) list.push({ id: safe.id, name: safe.name || 'التحويلات' })
    childSafes.forEach(c => list.push({ id: c.id, name: c.name }))
    allSafes.forEach(s => {
      if (!list.find(l => l.id === s.id)) list.push({ id: s.id, name: s.name })
    })
    return list
  }, [safe?.id, safe?.name, childSafes, allSafes])

  const {
    transactions: operationsTransactions,
    isLoading: isLoadingOperations,
    isLoadingMore: isLoadingMoreOperations,
    hasMore: hasMoreOperations,
    loadMore: loadMoreOperations,
    refresh: refreshOperations
  } = useInfiniteTransactions({
    recordIds: filteredRecordIds.length > 0 ? filteredRecordIds : undefined,
    transactionType: nonDrawerTransfersOnly ? 'transfer' : undefined,
    dateFilter,
    enabled: isOpen && activeTab === 'operations' && !isLoadingPreferences,
    pageSize: 200,
    excludeSales: true,
    excludeTransferTypes: nonDrawerExcludeTransfers,
    safes: safesForMapping
  })

  // Scroll detection for operations infinite scroll
  const { sentinelRef: operationsSentinelRef } = useScrollDetection({
    onLoadMore: loadMoreOperations,
    enabled: hasMoreOperations && !isLoadingMoreOperations && activeTab === 'operations',
    isLoading: isLoadingMoreOperations
  })

  // Filtered operations based on type filter
  const filteredOperations = useMemo(() => {
    if (operationsTypeFilter === 'all') return operationsTransactions
    return operationsTransactions.filter(t => t.transaction_type === operationsTypeFilter)
  }, [operationsTransactions, operationsTypeFilter])

  // Operations summary cards data
  const operationsSummary = useMemo(() => {
    const deposits = roundMoney(operationsTransactions.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0))
    const withdrawals = roundMoney(operationsTransactions.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0))
    const transfersIn = roundMoney(operationsTransactions.filter(t => t.transaction_type === 'transfer_in').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0))
    const transfersOut = roundMoney(operationsTransactions.filter(t => t.transaction_type === 'transfer_out').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0))
    return { deposits, withdrawals, transfersIn, transfersOut }
  }, [operationsTransactions])

  // Paid amounts mapped by sale_id or purchase_invoice_id
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({})
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<Record<string, {method: string, amount: number}[]>>({})

  // The safe balance is the actual cash drawer balance (paid amounts, not invoice totals)
  // This is fetched from the cash_drawers table
  const safeBalance = cashDrawerBalance ?? 0


  // Reserves filtered by current drawer selection
  const filteredReserves = useMemo(() => {
    if (!safe?.id) return reserves
    if (!reserves.length) return []
    if (!selectedDrawerFilters) return reserves
    const selectedIds = new Set<string>()
    selectedDrawerFilters.forEach(f => selectedIds.add(f === 'transfers' ? safe.id : f))
    return reserves.filter(r => selectedIds.has(r.record_id))
  }, [reserves, selectedDrawerFilters, safe?.id])

  const totalReserved = useMemo(() =>
    roundMoney(filteredReserves.reduce((sum, r) => sum + r.amount, 0))
  , [filteredReserves])

  // Displayed balance: filter for non-drawer safes based on active filter
  const displayedBalance = useMemo(() => {
    if (!safe?.supports_drawers && safe?.safe_type !== 'sub') {
      if (nonDrawerExcludeTransfers) return Math.max(0, safeBalance - nonDrawerTransferBalance)
      if (nonDrawerTransfersOnly) return nonDrawerTransferBalance
    }
    return safeBalance
  }, [safeBalance, nonDrawerTransferBalance, nonDrawerExcludeTransfers, nonDrawerTransfersOnly, safe?.supports_drawers, safe?.safe_type])

  // Recalculate statement balances client-side for coherent running total
  const recalculatedStatements = useMemo(() => {
    if (accountStatementData.length === 0) return accountStatementData
    const result = [...accountStatementData]
    // Row 0 is newest → its balance = displayedBalance
    result[0] = { ...result[0], balance: displayedBalance }
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const signedAmount = prev.isPositive ? prev.paidAmount : -prev.paidAmount
      result[i] = { ...result[i], balance: roundMoney(prev.balance - signedAmount) }
    }
    return result
  }, [accountStatementData, displayedBalance])

  const availableBalance = useMemo(() =>
    Math.max(0, safeBalance - totalReserved)
  , [safeBalance, totalReserved])

  // Context Menu State for editing invoices
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    statement: any
  }>({ isOpen: false, x: 0, y: 0, statement: null })

  // Edit Invoice Modal State
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false)
  const [statementToEdit, setStatementToEdit] = useState<any>(null)

  // Load date filter preferences from database
  const loadDateFilterPreferences = async () => {
    if (!safe?.id) return

    // For combined view, skip loading saved preferences (use default)
    if (additionalSafeIds.length > 0) {
      setIsLoadingPreferences(false)
      return
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_column_preferences')
        .select('preferences')
        .eq('user_id', 'default_user') // You can replace with actual user_id from auth
        .eq('table_name', `record_${safe.id}_date_filter`)
        .single()

      if (!error && data?.preferences) {
        const savedFilter = data.preferences as unknown as DateFilter
        setDateFilter(savedFilter)
      }
    } catch (error) {
      console.error('Error loading date filter preferences:', error)
    } finally {
      setIsLoadingPreferences(false)
    }
  }

  // Save date filter preferences to database
  const saveDateFilterPreferences = async (filter: DateFilter) => {
    if (!safe?.id || additionalSafeIds.length > 0) return

    try {
      const { error } = await (supabase as any)
        .from('user_column_preferences')
        .upsert({
          user_id: 'default_user', // You can replace with actual user_id from auth
          table_name: `record_${safe.id}_date_filter`,
          preferences: filter,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,table_name'
        })

      if (error) {
        console.error('Error saving date filter preferences:', error)
      }
    } catch (error) {
      console.error('Error saving date filter preferences:', error)
    }
  }

  // Fetch child safes (drawers) with names and balances for main safe aggregation
  const fetchChildSafes = async () => {
    if (!safe?.id || safe.safe_type === 'sub' || !safe.supports_drawers) {
      setChildSafeIds([])
      setChildSafes([])
      setMainSafeOwnBalance(0)
      // nonDrawerTransferBalance is now fetched separately via fetchNonDrawerTransferBalance()
      return
    }
    // Fetch child records (drawers)
    const { data: children } = await supabase
      .from('records')
      .select('id, name')
      .eq('parent_id', safe.id)
      .eq('safe_type', 'sub')

    const childIds = children?.map((r: any) => r.id) || []
    setChildSafeIds(childIds)

    // Fetch balances for all children + main safe itself
    const allIds = [safe.id, ...childIds]
    const { data: drawers } = await supabase
      .from('cash_drawers')
      .select('record_id, current_balance')
      .in('record_id', allIds)

    const balanceMap: Record<string, number> = {}
    ;(drawers || []).forEach((d: any) => {
      balanceMap[d.record_id] = d.current_balance || 0
    })

    // Set main safe's own balance (for "transfers" filter)
    setMainSafeOwnBalance(balanceMap[safe.id] || 0)

    // Set child safes with balances
    setChildSafes(
      (children || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        balance: balanceMap[c.id] || 0
      }))
    )
  }

  // Fetch non-drawer transfer balance (extracted from fetchChildSafes for proper error handling)
  const fetchNonDrawerTransferBalance = async () => {
    if (!safe?.id || safe.supports_drawers || safe.safe_type === 'sub') {
      setNonDrawerTransferBalance(0)
      return
    }
    try {
      const { data, error } = await supabase
        .from('cash_drawer_transactions')
        .select('amount, transaction_type')
        .eq('record_id', safe.id)
        .in('transaction_type', ['transfer_in', 'transfer_out'])
        .or('sale_id.not.is.null,transaction_type.eq.transfer_out')

      if (error) {
        console.error('Error fetching non-drawer transfer balance:', error)
        return
      }

      setNonDrawerTransferBalance(
        roundMoney(Math.max(0, (data || []).reduce((sum: number, t: any) =>
          sum + getSignedAmount(parseFloat(String(t.amount)) || 0, t.transaction_type), 0)))
      )
    } catch (e) {
      console.error('Error fetching non-drawer transfer balance:', e)
    }
  }

  // Fetch reserves (تجنيب)
  const fetchReserves = async () => {
    if (!safe?.id) return
    setIsLoadingReserves(true)
    try {
      const ids = allRecordIds.length > 0 ? allRecordIds : [safe.id]
      const { data, error } = await (supabase as any)
        .from('cash_drawer_reserves')
        .select('id, record_id, amount, notes, created_at')
        .in('record_id', ids)
        .order('created_at', { ascending: false })
      if (!error) setReserves(data || [])
    } catch (e) { console.error('Error fetching reserves:', e) }
    finally { setIsLoadingReserves(false) }
  }

  // Load all safes for name mapping when operations tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'operations' && allSafes.length === 0) {
      loadAllSafes()
    }
  }, [isOpen, activeTab])

  // Load preferences and child safes on mount
  useEffect(() => {
    if (isOpen && safe?.id) {
      loadDateFilterPreferences()
      fetchChildSafes()
      fetchNonDrawerTransferBalance()
      setSelectedDrawerFilters(null) // Reset filter when safe changes
    }

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [isOpen, safe?.id])

  // Re-fetch reserves when allRecordIds changes (after child safes load)
  useEffect(() => {
    if (isOpen && allRecordIds.length > 0) {
      fetchReserves()
    }
  }, [isOpen, allRecordIds.join(',')])

  // Auto-cleanup reserves when balance drops below reserved amount
  const isCleaningReserves = useRef(false)
  useEffect(() => {
    const cleanup = async () => {
      if (!safe?.id || isLoadingReserves || cashDrawerBalance === null) return
      if (reserves.length === 0 || totalReserved <= displayedBalance) return
      if (isCleaningReserves.current) return
      isCleaningReserves.current = true

      try {
        if (displayedBalance <= 0) {
          // Delete all reserves
          await (supabase as any).from('cash_drawer_reserves')
            .delete().in('id', reserves.map(r => r.id))
        } else {
          // Delete oldest reserves until total fits within balance
          const sorted = [...reserves].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          let excess = totalReserved - displayedBalance
          for (const reserve of sorted) {
            if (excess <= 0) break
            if (reserve.amount <= excess) {
              await (supabase as any).from('cash_drawer_reserves').delete().eq('id', reserve.id)
              excess -= reserve.amount
            } else {
              // Reduce this reserve's amount to fit
              await (supabase as any).from('cash_drawer_reserves')
                .update({ amount: roundMoney(reserve.amount - excess) }).eq('id', reserve.id)
              excess = 0
            }
          }
        }
        fetchReserves()
      } catch (e) {
        console.error('Error auto-cleaning reserves:', e)
      } finally {
        isCleaningReserves.current = false
      }
    }
    cleanup()
  }, [cashDrawerBalance, displayedBalance, totalReserved, reserves.length])

  // Device detection for mobile layout
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const width = window.innerWidth

      const isMobile = width < 768 || /mobile|android.*mobile|webos|blackberry|opera mini|iemobile/.test(userAgent)
      const isTablet = !isMobile && (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(userAgent) ||
        (width >= 768 && width <= 1280))

      setIsMobileDevice(isMobile)
      setIsTabletDevice(isTablet)

      // Auto-hide safe details on tablet for better space
      if (isTablet) {
        setShowSafeDetails(false)
      }
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== 'split' || activeTab !== 'transactions') return
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

  // Add global mouse event listeners
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

  // Helper function to get week start (Saturday) and end (Friday)
  const getWeekRange = (date: Date, isLastWeek: boolean = false) => {
    const targetDate = new Date(date)
    if (isLastWeek) {
      targetDate.setDate(targetDate.getDate() - 7)
    }
    
    // Find Saturday (start of week in Arabic calendar)
    const dayOfWeek = targetDate.getDay()
    const daysToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1
    
    const startOfWeek = new Date(targetDate)
    startOfWeek.setDate(targetDate.getDate() - daysToSaturday)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    return { startOfWeek, endOfWeek }
  }

  // Apply date filter to query
  const applyDateFilter = (query: any) => {
    const now = new Date()
    
    switch (dateFilter.type) {
      case 'today':
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)
        return query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString())
      
      case 'current_week':
        const { startOfWeek: currentWeekStart, endOfWeek: currentWeekEnd } = getWeekRange(now)
        const currentWeekEndDate = now < currentWeekEnd ? now : currentWeekEnd
        return query.gte('created_at', currentWeekStart.toISOString()).lte('created_at', currentWeekEndDate.toISOString())
      
      case 'last_week':
        const { startOfWeek: lastWeekStart, endOfWeek: lastWeekEnd } = getWeekRange(now, true)
        return query.gte('created_at', lastWeekStart.toISOString()).lte('created_at', lastWeekEnd.toISOString())
      
      case 'current_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        return query.gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString())
      
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        return query.gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString())
      
      case 'custom':
        if (dateFilter.startDate) {
          const startDate = new Date(dateFilter.startDate)
          startDate.setHours(0, 0, 0, 0)
          query = query.gte('created_at', startDate.toISOString())
        }
        if (dateFilter.endDate) {
          const endDate = new Date(dateFilter.endDate)
          endDate.setHours(23, 59, 59, 999)
          query = query.lte('created_at', endDate.toISOString())
        }
        return query
      
      case 'all':
      default:
        return query
    }
  }

  // Fetch sales from Supabase for the specific record
  const fetchSales = async () => {
    if (!safe?.id) return

    try {
      setIsLoadingSales(true)

      let salesData: any[] = []

      // When drawer filter is active, use two-step approach:
      // 1. Get sale_ids from cash_drawer_transactions for the filtered record_ids
      // 2. Fetch sales by those sale_ids
      if (selectedDrawerFilters && selectedDrawerFilters.size > 0) {
        let txQuery = supabase
          .from('cash_drawer_transactions')
          .select('sale_id')
          .in('record_id', filteredRecordIds)
          .not('sale_id', 'is', null)
        // Non-drawer safe: exclude transfer types when filtering "في الخزنة"
        if (nonDrawerExcludeTransfers) {
          txQuery = txQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
        }
        // Non-drawer safe: only transfer types when filtering "التحويلات"
        if (nonDrawerTransfersOnly) {
          txQuery = txQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
        }
        txQuery = applyDateFilter(txQuery)
        const { data: txData } = await txQuery

        const saleIds = Array.from(new Set((txData || []).map((t: any) => t.sale_id).filter(Boolean)))

        if (saleIds.length > 0) {
          const { data, error } = await supabase
            .from('sales')
            .select(`
              id,
              invoice_number,
              customer_id,
              total_amount,
              payment_method,
              notes,
              created_at,
              time,
              invoice_type,
              status,
              customer:customers(
                name,
                phone
              ),
              cashier:user_profiles(
                full_name
              )
            `)
            .in('id', saleIds)
            .order('created_at', { ascending: false })
            .limit(50)

          if (error) {
            console.error('Error fetching sales:', error)
            return
          }
          salesData = data || []
        }
      } else {
        // No filter active - use standard approach
        let query = supabase
          .from('sales')
          .select(`
            id,
            invoice_number,
            customer_id,
            total_amount,
            payment_method,
            notes,
            created_at,
            time,
            invoice_type,
            status,
            customer:customers(
              name,
              phone
            ),
            cashier:user_profiles(
              full_name
            )
          `)
          .in('record_id', allRecordIds)

        query = applyDateFilter(query)

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error fetching sales:', error)
          return
        }
        salesData = data || []
      }

      setSales(salesData)
      setAllSalesData(salesData) // Store for client-side filtering

      // Fetch paid amounts and batch load sale items for client-side search
      if (salesData.length > 0) {
        const saleIds = salesData.map((s: any) => s.id)

        // Fetch paid amounts (scoped to filteredRecordIds)
        let txQuery = supabase
          .from('cash_drawer_transactions')
          .select('sale_id, amount, payment_method')
          .in('sale_id', saleIds)
        txQuery = txQuery.in('record_id', filteredRecordIds)
        // Non-drawer safe: exclude transfer types when filtering "في الخزنة"
        if (nonDrawerExcludeTransfers) {
          txQuery = txQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
        }
        // Non-drawer safe: only transfer types when filtering "التحويلات"
        if (nonDrawerTransfersOnly) {
          txQuery = txQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
        }
        const { data: transactions } = await txQuery

        if (transactions) {
          const amounts: Record<string, number> = {}
          const breakdowns: Record<string, {method: string, amount: number}[]> = {}
          transactions.forEach((t: any) => {
            if (t.sale_id) {
              amounts[t.sale_id] = (amounts[t.sale_id] || 0) + Math.abs(t.amount || 0)
              if (!breakdowns[t.sale_id]) breakdowns[t.sale_id] = []
              breakdowns[t.sale_id].push({ method: t.payment_method || 'نقد', amount: Math.abs(t.amount || 0) })
            }
          })
          setPaidAmounts(prev => ({ ...prev, ...amounts }))
          setPaymentBreakdowns(prev => ({ ...prev, ...breakdowns }))
        }

        // Batch load all sale items for client-side search
        const { data: itemsData } = await supabase
          .from('sale_items')
          .select(`
            id, sale_id, quantity, unit_price, discount, notes,
            product:products(id, name, barcode, category:categories(name))
          `)
          .in('sale_id', saleIds)

        // Build items cache by sale_id
        const cache: {[saleId: string]: any[]} = {}
        itemsData?.forEach(item => {
          if (!cache[item.sale_id]) cache[item.sale_id] = []
          cache[item.sale_id].push(item)
        })
        setSaleItemsCache(cache)

        setSelectedTransaction(0)
        fetchSaleItems(salesData[0].id)
      }

    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setIsLoadingSales(false)
    }
  }

  // Fetch cash drawer balance from cash_drawers.current_balance (maintained atomically by RPC)
  const fetchCashDrawerBalance = async () => {
    if (!safe?.id) return
    try {
      const balanceIds = safe.supports_drawers ? filteredRecordIds : allRecordIds
      const { data: drawers, error } = await supabase
        .from('cash_drawers')
        .select('current_balance')
        .in('record_id', balanceIds)

      if (error) {
        console.error('Error fetching cash drawer balance:', error)
        return  // Keep cashDrawerBalance as null — prevents auto-cleanup from deleting reserves
      }

      const total = (drawers || []).reduce((sum: number, d: any) => sum + (d.current_balance || 0), 0)
      setCashDrawerBalance(total)
    } catch (error) {
      console.error('Error fetching cash drawer balance:', error)
      // Keep cashDrawerBalance as null — prevents auto-cleanup from deleting reserves
    }
  }

  // Fetch payment method breakdown via RPC (aggregated across children)
  const fetchPaymentBreakdown = async () => {
    if (!safe?.id) return
    try {
      const aggregated: Record<string, number> = {}

      // Use filteredRecordIds which includes all relevant IDs for the current filter
      const breakdownIds = filteredRecordIds

      // Call RPC for each safe and aggregate
      for (const id of breakdownIds) {
        const { data, error } = await (supabase as any)
          .rpc('get_safe_payment_breakdown', { p_record_id: id })
        if (error) {
          console.error('Error fetching payment breakdown for', id, error)
          continue
        }
        (data || []).forEach((row: any) => {
          const method = row.payment_method
          aggregated[method] = (aggregated[method] || 0) + Number(row.total_amount)
        })
      }

      setPaymentBreakdown(
        Object.entries(aggregated)
          .map(([method, amount]) => ({ method, amount }))
          .filter(item => item.amount !== 0)
      )
    } catch (error) {
      console.error('Error fetching payment breakdown:', error)
      setPaymentBreakdown([])
    }
  }

  // Old fetchTransfers and fetchAccountStatement functions - replaced by infinite scroll hooks
  // This function had a critical issue: it fetched ALL transactions from oldest to newest
  // which caused "today" filter to show no data when there were 12,000+ records
  // The new hook uses cursor-based pagination with server-side date filtering

  // Fetch statement invoice items for selected invoice
  const fetchStatementInvoiceItems = async (saleId: string) => {
    try {
      setIsLoadingStatementInvoiceItems(true)

      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          quantity,
          unit_price,
          cost_price,
          discount,
          notes,
          product:products(
            name,
            barcode,
            category:categories(name)
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching statement invoice items:', error)
        setStatementInvoiceItems([])
        return
      }

      setStatementInvoiceItems(data || [])

    } catch (error) {
      console.error('Error fetching statement invoice items:', error)
      setStatementInvoiceItems([])
    } finally {
      setIsLoadingStatementInvoiceItems(false)
    }
  }

  // Handle double click on statement row
  const handleStatementRowDoubleClick = async (statement: any) => {
    // Only handle invoices, not payments or initial balance
    if (statement.type !== 'فاتورة بيع' && statement.type !== 'مرتجع بيع') {
      return
    }

    // Find the index of this invoice in the invoice statements
    const index = invoiceStatements.findIndex(s => s.id === statement.id)
    if (index !== -1) {
      setCurrentInvoiceIndex(index)
    }

    // Get sale_id from the statement - we need to look it up from transactions
    const { data: txData, error: txError } = await supabase
      .from('cash_drawer_transactions')
      .select('sale_id')
      .eq('id', statement.id)
      .single()

    if (txError || !txData?.sale_id) {
      console.error('Error finding sale for statement:', txError)
      return
    }

    const saleId = txData.sale_id

    // Get sale details
    const { data: saleData, error } = await supabase
      .from('sales')
      .select(`
        *,
        cashier:user_profiles(full_name)
      `)
      .eq('id', saleId)
      .single()

    if (!error && saleData) {
      setSelectedStatementInvoice(saleData)
      setShowStatementInvoiceDetails(true)
      await fetchStatementInvoiceItems(saleId)
    }
  }

  // Navigate to next invoice in the statement
  const navigateToNextInvoice = async () => {
    if (currentInvoiceIndex < invoiceStatements.length - 1) {
      const nextIndex = currentInvoiceIndex + 1
      const nextStatement = invoiceStatements[nextIndex]
      setCurrentInvoiceIndex(nextIndex)

      // Get sale_id from the statement
      const { data: txData, error: txError } = await supabase
        .from('cash_drawer_transactions')
        .select('sale_id')
        .eq('id', nextStatement.id)
        .single()

      if (!txError && txData?.sale_id) {
        setIsLoadingStatementInvoiceItems(true)
        const { data: saleData, error } = await supabase
          .from('sales')
          .select(`
            *,
            cashier:user_profiles(full_name)
          `)
          .eq('id', txData.sale_id)
          .single()

        if (!error && saleData) {
          setSelectedStatementInvoice(saleData)
          await fetchStatementInvoiceItems(txData.sale_id)
        }
      }
    }
  }

  // Navigate to previous invoice in the statement
  const navigateToPreviousInvoice = async () => {
    if (currentInvoiceIndex > 0) {
      const prevIndex = currentInvoiceIndex - 1
      const prevStatement = invoiceStatements[prevIndex]
      setCurrentInvoiceIndex(prevIndex)

      // Get sale_id from the statement
      const { data: txData, error: txError } = await supabase
        .from('cash_drawer_transactions')
        .select('sale_id')
        .eq('id', prevStatement.id)
        .single()

      if (!txError && txData?.sale_id) {
        setIsLoadingStatementInvoiceItems(true)
        const { data: saleData, error } = await supabase
          .from('sales')
          .select(`
            *,
            cashier:user_profiles(full_name)
          `)
          .eq('id', txData.sale_id)
          .single()

        if (!error && saleData) {
          setSelectedStatementInvoice(saleData)
          await fetchStatementInvoiceItems(txData.sale_id)
        }
      }
    }
  }

  // Fetch sale items for selected sale
  const fetchSaleItems = async (saleId: string) => {
    try {
      setIsLoadingItems(true)
      
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          id,
          quantity,
          unit_price,
          cost_price,
          discount,
          notes,
          product:products(
            name,
            barcode,
            category:categories(name)
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching sale items:', error)
        setSaleItems([])
        return
      }
      
      setSaleItems(data || [])
      
    } catch (error) {
      console.error('Error fetching sale items:', error)
      setSaleItems([])
    } finally {
      setIsLoadingItems(false)
    }
  }

  // Fetch purchase invoices from Supabase for the specific record
  const fetchPurchaseInvoices = async () => {
    if (!safe?.id) return

    try {
      setIsLoadingPurchases(true)

      let purchasesData: any[] = []

      // When drawer filter is active, use two-step approach
      if (selectedDrawerFilters && selectedDrawerFilters.size > 0) {
        let txQuery = supabase
          .from('cash_drawer_transactions')
          .select('purchase_invoice_id')
          .in('record_id', filteredRecordIds)
          .not('purchase_invoice_id', 'is', null)
        // Non-drawer safe: exclude transfer types when filtering "في الخزنة"
        if (nonDrawerExcludeTransfers) {
          txQuery = txQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
        }
        // Non-drawer safe: only transfer types when filtering "التحويلات"
        if (nonDrawerTransfersOnly) {
          txQuery = txQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
        }
        txQuery = applyDateFilter(txQuery)
        const { data: txData } = await txQuery

        const purchaseIds = Array.from(new Set((txData || []).map((t: any) => t.purchase_invoice_id).filter(Boolean)))

        if (purchaseIds.length > 0) {
          const { data, error } = await supabase
            .from('purchase_invoices')
            .select(`
              id,
              invoice_number,
              supplier_id,
              total_amount,
              payment_status,
              notes,
              created_at,
              time,
              invoice_type,
              supplier:suppliers(
                name,
                phone
              ),
              creator:user_profiles(
                full_name
              )
            `)
            .in('id', purchaseIds)
            .order('created_at', { ascending: false })
            .limit(50)

          if (error) {
            console.error('Error fetching purchase invoices:', error)
            return
          }
          purchasesData = data || []
        }
      } else {
        // No filter active - use standard approach
        let query = supabase
          .from('purchase_invoices')
          .select(`
            id,
            invoice_number,
            supplier_id,
            total_amount,
            payment_status,
            notes,
            created_at,
            time,
            invoice_type,
            supplier:suppliers(
              name,
              phone
            ),
            creator:user_profiles(
              full_name
            )
          `)
          .in('record_id', allRecordIds)

        query = applyDateFilter(query)

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error fetching purchase invoices:', error)
          return
        }
        purchasesData = data || []
      }

      setPurchaseInvoices(purchasesData)
      setAllPurchasesData(purchasesData) // Store for client-side filtering

      // Fetch paid amounts and batch load purchase items for client-side search
      if (purchasesData.length > 0) {
        const purchaseIds = purchasesData.map((p: any) => p.id)

        // Fetch paid amounts (scoped to filteredRecordIds)
        let purchaseTxQuery = supabase
          .from('cash_drawer_transactions')
          .select('purchase_invoice_id, amount, payment_method')
          .in('purchase_invoice_id', purchaseIds)
        purchaseTxQuery = purchaseTxQuery.in('record_id', filteredRecordIds)
        // Non-drawer safe: exclude transfer types when filtering "في الخزنة"
        if (nonDrawerExcludeTransfers) {
          purchaseTxQuery = purchaseTxQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
        }
        // Non-drawer safe: only transfer types when filtering "التحويلات"
        if (nonDrawerTransfersOnly) {
          purchaseTxQuery = purchaseTxQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
        }
        const { data: transactions } = await purchaseTxQuery

        if (transactions) {
          const amounts: Record<string, number> = {}
          const breakdowns: Record<string, {method: string, amount: number}[]> = {}
          transactions.forEach((t: any) => {
            if (t.purchase_invoice_id) {
              amounts[t.purchase_invoice_id] = (amounts[t.purchase_invoice_id] || 0) + Math.abs(t.amount || 0)
              if (!breakdowns[t.purchase_invoice_id]) breakdowns[t.purchase_invoice_id] = []
              breakdowns[t.purchase_invoice_id].push({ method: t.payment_method || 'نقد', amount: Math.abs(t.amount || 0) })
            }
          })
          setPaidAmounts(prev => ({ ...prev, ...amounts }))
          setPaymentBreakdowns(prev => ({ ...prev, ...breakdowns }))
        }

        // Batch load all purchase invoice items for client-side search
        const { data: itemsData } = await supabase
          .from('purchase_invoice_items')
          .select(`
            id, purchase_invoice_id, quantity, unit_purchase_price, notes,
            product:products(id, name, barcode, category:categories(name))
          `)
          .in('purchase_invoice_id', purchaseIds)

        // Build items cache by invoice_id
        const cache: {[invoiceId: string]: any[]} = {}
        itemsData?.forEach(item => {
          const invoiceId = item.purchase_invoice_id
          if (invoiceId) {
            if (!cache[invoiceId]) cache[invoiceId] = []
            cache[invoiceId].push(item)
          }
        })
        setPurchaseItemsCache(cache)
      }

    } catch (error) {
      console.error('Error fetching purchase invoices:', error)
    } finally {
      setIsLoadingPurchases(false)
    }
  }

  // Fetch purchase invoice items for selected purchase invoice
  const fetchPurchaseInvoiceItems = async (purchaseInvoiceId: string) => {
    try {
      setIsLoadingPurchaseItems(true)
      
      const { data, error } = await supabase
        .from('purchase_invoice_items')
        .select(`
          id,
          quantity,
          unit_purchase_price,
          total_price,
          discount_amount,
          notes,
          product:products(
            name,
            barcode,
            category:categories(name)
          )
        `)
        .eq('purchase_invoice_id', purchaseInvoiceId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching purchase invoice items:', error)
        setPurchaseInvoiceItems([])
        return
      }
      
      setPurchaseInvoiceItems(data || [])
      
    } catch (error) {
      console.error('Error fetching purchase invoice items:', error)
      setPurchaseInvoiceItems([])
    } finally {
      setIsLoadingPurchaseItems(false)
    }
  }

  // Print receipt function
  const printReceipt = async (transaction: any, items: any[]) => {
    if (!transaction || items.length === 0) {
      alert('لا توجد بيانات للطباعة')
      return
    }

    // Get customer data if it's a sale
    let customerData = null
    let calculatedBalance = 0
    if (transaction.transactionType === 'sale' && transaction.customer_id) {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, address, city, opening_balance')
        .eq('id', transaction.customer_id)
        .single()
      customerData = data

      // Calculate customer balance with correct formula
      if (customerData && customerData.id !== '00000000-0000-0000-0000-000000000001') {
        const [salesRes, paymentsRes] = await Promise.all([
          supabase.from('sales').select('total_amount').eq('customer_id', customerData.id),
          supabase.from('customer_payments').select('amount, notes').eq('customer_id', customerData.id)
        ])
        const salesTotal = (salesRes.data || []).reduce((sum, s) => sum + (s.total_amount || 0), 0)

        // Separate loans (سلفة) from regular payments (دفعة)
        let totalRegularPayments = 0
        let totalLoans = 0
        ;(paymentsRes.data || []).forEach((payment: any) => {
          const isLoan = payment.notes?.startsWith('سلفة')
          if (isLoan) {
            totalLoans += (payment.amount || 0)
          } else {
            totalRegularPayments += (payment.amount || 0)
          }
        })

        const openingBalance = (customerData as any)?.opening_balance || 0
        // Correct formula: opening_balance + sales + loans - payments
        calculatedBalance = openingBalance + salesTotal + totalLoans - totalRegularPayments
      }
    }

    // Get branch info
    const { data: branchData } = await supabase
      .from('branches')
      .select('name, phone')
      .limit(1)
      .single()

    // Number to Arabic words function
    const numberToArabicWords = (num: number): string => {
      const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
        'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
      const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
      const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

      if (num === 0) return 'صفر'
      if (num < 0) return 'سالب ' + numberToArabicWords(Math.abs(num))

      const intNum = Math.floor(num)
      let result = ''

      const hundredsDigit = Math.floor(intNum / 100)
      const tensDigit = Math.floor((intNum % 100) / 10)
      const onesDigit = intNum % 10

      if (hundredsDigit > 0) {
        result += hundreds[hundredsDigit]
        if (tensDigit > 0 || onesDigit > 0) result += ' و'
      }

      if (intNum % 100 < 20) {
        result += ones[intNum % 100]
      } else {
        if (tensDigit > 0) {
          result += tens[tensDigit]
          if (onesDigit > 0) result += ' و'
        }
        if (onesDigit > 0) result += ones[onesDigit]
      }

      return result.trim().replace(/\s*و$/, '')
    }

    const isSale = transaction.transactionType === 'sale'
    const isPurchase = transaction.transactionType === 'purchase'
    const showTotalDebt = isSale && customerData && customerData.id !== '00000000-0000-0000-0000-000000000001' && calculatedBalance !== 0
    const logoUrl = window.location.origin + '/assets/logo/El Farouk Group2.png'

    const receiptContent = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة رقم ${transaction.invoice_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Arial', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 13px;
              line-height: 1.3;
              color: #000;
              background: white;
              width: 100%;
              margin: 0;
              padding: 0;
            }

            .receipt-header {
              text-align: center;
              margin-bottom: 3px;
              padding: 0 2px;
            }

            .company-logo {
              width: 60px;
              height: auto;
              margin: 0 auto 4px auto;
              display: block;
              max-height: 60px;
              object-fit: contain;
            }

            .company-logo-fallback {
              display: none;
            }

            .company-name {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 2px;
              color: #000;
            }

            .receipt-date {
              font-size: 11px;
              margin-bottom: 1px;
            }

            .receipt-address {
              font-size: 10px;
              margin-bottom: 1px;
            }

            .receipt-phone {
              font-size: 10px;
            }

            .invoice-type {
              font-size: 12px;
              font-weight: 600;
              margin-top: 5px;
              color: ${isPurchase ? '#dc3545' : '#28a745'};
            }

            .customer-info {
              margin: 10px 20px;
              padding: 8px;
              border: 1px dashed #333;
              background-color: #f9f9f9;
            }

            .customer-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
            }

            .customer-label {
              font-weight: 600;
              color: #333;
            }

            .customer-value {
              color: #000;
            }

            .items-table {
              width: calc(100% - 40px);
              border-collapse: collapse;
              margin: 3px 20px;
              border: 1px solid #000;
              table-layout: fixed;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 7px;
              text-align: center;
              font-size: 14px;
              font-weight: 400;
            }

            .items-table th {
              background-color: #f5f5f5;
              font-weight: 600;
              font-size: 14px;
            }

            .items-table th:nth-child(1),
            .items-table td:nth-child(1) {
              width: 45%;
            }

            .items-table th:nth-child(2),
            .items-table td:nth-child(2) {
              width: 12%;
            }

            .items-table th:nth-child(3),
            .items-table td:nth-child(3) {
              width: 18%;
            }

            .items-table th:nth-child(4),
            .items-table td:nth-child(4) {
              width: 25%;
              text-align: right !important;
              padding-right: 4px !important;
            }

            .item-name {
              text-align: right !important;
              padding-right: 12px !important;
              padding-left: 2px !important;
              font-size: 15px;
              font-weight: bold;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
            }

            .total-row {
              border-top: 2px solid #000;
              font-weight: 700;
              font-size: 12px;
            }

            .payment-section {
              margin-top: 8px;
              text-align: center;
              font-size: 11px;
              padding: 0 2px;
            }

            .total-debt {
              margin: 10px 20px;
              padding: 8px;
              border: 1px solid #000;
              background-color: #f5f5f5;
              text-align: center;
              font-weight: 600;
              font-size: 14px;
            }

            .footer {
              text-align: center;
              margin-top: 8px;
              font-size: 9px;
              border-top: 1px solid #000;
              padding: 3px 2px 0 2px;
            }

            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }

              body {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 0 1.5mm !important;
              }

              .no-print {
                display: none;
              }

              .items-table {
                margin: 3px 0;
                width: 100% !important;
              }

              .items-table th,
              .items-table td {
                padding: 2px;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <img
              src="${logoUrl}"
              alt="El Farouk Group"
              class="company-logo"
              onerror="this.style.display='none'; document.querySelector('.company-logo-fallback').style.display='block';"
            />
            <div class="company-logo-fallback" style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">🏢</div>
            <div class="company-name">El Farouk Group</div>
            <div class="receipt-date">${new Date(transaction.created_at).toLocaleDateString("ar-EG")} - ${new Date(transaction.created_at).toLocaleDateString("en-US")}</div>
            <div class="receipt-address">${branchData?.name || "الفرع الرئيسي"}</div>
            <div class="receipt-phone">${branchData?.phone || "01102862856"}</div>
            <div class="invoice-type">${isPurchase ? 'فاتورة مشتريات' : (transaction.invoice_type === 'sale_return' ? 'مرتجع مبيعات' : 'فاتورة مبيعات')}</div>
          </div>

          ${customerData && customerData.id !== '00000000-0000-0000-0000-000000000001' && (customerData.name || customerData.phone || customerData.address || customerData.city) ? `
          <div class="customer-info">
            ${customerData.name ? `<div class="customer-row"><span class="customer-label">العميل:</span> <span class="customer-value">${customerData.name}</span></div>` : ''}
            ${customerData.phone ? `<div class="customer-row"><span class="customer-label">الهاتف:</span> <span class="customer-value">${customerData.phone}</span></div>` : ''}
            ${customerData.address ? `<div class="customer-row"><span class="customer-label">العنوان:</span> <span class="customer-value">${customerData.address}</span></div>` : ''}
            ${customerData.city ? `<div class="customer-row"><span class="customer-label">المدينة:</span> <span class="customer-value">${customerData.city}</span></div>` : ''}
          </div>
          ` : ''}

          <table class="items-table">
            <thead>
              <tr>
                <th class="item-name">الصنف</th>
                <th>كمية</th>
                <th>سعر</th>
                <th>قيمة</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td class="item-name">${item.product?.name || 'منتج'}</td>
                  <td>${Math.abs(item.quantity)}</td>
                  <td>${(item.unit_price || 0).toFixed(0)}</td>
                  <td>${Math.abs((item.unit_price || 0) * item.quantity).toFixed(0)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="item-name">-</td>
                <td>${items.length}</td>
                <td>= اجمالي =</td>
                <td>${Math.abs(transaction.total_amount).toFixed(0)}</td>
              </tr>
            </tbody>
          </table>

          ${showTotalDebt ? `
          <div class="payment-section">
            ${numberToArabicWords(Math.abs(transaction.total_amount))} جنيهاً
          </div>
          <div class="total-debt">
            إجمالي الدين: ${calculatedBalance.toFixed(0)} جنيه
          </div>
          ` : ''}

          <div class="footer">
            ${new Date(transaction.created_at).toLocaleDateString("en-GB")} ${transaction.time || new Date(transaction.created_at).toLocaleTimeString("en-GB", { hour12: false })}
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">طباعة</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">إغلاق</button>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=450,height=650,scrollbars=yes,resizable=yes')
    if (printWindow) {
      printWindow.document.write(receiptContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    } else {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة')
    }
  }

  // Set up real-time subscriptions and fetch initial data
  useEffect(() => {
    if (isOpen && safe?.id && !isLoadingPreferences) {
      fetchSales()
      fetchPurchaseInvoices()
      fetchCashDrawerBalance()
      fetchPaymentBreakdown()
      fetchNonDrawerTransferBalance()
      // Account statement and transfers are now handled by infinite scroll hooks

    }
  }, [isOpen, safe?.id, dateFilter, isLoadingPreferences, childSafeIds, additionalSafeIds, selectedDrawerFilters])

  // Client-side search for product in loaded invoices
  const searchProductInInvoices = (query: string) => {
    if (!query.trim()) {
      setSearchQuery('')
      setHighlightedProductId(null)
      // Restore all loaded transactions
      setSales(allSalesData)
      setPurchaseInvoices(allPurchasesData)
      if (allSalesData.length > 0 || allPurchasesData.length > 0) {
        setSelectedTransaction(0)
        if (allSalesData.length > 0) {
          fetchSaleItems(allSalesData[0].id)
        } else if (allPurchasesData.length > 0) {
          fetchPurchaseInvoiceItems(allPurchasesData[0].id)
        }
      }
      return
    }

    setSearchQuery(query)
    const lowerQuery = query.toLowerCase()

    // Filter sales that contain the searched product (client-side)
    const matchingSales = allSalesData.filter(sale => {
      const items = saleItemsCache[sale.id] || []
      return items.some(item =>
        item.product?.name?.toLowerCase().includes(lowerQuery) ||
        item.product?.barcode?.toLowerCase().includes(lowerQuery)
      )
    })

    // Filter purchases that contain the searched product (client-side)
    const matchingPurchases = allPurchasesData.filter(purchase => {
      const items = purchaseItemsCache[purchase.id] || []
      return items.some(item =>
        item.product?.name?.toLowerCase().includes(lowerQuery) ||
        item.product?.barcode?.toLowerCase().includes(lowerQuery)
      )
    })

    // Find first matching product for highlighting
    let firstMatchingProductId: string | null = null
    for (const sale of matchingSales) {
      const items = saleItemsCache[sale.id] || []
      const matchingItem = items.find(item =>
        item.product?.name?.toLowerCase().includes(lowerQuery) ||
        item.product?.barcode?.toLowerCase().includes(lowerQuery)
      )
      if (matchingItem) {
        firstMatchingProductId = matchingItem.product?.id
        break
      }
    }
    if (!firstMatchingProductId) {
      for (const purchase of matchingPurchases) {
        const items = purchaseItemsCache[purchase.id] || []
        const matchingItem = items.find(item =>
          item.product?.name?.toLowerCase().includes(lowerQuery) ||
          item.product?.barcode?.toLowerCase().includes(lowerQuery)
        )
        if (matchingItem) {
          firstMatchingProductId = matchingItem.product?.id
          break
        }
      }
    }

    // Update sales and purchases with search results
    setSales(matchingSales)
    setPurchaseInvoices(matchingPurchases)
    setHighlightedProductId(firstMatchingProductId)

    // Auto-select first transaction if available
    if (matchingSales.length > 0 || matchingPurchases.length > 0) {
      setSelectedTransaction(0)

      // Load items for first transaction
      if (matchingSales.length > 0) {
        fetchSaleItems(matchingSales[0].id)
      } else if (matchingPurchases.length > 0) {
        fetchPurchaseInvoiceItems(matchingPurchases[0].id)
      }
    }
  }

  // Create combined transactions array from sales and purchase invoices
  const allTransactions = useMemo(() => {
    const salesWithType = sales.map(sale => ({
      ...sale,
      transactionType: 'sale',
      amount: sale.total_amount,
      paid_amount: paidAmounts[sale.id] || 0,
      paymentBreakdown: paymentBreakdowns[sale.id] || [],
      client: sale.customer,
      clientType: 'عميل'
    }))

    const purchasesWithType = purchaseInvoices.map(purchase => ({
      ...purchase,
      transactionType: 'purchase',
      amount: purchase.total_amount,
      paid_amount: paidAmounts[purchase.id] || 0,
      paymentBreakdown: paymentBreakdowns[purchase.id] || [],
      client: purchase.supplier,
      clientType: 'مورد'
    }))

    // Combine and sort by creation date
    return [...salesWithType, ...purchasesWithType].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [sales, purchaseInvoices, paidAmounts, paymentBreakdowns])

  // Create combined transaction items based on selected transaction type
  const allTransactionItems = useMemo(() => {
    if (allTransactions.length === 0 || selectedTransaction >= allTransactions.length) return []
    
    const selectedTxn = allTransactions[selectedTransaction]
    if (selectedTxn.transactionType === 'sale') {
      return saleItems.map(item => ({ ...item, itemType: 'sale' }))
    } else if (selectedTxn.transactionType === 'purchase') {
      return purchaseInvoiceItems.map(item => ({ ...item, itemType: 'purchase' }))
    }
    return []
  }, [allTransactions, selectedTransaction, saleItems, purchaseInvoiceItems])

  // Fetch transaction items when selected transaction changes
  useEffect(() => {
    if (allTransactions.length > 0 && selectedTransaction < allTransactions.length) {
      const selectedTxn = allTransactions[selectedTransaction]
      if (selectedTxn.transactionType === 'sale') {
        fetchSaleItems(selectedTxn.id)
        setPurchaseInvoiceItems([]) // Clear purchase items
      } else if (selectedTxn.transactionType === 'purchase') {
        fetchPurchaseInvoiceItems(selectedTxn.id)
        setSaleItems([]) // Clear sale items
      }
    }
  }, [selectedTransaction, allTransactions])

  // ==================== Context Menu Functions ====================
  const handleStatementContextMenu = (e: React.MouseEvent, statement: any) => {
    e.preventDefault()
    // فقط السماح بالتعديل لفواتير البيع
    if (statement.type === 'فاتورة بيع' || statement.type === 'مرتجع بيع') {
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        statement: statement
      })
    }
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, statement: null })
  }

  const handleEditStatement = () => {
    if (contextMenu.statement) {
      setStatementToEdit(contextMenu.statement)
      setIsEditInvoiceModalOpen(true)
    }
    closeContextMenu()
  }

  const handleInvoiceUpdated = () => {
    // إعادة تحميل البيانات بعد التعديل
    refreshStatements()
    fetchCashDrawerBalance()
    fetchPaymentBreakdown()
  }

  // Handle delete transaction
  const handleDeleteTransaction = (transaction: any) => {
    setTransactionToDelete(transaction)
    setShowDeleteModal(true)
  }

  // Confirm delete transaction
  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      setIsDeleting(true)

      if (transactionToDelete.transactionType === 'sale') {
        // Use cancelSalesInvoice to properly restore inventory and reverse cash drawer
        const result = await cancelSalesInvoice({
          saleId: transactionToDelete.id,
          userId: null,
          userName: null
        })

        if (!result.success) {
          console.error('Error cancelling sale:', result.message)
          return
        }
      } else if (transactionToDelete.transactionType === 'purchase') {
        // Delete purchase invoice items first (foreign key constraint)
        const { error: purchaseItemsError } = await supabase
          .from('purchase_invoice_items')
          .delete()
          .eq('purchase_invoice_id', transactionToDelete.id)

        if (purchaseItemsError) {
          console.error('Error deleting purchase invoice items:', purchaseItemsError)
          throw purchaseItemsError
        }

        // Delete the purchase invoice
        const { error: purchaseError } = await supabase
          .from('purchase_invoices')
          .delete()
          .eq('id', transactionToDelete.id)

        if (purchaseError) {
          console.error('Error deleting purchase invoice:', purchaseError)
          throw purchaseError
        }
      }

      // Close modal and reset state
      setShowDeleteModal(false)
      setTransactionToDelete(null)

      // Refresh data (real-time will handle it but this ensures immediate update)
      fetchSales()
      fetchPurchaseInvoices()

      // Reset selected transaction if needed
      if (selectedTransaction >= allTransactions.length - 1) {
        setSelectedTransaction(Math.max(0, allTransactions.length - 2))
      }

    } catch (error) {
      console.error('Error deleting/cancelling transaction:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setTransactionToDelete(null)
  }

  // Open mobile transaction details
  const openMobileTransactionDetails = async (transaction: any) => {
    setMobileSelectedTransaction(transaction)
    setShowMobileTransactionDetails(true)
    setIsLoadingMobileTransactionItems(true)

    try {
      if (transaction.transactionType === 'sale') {
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            id,
            quantity,
            unit_price,
            cost_price,
            discount,
            notes,
            product:products(
              id,
              name,
              barcode,
              main_image_url,
              category:categories(name)
            )
          `)
          .eq('sale_id', transaction.id)
          .order('created_at', { ascending: true })

        if (!error && data) {
          setMobileTransactionItems(data)
        }
      } else if (transaction.transactionType === 'purchase') {
        const { data, error } = await supabase
          .from('purchase_invoice_items')
          .select(`
            id,
            quantity,
            unit_purchase_price,
            total_price,
            discount_amount,
            notes,
            product:products(
              id,
              name,
              barcode,
              main_image_url,
              category:categories(name)
            )
          `)
          .eq('purchase_invoice_id', transaction.id)
          .order('created_at', { ascending: true })

        if (!error && data) {
          // Map purchase items to match sale items structure
          setMobileTransactionItems(data.map(item => ({
            ...item,
            unit_price: item.unit_purchase_price,
            discount: item.discount_amount
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching transaction items:', error)
    } finally {
      setIsLoadingMobileTransactionItems(false)
    }
  }

  // Load all safes for transfer selection
  const loadAllSafes = async () => {
    try {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('is_active', true)
        .neq('id', safe?.id) // Exclude current safe
        .order('name')

      if (!error && data) {
        setAllSafes(data)
      }
    } catch (error) {
      console.error('Error loading safes:', error)
    }
  }

  // Drawer filter toggle functions
  const handleDrawerFilterToggle = (filterId: string) => {
    setSelectedDrawerFilters(prev => {
      if (!prev) { return new Set([filterId]) } // from "all" to specific
      const next = new Set(prev)
      next.has(filterId) ? next.delete(filterId) : next.add(filterId)
      // Non-drawer safes: if both 'safe' and 'transfers' selected, that's "all"
      if (!safe?.supports_drawers && next.has('safe') && next.has('transfers')) return null
      return next.size === 0 ? null : next
    })
  }
  const handleSelectAllDrawers = () => setSelectedDrawerFilters(null)

  // Open withdraw modal
  const openWithdrawModal = () => {
    setWithdrawAmount('')
    setWithdrawType('withdraw')
    setTargetSafeId('')
    setWithdrawNotes('')
    setWithdrawSourceId('')
    setShowWithdrawSuggestions(false)
    setWithdrawAllMode(null)
    loadAllSafes()
    setShowWithdrawModal(true)
  }

  // Handle withdraw/deposit/transfer
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)

    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح')
      return
    }

    // === "الكل" (All sources) withdrawal/transfer - only for drawer safes ===
    if (withdrawSourceId === 'all' && (withdrawType === 'withdraw' || withdrawType === 'transfer') && safe.supports_drawers && childSafes.length > 0) {
      if (!withdrawAllMode) {
        alert(withdrawType === 'withdraw' ? 'يرجى اختيار طريقة السحب' : 'يرجى اختيار طريقة التحويل')
        return
      }

      if (withdrawType === 'transfer' && !targetSafeId) {
        alert('يرجى اختيار الخزنة المستهدفة')
        return
      }

      setIsWithdrawing(true)
      try {
        // Collect all sources with balance > 0
        const allSources: { id: string; name: string; balance: number }[] = []
        childSafes.forEach(c => { if (c.balance > 0) allSources.push({ id: c.id, name: c.name, balance: c.balance }) })
        if (mainSafeOwnBalance > 0) allSources.push({ id: safe.id, name: 'التحويلات', balance: mainSafeOwnBalance })

        let totalTransferred = 0
        let cashTransferred = 0 // From drawers (child safes)
        let transferTransferred = 0 // From main safe (التحويلات)

        for (const source of allSources) {
          // Calculate amount to withdraw from this source
          let withdrawFromSource = source.balance
          if (withdrawAllMode === 'excluding_reserves') {
            const sourceReserveAmount = roundMoney(reserves.filter(r => r.record_id === source.id).reduce((sum, r) => sum + r.amount, 0))
            withdrawFromSource = Math.max(0, source.balance - sourceReserveAmount)
          }
          if (withdrawFromSource <= 0) continue

          // Get the drawer
          const { data: drawer, error: drawerError } = await supabase
            .from('cash_drawers')
            .select('id')
            .eq('record_id', source.id)
            .single()

          if (drawerError || !drawer) continue

          // Atomic balance update (prevents race conditions)
          const { data: rpcResult } = await supabase.rpc(
            'atomic_adjust_drawer_balance' as any,
            { p_drawer_id: drawer.id, p_change: -withdrawFromSource }
          )
          const newBalance = rpcResult?.[0]?.new_balance ?? roundMoney(source.balance - withdrawFromSource)

          // Create withdrawal/transfer_out transaction
          await supabase
            .from('cash_drawer_transactions')
            .insert({
              drawer_id: drawer.id,
              record_id: source.id,
              transaction_type: withdrawType === 'transfer' ? 'transfer_out' : 'withdrawal',
              amount: withdrawFromSource,
              balance_after: roundMoney(newBalance),
              notes: withdrawType === 'transfer'
                ? `تحويل إلى خزنة أخرى (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`
                : `سحب من الخزنة (سحب الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
              performed_by: user?.name || 'system',
              ...(withdrawType === 'transfer' ? { related_record_id: targetSafeId } : {})
            })

          totalTransferred += withdrawFromSource
          // Track cash vs transfer: main safe (source.id === safe.id) is transfers, drawers are cash
          if (source.id === safe.id) {
            transferTransferred += withdrawFromSource
          } else {
            cashTransferred += withdrawFromSource
          }
        }

        // For transfer: deposit to target safe, split cash vs transfers
        if (withdrawType === 'transfer' && totalTransferred > 0) {
          // Get or create target drawer
          let { data: targetDrawer } = await supabase
            .from('cash_drawers')
            .select('*')
            .eq('record_id', targetSafeId)
            .single()

          if (!targetDrawer) {
            const { data: newDrawer } = await supabase
              .from('cash_drawers')
              .insert({
                record_id: targetSafeId,
                current_balance: 0,
                status: 'open'
              })
              .select()
              .single()
            targetDrawer = newDrawer
          }

          if (targetDrawer) {
            // Atomic balance update for target drawer (full amount)
            const { data: targetRpcResult } = await supabase.rpc(
              'atomic_adjust_drawer_balance' as any,
              { p_drawer_id: targetDrawer.id, p_change: totalTransferred }
            )
            const targetNewBalance = targetRpcResult?.[0]?.new_balance ?? roundMoney((targetDrawer.current_balance || 0) + totalTransferred)

            // Split into cash (deposit) and transfer (transfer_in) transactions on target
            // Cash from drawers → deposit (goes to "في الخزنة" on target)
            if (cashTransferred > 0) {
              await supabase
                .from('cash_drawer_transactions')
                .insert({
                  drawer_id: targetDrawer.id,
                  record_id: targetSafeId,
                  transaction_type: 'deposit',
                  amount: cashTransferred,
                  balance_after: roundMoney(targetNewBalance - transferTransferred),
                  notes: `تحويل من خزنة أخرى - نقدي (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
                  performed_by: user?.name || 'system',
                  related_record_id: safe.id
                })
            }
            // Transfers from main safe → transfer_in (goes to "التحويلات" on target)
            if (transferTransferred > 0) {
              await supabase
                .from('cash_drawer_transactions')
                .insert({
                  drawer_id: targetDrawer.id,
                  record_id: targetSafeId,
                  transaction_type: 'transfer_in',
                  amount: transferTransferred,
                  balance_after: roundMoney(targetNewBalance),
                  notes: `تحويل من خزنة أخرى - تحويلات (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
                  performed_by: user?.name || 'system',
                  related_record_id: safe.id
                })
            }
          }
        }

        // If full mode: delete all reserves for withdrawn sources
        if (withdrawAllMode === 'full') {
          const withdrawnSourceIds = allSources.filter(s => s.balance > 0).map(s => s.id)
          if (withdrawnSourceIds.length > 0) {
            await (supabase as any).from('cash_drawer_reserves')
              .delete().in('record_id', withdrawnSourceIds)
          }
        }

        // Refresh balances
        fetchCashDrawerBalance()
        fetchChildSafes()
        fetchNonDrawerTransferBalance()
        fetchReserves()

        // Reset form
        setWithdrawAmount('')
        setWithdrawNotes('')
        setTargetSafeId('')
        setWithdrawSourceId('')
        setWithdrawAllMode(null)
        setShowWithdrawModal(false)
        onSafeUpdated?.()
        alert(withdrawType === 'transfer' ? 'تم تحويل الكل بنجاح' : `تم سحب ${amount} بنجاح`)
      } catch (error: any) {
        console.error('Error in withdraw/transfer all:', error)
        alert(`حدث خطأ: ${error.message}`)
      } finally {
        setIsWithdrawing(false)
      }
      return
    }

    // === "الكل" (All sources) withdrawal/transfer - for NON-drawer safes ===
    if (withdrawSourceId === 'all' && (withdrawType === 'withdraw' || withdrawType === 'transfer') && !safe.supports_drawers) {
      if (!withdrawAllMode) {
        alert(withdrawType === 'withdraw' ? 'يرجى اختيار طريقة السحب' : 'يرجى اختيار طريقة التحويل')
        return
      }

      if (withdrawType === 'transfer' && !targetSafeId) {
        alert('يرجى اختيار الخزنة المستهدفة')
        return
      }

      setIsWithdrawing(true)
      try {
        // Calculate cash vs transfer portions
        let cashPortion = Math.max(0, safeBalance - nonDrawerTransferBalance)
        let transferPortion = Math.min(nonDrawerTransferBalance, safeBalance)

        // Handle reserves (excluding_reserves mode) - reserves only protect cash, not transfers
        if (withdrawAllMode === 'excluding_reserves') {
          const totalReserves = roundMoney(reserves.reduce((sum, r) => sum + r.amount, 0))
          const cashAfterReserves = Math.max(0, cashPortion - totalReserves)
          const availableTotal = roundMoney(cashAfterReserves + transferPortion)
          if (availableTotal <= 0) {
            alert('لا يوجد رصيد متاح بعد استثناء المجنب')
            setIsWithdrawing(false)
            return
          }
          cashPortion = cashAfterReserves
          // transferPortion stays unchanged - reserves don't apply to transfers
        }

        // Get the drawer (non-drawer safes have a single drawer with record_id = safe.id)
        let { data: drawer } = await supabase
          .from('cash_drawers')
          .select('*')
          .eq('record_id', safe.id)
          .single()

        if (!drawer) throw new Error('لم يتم العثور على الخزنة')

        const totalAmount = roundMoney(cashPortion + transferPortion)
        if (totalAmount <= 0) {
          alert('لا يوجد رصيد للسحب')
          setIsWithdrawing(false)
          return
        }

        // Atomic balance update for full amount
        const { data: rpcResult, error: rpcErr } = await supabase.rpc(
          'atomic_adjust_drawer_balance' as any,
          { p_drawer_id: drawer.id, p_change: -totalAmount }
        )
        if (rpcErr) throw new Error(`فشل في تحديث الرصيد: ${rpcErr.message}`)
        let runningBalance = rpcResult?.[0]?.new_balance ?? roundMoney((drawer.current_balance || 0) - totalAmount)

        // Create withdrawal transaction for cash portion (doesn't affect nonDrawerTransferBalance)
        if (cashPortion > 0) {
          const { error: cashTxError } = await supabase
            .from('cash_drawer_transactions')
            .insert({
              drawer_id: drawer.id,
              record_id: safe.id,
              transaction_type: 'withdrawal',
              amount: cashPortion,
              balance_after: roundMoney(runningBalance + transferPortion),
              notes: withdrawType === 'transfer'
                ? `تحويل إلى خزنة أخرى - نقدي (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`
                : `سحب من الخزنة - نقدي (سحب الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
              performed_by: user?.name || 'system',
              ...(withdrawType === 'transfer' ? { related_record_id: targetSafeId } : {})
            })
          if (cashTxError) {
            // Rollback balance change
            await supabase.rpc('atomic_adjust_drawer_balance' as any, { p_drawer_id: drawer.id, p_change: totalAmount })
            throw new Error(`فشل في تسجيل المعاملة: ${cashTxError.message}`)
          }
        }

        // Create transfer_out transaction for transfer portion (DOES reduce nonDrawerTransferBalance)
        if (transferPortion > 0) {
          const { error: transferTxError } = await supabase
            .from('cash_drawer_transactions')
            .insert({
              drawer_id: drawer.id,
              record_id: safe.id,
              transaction_type: 'transfer_out',
              amount: transferPortion,
              balance_after: roundMoney(runningBalance),
              notes: withdrawType === 'transfer'
                ? `تحويل إلى خزنة أخرى - تحويلات (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`
                : `سحب من الخزنة - تحويلات (سحب الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
              performed_by: user?.name || 'system',
              ...(withdrawType === 'transfer' ? { related_record_id: targetSafeId } : {})
            })
          if (transferTxError) {
            // Rollback balance change
            await supabase.rpc('atomic_adjust_drawer_balance' as any, { p_drawer_id: drawer.id, p_change: totalAmount })
            throw new Error(`فشل في تسجيل المعاملة: ${transferTxError.message}`)
          }
        }

        // For transfer: deposit to target safe, preserving cash/transfer distinction
        if (withdrawType === 'transfer' && totalAmount > 0) {
          let { data: targetDrawer } = await supabase
            .from('cash_drawers')
            .select('*')
            .eq('record_id', targetSafeId)
            .single()

          if (!targetDrawer) {
            const { data: newDrawer } = await supabase
              .from('cash_drawers')
              .insert({ record_id: targetSafeId, current_balance: 0, status: 'open' })
              .select()
              .single()
            targetDrawer = newDrawer
          }

          if (targetDrawer) {
            const { data: targetRpcResult } = await supabase.rpc(
              'atomic_adjust_drawer_balance' as any,
              { p_drawer_id: targetDrawer.id, p_change: totalAmount }
            )
            const targetNewBalance = targetRpcResult?.[0]?.new_balance ?? roundMoney((targetDrawer.current_balance || 0) + totalAmount)

            // Cash portion → deposit on target (goes to "في الخزنة")
            if (cashPortion > 0) {
              await supabase
                .from('cash_drawer_transactions')
                .insert({
                  drawer_id: targetDrawer.id,
                  record_id: targetSafeId,
                  transaction_type: 'deposit',
                  amount: cashPortion,
                  balance_after: roundMoney(targetNewBalance - transferPortion),
                  notes: `تحويل من خزنة ${safe.name} - نقدي (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
                  performed_by: user?.name || 'system',
                  related_record_id: safe.id
                })
            }
            // Transfer portion → transfer_in on target (goes to "التحويلات")
            if (transferPortion > 0) {
              await supabase
                .from('cash_drawer_transactions')
                .insert({
                  drawer_id: targetDrawer.id,
                  record_id: targetSafeId,
                  transaction_type: 'transfer_in',
                  amount: transferPortion,
                  balance_after: roundMoney(targetNewBalance),
                  notes: `تحويل من خزنة ${safe.name} - تحويلات (تحويل الكل)${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
                  performed_by: user?.name || 'system',
                  related_record_id: safe.id
                })
            }
          }
        }

        // If full mode: delete all reserves
        if (withdrawAllMode === 'full') {
          await (supabase as any).from('cash_drawer_reserves')
            .delete().eq('record_id', safe.id)
        }

        // Refresh balances
        fetchCashDrawerBalance()
        fetchChildSafes()
        fetchNonDrawerTransferBalance()
        fetchReserves()

        // Reset form
        setWithdrawAmount('')
        setWithdrawNotes('')
        setTargetSafeId('')
        setWithdrawSourceId('')
        setWithdrawAllMode(null)
        setShowWithdrawModal(false)
        onSafeUpdated?.()
        alert(withdrawType === 'transfer' ? 'تم تحويل الكل بنجاح' : `تم سحب ${amount} بنجاح`)
      } catch (error: any) {
        console.error('Error in non-drawer withdraw/transfer all:', error)
        alert(`حدث خطأ: ${error.message}`)
      } finally {
        setIsWithdrawing(false)
      }
      return
    }

    // === "الكل" (All targets) deposit - only for drawer safes ===
    if (withdrawSourceId === 'all' && withdrawType === 'deposit' && safe.supports_drawers && childSafes.length > 0) {
      setIsWithdrawing(true)
      try {
        // Collect all targets: childSafes + main safe (التحويلات)
        const allTargets: { id: string; name: string }[] = []
        childSafes.forEach(c => allTargets.push({ id: c.id, name: c.name }))
        allTargets.push({ id: safe.id, name: 'التحويلات' })

        // Split amount equally among all targets
        const perTarget = Math.floor((amount / allTargets.length) * 100) / 100
        let remaining = roundMoney(amount)

        for (let i = 0; i < allTargets.length; i++) {
          const target = allTargets[i]
          // Last target gets remainder for rounding
          const depositAmount = i === allTargets.length - 1 ? remaining : perTarget
          remaining = roundMoney(remaining - depositAmount)

          if (depositAmount <= 0) continue

          // Get or create drawer
          let { data: drawer } = await supabase
            .from('cash_drawers')
            .select('*')
            .eq('record_id', target.id)
            .single()

          if (!drawer) {
            const { data: newDrawer } = await supabase
              .from('cash_drawers')
              .insert({
                record_id: target.id,
                current_balance: 0,
                status: 'open'
              })
              .select()
              .single()
            drawer = newDrawer
          }

          if (!drawer) continue

          // Atomic balance update (prevents race conditions)
          const { data: depositRpcResult } = await supabase.rpc(
            'atomic_adjust_drawer_balance' as any,
            { p_drawer_id: drawer.id, p_change: depositAmount }
          )
          const newBalance = depositRpcResult?.[0]?.new_balance ?? roundMoney((drawer.current_balance || 0) + depositAmount)

          // Create deposit transaction
          await supabase
            .from('cash_drawer_transactions')
            .insert({
              drawer_id: drawer.id,
              record_id: target.id,
              transaction_type: 'deposit',
              amount: depositAmount,
              balance_after: roundMoney(newBalance),
              notes: `إيداع في الخزنة (إيداع الكل - ${target.name})${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
              performed_by: user?.name || 'system'
            })
        }

        // Refresh balances
        fetchCashDrawerBalance()
        fetchChildSafes()
        fetchNonDrawerTransferBalance()

        // Reset form
        setWithdrawAmount('')
        setWithdrawNotes('')
        setTargetSafeId('')
        setWithdrawSourceId('')
        setWithdrawAllMode(null)
        setShowWithdrawModal(false)
        onSafeUpdated?.()
        alert('تم الإيداع بنجاح')
      } catch (error: any) {
        console.error('Error in deposit all:', error)
        alert(`حدث خطأ: ${error.message}`)
      } finally {
        setIsWithdrawing(false)
      }
      return
    }

    // For safes with drawers or non-drawer safes with transfers, require source selection for withdraw/transfer
    const isNonDrawerWithTransfers = !safe.supports_drawers && safe.safe_type !== 'sub'
    if ((safe.supports_drawers && childSafes.length > 0 || isNonDrawerWithTransfers) && (withdrawType === 'withdraw' || withdrawType === 'transfer') && !withdrawSourceId) {
      alert('يرجى اختيار مصدر السحب')
      return
    }

    // Resolve source record_id
    const sourceRecordId = (safe.supports_drawers && childSafes.length > 0 && withdrawSourceId)
      ? (withdrawSourceId === 'transfers' ? safe.id : withdrawSourceId)
      : safe.id // For non-drawer safes, record_id is always safe.id regardless of source selection

    // Get source balance for validation
    const sourceBalance = (safe.supports_drawers && childSafes.length > 0 && withdrawSourceId)
      ? (withdrawSourceId === 'transfers'
        ? mainSafeOwnBalance
        : (childSafes.find(c => c.id === withdrawSourceId)?.balance || 0))
      : (isNonDrawerWithTransfers && withdrawSourceId)
        ? (withdrawSourceId === 'safe-only' ? Math.max(0, safeBalance - nonDrawerTransferBalance) : withdrawSourceId === 'transfers' ? nonDrawerTransferBalance : safeBalance)
        : safeBalance

    // فقط للسحب والتحويل: التحقق من الرصيد الكافي
    if ((withdrawType === 'withdraw' || withdrawType === 'transfer') && amount > sourceBalance) {
      alert('لا يوجد رصيد كافي في الخزنة')
      return
    }

    // منع السحب إذا كان الرصيد بالسالب أو صفر
    if ((withdrawType === 'withdraw' || withdrawType === 'transfer') && sourceBalance <= 0) {
      alert('لا يوجد رصيد كافي في الخزنة للسحب')
      return
    }

    // Check if withdrawal would dip below reserved amount
    // Skip for transfer-source withdrawals on non-drawer safes (reserves only protect cash, not transfers)
    const isTransferSource = isNonDrawerWithTransfers && withdrawSourceId === 'transfers'
    if ((withdrawType === 'withdraw' || withdrawType === 'transfer') && !isTransferSource) {
      const sourceReserves = roundMoney(reserves
        .filter(r => r.record_id === sourceRecordId)
        .reduce((sum, r) => sum + r.amount, 0))

      if (sourceReserves > 0 && amount > (sourceBalance - sourceReserves)) {
        const proceed = confirm(
          `تحذير: هذا السحب سيتجاوز المبلغ المُجنّب (${formatPrice(sourceReserves, 'system')}). سيتم تعديل التجنيب تلقائياً. هل تريد المتابعة؟`
        )
        if (!proceed) return
      }
    }

    if (withdrawType === 'transfer' && !targetSafeId) {
      alert('يرجى اختيار الخزنة المستهدفة للتحويل')
      return
    }

    setIsWithdrawing(true)

    try {
      // 1. Get source drawer (using resolved source record_id)
      let { data: sourceDrawer, error: sourceError } = await supabase
        .from('cash_drawers')
        .select('*')
        .eq('record_id', sourceRecordId)
        .single()

      // إنشاء الخزنة إذا لم تكن موجودة (للإيداع)
      if (sourceError && sourceError.code === 'PGRST116' && withdrawType === 'deposit') {
        const { data: newDrawer, error: createError } = await supabase
          .from('cash_drawers')
          .insert({ record_id: sourceRecordId, current_balance: 0 })
          .select()
          .single()

        if (createError) throw createError
        sourceDrawer = newDrawer
      } else if (sourceError || !sourceDrawer) {
        throw new Error('لم يتم العثور على الخزنة')
      }

      // 2. تحديد نوع العملية
      let transactionAmount: number
      let transactionType: string
      let transactionNotes: string
      const balanceDelta = withdrawType === 'deposit' ? amount : -amount

      if (withdrawType === 'deposit') {
        transactionAmount = amount
        const isNonDrawerSafe = !safe.supports_drawers && safe.safe_type !== 'sub'
        if (isNonDrawerSafe && withdrawSourceId === 'transfers') {
          transactionType = 'transfer_in'
        } else {
          transactionType = 'deposit'
        }
        transactionNotes = `إيداع في الخزنة${withdrawNotes ? ` - ${withdrawNotes}` : ''}`
      } else {
        transactionAmount = amount
        // For non-drawer safes: use transfer_out when withdrawing from "التحويلات" (so nonDrawerTransferBalance decreases)
        // and use withdrawal when withdrawing from "في الخزنة" (so only cash decreases)
        const isNonDrawerSafe = !safe.supports_drawers && safe.safe_type !== 'sub'
        if (isNonDrawerSafe && withdrawSourceId === 'transfers') {
          transactionType = 'transfer_out' // Always transfer_out to reduce nonDrawerTransferBalance
        } else if (isNonDrawerSafe && withdrawSourceId === 'safe-only') {
          transactionType = 'withdrawal' // Always withdrawal so cash portion decreases
        } else if (isNonDrawerSafe) {
          transactionType = 'withdrawal'
        } else {
          transactionType = withdrawType === 'transfer' ? 'transfer_out' : 'withdrawal'
        }
        transactionNotes = withdrawType === 'transfer'
          ? `تحويل إلى خزنة أخرى${withdrawNotes ? ` - ${withdrawNotes}` : ''}`
          : `سحب من الخزنة${withdrawNotes ? ` - ${withdrawNotes}` : ''}`
      }

      // Prevent negative balance for withdraw/transfer
      if (withdrawType !== 'deposit' && (sourceDrawer.current_balance || 0) + balanceDelta < -0.01) {
        throw new Error('لا يمكن سحب أكثر من الرصيد المتاح')
      }

      // تحديث رصيد الخزنة ذرياً (يمنع حالات السباق)
      const { data: sourceRpcResult, error: sourceRpcErr } = await supabase.rpc(
        'atomic_adjust_drawer_balance' as any,
        { p_drawer_id: sourceDrawer.id, p_change: balanceDelta }
      )

      if (sourceRpcErr) throw new Error(`فشل في تحديث الرصيد: ${sourceRpcErr.message}`)
      const newSourceBalance = sourceRpcResult?.[0]?.new_balance ?? roundMoney((sourceDrawer.current_balance || 0) + balanceDelta)

      // 3. إنشاء سجل المعاملة
      const { error: txError } = await supabase
        .from('cash_drawer_transactions')
        .insert({
          drawer_id: sourceDrawer.id,
          record_id: sourceRecordId,
          transaction_type: transactionType,
          amount: transactionAmount,
          balance_after: roundMoney(newSourceBalance),
          notes: transactionNotes,
          performed_by: user?.name || 'system',
          ...(withdrawType === 'transfer' && targetSafeId ? { related_record_id: targetSafeId } : {})
        })

      if (txError) {
        // Rollback balance change if transaction record fails (Bug 32 fix)
        await supabase.rpc('atomic_adjust_drawer_balance' as any, {
          p_drawer_id: sourceDrawer.id, p_change: -balanceDelta
        })
        console.error('Error creating transaction:', txError)
        throw new Error(`فشل في تسجيل المعاملة: ${txError.message}`)
      }

      // 4. في حالة التحويل، إضافة للخزنة المستهدفة
      if (withdrawType === 'transfer' && targetSafeId) {
        // Get or create target drawer
        let { data: targetDrawer, error: targetError } = await supabase
          .from('cash_drawers')
          .select('*')
          .eq('record_id', targetSafeId)
          .single()

        if (targetError && targetError.code === 'PGRST116') {
          // Create target drawer if doesn't exist
          const { data: newTargetDrawer, error: createError } = await supabase
            .from('cash_drawers')
            .insert({ record_id: targetSafeId, current_balance: 0 })
            .select()
            .single()

          if (!createError) {
            targetDrawer = newTargetDrawer
          }
        }

        if (targetDrawer) {
          // Atomic balance update for target drawer
          const { data: targetRpcResult, error: targetRpcErr } = await supabase.rpc(
            'atomic_adjust_drawer_balance' as any,
            { p_drawer_id: targetDrawer.id, p_change: amount }
          )

          if (targetRpcErr) throw new Error(`فشل في تحديث رصيد الخزنة المستهدفة: ${targetRpcErr.message}`)
          const newTargetBalance = targetRpcResult?.[0]?.new_balance ?? roundMoney((targetDrawer.current_balance || 0) + amount)

          // Create deposit transaction for target with related_record_id
          // For non-drawer safes: cash-sourced transfers → deposit on target (preserves cash category)
          // transfer-sourced transfers → transfer_in on target (preserves transfer category)
          const isNonDrawerSafe = !safe.supports_drawers && safe.safe_type !== 'sub'
          const targetTxType = (isNonDrawerSafe && (withdrawSourceId === 'safe-only' || !withdrawSourceId)) ? 'deposit' : 'transfer_in'
          const { error: targetTxError } = await supabase
            .from('cash_drawer_transactions')
            .insert({
              drawer_id: targetDrawer.id,
              record_id: targetSafeId,
              transaction_type: targetTxType,
              amount: amount,
              balance_after: roundMoney(newTargetBalance),
              notes: `تحويل من خزنة ${safe.name}${withdrawNotes ? ` - ${withdrawNotes}` : ''}`,
              performed_by: user?.name || 'system',
              related_record_id: sourceRecordId
            })

          if (targetTxError) {
            // Rollback target balance change
            await supabase.rpc('atomic_adjust_drawer_balance' as any, {
              p_drawer_id: targetDrawer.id, p_change: -amount
            })
            console.error('Error creating target transaction:', targetTxError)
            throw new Error(`فشل في تسجيل التحويل للخزنة المستهدفة: ${targetTxError.message}`)
          }
        }
      }

      // 5. Refresh balances
      fetchCashDrawerBalance()
      fetchChildSafes() // Refresh drawer balances
      fetchNonDrawerTransferBalance()

      // 6. Reset form
      setWithdrawAmount('')
      setWithdrawNotes('')
      setTargetSafeId('')
      setWithdrawSourceId('')
      setWithdrawAllMode(null)

      // 7. Close modal and show success
      setShowWithdrawModal(false)
      onSafeUpdated?.()

      const successMessage = withdrawType === 'deposit'
        ? `تم إيداع ${amount} بنجاح`
        : withdrawType === 'transfer'
          ? `تم تحويل ${amount} بنجاح`
          : `تم سحب ${amount} بنجاح`

      alert(successMessage)

    } catch (error: any) {
      console.error('Error in transaction:', error)
      alert(`حدث خطأ: ${error.message}`)
    } finally {
      setIsWithdrawing(false)
    }
  }

  // === Reserve (تجنيب) CRUD functions ===
  const openAddReserveModal = () => {
    setReserveModalMode('add')
    setEditingReserve(null)
    setReserveAmount('')
    setReserveNotes('')
    // Default to first drawer if safe has drawers, otherwise safe itself
    setReserveSourceId(childSafes.length > 0 ? childSafes[0].id : safe?.id || '')
    setShowReserveModal(true)
  }

  const openEditReserveModal = (reserve: any) => {
    setReserveModalMode('edit')
    setEditingReserve(reserve)
    setReserveAmount(String(reserve.amount))
    setReserveNotes(reserve.notes || '')
    setReserveSourceId(reserve.record_id)
    setShowReserveModal(true)
  }

  const getDrawerAvailableBalance = (recordId: string) => {
    // Get drawer balance
    const drawer = childSafes.find(d => d.id === recordId)
    const balance = drawer ? drawer.balance : (recordId === safe?.id ? (cashDrawerBalance ?? 0) : 0)
    // Subtract existing reserves for this drawer
    const existingReserves = reserves
      .filter(r => r.record_id === recordId && r.id !== editingReserve?.id)
      .reduce((sum, r) => sum + r.amount, 0)
    return Math.max(0, balance - existingReserves)
  }

  const handleSaveReserve = async () => {
    const amount = parseFloat(reserveAmount)
    if (!amount || amount <= 0) return

    const maxAvailable = getDrawerAvailableBalance(reserveSourceId)
    if (amount > maxAvailable) {
      alert(`المبلغ أكبر من المتاح (${formatPrice(maxAvailable, 'system')})`)
      return
    }

    setIsSavingReserve(true)
    try {
      if (reserveModalMode === 'add') {
        const { error } = await (supabase as any)
          .from('cash_drawer_reserves')
          .insert({
            record_id: reserveSourceId,
            amount,
            notes: reserveNotes.trim(),
            created_by: user?.name || 'system'
          })
        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from('cash_drawer_reserves')
          .update({
            amount,
            notes: reserveNotes.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReserve.id)
        if (error) throw error
      }

      await fetchReserves()
      setShowReserveModal(false)
    } catch (error: any) {
      console.error('Error saving reserve:', error)
      alert(`حدث خطأ: ${error.message}`)
    } finally {
      setIsSavingReserve(false)
    }
  }

  const confirmDeleteReserve = async () => {
    if (!reserveToDelete) return
    setIsDeletingReserve(true)
    try {
      const { error } = await (supabase as any)
        .from('cash_drawer_reserves')
        .delete()
        .eq('id', reserveToDelete.id)
      if (error) throw error
      await fetchReserves()
      setShowDeleteReserveModal(false)
      setReserveToDelete(null)
    } catch (error: any) {
      console.error('Error deleting reserve:', error)
      alert(`حدث خطأ: ${error.message}`)
    } finally {
      setIsDeletingReserve(false)
    }
  }

  const getDrawerNameForReserve = (recordId: string) => {
    const drawer = childSafes.find(d => d.id === recordId)
    return drawer?.name || (recordId === safe?.id ? 'التحويلات' : '')
  }

  if (!safe) return null

  // Transfers data - now uses infinite scroll hook (useInfiniteTransactions)

  // Sample invoices data
  const transactions = [
    {
      id: 1,
      invoiceNumber: 'INV-2025-001',
      date: 'July 15, 2025',
      day: 'الثلاثاء',
      barcode: '1234567890123',
      totalAmount: formatPrice(1677),
      paymentMethod: 'نقدي',
      invoiceType: 'بيع',
      notes: 'فاتورة عادية',
      updateDate: '03:22 PM - 6/30/2025',
      updatedBy: 'محمد علي'
    },
    {
      id: 2,
      invoiceNumber: 'INV-2025-002',
      date: 'July 2, 2025', 
      day: 'الأربعاء',
      barcode: '1234567890124',
      totalAmount: formatPrice(210),
      paymentMethod: 'فيزا',
      invoiceType: 'بيع',
      notes: '',
      updateDate: '01:15 PM - 7/2/2025',
      updatedBy: 'فاطمة أحمد'
    },
    {
      id: 3,
      invoiceNumber: 'INV-2025-003',
      date: 'June 29, 2025',
      day: 'الأحد', 
      barcode: '1234567890125',
      totalAmount: formatPrice(850),
      paymentMethod: 'نقدي',
      invoiceType: 'بيع',
      notes: 'عميل VIP',
      updateDate: '11:30 AM - 6/29/2025',
      updatedBy: 'عبد الرحمن'
    },
    {
      id: 4,
      invoiceNumber: 'RET-2025-001',
      date: 'June 29, 2025',
      day: 'الأحد',
      barcode: '1234567890126',
      totalAmount: `-${formatPrice(100)}`,
      paymentMethod: 'نقدي',
      invoiceType: 'مرتجع',
      notes: 'مرتجع معيب',
      updateDate: '04:45 PM - 6/29/2025',
      updatedBy: 'سارة محمد'
    },
    {
      id: 5,
      invoiceNumber: 'INV-2025-004',
      date: 'June 28, 2025',
      day: 'السبت',
      barcode: '1234567890127',
      totalAmount: formatPrice(485), 
      paymentMethod: 'ماستركارد',
      invoiceType: 'بيع',
      notes: '',
      updateDate: '09:15 AM - 6/28/2025',
      updatedBy: 'أحمد خالد'
    }
  ]

  // Sample invoice details data for selected invoice
  const transactionDetails = [
    {
      id: 1,
      category: 'الإلكترونيات',
      productName: 'هاتف سامسونج جالاكسي',
      quantity: 2,
      productCode: 'PHONE-001',
      barcode: '1234567890001',
      variant: { color: 'أسود', shape: 'عادي' },
      price: 15000.00,
      discount: 5,
      total: 28500.00
    },
    {
      id: 2,
      category: 'الإلكترونيات',
      productName: 'سماعات بلوتوث',
      quantity: 1,
      productCode: 'HEADPHONE-001',
      barcode: '1234567890002',
      variant: { color: 'أبيض' },
      price: 2500.00,
      discount: 10,
      total: 2250.00
    },
    {
      id: 3,
      category: 'الملابس',
      productName: 'تي شيرت قطني',
      quantity: 3,
      productCode: 'TSHIRT-001',
      barcode: '1234567890003',
      variant: { color: 'أزرق', shape: 'L' },
      price: 250.00,
      discount: 0,
      total: 750.00
    },
    {
      id: 4,
      category: 'المنزل',
      productName: 'كوب قهوة زجاجي',
      quantity: 6,
      productCode: 'CUP-001',
      barcode: '1234567890004',
      variant: {},
      price: 75.00,
      discount: 15,
      total: 382.50
    },
    {
      id: 5,
      category: 'الكتب',
      productName: 'كتاب البرمجة',
      quantity: 1,
      productCode: 'BOOK-001',
      barcode: '1234567890005',
      variant: {},
      price: 500.00,
      discount: 20,
      total: 400.00
    }
  ];

  // Payment method color helper
  const methodColorMap: Record<string, string> = {
    'نقد': 'text-green-400', 'نقدي': 'text-green-400', 'cash': 'text-green-400',
    'تحويل': 'text-orange-400', 'transfer': 'text-orange-400', 'تحويل بنكي': 'text-orange-400',
  }
  const fallbackColors = ['text-blue-400', 'text-purple-400', 'text-cyan-400', 'text-pink-400', 'text-yellow-400']
  const getMethodColor = (method: string) => {
    const lower = method?.toLowerCase() || ''
    for (const [key, color] of Object.entries(methodColorMap)) {
      if (lower.includes(key)) return color
    }
    let hash = 0
    for (let i = 0; i < lower.length; i++) hash += lower.charCodeAt(i)
    return fallbackColors[Math.abs(hash) % fallbackColors.length]
  }

  // Define columns for each table - exactly like Products page structure
  const statementColumns = [
    {
      id: 'index',
      header: '#',
      accessor: 'index',
      width: 50,
      render: (value: number) => (
        <span className="text-gray-400">{value}</span>
      )
    },
    {
      id: 'date',
      header: 'التاريخ',
      accessor: 'date',
      width: 120,
      render: (value: string) => <span className="text-white">{value}</span>
    },
    {
      id: 'time',
      header: '⏰ الساعة',
      accessor: 'time',
      width: 80,
      render: (value: string) => <span className="text-blue-400">{value}</span>
    },
    {
      id: 'description',
      header: 'البيان',
      accessor: 'description',
      width: 250,
      render: (value: string) => <span className="text-white">{value}</span>
    },
    {
      id: 'type',
      header: 'نوع العملية',
      accessor: 'type',
      width: 120,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value === 'فاتورة بيع'
            ? 'bg-green-600/20 text-green-400 border border-green-600'
            : value === 'مرتجع بيع'
            ? 'bg-orange-600/20 text-orange-400 border border-orange-600'
            : value === 'دفعة'
            ? 'bg-blue-600/20 text-blue-400 border border-blue-600'
            : value === 'سحب'
            ? 'bg-red-600/20 text-red-400 border border-red-600'
            : value === 'تسوية'
            ? 'bg-purple-600/20 text-purple-400 border border-purple-600'
            : value === 'رصيد أولي'
            ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600'
            : value === 'إضافه'
            ? 'bg-green-600/20 text-green-400 border border-green-600'
            : value === 'مصروفات'
            ? 'bg-red-600/20 text-red-400 border border-red-600'
            : 'bg-gray-600/20 text-gray-400 border border-gray-600'
        }`}>
          {value}
        </span>
      )
    },
    {
      id: 'invoiceValue',
      header: 'قيمة الفاتورة',
      accessor: 'invoiceValue',
      width: 130,
      render: (value: number, item: any) => (
        <span className="text-gray-300 font-medium">
          {value > 0 ? formatPrice(value, 'system') : '-'}
        </span>
      )
    },
    {
      id: 'paidAmount',
      header: 'المبلغ المدفوع',
      accessor: 'paidAmount',
      width: 130,
      render: (value: number, item: any) => {
        // Negative operations: sale return, withdrawal, purchase invoice
        const isNegative = item.type === 'مرتجع بيع' || item.type === 'سحب' || item.type === 'فاتورة شراء' || !item.isPositive
        return (
          <span className={`font-medium ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
            {isNegative ? '-' : '+'}{formatPrice(value, 'system')}
          </span>
        )
      }
    },
    {
      id: 'payment_method',
      header: 'طريقة الدفع',
      accessor: 'payment_method',
      width: 200,
      render: (value: string, item: any) => {
        if (item.paymentBreakdown?.length > 1) {
          return (
            <div className="flex flex-col gap-0.5">
              {item.paymentBreakdown.map((b: { method: string; amount: number }, i: number) => (
                <span key={i} className={`text-xs ${getMethodColor(b.method)}`}>
                  {b.method}: {formatPrice(b.amount, 'system')}
                </span>
              ))}
            </div>
          )
        }
        return <span className={getMethodColor(value || '-')}>{value || '-'}</span>
      }
    },
    {
      id: 'balance',
      header: 'الرصيد',
      accessor: 'balance',
      width: 140,
      render: (value: number) => <span className="text-blue-400 font-medium">{formatPrice(value, 'system')}</span>
    },
    {
      id: 'employee_name',
      header: 'الموظف',
      accessor: 'employee_name',
      width: 120,
      render: (value: string) => <span className="text-yellow-400">{value || '-'}</span>
    }
  ]

  const transactionColumns = [
    { 
      id: 'index', 
      header: '#', 
      accessor: '#', 
      width: 50,
      render: (value: any, item: any, index: number) => (
        <span className="text-gray-400">{index + 1}</span>
      )
    },
    {
      id: 'invoice_number',
      header: 'رقم الفاتورة',
      accessor: 'invoice_number',
      width: 180,
      render: (value: string, item: any) => (
        <span className={`flex items-center gap-1 ${item.status === 'cancelled' ? 'opacity-60' : ''}`}>
          <span className="text-blue-400">{value}</span>
          {item.status === 'cancelled' && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">ملغاة</span>
          )}
        </span>
      )
    },
    {
      id: 'created_at',
      header: 'التاريخ',
      accessor: 'created_at',
      width: 120,
      render: (value: string) => {
        const date = new Date(value)
        return <span className="text-white">{date.toLocaleDateString('en-GB')}</span>
      }
    },
    { 
      id: 'time', 
      header: 'الوقت', 
      accessor: 'time', 
      width: 100,
      render: (value: string) => {
        if (!value) return <span className="text-gray-400">-</span>
        const timeOnly = value.substring(0, 5)
        return <span className="text-blue-400 font-mono">{timeOnly}</span>
      }
    },
    { 
      id: 'client_name', 
      header: 'العميل/المورد', 
      accessor: 'client.name', 
      width: 150,
      render: (value: string, item: any) => (
        <div>
          <span className="text-white">{item.client?.name || 'غير محدد'}</span>
          <br />
          <span className="text-xs text-gray-400">({item.clientType})</span>
        </div>
      )
    },
    { 
      id: 'client_phone', 
      header: 'الهاتف', 
      accessor: 'client.phone', 
      width: 150,
      render: (value: string, item: any) => <span className="text-gray-300 font-mono text-sm">{item.client?.phone || '-'}</span>
    },
    {
      id: 'total_amount',
      header: 'قيمة الفاتورة',
      accessor: 'total_amount',
      width: 130,
      render: (value: number) => (
        <span className="text-gray-300 font-medium">
          {formatPrice(Math.abs(value), 'system')}
        </span>
      )
    },
    {
      id: 'paid_amount',
      header: 'المبلغ المدفوع',
      accessor: 'paid_amount',
      width: 130,
      render: (value: number, item: any) => {
        const isPurchase = item.transactionType === 'purchase'
        const isReturn = item.invoice_type === 'Purchase Return' || item.invoice_type === 'Sale Return'
        // Purchase Invoice = negative (money out), Purchase Return = positive
        // Sale Invoice = positive (money in), Sale Return = negative
        const shouldBeNegative = (isPurchase && !isReturn) || (!isPurchase && isReturn)
        const colorClass = shouldBeNegative ? 'text-red-400' : 'text-green-400'

        return (
          <span className={`${colorClass} font-medium`}>
            {shouldBeNegative ? '-' : '+'}{formatPrice(value || 0, 'system')}
          </span>
        )
      }
    },
    {
      id: 'payment_method',
      header: 'طريقة الدفع',
      accessor: 'payment_method',
      width: 200,
      render: (value: string, item: any) => {
        if (item.paymentBreakdown?.length > 1) {
          return (
            <span className="flex flex-wrap gap-x-1">
              {item.paymentBreakdown.map((b: {method: string, amount: number}, i: number) => (
                <span key={i}>
                  <span className={getMethodColor(b.method)}>{b.method}: {formatPrice(b.amount, 'system')}</span>
                  {i < item.paymentBreakdown.length - 1 && <span className="text-gray-500"> , </span>}
                </span>
              ))}
            </span>
          )
        }
        return <span className={getMethodColor(value || 'نقد')}>{value || 'نقد'}</span>
      }
    },
    { 
      id: 'invoice_type', 
      header: 'نوع الفاتورة', 
      accessor: 'invoice_type', 
      width: 120,
      render: (value: string, item: any) => {
        const getInvoiceTypeText = (invoiceType: string, transactionType: string, notes: string) => {
          // Check if this is a transfer invoice by looking for [TRANSFER] prefix in notes
          if (notes && notes.startsWith('[TRANSFER]')) {
            return 'نقل'
          }
          
          if (transactionType === 'purchase') {
            switch (invoiceType) {
              case 'Purchase Invoice': return 'فاتورة شراء'
              case 'Purchase Return': return 'مرتجع شراء'
              default: return 'فاتورة شراء'
            }
          } else {
            switch (invoiceType) {
              case 'sale': return 'فاتورة بيع'
              case 'Sale Invoice': return 'فاتورة بيع'
              case 'Sale Return': return 'مرتجع بيع'
              default: return invoiceType || 'فاتورة بيع'
            }
          }
        }
        
        const getInvoiceTypeColor = (invoiceType: string, transactionType: string, notes: string) => {
          // Check if this is a transfer invoice by looking for [TRANSFER] prefix in notes
          if (notes && notes.startsWith('[TRANSFER]')) {
            return 'bg-orange-600/20 text-orange-400 border border-orange-600'
          }
          
          if (transactionType === 'purchase') {
            switch (invoiceType) {
              case 'Purchase Invoice': return 'bg-blue-600/20 text-blue-400 border border-blue-600'
              case 'Purchase Return': return 'bg-purple-600/20 text-purple-400 border border-purple-600'
              default: return 'bg-blue-600/20 text-blue-400 border border-blue-600'
            }
          } else {
            switch (invoiceType) {
              case 'sale': 
              case 'Sale Invoice': return 'bg-green-600/20 text-green-400 border border-green-600'
              case 'Sale Return': return 'bg-orange-600/20 text-orange-400 border border-orange-600'
              default: return 'bg-green-600/20 text-green-400 border border-green-600'
            }
          }
        }
        
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${getInvoiceTypeColor(value, item.transactionType, item.notes)}`}>
            {getInvoiceTypeText(value, item.transactionType, item.notes)}
          </span>
        )
      }
    },
    {
      id: 'notes',
      header: 'البيان',
      accessor: 'notes',
      width: 200,
      render: (value: string) => {
        // Clean up transfer notes by removing [TRANSFER] prefix
        const cleanNotes = value && value.startsWith('[TRANSFER]')
          ? value.replace('[TRANSFER] ', '')
          : value
        return <span className="text-gray-400">{cleanNotes || '-'}</span>
      }
    },
    {
      id: 'employee_name',
      header: 'الموظف',
      accessor: 'cashier.full_name',
      width: 120,
      render: (value: string, item: any) => <span className="text-yellow-400">{item.cashier?.full_name || item.creator?.full_name || '-'}</span>
    }
  ]

  const paymentsColumns = [
    {
      id: 'index',
      header: '#',
      accessor: '#',
      width: 50,
      render: (value: any, item: any, index: number) => (
        <span className="text-gray-400">{index + 1}</span>
      )
    },
    {
      id: 'date',
      header: 'التاريخ',
      accessor: 'created_at',
      width: 120,
      render: (value: string) => {
        const date = value ? new Date(value) : new Date()
        return <span className="text-white">{date.toLocaleDateString('en-GB')}</span>
      }
    },
    {
      id: 'time',
      header: '⏰ الساعة',
      accessor: 'created_at',
      width: 100,
      render: (value: string) => {
        const date = value ? new Date(value) : new Date()
        return <span className="text-blue-400">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
      }
    },
    {
      id: 'type',
      header: 'نوع العملية',
      accessor: 'transaction_type',
      width: 120,
      render: (value: string) => {
        const typeMap: { [key: string]: { text: string; color: string; bg: string } } = {
          'deposit': { text: 'إضافه', color: 'text-green-400', bg: 'bg-green-600/20 border-green-600' },
          'withdrawal': { text: 'سحب', color: 'text-red-400', bg: 'bg-red-600/20 border-red-600' },
          'expense': { text: 'مصروفات', color: 'text-red-400', bg: 'bg-red-600/20 border-red-600' },
          'adjustment': { text: 'تسوية', color: 'text-yellow-400', bg: 'bg-yellow-600/20 border-yellow-600' },
          'transfer_in': { text: 'تحويل وارد', color: 'text-green-400', bg: 'bg-green-600/20 border-green-600' },
          'transfer_out': { text: 'تحويل صادر', color: 'text-orange-400', bg: 'bg-orange-600/20 border-orange-600' },
          'transfer': { text: 'تحويل', color: 'text-blue-400', bg: 'bg-blue-600/20 border-blue-600' }
        }
        const typeInfo = typeMap[value] || { text: value || '-', color: 'text-gray-400', bg: 'bg-gray-600/20 border-gray-600' }
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium border ${typeInfo.bg} ${typeInfo.color}`}>
            {typeInfo.text}
          </span>
        )
      }
    },
    {
      id: 'amount',
      header: 'المبلغ',
      accessor: 'amount',
      width: 140,
      render: (value: number) => {
        const amount = value || 0
        const isPositive = amount >= 0
        return (
          <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPrice(amount, 'system')}
          </span>
        )
      }
    },
    {
      id: 'payment_method',
      header: 'طريقة الدفع',
      accessor: 'payment_method',
      width: 120,
      render: (value: string) => <span className="text-blue-400">{value || '-'}</span>
    },
    {
      id: 'notes',
      header: 'البيان',
      accessor: 'notes',
      width: 250,
      render: (value: string) => <span className="text-gray-400">{value || '-'}</span>
    },
    {
      id: 'employee_name',
      header: 'الموظف',
      accessor: 'performed_by',
      width: 120,
      render: (value: string) => <span className="text-yellow-400">{value || '-'}</span>
    }
  ]

  const transactionDetailsColumns = [
    {
      id: 'index',
      header: '#',
      accessor: '#',
      width: 50,
      render: (value: any, item: any, index: number) => (
        <span className="text-white">{index + 1}</span>
      )
    },
    {
      id: 'category',
      header: 'المجموعة',
      accessor: 'product.category.name',
      width: 120,
      render: (value: string, item: any) => {
        const isHighlighted = highlightedProductId === item.product?.id
        return (
          <span className={isHighlighted ? 'text-yellow-100 font-semibold' : 'text-purple-400'}>
            {item.product?.category?.name || 'غير محدد'}
          </span>
        )
      }
    },
    {
      id: 'productName',
      header: 'اسم المنتج',
      accessor: 'product.name',
      width: 200,
      render: (value: string, item: any) => {
        const isHighlighted = highlightedProductId === item.product?.id
        return (
          <div className="flex items-center gap-2">
            {isHighlighted && <span className="text-yellow-300 text-lg">★</span>}
            <span className={`font-medium ${isHighlighted ? 'text-yellow-100 font-bold' : 'text-white'}`}>
              {item.product?.name || 'منتج محذوف'}
            </span>
          </div>
        )
      }
    },
    { 
      id: 'quantity', 
      header: 'الكمية', 
      accessor: 'quantity', 
      width: 80,
      render: (value: number) => <span className="text-blue-400 font-medium">{value}</span>
    },
    { 
      id: 'barcode', 
      header: 'الباركود', 
      accessor: 'product.barcode', 
      width: 150,
      render: (value: string, item: any) => (
        <span className="text-gray-300 font-mono text-sm">{item.product?.barcode || '-'}</span>
      )
    },
    { 
      id: 'unit_price', 
      header: 'السعر', 
      accessor: 'unit_price', 
      width: 100,
      render: (value: number, item: any) => {
        const price = item.itemType === 'purchase' ? item.unit_purchase_price : item.unit_price
        return <span className="text-green-400 font-medium">{price ? price.toFixed(2) : '0.00'}</span>
      }
    },
    { 
      id: 'discount', 
      header: 'خصم', 
      accessor: 'discount', 
      width: 80,
      render: (value: number, item: any) => {
        const discount = item.itemType === 'purchase' ? item.discount_amount : item.discount
        return <span className="text-orange-400 font-medium">{discount ? discount.toFixed(2) : '0.00'}</span>
      }
    },
    { 
      id: 'total', 
      header: 'الإجمالي', 
      accessor: 'total', 
      width: 120,
      render: (value: any, item: any) => {
        let total: number
        if (item.itemType === 'purchase') {
          // For purchase items, use total_price if available, otherwise calculate
          total = item.total_price || ((item.quantity * item.unit_purchase_price) - (item.discount_amount || 0))
        } else {
          // For sale items, calculate from unit_price
          total = (item.quantity * item.unit_price) - (item.discount || 0)
        }
        return <span className="text-green-400 font-bold">{total.toFixed(2)}</span>
      }
    },
    { 
      id: 'notes', 
      header: 'ملاحظات', 
      accessor: 'notes', 
      width: 150,
      render: (value: string) => <span className="text-gray-400">{value || '-'}</span>
    }
  ]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Mobile Layout - Complete redesign for small screens */}
        {isMobileDevice ? (
          <div className="bg-[#2B3544] h-full w-full flex flex-col">
            {/* Mobile Transaction Details View */}
            {showMobileTransactionDetails && mobileSelectedTransaction ? (
              <>
                {/* Transaction Details Header */}
                <div className="bg-[#374151] border-b border-gray-600 px-3 py-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowMobileTransactionDetails(false)
                      setMobileSelectedTransaction(null)
                      setMobileTransactionItems([])
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-600/30 transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-white font-medium">تفاصيل الفاتورة</span>
                    <span className="text-blue-400 mr-2">#{mobileSelectedTransaction.invoice_number}</span>
                  </div>
                  <div className="w-9" />
                </div>

                {/* Transaction Summary Card */}
                <div className="bg-[#3B4754] border-b border-gray-600 p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      mobileSelectedTransaction.transactionType === 'purchase'
                        ? 'bg-blue-900 text-blue-300'
                        : mobileSelectedTransaction.invoice_type === 'مرتجع' || mobileSelectedTransaction.invoice_type === 'مرتجع بيع' || mobileSelectedTransaction.invoice_type === 'Sale Return'
                          ? 'bg-red-900 text-red-300'
                          : 'bg-green-900 text-green-300'
                    }`}>
                      {mobileSelectedTransaction.transactionType === 'purchase'
                        ? 'فاتورة شراء'
                        : mobileSelectedTransaction.invoice_type === 'Sale Invoice' ? 'فاتورة بيع' :
                          mobileSelectedTransaction.invoice_type === 'Sale Return' ? 'مرتجع بيع' :
                          mobileSelectedTransaction.invoice_type || 'فاتورة بيع'}
                    </span>
                    <span className="text-white font-bold text-lg">
                      {formatPrice(Math.abs(parseFloat(mobileSelectedTransaction.total_amount || mobileSelectedTransaction.amount)))}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-[#2B3544] border-b border-gray-600 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowMobileActions(!showMobileActions)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white py-2 px-3 rounded-lg hover:bg-gray-600/30 transition-colors"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                      <span className="text-sm">الإجراءات</span>
                      {showMobileActions ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {showMobileActions && (
                    <div className="flex gap-2 mt-2 animate-fadeIn">
                      <button
                        onClick={() => handleDeleteTransaction(mobileSelectedTransaction)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>حذف</span>
                      </button>
                      <button
                        onClick={() => {
                          const items = mobileTransactionItems
                          printReceipt(mobileSelectedTransaction, items)
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                      >
                        <PrinterIcon className="h-4 w-4" />
                        <span>طباعة</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Transaction Items */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
                  <div className="text-gray-400 text-xs mb-2 text-center">عناصر الفاتورة ({mobileTransactionItems.length})</div>

                  {isLoadingMobileTransactionItems ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : mobileTransactionItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">لا توجد عناصر</div>
                  ) : (
                    <div className="space-y-3">
                      {mobileTransactionItems.map((item, idx) => {
                        const itemTotal = (item.quantity * item.unit_price) - (item.discount || 0)
                        return (
                          <div key={item.id || idx} className="bg-[#374151] rounded-lg p-3">
                            <div className="flex gap-3">
                              {/* Product Image */}
                              <div className="w-16 h-16 flex-shrink-0 bg-[#2B3544] rounded-lg overflow-hidden">
                                {item.product?.main_image_url ? (
                                  <img
                                    src={item.product.main_image_url}
                                    alt={item.product?.name || ''}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                                    {mobileSelectedTransaction.transactionType === 'purchase' ? '📦' : '🛒'}
                                  </div>
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-medium text-sm truncate mb-1">
                                  {item.product?.name || 'منتج غير معروف'}
                                </div>
                                <div className="text-gray-400 text-xs mb-1">
                                  {item.product?.category?.name || '-'}
                                </div>
                                <div className="text-gray-500 text-xs" dir="ltr">
                                  {item.product?.barcode || '-'}
                                </div>
                              </div>
                            </div>

                            {/* Item Details Grid */}
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">السعر:</span>
                                <span className="text-white">{formatPrice(item.unit_price)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">الكمية:</span>
                                <span className="text-white">{Math.abs(item.quantity)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">خصم:</span>
                                <span className="text-orange-400">{formatPrice(item.discount || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">الإجمالي:</span>
                                <span className="text-green-400 font-medium">{formatPrice(Math.abs(itemTotal))}</span>
                              </div>
                            </div>

                            {item.notes && (
                              <div className="mt-2 text-xs text-gray-300 bg-[#2B3544] rounded p-2">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Mobile Header - Safe Name */}
                <div className="bg-[#374151] border-b border-gray-600 px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-600/30 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <h1 className="text-white font-medium text-base truncate max-w-[60%]">{displayName}</h1>
                  <div className="w-9" />
                </div>

                {/* Mobile Balance & Safe Info Section */}
                <div className="bg-[#3B4754] border-b border-gray-600">
                  {/* Balance Card with Withdraw Button */}
                  <div className="w-full px-3 py-3 flex items-center gap-2">
                    {/* Toggle Button */}
                    <button
                      onClick={() => setIsMobileInfoExpanded(!isMobileInfoExpanded)}
                      className="flex items-center"
                    >
                      {isMobileInfoExpanded ? (
                        <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {/* Balance Card - Clickable to toggle */}
                    <button
                      onClick={() => setIsMobileInfoExpanded(!isMobileInfoExpanded)}
                      className="flex-1 bg-purple-600 rounded-lg px-4 py-2 text-center"
                    >
                      <div className="font-bold text-white text-xl">
                        {formatPrice(displayedBalance)}
                      </div>
                      <div className="text-purple-200 text-[10px]">
                        رصيد الخزنة
                      </div>
                    </button>

                    {/* Withdraw Button */}
                    <button
                      onClick={openWithdrawModal}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-2 flex flex-col items-center justify-center transition-colors"
                    >
                      <span className="text-base">💰</span>
                      <span className="text-[10px] font-medium">سحب</span>
                    </button>
                  </div>

                  {/* Expandable Content */}
                  {isMobileInfoExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Safe Info */}
                      <div className="bg-[#2B3544] rounded-lg p-3">
                        <h3 className="text-white font-medium mb-2 text-sm">معلومات الخزنة</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white">{displayName}</span>
                            <span className="text-gray-400">اسم الخزنة</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">جميع الفروع</span>
                            <span className="text-gray-400">الفرع</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-400">
                              {dateFilter.type === 'today' && 'اليوم'}
                              {dateFilter.type === 'current_week' && 'الأسبوع الحالي'}
                              {dateFilter.type === 'last_week' && 'الأسبوع الماضي'}
                              {dateFilter.type === 'current_month' && 'الشهر الحالي'}
                              {dateFilter.type === 'last_month' && 'الشهر الماضي'}
                              {dateFilter.type === 'custom' && 'فترة مخصصة'}
                              {dateFilter.type === 'all' && 'جميع الفترات'}
                            </span>
                            <span className="text-gray-400">الفترة الزمنية</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">{new Date().toLocaleDateString('en-GB')}</span>
                            <span className="text-gray-400">التاريخ الحالي</span>
                          </div>
                        </div>
                      </div>

                      {/* Drawer Filter - Only for safes with drawers */}
                      {safe.supports_drawers && childSafes.length > 0 && (
                        <div className="bg-[#2B3544] rounded-lg p-3">
                          <h4 className="text-white font-medium mb-2 text-sm text-right">تصفية حسب الدرج</h4>
                          <div className="space-y-1.5">
                            <label className="flex items-center justify-between cursor-pointer px-1 py-1">
                              <span className="text-white text-sm font-medium">{formatPrice(
                                childSafes.reduce((sum, c) => sum + c.balance, 0) + mainSafeOwnBalance
                              )}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300 text-sm">الكل</span>
                                <input
                                  type="checkbox"
                                  checked={!selectedDrawerFilters}
                                  onChange={handleSelectAllDrawers}
                                  className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                />
                              </div>
                            </label>
                            {childSafes.map(drawer => (
                              <label key={drawer.id} className="flex items-center justify-between cursor-pointer px-1 py-1">
                                <span className="text-green-400 text-sm">{formatPrice(drawer.balance)}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-300 text-sm truncate max-w-[100px]">{drawer.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={!selectedDrawerFilters || selectedDrawerFilters.has(drawer.id)}
                                    onChange={() => handleDrawerFilterToggle(drawer.id)}
                                    className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                  />
                                </div>
                              </label>
                            ))}
                            <div className="border-t border-gray-600 my-1"></div>
                            <label className="flex items-center justify-between cursor-pointer px-1 py-1">
                              <span className="text-blue-400 text-sm">{formatPrice(mainSafeOwnBalance)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300 text-sm">التحويلات</span>
                                <input
                                  type="checkbox"
                                  checked={!selectedDrawerFilters || selectedDrawerFilters.has('transfers')}
                                  onChange={() => handleDrawerFilterToggle('transfers')}
                                  className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                />
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Transaction Filter - For non-drawer safes (Mobile) */}
                      {!safe.supports_drawers && (
                        <div className="bg-[#2B3544] rounded-lg p-3">
                          <h4 className="text-white font-medium mb-2 text-sm text-right">تصفية المعاملات</h4>
                          <div className="space-y-1.5">
                            {/* الكل */}
                            <label className="flex items-center justify-between cursor-pointer px-1 py-1">
                              <span className="text-white text-sm font-medium">{formatPrice(safeBalance)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300 text-sm">الكل</span>
                                <input
                                  type="checkbox"
                                  checked={!selectedDrawerFilters}
                                  onChange={handleSelectAllDrawers}
                                  className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                />
                              </div>
                            </label>
                            {/* في الخزنة */}
                            <label className="flex items-center justify-between cursor-pointer px-1 py-1">
                              <span className="text-green-400 text-sm">{formatPrice(Math.max(0, safeBalance - nonDrawerTransferBalance))}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300 text-sm">في الخزنة</span>
                                <input
                                  type="checkbox"
                                  checked={!selectedDrawerFilters || selectedDrawerFilters.has('safe')}
                                  onChange={() => handleDrawerFilterToggle('safe')}
                                  className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                />
                              </div>
                            </label>
                            <div className="border-t border-gray-600 my-1"></div>
                            {/* التحويلات */}
                            <label className="flex items-center justify-between cursor-pointer px-1 py-1">
                              <span className="text-blue-400 text-sm">{formatPrice(nonDrawerTransferBalance)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300 text-sm">التحويلات</span>
                                <input
                                  type="checkbox"
                                  checked={!selectedDrawerFilters || selectedDrawerFilters.has('transfers')}
                                  onChange={() => handleDrawerFilterToggle('transfers')}
                                  className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                />
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Reserve (تجنيب) Section - Mobile */}
                      <div className="bg-[#2B3544] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          {displayedBalance > 0 ? (
                            <button
                              onClick={openAddReserveModal}
                              className="p-1 rounded hover:bg-orange-600/20 text-orange-400 transition-colors"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          ) : <div />}
                          <h4 className="text-white font-medium text-sm">التجنيب</h4>
                        </div>

                        {filteredReserves.length > 0 && (
                          <div className="space-y-1 mb-2">
                            <div className="flex justify-between items-center">
                              <span className="text-green-400 text-sm font-medium">{formatPrice(availableBalance)}</span>
                              <span className="text-gray-400 text-xs">المتاح / اليومي</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-orange-400 text-sm font-medium">{formatPrice(totalReserved)}</span>
                              <span className="text-gray-400 text-xs">المُجنّب</span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {filteredReserves.length > 0 ? filteredReserves.map(reserve => (
                            <div key={reserve.id} className="bg-[#374151] rounded p-2 relative">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => openEditReserveModal(reserve)}
                                    className="p-0.5 rounded hover:bg-blue-600/20 text-blue-400 transition-colors"
                                  >
                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setReserveToDelete(reserve); setShowDeleteReserveModal(true) }}
                                    className="p-0.5 rounded hover:bg-red-600/20 text-red-400 transition-colors"
                                  >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="text-right">
                                  <span className="text-orange-400 text-sm font-medium">{formatPrice(reserve.amount)}</span>
                                  {reserve.notes && (
                                    <p className="text-gray-400 text-xs mt-0.5">{reserve.notes}</p>
                                  )}
                                  {childSafes.length > 0 && (
                                    <p className="text-gray-500 text-xs mt-0.5">{getDrawerNameForReserve(reserve.record_id)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )) : (
                            <p className="text-gray-500 text-xs text-center py-1">لا يوجد مبالغ مُجنّبة</p>
                          )}
                        </div>
                      </div>

                      {/* Date Filter Button */}
                      <button
                        onClick={() => setShowDateFilter(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>التاريخ</span>
                      </button>

                      {/* Current Filter Display */}
                      {dateFilter.type !== 'all' && (
                        <div className="text-center">
                          <span className="text-xs text-purple-400">
                            {dateFilter.type === 'today' && 'عرض فواتير اليوم'}
                            {dateFilter.type === 'current_week' && 'عرض فواتير الأسبوع الحالي'}
                            {dateFilter.type === 'last_week' && 'عرض فواتير الأسبوع الماضي'}
                            {dateFilter.type === 'current_month' && 'عرض فواتير الشهر الحالي'}
                            {dateFilter.type === 'last_month' && 'عرض فواتير الشهر الماضي'}
                            {dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate &&
                              `من ${dateFilter.startDate.toLocaleDateString('en-GB')} إلى ${dateFilter.endDate.toLocaleDateString('en-GB')}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {/* Transactions Tab Content */}
                  {activeTab === 'transactions' && (
                    <div className="p-3 space-y-2">
                      {isLoadingSales ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      ) : allTransactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">لا توجد فواتير</div>
                      ) : (
                        allTransactions.map((transaction, index) => {
                          const txnDate = new Date(transaction.created_at)
                          const timeStr = transaction.time || txnDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                          const isSale = transaction.transactionType === 'sale'
                          const isPurchase = transaction.transactionType === 'purchase'

                          return (
                            <div
                              key={transaction.id}
                              onClick={() => openMobileTransactionDetails(transaction)}
                              className="bg-[#374151] rounded-lg p-3 cursor-pointer transition-colors active:bg-[#4B5563]"
                            >
                              {/* Header Row - Amount + Invoice# + Type Badge */}
                              <div className="flex justify-between items-center mb-2">
                                <span className={`font-bold text-lg ${
                                  parseFloat(transaction.amount) < 0 ? 'text-orange-400' :
                                  isPurchase ? 'text-red-400' : 'text-white'
                                }`}>
                                  {formatPrice(Math.abs(parseFloat(transaction.amount)))}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-400 font-medium text-sm">#{transaction.invoice_number}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    isPurchase
                                      ? 'bg-blue-900 text-blue-300'
                                      : transaction.invoice_type === 'مرتجع' || transaction.invoice_type === 'مرتجع بيع' || transaction.invoice_type === 'Sale Return'
                                        ? 'bg-red-900 text-red-300'
                                        : 'bg-green-900 text-green-300'
                                  }`}>
                                    {isPurchase ? 'شراء' :
                                     transaction.invoice_type === 'Sale Invoice' ? 'بيع' :
                                     transaction.invoice_type === 'Sale Return' ? 'مرتجع' :
                                     transaction.invoice_type === 'فاتورة بيع' ? 'بيع' :
                                     transaction.invoice_type === 'مرتجع بيع' ? 'مرتجع' :
                                     'بيع'}
                                  </span>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-gray-600 pt-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">التاريخ:</span>
                                  <span className="text-gray-300">{txnDate.toLocaleDateString('en-GB')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">الوقت:</span>
                                  <span className="text-gray-300">{timeStr}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">{isPurchase ? 'المورد:' : 'العميل:'}</span>
                                  <span className="text-gray-300 truncate max-w-[80px]">{transaction.client?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">المدفوع:</span>
                                  <span className="text-green-400">{formatPrice(transaction.paid_amount || 0)}</span>
                                </div>
                              </div>

                              {/* Notes with tap indicator */}
                              <div className="mt-2 text-xs bg-[#2B3544] rounded p-2 border-t border-gray-600">
                                {transaction.notes && (
                                  <div className="text-gray-300 mb-1">{transaction.notes}</div>
                                )}
                                <div className="flex items-center justify-end text-gray-500 text-xs">
                                  <span>اضغط لعرض التفاصيل</span>
                                  <ChevronLeftIcon className="h-3 w-3 mr-1" />
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* Payments/Transfers Tab Content */}
                  {activeTab === 'payments' && (
                    <div className="p-4 space-y-3">
                      {isLoadingTransfers ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                      ) : transfers.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">لا توجد تحويلات</div>
                      ) : (
                        transfers.map((transfer) => (
                          <div
                            key={transfer.id}
                            className="bg-[#374151] rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                transfer.amount > 0
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {transfer.amount > 0 ? 'إيداع' : 'سحب'}
                              </span>
                              <span className={`font-bold text-lg ${
                                transfer.amount > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatPrice(Math.abs(transfer.amount || 0))}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-400">
                              <span>{transfer.created_at ? new Date(transfer.created_at).toLocaleDateString('en-GB') : '-'}</span>
                              <span>{transfer.transaction_type || '-'}</span>
                            </div>
                            {transfer.notes && (
                              <div className="mt-2 text-sm text-gray-300 bg-[#2B3544] rounded p-2">
                                {transfer.notes}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Operations Tab Content (Mobile) */}
                  {activeTab === 'operations' && (
                    <div className="p-3 space-y-3">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-700 rounded-lg p-2.5 text-center">
                          <div className="text-green-400 text-sm font-bold">{formatPrice(operationsSummary.deposits, 'system')}</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">إيداعات ↑</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-2.5 text-center">
                          <div className="text-red-400 text-sm font-bold">{formatPrice(operationsSummary.withdrawals, 'system')}</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">سحوبات ↓</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-2.5 text-center">
                          <div className="text-blue-400 text-sm font-bold">{formatPrice(operationsSummary.transfersIn, 'system')}</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">تحويلات واردة ←</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-2.5 text-center">
                          <div className="text-orange-400 text-sm font-bold">{formatPrice(operationsSummary.transfersOut, 'system')}</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">تحويلات صادرة →</div>
                        </div>
                      </div>

                      {/* Type Filter */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { key: 'all', label: 'الكل' },
                          { key: 'deposit', label: 'إضافه' },
                          { key: 'withdrawal', label: 'سحب' },
                          { key: 'expense', label: 'مصروفات' },
                          { key: 'transfer_in', label: 'وارد' },
                          { key: 'transfer_out', label: 'صادر' }
                        ].map(f => (
                          <button
                            key={f.key}
                            onClick={() => setOperationsTypeFilter(f.key)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              operationsTypeFilter === f.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Transaction List */}
                      {isLoadingOperations ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      ) : filteredOperations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">لا توجد معاملات</div>
                      ) : (
                        filteredOperations.map((op) => {
                          const typeMap: { [key: string]: { text: string; color: string; bg: string } } = {
                            'deposit': { text: 'إضافه', color: 'text-green-400', bg: 'bg-green-500/20' },
                            'withdrawal': { text: 'سحب', color: 'text-red-400', bg: 'bg-red-500/20' },
                            'expense': { text: 'مصروفات', color: 'text-red-400', bg: 'bg-red-500/20' },
                            'transfer_in': { text: 'تحويل وارد', color: 'text-blue-400', bg: 'bg-blue-500/20' },
                            'transfer_out': { text: 'تحويل صادر', color: 'text-orange-400', bg: 'bg-orange-500/20' }
                          }
                          const typeInfo = typeMap[op.transaction_type || ''] || { text: op.transaction_type || '-', color: 'text-gray-400', bg: 'bg-gray-500/20' }
                          const isPositive = (op.amount || 0) >= 0
                          return (
                            <div key={op.id} className="bg-[#374151] rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                                  {typeInfo.text}
                                </span>
                                <span className={`font-bold text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                  {isPositive ? '+' : ''}{formatPrice(op.amount || 0, 'system')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-gray-600 pt-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">التاريخ:</span>
                                  <span className="text-gray-300">{op.created_at ? new Date(op.created_at).toLocaleDateString('en-GB') : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">الساعة:</span>
                                  <span className="text-gray-300">{op.created_at ? new Date(op.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span>
                                </div>
                                {op.safe_name && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">الدرج:</span>
                                    <span className="text-purple-400">{op.safe_name}</span>
                                  </div>
                                )}
                                {(op.transaction_type === 'transfer_in' || op.transaction_type === 'transfer_out') && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">من/إلى:</span>
                                    <span className="text-cyan-400">{op.related_safe_name || '-'}</span>
                                  </div>
                                )}
                                {op.performed_by && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">الموظف:</span>
                                    <span className="text-yellow-400">{op.performed_by}</span>
                                  </div>
                                )}
                              </div>
                              {op.notes && (
                                <div className="mt-2 text-xs text-gray-300 bg-[#2B3544] rounded p-2">
                                  {op.notes}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                      {/* Sentinel for infinite scroll */}
                      <div ref={operationsSentinelRef} className="h-4" />
                      {isLoadingMoreOperations && (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                          <span className="text-gray-400 text-sm">جاري تحميل المزيد...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Statement Tab Content */}
                  {activeTab === 'statement' && (
                    <div className="p-4 space-y-3">
                      {isLoadingStatement ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      ) : recalculatedStatements.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">لا توجد حركات</div>
                      ) : (
                        recalculatedStatements.map((statement, index) => (
                          <div
                            key={statement.id || index}
                            onClick={() => {
                              // إذا كان العنصر فاتورة بيع أو مرتجع بيع، نفتح تفاصيلها
                              if (statement.sale_id) {
                                // إنشاء كائن المعاملة للاستخدام مع openMobileTransactionDetails
                                const transaction = {
                                  id: statement.sale_id,
                                  invoice_number: statement.description?.match(/#?(\d+)/)?.[1] || statement.description?.split(' - ')[1] || '-',
                                  transactionType: 'sale',
                                  invoice_type: statement.type === 'مرتجع بيع' ? 'Sale Return' : 'Sale',
                                  total_amount: statement.paidAmount || statement.invoiceValue || 0,
                                  amount: statement.paidAmount || 0,
                                  created_at: statement.created_at,
                                  notes: ''
                                }
                                openMobileTransactionDetails(transaction)
                              }
                            }}
                            className={`bg-[#374151] rounded-lg p-3 transition-colors ${
                              statement.sale_id ? 'cursor-pointer active:bg-[#4B5563]' : ''
                            } ${
                              statement.type === 'فاتورة بيع'
                                ? 'border-2 border-green-700/50'
                                : statement.type === 'فاتورة شراء'
                                  ? 'border-2 border-blue-700/50'
                                  : statement.type === 'مرتجع بيع'
                                    ? 'border-2 border-red-700/50'
                                    : statement.type === 'إضافه'
                                      ? 'border-2 border-green-700/50'
                                      : statement.type === 'مصروفات'
                                        ? 'border-2 border-red-700/50'
                                        : 'border-2 border-gray-600/50'
                            }`}
                          >
                            {/* الصف العلوي: نوع العملية + التاريخ */}
                            <div className="flex justify-between items-center mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                statement.type === 'فاتورة بيع'
                                  ? 'bg-green-900 text-green-300'
                                  : statement.type === 'فاتورة شراء'
                                    ? 'bg-blue-900 text-blue-300'
                                    : statement.type === 'مرتجع بيع'
                                      ? 'bg-red-900 text-red-300'
                                      : statement.type === 'إضافه'
                                        ? 'bg-emerald-900 text-emerald-300'
                                        : statement.type === 'مصروفات'
                                          ? 'bg-red-900 text-red-300'
                                          : statement.type === 'سحب'
                                            ? 'bg-orange-900 text-orange-300'
                                            : 'bg-gray-700 text-gray-300'
                              }`}>
                                {statement.type}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {new Date(statement.date).toLocaleDateString('en-GB')}
                              </span>
                            </div>

                            {/* البيان/الوصف */}
                            {statement.description && (
                              <div className="text-sm text-gray-300 mb-3">{statement.description}</div>
                            )}

                            {/* صف الأرقام */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div className="text-center">
                                <div className="text-gray-500 mb-1">المبلغ</div>
                                <span className={`font-medium ${
                                  statement.amount >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatPrice(Math.abs(statement.amount || 0))}
                                </span>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500 mb-1">الرصيد</div>
                                <span className={`font-medium ${
                                  index === 0
                                    ? 'bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded'
                                    : 'text-gray-400'
                                }`}>
                                  {formatPrice(statement.balance || 0)}
                                </span>
                              </div>
                            </div>

                            {/* مؤشر "اضغط لعرض التفاصيل" للفواتير فقط */}
                            {statement.sale_id && (
                              <div className="mt-2 flex items-center justify-end text-gray-500 text-xs">
                                <span>اضغط لعرض التفاصيل</span>
                                <ChevronLeftIcon className="h-3 w-3 mr-1" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="bg-[#374151] border-t border-gray-600 px-1 py-1 flex items-center justify-around safe-area-bottom">
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors ${
                      activeTab === 'transactions'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">📋</span>
                    <span className="text-xs font-medium">الفواتير ({allTransactions.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors ${
                      activeTab === 'payments'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">💸</span>
                    <span className="text-xs font-medium">التحويلات</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('statement')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors ${
                      activeTab === 'statement'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">📊</span>
                    <span className="text-xs font-medium">كشف الحساب</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('operations')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors ${
                      activeTab === 'operations'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">🔄</span>
                    <span className="text-xs font-medium">المعاملات</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
        <div className="bg-[#2B3544] h-full w-full flex flex-col">

          {/* Top Navigation - All buttons in one row */}
          <div className="bg-[#374151] border-b border-gray-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                {/* Action Buttons - Same style as customer list */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (allTransactions.length > 0 && selectedTransaction < allTransactions.length) {
                        handleDeleteTransaction(allTransactions[selectedTransaction])
                      }
                    }}
                    disabled={allTransactions.length === 0 || selectedTransaction >= allTransactions.length || (allTransactions.length > 0 && selectedTransaction < allTransactions.length && allTransactions[selectedTransaction]?.transactionType === 'sale' && allTransactions[selectedTransaction]?.status === 'cancelled')}
                    className={`flex flex-col items-center p-2 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer min-w-[80px] transition-colors ${allTransactions.length > 0 && selectedTransaction < allTransactions.length && allTransactions[selectedTransaction]?.transactionType === 'sale' ? 'text-orange-400 hover:text-orange-300' : 'text-red-400 hover:text-red-300'}`}
                  >
                    {allTransactions.length > 0 && selectedTransaction < allTransactions.length && allTransactions[selectedTransaction]?.transactionType === 'sale' ? (
                      <XCircleIcon className="h-5 w-5 mb-1" />
                    ) : (
                      <TrashIcon className="h-5 w-5 mb-1" />
                    )}
                    <span className="text-sm">{allTransactions.length > 0 && selectedTransaction < allTransactions.length && allTransactions[selectedTransaction]?.transactionType === 'sale' ? 'إلغاء الفاتورة' : 'حذف الفاتورة'}</span>
                  </button>

                  <button
                    onClick={openWithdrawModal}
                    className="flex flex-col items-center p-2 text-orange-400 hover:text-orange-300 cursor-pointer min-w-[80px] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm">سحب الخزنة</span>
                  </button>

                </div>

                {/* Tab Navigation - Same row */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 rounded-t-lg transition-all duration-200 ${
                      activeTab === 'payments'
                        ? 'text-blue-400 border-blue-400 bg-blue-600/10'
                        : 'text-gray-300 hover:text-white border-transparent hover:border-gray-400 hover:bg-gray-600/20'
                    }`}
                  >
                    التحويلات
                  </button>
                  <button
                    onClick={() => setActiveTab('statement')}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 rounded-t-lg transition-all duration-200 ${
                      activeTab === 'statement'
                        ? 'text-blue-400 border-blue-400 bg-blue-600/10'
                        : 'text-gray-300 hover:text-white border-transparent hover:border-gray-400 hover:bg-gray-600/20'
                    }`}
                  >
                    كشف الحساب
                  </button>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className={`px-5 py-2.5 text-sm font-semibold border-b-2 rounded-t-lg transition-all duration-200 ${
                      activeTab === 'transactions'
                        ? 'text-blue-400 border-blue-400 bg-blue-600/10'
                        : 'text-gray-300 hover:text-white border-transparent hover:border-gray-400 hover:bg-gray-600/20'
                    }`}
                  >
                    فواتير الخزنة ({allTransactions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('operations')}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 rounded-t-lg transition-all duration-200 ${
                      activeTab === 'operations'
                        ? 'text-blue-400 border-blue-400 bg-blue-600/10'
                        : 'text-gray-300 hover:text-white border-transparent hover:border-gray-400 hover:bg-gray-600/20'
                    }`}
                  >
                    المعاملات
                  </button>
                </div>

                {/* View Mode Toggle Buttons - Only show for transactions tab */}
                {activeTab === 'transactions' && (
                  <div className="flex gap-1 bg-gray-600/50 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('safes-only')}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                        viewMode === 'safes-only'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                      }`}
                      title="عرض فواتير الخزنة فقط"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                        viewMode === 'split'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                      }`}
                      title="عرض مقسم"
                    >
                      ⬌
                    </button>
                    <button
                      onClick={() => setViewMode('details-only')}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                        viewMode === 'details-only'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                      }`}
                      title="عرض تفاصيل الفاتورة فقط"
                    >
                      📄
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-600/30 transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0" ref={containerRef}>
            {/* Toggle Button - Flat design on the edge */}
            <div className="flex">
              <button
                onClick={() => setShowSafeDetails(!showSafeDetails)}
                className="w-6 bg-[#374151] hover:bg-[#4B5563] border-r border-gray-600 flex items-center justify-center transition-colors duration-200"
                title={showSafeDetails ? 'إخفاء تفاصيل الخزنة' : 'إظهار تفاصيل الخزنة'}
              >
                {showSafeDetails ? (
                  <ChevronRightIcon className="h-4 w-4 text-gray-300" />
                ) : (
                  <ChevronLeftIcon className="h-4 w-4 text-gray-300" />
                )}
              </button>
            </div>

            {/* Right Sidebar - Record Info (First in RTL) */}
            {showSafeDetails && (
              <div className="w-80 bg-[#3B4754] border-l border-gray-600 flex flex-col overflow-y-auto scrollbar-hide">

                {/* Record Balance */}
                <div className="p-4 border-b border-gray-600">
                  <div className="bg-purple-600 rounded p-4 text-center">
                    <div className="text-2xl font-bold text-white">{formatPrice(displayedBalance, 'system')}</div>
                    <div className="text-purple-200 text-sm">رصيد الخزنة</div>
                  </div>
                </div>

                {/* Drawer Filter Section - Only for safes with drawers */}
                {safe.supports_drawers && childSafes.length > 0 && (
                  <div className="p-4 border-b border-gray-600">
                    <h4 className="text-white font-medium mb-3 text-sm text-right">تصفية حسب الدرج</h4>
                    <div className="space-y-1.5">
                      {/* All checkbox */}
                      <label className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#2B3544] transition-colors">
                        <span className="text-white font-medium text-sm">{formatPrice(
                          childSafes.reduce((sum, c) => sum + c.balance, 0) + mainSafeOwnBalance, 'system'
                        )}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">الكل</span>
                          <input
                            type="checkbox"
                            checked={!selectedDrawerFilters}
                            onChange={handleSelectAllDrawers}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      </label>

                      {/* Individual drawer checkboxes */}
                      {childSafes.map(drawer => (
                        <label key={drawer.id} className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#2B3544] transition-colors">
                          <span className="text-green-400 text-sm">{formatPrice(drawer.balance, 'system')}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-sm truncate max-w-[120px]">{drawer.name}</span>
                            <input
                              type="checkbox"
                              checked={!selectedDrawerFilters || selectedDrawerFilters.has(drawer.id)}
                              onChange={() => handleDrawerFilterToggle(drawer.id)}
                              className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                            />
                          </div>
                        </label>
                      ))}

                      {/* Separator */}
                      <div className="border-t border-gray-600 my-1"></div>

                      {/* Transfers checkbox (non-physical payments routed to main safe) */}
                      <label className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#2B3544] transition-colors">
                        <span className="text-blue-400 text-sm">{formatPrice(mainSafeOwnBalance, 'system')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">التحويلات</span>
                          <input
                            type="checkbox"
                            checked={!selectedDrawerFilters || selectedDrawerFilters.has('transfers')}
                            onChange={() => handleDrawerFilterToggle('transfers')}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Transaction Filter - For non-drawer safes (Desktop) */}
                {!safe.supports_drawers && (
                  <div className="p-4 border-b border-gray-600">
                    <h4 className="text-white font-medium mb-3 text-sm text-right">تصفية المعاملات</h4>
                    <div className="space-y-1.5">
                      {/* الكل */}
                      <label className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#2B3544] transition-colors">
                        <span className="text-white font-medium text-sm">{formatPrice(safeBalance, 'system')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">الكل</span>
                          <input
                            type="checkbox"
                            checked={!selectedDrawerFilters}
                            onChange={handleSelectAllDrawers}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      </label>
                      {/* في الخزنة */}
                      <label className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#2B3544] transition-colors">
                        <span className="text-green-400 text-sm">{formatPrice(Math.max(0, safeBalance - nonDrawerTransferBalance), 'system')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">في الخزنة</span>
                          <input
                            type="checkbox"
                            checked={!selectedDrawerFilters || selectedDrawerFilters.has('safe')}
                            onChange={() => handleDrawerFilterToggle('safe')}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      </label>
                      <div className="border-t border-gray-600 my-1"></div>
                      {/* التحويلات */}
                      <label className="flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#2B3544] transition-colors">
                        <span className="text-blue-400 text-sm">{formatPrice(nonDrawerTransferBalance, 'system')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">التحويلات</span>
                          <input
                            type="checkbox"
                            checked={!selectedDrawerFilters || selectedDrawerFilters.has('transfers')}
                            onChange={() => handleDrawerFilterToggle('transfers')}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Safe Info */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm">{displayName}</span>
                      <span className="text-gray-400 text-xs">اسم الخزنة</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-400 text-sm">
                        {dateFilter.type === 'today' && 'اليوم'}
                        {dateFilter.type === 'current_week' && 'الأسبوع الحالي'}
                        {dateFilter.type === 'last_week' && 'الأسبوع الماضي'}
                        {dateFilter.type === 'current_month' && 'الشهر الحالي'}
                        {dateFilter.type === 'last_month' && 'الشهر الماضي'}
                        {dateFilter.type === 'custom' && 'فترة مخصصة'}
                        {dateFilter.type === 'all' && 'جميع الفترات'}
                      </span>
                      <span className="text-gray-400 text-xs">الفترة</span>
                    </div>
                    {dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-white text-xs">
                          {dateFilter.startDate.toLocaleDateString('en-GB')} - {dateFilter.endDate.toLocaleDateString('en-GB')}
                        </span>
                        <span className="text-gray-400 text-xs">من - إلى</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm">{new Date().toLocaleDateString('en-GB')}</span>
                      <span className="text-gray-400 text-xs">التاريخ</span>
                    </div>
                  </div>
                </div>

                {/* Reserve (تجنيب) Section */}
                <div className="p-4 border-t border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    {displayedBalance > 0 ? (
                      <button
                        onClick={openAddReserveModal}
                        className="p-1 rounded hover:bg-orange-600/20 text-orange-400 transition-colors"
                        title="تجنيب مبلغ"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    ) : <div />}
                    <h4 className="text-white font-medium text-sm">التجنيب</h4>
                  </div>

                  {filteredReserves.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-green-400 text-sm font-medium">{formatPrice(availableBalance, 'system')}</span>
                        <span className="text-gray-400 text-xs">المتاح / اليومي</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-orange-400 text-sm font-medium">{formatPrice(totalReserved, 'system')}</span>
                        <span className="text-gray-400 text-xs">المُجنّب</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                    {filteredReserves.length > 0 ? filteredReserves.map(reserve => (
                      <div key={reserve.id} className="group bg-[#2B3544] rounded p-2.5 relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditReserveModal(reserve)}
                              className="p-0.5 rounded hover:bg-blue-600/20 text-blue-400 transition-colors"
                            >
                              <PencilSquareIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setReserveToDelete(reserve); setShowDeleteReserveModal(true) }}
                              className="p-0.5 rounded hover:bg-red-600/20 text-red-400 transition-colors"
                            >
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="text-right">
                            <span className="text-orange-400 text-sm font-medium">{formatPrice(reserve.amount, 'system')}</span>
                            {reserve.notes && (
                              <p className="text-gray-400 text-xs mt-0.5">{reserve.notes}</p>
                            )}
                            {childSafes.length > 0 && (
                              <p className="text-gray-500 text-xs mt-0.5">{getDrawerNameForReserve(reserve.record_id)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-gray-500 text-xs text-center py-2">لا يوجد مبالغ مُجنّبة</p>
                    )}
                  </div>
                </div>

                {/* Date Filter Button */}
                <div className="p-4 border-t border-gray-600">
                  <button
                    onClick={() => setShowDateFilter(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <CalendarDaysIcon className="h-5 w-5" />
                    <span>التاريخ</span>
                  </button>

                  {dateFilter.type !== 'all' && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-purple-400">
                        {dateFilter.type === 'today' && 'عرض فواتير اليوم'}
                        {dateFilter.type === 'current_week' && 'عرض فواتير الأسبوع الحالي'}
                        {dateFilter.type === 'last_week' && 'عرض فواتير الأسبوع الماضي'}
                        {dateFilter.type === 'current_month' && 'عرض فواتير الشهر الحالي'}
                        {dateFilter.type === 'last_month' && 'عرض فواتير الشهر الماضي'}
                        {dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate &&
                          `من ${dateFilter.startDate.toLocaleDateString('en-GB')} إلى ${dateFilter.endDate.toLocaleDateString('en-GB')}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main Content Area - Left side containing both tables */}
            <div className="flex-1 flex flex-col min-w-0 relative">
              
              {/* Search Bar */}
              <div className={`bg-[#374151] border-b p-4 transition-colors ${searchQuery ? 'border-blue-500' : 'border-gray-600'}`}>
                {searchQuery && (
                  <div className="mb-2 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400">
                      <span>🔍</span>
                      <span>البحث نشط - عرض الفواتير التي تحتوي على المنتج المحدد فقط</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">النتائج:</span>
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-medium">
                        {allTransactions.length}
                      </span>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <MagnifyingGlassIcon className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-blue-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder="ابحث عن منتج (اسم المنتج أو الباركود)..."
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value
                      setSearchQuery(value)

                      // Clear previous timeout
                      if (searchTimeout) {
                        clearTimeout(searchTimeout)
                      }

                      // Client-side search with short debounce (100ms)
                      const timeout = setTimeout(() => {
                        searchProductInInvoices(value)
                      }, 100)
                      setSearchTimeout(timeout)
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        // Clear timeout and search immediately
                        if (searchTimeout) {
                          clearTimeout(searchTimeout)
                        }
                        searchProductInInvoices(searchQuery)
                      }
                    }}
                    className="w-full pl-24 pr-10 py-2 bg-[#2B3544] border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => searchProductInInvoices(searchQuery)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      بحث
                    </button>
                    <button
                      onClick={() => searchProductInInvoices('')}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                    >
                      مسح
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Content Based on Active Tab and View Mode */}
              <div className="flex-1 overflow-y-auto scrollbar-hide relative">
                {activeTab === 'statement' && (
                  <div className="h-full flex flex-col">
                    {showStatementInvoiceDetails ? (
                      <div className="flex flex-col h-full bg-[#1F2937]">
                        {/* Top Bar with Back Button and Print Actions */}
                        <div className="bg-[#2B3544] border-b border-gray-600 px-4 py-2 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setShowStatementInvoiceDetails(false)
                              setSelectedStatementInvoice(null)
                              setStatementInvoiceItems([])
                            }}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors text-sm"
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                            <span>العودة</span>
                          </button>
                          <div className="flex items-center gap-2">
                            {/* Print Receipt Button */}
                            <button
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                              disabled={isLoadingStatementInvoiceItems || statementInvoiceItems.length === 0}
                            >
                              <PrinterIcon className="h-4 w-4" />
                              ريسيت
                            </button>
                          </div>
                        </div>

                        {/* Navigation Bar with Invoice Number */}
                        <div className="bg-[#374151] border-b border-gray-600 px-4 py-3 flex items-center justify-center gap-4">
                          {/* Previous Button */}
                          <button
                            onClick={navigateToPreviousInvoice}
                            disabled={currentInvoiceIndex === 0 || isLoadingStatementInvoiceItems}
                            className={`p-2 rounded-lg transition-colors ${
                              currentInvoiceIndex === 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <ChevronRightIcon className="h-5 w-5" />
                          </button>

                          {/* Invoice Number Display */}
                          <div className="flex items-center gap-3 bg-[#2B3544] px-6 py-2 rounded-lg border border-gray-600">
                            <span className="text-gray-400 text-sm">فاتورة رقم</span>
                            <span className="text-white font-bold text-xl">
                              {selectedStatementInvoice?.invoice_number?.replace('INV-', '').split('-')[0] || '---'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              ({currentInvoiceIndex + 1} من {invoiceStatements.length})
                            </span>
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={navigateToNextInvoice}
                            disabled={currentInvoiceIndex >= invoiceStatements.length - 1 || isLoadingStatementInvoiceItems}
                            className={`p-2 rounded-lg transition-colors ${
                              currentInvoiceIndex >= invoiceStatements.length - 1
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <ChevronLeftIcon className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Invoice Info Header */}
                        <div className="bg-[#2B3544] border-b border-gray-600 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 rounded text-sm font-medium ${
                                selectedStatementInvoice?.invoice_type === 'Sale Return'
                                  ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30'
                                  : 'bg-green-600/20 text-green-400 border border-green-600/30'
                              }`}>
                                {selectedStatementInvoice?.invoice_type === 'Sale Return' ? 'مرتجع بيع' : 'فاتورة بيع'}
                              </span>
                              <span className="text-gray-300 text-sm">
                                {selectedStatementInvoice?.created_at
                                  ? new Date(selectedStatementInvoice.created_at).toLocaleDateString('ar-EG', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'numeric',
                                      day: 'numeric'
                                    })
                                  : '---'}
                              </span>
                            </div>
                            <div className="text-white font-medium">
                              {displayName}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Items Table */}
                        <div className="flex-1 overflow-hidden">
                          {isLoadingStatementInvoiceItems ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                              <span className="text-gray-400">جاري تحميل تفاصيل الفاتورة...</span>
                            </div>
                          ) : (
                            <div className="h-full overflow-y-auto scrollbar-hide">
                              <table className="w-full">
                                <thead className="bg-[#374151] sticky top-0">
                                  <tr>
                                    <th className="px-4 py-3 text-right text-gray-300 font-medium text-sm border-b border-gray-600 w-12">م</th>
                                    <th className="px-4 py-3 text-right text-gray-300 font-medium text-sm border-b border-gray-600">الصنف</th>
                                    <th className="px-4 py-3 text-center text-gray-300 font-medium text-sm border-b border-gray-600 w-24">الكمية</th>
                                    <th className="px-4 py-3 text-center text-gray-300 font-medium text-sm border-b border-gray-600 w-28">سعر</th>
                                    <th className="px-4 py-3 text-center text-gray-300 font-medium text-sm border-b border-gray-600 w-28">قيمة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {statementInvoiceItems.map((item, index) => (
                                    <tr key={item.id} className="border-b border-gray-700 hover:bg-[#374151]/50">
                                      <td className="px-4 py-3 text-blue-400 font-medium text-sm">{index + 1}</td>
                                      <td className="px-4 py-3 text-blue-400 font-medium text-sm">
                                        {item.product?.name || 'منتج غير معروف'}
                                      </td>
                                      <td className="px-4 py-3 text-center text-white text-sm">
                                        {Math.abs(item.quantity)}
                                      </td>
                                      <td className="px-4 py-3 text-center text-white text-sm">
                                        {formatPrice(item.unit_price)}
                                      </td>
                                      <td className="px-4 py-3 text-center text-white text-sm">
                                        {formatPrice(Math.abs(item.quantity) * item.unit_price)}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Totals Row */}
                                  <tr className="bg-[#374151] border-t-2 border-blue-500">
                                    <td colSpan={2} className="px-4 py-3 text-left text-blue-400 font-bold text-sm">
                                      - = اجمالي = -
                                    </td>
                                    <td className="px-4 py-3 text-center text-blue-400 font-bold text-sm">
                                      {statementInvoiceItems.reduce((sum, item) => sum + Math.abs(item.quantity), 0)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-white text-sm"></td>
                                    <td className="px-4 py-3 text-center text-blue-400 font-bold text-sm">
                                      {formatPrice(Math.abs(selectedStatementInvoice?.total_amount || 0))}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Invoice Info Footer */}
                        <div className="bg-[#2B3544] border-t border-gray-600 p-4">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="flex flex-col items-center bg-[#374151] rounded-lg p-3 border border-gray-600">
                              <span className="text-gray-400 mb-1">الاجمالي</span>
                              <span className="text-white font-bold">
                                {formatPrice(Math.abs(selectedStatementInvoice?.total_amount || 0))}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-[#374151] rounded-lg p-3 border border-gray-600">
                              <span className="text-gray-400 mb-1">الخصم</span>
                              <span className="text-white font-bold">
                                {formatPrice(selectedStatementInvoice?.discount_amount || 0)}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-[#374151] rounded-lg p-3 border border-gray-600">
                              <span className="text-gray-400 mb-1">المدفوع</span>
                              <span className="text-green-400 font-bold">
                                {formatPrice(Math.abs(selectedStatementInvoice?.total_amount || 0))}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-[#374151] rounded-lg p-3 border border-gray-600">
                              <span className="text-gray-400 mb-1">رصيد الخزنة</span>
                              <span className="text-blue-400 font-bold">
                                {formatPrice(displayedBalance)}
                              </span>
                            </div>
                          </div>

                          {/* Notes and Employee Info */}
                          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                              <span>الملاحظات:</span>
                              <span className="text-gray-300">{selectedStatementInvoice?.notes || '---'}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span>
                                TIME: {selectedStatementInvoice?.created_at
                                  ? new Date(selectedStatementInvoice.created_at).toLocaleDateString('en-GB')
                                  : '---'} {selectedStatementInvoice?.time || ''}
                              </span>
                              <span>
                                by: {(selectedStatementInvoice as any)?.cashier?.full_name || 'system'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Account Statement Table with Infinite Scroll */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                          {isLoadingStatement ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                              <span className="text-gray-400">جاري تحميل كشف الحساب...</span>
                            </div>
                          ) : recalculatedStatements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8">
                              <div className="text-6xl mb-4">📊</div>
                              <p className="text-gray-400 text-lg mb-2">لا توجد عمليات في كشف الحساب</p>
                              <p className="text-gray-500 text-sm">سيتم عرض العمليات هنا عند إجرائها</p>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-auto scrollbar-hide">
                              <ResizableTable
                                className="h-full w-full"
                                columns={statementColumns}
                                data={recalculatedStatements}
                                onRowDoubleClick={handleStatementRowDoubleClick}
                                onRowContextMenu={handleStatementContextMenu}
                              />
                              {/* Sentinel element for infinite scroll */}
                              <div ref={statementSentinelRef} className="h-4" />
                              {/* Loading more indicator */}
                              {isLoadingMoreStatements && (
                                <div className="flex items-center justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                                  <span className="text-gray-400 text-sm">جاري تحميل المزيد...</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {activeTab === 'transactions' && (
                  <div className="h-full relative">
                    {/* Records Table - Always rendered but z-indexed based on view mode */}
                    <div 
                      className={`absolute inset-0 bg-[#2B3544] transition-all duration-300 ${
                        viewMode === 'details-only' ? 'z-0 opacity-20' : 'z-10'
                      } ${
                        viewMode === 'split' ? '' : 'opacity-100'
                      }`}
                      style={{
                        height: viewMode === 'split' ? `${dividerPosition}%` : '100%',
                        zIndex: viewMode === 'safes-only' ? 20 : viewMode === 'split' ? 10 : 5
                      }}
                    >
                      {isLoadingSales ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                          <span className="text-gray-400">جاري تحميل الفواتير...</span>
                        </div>
                      ) : allTransactions.length === 0 && searchQuery ? (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                          <div className="text-6xl mb-4">🔍</div>
                          <p className="text-gray-400 text-lg mb-2">لا توجد فواتير تحتوي على هذا المنتج</p>
                          <p className="text-gray-500 text-sm">ابحث عن منتج آخر أو امسح البحث</p>
                        </div>
                      ) : (
                        <ResizableTable
                          className="h-full w-full"
                          columns={transactionColumns}
                          data={allTransactions}
                          selectedRowId={allTransactions[selectedTransaction]?.id?.toString() || null}
                          onRowClick={(transaction: any, index: number) => setSelectedTransaction(index)}
                        />
                      )}
                    </div>

                    {/* Resizable Divider - Only show in split mode */}
                    {viewMode === 'split' && (
                      <div
                        className="absolute left-0 right-0 h-2 bg-gray-600 hover:bg-blue-500 cursor-row-resize z-30 flex items-center justify-center transition-colors duration-200"
                        style={{ top: `${dividerPosition}%`, transform: 'translateY(-50%)' }}
                        onMouseDown={handleMouseDown}
                      >
                        <div className="w-12 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                    )}

                    {/* Transaction Details - Always rendered but z-indexed based on view mode */}
                    <div 
                      className={`absolute inset-0 bg-[#2B3544] flex flex-col transition-all duration-300 ${
                        viewMode === 'safes-only' ? 'z-0 opacity-20' : 'z-10'
                      }`}
                      style={{
                        top: viewMode === 'split' ? `${dividerPosition}%` : '0',
                        height: viewMode === 'split' ? `${100 - dividerPosition}%` : '100%',
                        zIndex: viewMode === 'details-only' ? 20 : viewMode === 'split' ? 10 : 5
                      }}
                    >
                      <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0 border-b border-gray-600">
                        <button
                          onClick={() => {
                            const currentTransaction = allTransactions[selectedTransaction]
                            const items = currentTransaction?.transactionType === 'sale' ? saleItems : purchaseInvoiceItems
                            printReceipt(currentTransaction, items)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                          disabled={isLoadingItems || (saleItems.length === 0 && purchaseInvoiceItems.length === 0)}
                        >
                          <PrinterIcon className="h-4 w-4" />
                          طباعة الريسيت
                        </button>
                        <h3 className="text-blue-400 font-medium text-lg">
                          تفاصيل الفاتورة {allTransactions[selectedTransaction]?.invoice_number || ''}
                        </h3>
                      </div>

                      <div className="flex-1 min-h-0 px-4 pb-4">
                        {isLoadingItems ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                            <span className="text-gray-400">جاري تحميل العناصر...</span>
                          </div>
                        ) : (
                          <ResizableTable
                            className="h-full w-full"
                            columns={transactionDetailsColumns}
                            data={allTransactionItems}
                            getRowClassName={(item) =>
                              highlightedProductId === item.product?.id
                                ? 'bg-yellow-500/30 hover:bg-yellow-500/40'
                                : ''
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'payments' && (
                  <div className="h-full flex flex-col">
                    {/* Payments Header */}
                    <div className="bg-[#2B3544] border-b border-gray-600 p-4">
                      <div className="flex items-center justify-end">
                        <div className="text-right">
                          <div className="text-white text-lg font-medium">تحويلات الخزنة</div>
                          <div className="text-gray-400 text-sm mt-1">
                            إجمالي التحويلات: {formatPrice(transfers.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0), 'system')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payments Table with Infinite Scroll */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {isLoadingTransfers ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                          <span className="text-gray-400">جاري تحميل التحويلات...</span>
                        </div>
                      ) : transfers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                          <div className="text-6xl mb-4">💸</div>
                          <p className="text-gray-400 text-lg mb-2">لا توجد تحويلات مسجلة</p>
                          <p className="text-gray-500 text-sm">الإيداعات والسحوبات ستظهر هنا</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-auto scrollbar-hide">
                          <ResizableTable
                            className="h-full w-full"
                            columns={paymentsColumns}
                            data={transfers}
                          />
                          {/* Sentinel element for infinite scroll */}
                          <div ref={transfersSentinelRef} className="h-4" />
                          {/* Loading more indicator */}
                          {isLoadingMoreTransfers && (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                              <span className="text-gray-400 text-sm">جاري تحميل المزيد...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'operations' && (
                  <div className="h-full flex flex-col">
                    {/* Operations Header - Summary Cards */}
                    <div className="bg-[#2B3544] border-b border-gray-600 p-4">
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-green-400 text-lg font-bold">{formatPrice(operationsSummary.deposits, 'system')}</div>
                          <div className="text-gray-400 text-xs mt-1">إيداعات ↑</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-red-400 text-lg font-bold">{formatPrice(operationsSummary.withdrawals, 'system')}</div>
                          <div className="text-gray-400 text-xs mt-1">سحوبات ↓</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-blue-400 text-lg font-bold">{formatPrice(operationsSummary.transfersIn, 'system')}</div>
                          <div className="text-gray-400 text-xs mt-1">تحويلات واردة ←</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <div className="text-orange-400 text-lg font-bold">{formatPrice(operationsSummary.transfersOut, 'system')}</div>
                          <div className="text-gray-400 text-xs mt-1">تحويلات صادرة →</div>
                        </div>
                      </div>

                      {/* Type Filter Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { key: 'all', label: 'الكل' },
                          { key: 'deposit', label: 'إضافه' },
                          { key: 'withdrawal', label: 'سحب' },
                          { key: 'expense', label: 'مصروفات' },
                          { key: 'transfer_in', label: 'تحويل وارد' },
                          { key: 'transfer_out', label: 'تحويل صادر' }
                        ].map(f => (
                          <button
                            key={f.key}
                            onClick={() => setOperationsTypeFilter(f.key)}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              operationsTypeFilter === f.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Operations Table */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {isLoadingOperations ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                          <span className="text-gray-400">جاري تحميل المعاملات...</span>
                        </div>
                      ) : filteredOperations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                          <div className="text-6xl mb-4">🔄</div>
                          <p className="text-gray-400 text-lg mb-2">لا توجد معاملات</p>
                          <p className="text-gray-500 text-sm">الإيداعات والسحوبات والتحويلات ستظهر هنا</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-auto scrollbar-hide">
                          <ResizableTable
                            className="h-full w-full"
                            columns={[
                              {
                                id: 'index',
                                header: '#',
                                accessor: '#',
                                width: 50,
                                render: (_v: any, _item: any, index: number) => <span className="text-gray-400">{index + 1}</span>
                              },
                              {
                                id: 'date',
                                header: 'التاريخ',
                                accessor: 'created_at',
                                width: 100,
                                render: (value: string) => <span className="text-white">{value ? new Date(value).toLocaleDateString('en-GB') : '-'}</span>
                              },
                              {
                                id: 'time',
                                header: 'الساعة',
                                accessor: 'created_at',
                                width: 90,
                                render: (value: string) => <span className="text-blue-400">{value ? new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span>
                              },
                              {
                                id: 'type',
                                header: 'نوع العملية',
                                accessor: 'transaction_type',
                                width: 120,
                                render: (value: string) => {
                                  const typeMap: { [key: string]: { text: string; color: string; bg: string } } = {
                                    'deposit': { text: 'إضافه', color: 'text-green-400', bg: 'bg-green-600/20 border-green-600' },
                                    'withdrawal': { text: 'سحب', color: 'text-red-400', bg: 'bg-red-600/20 border-red-600' },
                                    'expense': { text: 'مصروفات', color: 'text-red-400', bg: 'bg-red-600/20 border-red-600' },
                                    'transfer_in': { text: 'تحويل وارد', color: 'text-blue-400', bg: 'bg-blue-600/20 border-blue-600' },
                                    'transfer_out': { text: 'تحويل صادر', color: 'text-orange-400', bg: 'bg-orange-600/20 border-orange-600' }
                                  }
                                  const typeInfo = typeMap[value] || { text: value || '-', color: 'text-gray-400', bg: 'bg-gray-600/20 border-gray-600' }
                                  return <span className={`px-2 py-1 rounded text-xs font-medium border ${typeInfo.bg} ${typeInfo.color}`}>{typeInfo.text}</span>
                                }
                              },
                              {
                                id: 'amount',
                                header: 'المبلغ',
                                accessor: 'amount',
                                width: 130,
                                render: (value: number) => {
                                  const isPositive = (value || 0) >= 0
                                  return <span className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{isPositive ? '+' : ''}{formatPrice(value || 0, 'system')}</span>
                                }
                              },
                              {
                                id: 'drawer_name',
                                header: 'الدرج',
                                accessor: 'safe_name',
                                width: 120,
                                render: (value: string) => <span className="text-purple-400">{value || '-'}</span>
                              },
                              {
                                id: 'related',
                                header: 'من/إلى',
                                accessor: 'related_safe_name',
                                width: 120,
                                render: (value: string, item: any) => {
                                  if (item.transaction_type !== 'transfer_in' && item.transaction_type !== 'transfer_out') return <span className="text-gray-500">-</span>
                                  return <span className="text-cyan-400">{value || '-'}</span>
                                }
                              },
                              {
                                id: 'notes',
                                header: 'البيان',
                                accessor: 'notes',
                                width: 200,
                                render: (value: string) => <span className="text-gray-400">{value || '-'}</span>
                              },
                              {
                                id: 'employee',
                                header: 'الموظف',
                                accessor: 'performed_by',
                                width: 120,
                                render: (value: string) => <span className="text-yellow-400">{value || '-'}</span>
                              }
                            ]}
                            data={filteredOperations}
                          />
                          {/* Sentinel element for infinite scroll */}
                          <div ref={operationsSentinelRef} className="h-4" />
                          {isLoadingMoreOperations && (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                              <span className="text-gray-400 text-sm">جاري تحميل المزيد...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Delete/Cancel Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDeleteTransaction}
        isDeleting={isDeleting}
        title={transactionToDelete?.transactionType === 'purchase' ? 'تأكيد حذف فاتورة الشراء' : 'تأكيد إلغاء فاتورة البيع'}
        message={transactionToDelete?.transactionType === 'purchase' ? 'هل أنت متأكد أنك تريد حذف هذه فاتورة الشراء؟' : 'هل أنت متأكد أنك تريد إلغاء هذه الفاتورة؟ سيتم إرجاع المخزون وعكس معاملات الخزنة.'}
        itemName={transactionToDelete ? `فاتورة رقم: ${transactionToDelete.invoice_number} (${transactionToDelete.transactionType === 'purchase' ? 'شراء' : 'بيع'})` : ''}
        variant={transactionToDelete?.transactionType === 'sale' ? 'cancel' : 'delete'}
      />

      {/* Date Filter Modal */}
      <SimpleDateFilterModal
        isOpen={showDateFilter}
        onClose={() => setShowDateFilter(false)}
        onDateFilterChange={(filter) => {
          setDateFilter(filter)
          saveDateFilterPreferences(filter)
        }}
        currentFilter={dateFilter}
      />

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-[#2B3544] rounded-lg w-full max-w-md mx-4 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <h3 className="text-white font-medium text-lg">
                {withdrawType === 'deposit' ? 'إيداع في الخزنة' : withdrawType === 'transfer' ? 'تحويل من الخزنة' : 'سحب من الخزنة'}
              </h3>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current Balance Display */}
              <div className="bg-purple-600/20 border border-purple-500 rounded p-3 text-center">
                <div className="text-purple-300 text-sm">
                  {safe.supports_drawers && childSafes.length > 0 && withdrawSourceId
                    ? (withdrawSourceId === 'all' ? 'الرصيد الإجمالي' : withdrawSourceId === 'transfers' ? 'رصيد التحويلات' : `رصيد ${childSafes.find(c => c.id === withdrawSourceId)?.name || 'الدرج'}`)
                    : (!safe.supports_drawers && safe.safe_type !== 'sub' && nonDrawerTransferBalance !== 0 && withdrawSourceId)
                      ? (withdrawSourceId === 'safe-only' ? 'رصيد الخزنة' : withdrawSourceId === 'transfers' ? 'رصيد التحويلات' : withdrawSourceId === 'all' ? 'الرصيد الإجمالي' : 'الرصيد الحالي')
                      : 'الرصيد الحالي'}
                </div>
                <div className="text-white text-xl font-bold">{formatPrice(
                  safe.supports_drawers && childSafes.length > 0 && withdrawSourceId
                    ? (withdrawSourceId === 'all' ? safeBalance : withdrawSourceId === 'transfers'
                      ? mainSafeOwnBalance
                      : (childSafes.find(c => c.id === withdrawSourceId)?.balance || 0))
                    : (!safe.supports_drawers && safe.safe_type !== 'sub' && nonDrawerTransferBalance !== 0 && withdrawSourceId)
                      ? (withdrawSourceId === 'safe-only' ? Math.max(0, safeBalance - nonDrawerTransferBalance) : withdrawSourceId === 'transfers' ? nonDrawerTransferBalance : safeBalance)
                      : safeBalance
                , 'system')}</div>
              </div>

              {/* Operation Type */}
              <div>
                <label className="block text-gray-300 text-sm mb-2 text-right">نوع العملية</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setWithdrawType('withdraw'); setShowWithdrawSuggestions(false) }}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                      withdrawType === 'withdraw'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    سحب
                  </button>
                  <button
                    onClick={() => { setWithdrawType('deposit'); setShowWithdrawSuggestions(false) }}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                      withdrawType === 'deposit'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    إيداع
                  </button>
                  <button
                    onClick={() => { setWithdrawType('transfer'); setShowWithdrawSuggestions(false) }}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                      withdrawType === 'transfer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    تحويل
                  </button>
                </div>
              </div>

              {/* Source Selection - For safes with drawers OR non-drawer safes with transfers */}
              {(() => {
                const isNonDrawerWithTransfers = !safe.supports_drawers && safe.safe_type !== 'sub'
                if (safe.supports_drawers && childSafes.length > 0) {
                  return (
                    <div>
                      <label className="block text-gray-300 text-sm mb-2 text-right">
                        {withdrawType === 'deposit' ? 'الإيداع في' : 'السحب من'}
                      </label>
                      <select
                        value={withdrawSourceId}
                        onChange={(e) => { setWithdrawSourceId(e.target.value); setShowWithdrawSuggestions(false); setWithdrawAllMode(null); setWithdrawAmount('') }}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر المصدر...</option>
                        <option value="all">الكل ({formatPrice(safeBalance, 'system')})</option>
                        {childSafes.map(drawer => (
                          <option key={drawer.id} value={drawer.id}>
                            {drawer.name} ({formatPrice(drawer.balance, 'system')})
                          </option>
                        ))}
                        <option value="transfers">
                          التحويلات ({formatPrice(mainSafeOwnBalance, 'system')})
                        </option>
                      </select>
                    </div>
                  )
                } else if (isNonDrawerWithTransfers) {
                  return (
                    <div>
                      <label className="block text-gray-300 text-sm mb-2 text-right">
                        {withdrawType === 'deposit' ? 'الإيداع في' : 'السحب من'}
                      </label>
                      <select
                        value={withdrawSourceId}
                        onChange={(e) => { setWithdrawSourceId(e.target.value); setShowWithdrawSuggestions(false); setWithdrawAllMode(null); setWithdrawAmount('') }}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر المصدر...</option>
                        {withdrawType !== 'deposit' && (
                          <option value="all">الكل ({formatPrice(safeBalance, 'system')})</option>
                        )}
                        <option value="safe-only">
                          الخزنة ({formatPrice(Math.max(0, safeBalance - nonDrawerTransferBalance), 'system')})
                        </option>
                        <option value="transfers">
                          التحويلات ({formatPrice(nonDrawerTransferBalance, 'system')})
                        </option>
                      </select>
                    </div>
                  )
                }
                return null
              })()}

              {/* Target Safe (if transfer) */}
              {withdrawType === 'transfer' && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2 text-right">الخزنة المستهدفة</label>
                  <select
                    value={targetSafeId}
                    onChange={(e) => setTargetSafeId(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر الخزنة...</option>
                    {allSafes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount - different UI when "الكل" is selected */}
              {withdrawSourceId === 'all' && (withdrawType === 'withdraw' || withdrawType === 'transfer') ? (
                <div>
                  <label className="block text-gray-300 text-sm mb-2 text-right">{withdrawType === 'withdraw' ? 'اختر طريقة السحب' : 'اختر طريقة التحويل'}</label>
                  <div className="space-y-2">
                    {(() => {
                      const totalReserves = roundMoney(reserves.reduce((sum, r) => sum + r.amount, 0))
                      const isNonDrawerSafe = !safe.supports_drawers && safe.safe_type !== 'sub' && nonDrawerTransferBalance > 0
                      const balanceExcludingReserves = isNonDrawerSafe
                        ? roundMoney(Math.max(0, Math.max(0, safeBalance - nonDrawerTransferBalance) - totalReserves) + Math.min(nonDrawerTransferBalance, safeBalance))
                        : Math.max(0, safeBalance - totalReserves)
                      return (
                        <>
                          <button
                            onClick={() => {
                              setWithdrawAllMode('full')
                              setWithdrawAmount(roundMoney(safeBalance).toString())
                            }}
                            className={`w-full text-right px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                              withdrawAllMode === 'full'
                                ? 'bg-red-600/30 border-red-500 text-red-300'
                                : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                            }`}
                          >
                            {withdrawType === 'withdraw' ? 'سحب' : 'تحويل'} الرصيد بالكامل ({formatPrice(safeBalance, 'system')})
                          </button>
                          {totalReserves > 0 && (
                            <button
                              onClick={() => {
                                setWithdrawAllMode('excluding_reserves')
                                setWithdrawAmount(roundMoney(balanceExcludingReserves).toString())
                              }}
                              className={`w-full text-right px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                                withdrawAllMode === 'excluding_reserves'
                                  ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                                  : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                              }`}
                            >
                              {withdrawType === 'withdraw' ? 'سحب' : 'تحويل'} الرصيد بدون المجنب ({formatPrice(balanceExcludingReserves, 'system')})
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  {/* Show selected amount confirmation */}
                  {withdrawAllMode && withdrawAmount && (
                    <div className="mt-3 bg-green-600/20 border border-green-600 rounded p-2.5 text-center">
                      <span className="text-green-300 text-sm">المبلغ: {formatPrice(parseFloat(withdrawAmount), 'system')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 text-sm mb-2 text-right">المبلغ</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    min="0"
                    max={withdrawType === 'deposit' ? undefined : (
                      safe.supports_drawers && childSafes.length > 0 && withdrawSourceId
                        ? (withdrawSourceId === 'transfers' ? mainSafeOwnBalance : (childSafes.find(c => c.id === withdrawSourceId)?.balance || 0))
                        : (!safe.supports_drawers && safe.safe_type !== 'sub' && nonDrawerTransferBalance !== 0 && withdrawSourceId)
                          ? (withdrawSourceId === 'safe-only' ? Math.max(0, safeBalance - nonDrawerTransferBalance) : withdrawSourceId === 'transfers' ? nonDrawerTransferBalance : safeBalance)
                          : safeBalance
                    )}
                    step="0.01"
                  />
                  {/* اقتراحات السحب - فقط للسحب والتحويل */}
                  {withdrawType !== 'deposit' && (() => {
                    const isNonDrawerSrc = !safe.supports_drawers && safe.safe_type !== 'sub'
                    const sourceBalanceForButton = roundMoney(safe.supports_drawers && childSafes.length > 0 && withdrawSourceId
                      ? (withdrawSourceId === 'transfers' ? mainSafeOwnBalance : (childSafes.find(c => c.id === withdrawSourceId)?.balance || 0))
                      : (isNonDrawerSrc && withdrawSourceId)
                        ? (withdrawSourceId === 'safe-only' ? Math.max(0, safeBalance - nonDrawerTransferBalance) : withdrawSourceId === 'transfers' ? nonDrawerTransferBalance : safeBalance)
                        : safeBalance)
                    const sourceReserves = roundMoney(safe.supports_drawers && childSafes.length > 0 && withdrawSourceId
                      ? reserves.filter(r => r.record_id === (withdrawSourceId === 'transfers' ? safe.id : withdrawSourceId)).reduce((sum, r) => sum + r.amount, 0)
                      : reserves.reduce((sum, r) => sum + r.amount, 0))
                    const balanceExcludingReserves = Math.max(0, sourceBalanceForButton - sourceReserves)
                    return sourceBalanceForButton > 0 ? (
                      <div className="mt-2 relative">
                        <button
                          onClick={() => setShowWithdrawSuggestions(!showWithdrawSuggestions)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          اقتراحات
                          <svg className={`w-3 h-3 transition-transform ${showWithdrawSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showWithdrawSuggestions && (
                          <div className="mt-1 bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                            <button
                              onClick={() => { setWithdrawAmount(roundMoney(sourceBalanceForButton).toString()); setShowWithdrawSuggestions(false) }}
                              className="w-full text-right text-xs text-gray-200 hover:bg-gray-600 px-3 py-2 transition-colors"
                            >
                              سحب الرصيد بالكامل ({formatPrice(sourceBalanceForButton, 'system')})
                            </button>
                            {sourceReserves > 0 && (
                              <button
                                onClick={() => { setWithdrawAmount(roundMoney(balanceExcludingReserves).toString()); setShowWithdrawSuggestions(false) }}
                                className="w-full text-right text-xs text-gray-200 hover:bg-gray-600 px-3 py-2 border-t border-gray-600 transition-colors"
                              >
                                سحب الرصيد بدون المجنب ({formatPrice(balanceExcludingReserves, 'system')})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-gray-300 text-sm mb-2 text-right">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-gray-600">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || (withdrawSourceId === 'all' && withdrawType !== 'deposit' && !withdrawAllMode)}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  withdrawType === 'deposit'
                    ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-800 disabled:cursor-not-allowed'
                    : withdrawType === 'transfer'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800 disabled:cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-800 disabled:cursor-not-allowed'
                }`}
              >
                {isWithdrawing ? 'جاري...' : withdrawType === 'deposit' ? 'إيداع' : withdrawType === 'transfer' ? 'تحويل' : 'سحب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Add/Edit Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReserveModal(false)} />
          <div className="relative bg-[#1F2937] rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <button onClick={() => setShowReserveModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
              <h3 className="text-white font-bold text-lg">
                {reserveModalMode === 'add' ? 'تجنيب مبلغ' : 'تعديل التجنيب'}
              </h3>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Drawer selector - only for safes with drawers and in add mode */}
              {reserveModalMode === 'add' && safe.supports_drawers && childSafes.length > 0 && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2 text-right">الدرج</label>
                  <select
                    value={reserveSourceId}
                    onChange={(e) => setReserveSourceId(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                  >
                    {childSafes.map(drawer => (
                      <option key={drawer.id} value={drawer.id}>
                        {drawer.name} ({formatPrice(drawer.balance, 'system')})
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-500 text-xs mt-1 text-right">
                    المتاح للتجنيب: {formatPrice(getDrawerAvailableBalance(reserveSourceId), 'system')}
                  </p>
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="block text-gray-300 text-sm mb-2 text-right">المبلغ</label>
                <input
                  type="number"
                  value={reserveAmount}
                  onChange={(e) => setReserveAmount(e.target.value)}
                  placeholder="أدخل المبلغ..."
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>

              {/* Notes input */}
              <div>
                <label className="block text-gray-300 text-sm mb-2 text-right">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  placeholder="مثال: فكة لبكرة..."
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-gray-600">
              <button
                onClick={() => setShowReserveModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveReserve}
                disabled={isSavingReserve || !reserveAmount || parseFloat(reserveAmount) <= 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors disabled:bg-orange-800 disabled:cursor-not-allowed"
              >
                {isSavingReserve ? 'جاري...' : reserveModalMode === 'add' ? 'تجنيب' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reserve Confirmation */}
      <ConfirmDeleteModal
        isOpen={showDeleteReserveModal}
        onClose={() => { setShowDeleteReserveModal(false); setReserveToDelete(null) }}
        onConfirm={confirmDeleteReserve}
        isDeleting={isDeletingReserve}
        title="حذف التجنيب"
        message="هل أنت متأكد؟ سيتم إضافة هذا المبلغ ضمن نقود الدرج"
        itemName={reserveToDelete ? formatPrice(reserveToDelete.amount, 'system') : ''}
      />

      {/* Context Menu for Statement */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        items={createEditContextMenuItems(handleEditStatement)}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={isEditInvoiceModalOpen}
        onClose={() => {
          setIsEditInvoiceModalOpen(false)
          setStatementToEdit(null)
        }}
        onInvoiceUpdated={handleInvoiceUpdated}
        saleId={statementToEdit?.sale_id || null}
        initialRecordId={safe?.id}  // الخزنة الحالية هي الخزنة المعروضة
      />
    </>
  )
}