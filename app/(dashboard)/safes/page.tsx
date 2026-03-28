'use client'

import {
  PlusIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  PencilIcon,
  TrashIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase/client'
import Sidebar from '../../components/layout/Sidebar'
import TopHeader from '../../components/layout/TopHeader'
import ContextMenu, { createEditContextMenuItems } from '../../components/ContextMenu'
import type { DateFilter } from '../../components/SimpleDateFilterModal'

const SafeDetailsModal = dynamic(() => import('../../components/SafeDetailsModal'), { ssr: false })
const AddSafeModal = dynamic(() => import('../../components/AddSafeModal'), { ssr: false })
const EditSafeModal = dynamic(() => import('../../components/EditSafeModal'), { ssr: false })
const AddPaymentMethodModal = dynamic(() => import('../../components/AddPaymentMethodModal'), { ssr: false })
const EditPaymentMethodModal = dynamic(() => import('../../components/EditPaymentMethodModal'), { ssr: false })
const SimpleDateFilterModal = dynamic(() => import('../../components/SimpleDateFilterModal'), { ssr: false })
const EditInvoiceModal = dynamic(() => import('../../components/EditInvoiceModal'), { ssr: false })
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import { useOfflineStatus } from '../../lib/hooks/useOfflineStatus'
import { useOfflineData } from '../../lib/hooks/useOfflineData'
import { useInfiniteTransactions, CashDrawerTransaction } from '../../lib/hooks/useInfiniteTransactions'
import { useScrollDetection } from '../../lib/hooks/useScrollDetection'
import { getDateRangeFromFilter, getDateFilterLabel } from '../../lib/utils/dateFilters'
import { getAllPendingSales } from '../../lib/offline/db'
import type { PendingSale } from '../../lib/offline/types'
import { useActivityLogger } from "@/app/lib/hooks/useActivityLogger"

// Types
interface Safe {
  id: string
  name: string
  is_primary: boolean | null
  is_active: boolean | null
  branch_id: string | null
  created_at: string | null
  updated_at: string | null
  parent_id: string | null
  safe_type: string | null
  supports_drawers: boolean | null
  show_transfers?: boolean | null
}

// CashDrawerTransaction is now imported from useInfiniteTransactions hook

interface PaymentMethod {
  id: string
  name: string
  is_default: boolean | null
  is_active: boolean | null
  is_physical: boolean | null
  created_at: string | null
  updated_at: string | null
}

type TabType = 'safes' | 'records' | 'payment_methods'
type TransactionType = 'all' | 'sale' | 'return' | 'withdrawal' | 'deposit' | 'adjustment' | 'transfer'

export default function SafesPage() {
  const formatPrice = useFormatPrice()
  const activityLog = useActivityLogger()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Offline support
  const { isOnline, isOfflineReady, pendingSalesCount } = useOfflineStatus()
  const { data: offlineData } = useOfflineData()
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([])
  const [isUsingOfflineData, setIsUsingOfflineData] = useState(false)

  // Tab Management
  const [activeTab, setActiveTab] = useState<TabType>('safes')

  // Safes Tab State
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSafeDetailsModalOpen, setIsSafeDetailsModalOpen] = useState(false)
  const [isAddSafeModalOpen, setIsAddSafeModalOpen] = useState(false)
  const [isEditSafeModalOpen, setIsEditSafeModalOpen] = useState(false)
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null)
  const [safeToEdit, setSafeToEdit] = useState<Safe | null>(null)
  const [safes, setSafes] = useState<Safe[]>([])
  const [safeBalances, setSafeBalances] = useState<Record<string, number>>({})
  const [transferBalances, setTransferBalances] = useState<Record<string, number>>({})
  const [activeSafesCount, setActiveSafesCount] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [safesSearchTerm, setSafesSearchTerm] = useState('')
  const [addSubSafeParent, setAddSubSafeParent] = useState<Safe | null>(null)
  // Records Tab State - Filter configurations
  const [transactionFilters, setTransactionFilters] = useState<{
    safeIds: string[]
    transactionType: TransactionType
    paymentMethod: string
    dateFilter: DateFilter
  }>({
    safeIds: [],
    transactionType: 'all',
    paymentMethod: 'all',
    dateFilter: { type: 'all' }
  })

  // Multi-select dropdown state
  const [isSafeFilterOpen, setIsSafeFilterOpen] = useState(false)
  const safeFilterRef = useRef<HTMLDivElement>(null)

  // Combined safes picker state (for multi-safe view in SafeDetailsModal)
  const [combinedSafeIds, setCombinedSafeIds] = useState<string[]>([])
  const [isCombinedPickerOpen, setIsCombinedPickerOpen] = useState(false)
  const combinedPickerRef = useRef<HTMLDivElement>(null)

  // Payment method breakdown for safes tab
  const [paymentMethodBreakdown, setPaymentMethodBreakdown] = useState<Record<string, number>>({})
  const [showDateFilterModal, setShowDateFilterModal] = useState(false)
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('')

  // Use infinite scroll hook for transactions
  const {
    transactions,
    isLoading: isLoadingTransactions,
    isLoadingMore: isLoadingMoreTransactions,
    hasMore: hasMoreTransactions,
    loadMore: loadMoreTransactions,
    refresh: refreshTransactions
  } = useInfiniteTransactions({
    recordIds: transactionFilters.safeIds.length > 0 ? transactionFilters.safeIds : undefined,
    transactionType: transactionFilters.transactionType,
    paymentMethod: transactionFilters.paymentMethod,
    dateFilter: transactionFilters.dateFilter,
    enabled: activeTab === 'records',
    pageSize: 200,
    safes: safes
  })

  // Scroll detection for infinite scroll
  const { sentinelRef: transactionSentinelRef } = useScrollDetection({
    onLoadMore: loadMoreTransactions,
    enabled: hasMoreTransactions && !isLoadingMoreTransactions && activeTab === 'records',
    isLoading: isLoadingMoreTransactions
  })

  // Offline transactions state (used when in offline mode)
  const [offlineTransactions, setOfflineTransactions] = useState<CashDrawerTransaction[]>([])

  // Payment Methods Tab State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isAddPaymentMethodModalOpen, setIsAddPaymentMethodModalOpen] = useState(false)
  const [isEditPaymentMethodModalOpen, setIsEditPaymentMethodModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [paymentMethodSearchTerm, setPaymentMethodSearchTerm] = useState('')

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    transaction: CashDrawerTransaction | null
  }>({ isOpen: false, x: 0, y: 0, transaction: null })

  // Edit Invoice Modal State
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState<CashDrawerTransaction | null>(null)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // ==================== Safes Tab Functions ====================
  const openSafeDetails = (safe: Safe) => {
    setSelectedSafe(safe)
    setIsSafeDetailsModalOpen(true)
  }

  const closeSafeDetails = () => {
    setIsSafeDetailsModalOpen(false)
    setSelectedSafe(null)
    setCombinedSafeIds([])
  }

  const openAddSafeModal = () => {
    setIsAddSafeModalOpen(true)
  }

  const closeAddSafeModal = () => {
    setIsAddSafeModalOpen(false)
  }

  const openEditSafeModal = (safe: Safe) => {
    setSafeToEdit(safe)
    setIsEditSafeModalOpen(true)
  }

  const closeEditSafeModal = () => {
    setIsEditSafeModalOpen(false)
    setSafeToEdit(null)
  }

  const handleDeleteSafe = async (safe: Safe) => {
    // Check for child safes (sub-safes/drawers)
    if (safe.safe_type === 'main') {
      const childSafes = safes.filter(s => s.parent_id === safe.id)
      if (childSafes.length > 0) {
        alert(`لا يمكن حذف الخزنة "${safe.name}" لأنها تحتوي على ${childSafes.length} درج\n\nيجب حذف الأدراج أولاً`)
        return
      }
    }

    try {
      const { data: drawer, error: drawerError } = await supabase
        .from('cash_drawers')
        .select('current_balance')
        .eq('record_id', safe.id)
        .single()

      if (drawerError && drawerError.code !== 'PGRST116') {
        console.error('Error checking safe balance:', drawerError)
        alert('حدث خطأ أثناء التحقق من رصيد الخزنة')
        return
      }

      const balance = drawer?.current_balance || 0
      if (balance !== 0) {
        alert(`لا يمكن حذف الخزنة "${safe.name}" لأنها تحتوي على رصيد (${formatPrice(balance)})\n\nيجب تفريغ الخزنة أولاً قبل حذفها`)
        return
      }

      if (window.confirm(`هل أنت متأكد من حذف ${safe.safe_type === 'sub' ? 'الدرج' : 'الخزنة'} "${safe.name}"؟`)) {
        const { error } = await supabase
          .from('records')
          .delete()
          .eq('id', safe.id)

        if (error) {
          console.error('Error deleting safe:', error)
          alert('حدث خطأ أثناء حذف الخزنة')
          return
        }

        activityLog({ entityType: 'cash_drawer', actionType: 'delete', entityId: safe.id, entityName: safe.name, description: 'حذف خزنة' })
        fetchSafes()
        if (selectedSafe?.id === safe.id) {
          setSelectedSafe(null)
        }
      }
    } catch (error) {
      console.error('Error deleting safe:', error)
      alert('حدث خطأ أثناء حذف الخزنة')
    }
  }

  const fetchSafes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching safes:', error)
        return
      }

      setSafes(data || [])
      setActiveSafesCount(data?.filter((safe: Safe) => safe.is_active).length || 0)

      // Fetch per-safe balances from cash_drawers
      const { data: drawers, error: drawersError } = await supabase
        .from('cash_drawers')
        .select('record_id, current_balance')

      if (!drawersError && drawers) {
        const balanceMap: Record<string, number> = {}
        let total = 0
        drawers.forEach((d: any) => {
          if (d.record_id) {
            balanceMap[d.record_id] = d.current_balance || 0
            total += d.current_balance || 0
          }
        })
        setSafeBalances(balanceMap)
        setTotalBalance(total)
      }

      // Fetch transfer balances for main safes (to show transfers row on cards)
      if (data) {
        const mainSafeIds = data.filter((s: any) => s.safe_type !== 'sub' && s.show_transfers !== false).map((s: any) => s.id)
        if (mainSafeIds.length > 0) {
          const { data: txs } = await supabase
            .from('cash_drawer_transactions')
            .select('record_id, transaction_type, amount')
            .in('record_id', mainSafeIds)
            .in('transaction_type', ['transfer_in', 'transfer_out'])
            .order('created_at', { ascending: true })

          if (txs) {
            const tBal: Record<string, number> = {}
            txs.forEach((t: any) => {
              const amt = parseFloat(String(t.amount)) || 0
              if (!tBal[t.record_id]) tBal[t.record_id] = 0
              if (t.transaction_type === 'transfer_in') {
                tBal[t.record_id] += amt
              } else {
                tBal[t.record_id] = Math.max(0, tBal[t.record_id] - amt)
              }
            })
            // Round values
            Object.keys(tBal).forEach(k => { tBal[k] = Math.round(tBal[k] * 100) / 100 })
            setTransferBalances(tBal)
          }
        }
      }

      // Fetch payment method breakdown from today's transactions
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: todayTxs } = await supabase
        .from('cash_drawer_transactions')
        .select('payment_method, amount')
        .gte('created_at', todayStart.toISOString())
        .in('transaction_type', ['sale'])

      if (todayTxs) {
        const breakdown: Record<string, number> = {}
        todayTxs.forEach((tx: any) => {
          const method = tx.payment_method || 'cash'
          breakdown[method] = (breakdown[method] || 0) + (tx.amount || 0)
        })
        setPaymentMethodBreakdown(breakdown)
      }
    } catch (error) {
      console.error('Error fetching safes:', error)
    }
  }, [])

  const handleSafeAdded = () => {
    fetchSafes()
    activityLog({ entityType: 'cash_drawer', actionType: 'create', description: 'أضاف خزنة جديدة' })
  }

  const handleSafeUpdated = () => {
    fetchSafes()
    activityLog({ entityType: 'cash_drawer', actionType: 'update', description: 'عدّل بيانات خزنة' })
  }

  // ==================== Records Tab Functions ====================
  // getDateRangeFromFilter and getDateFilterLabel are now imported from @/lib/utils/dateFilters
  // fetchTransactions is now replaced by useInfiniteTransactions hook

  const getTransactionTypeBadge = (type: string | null) => {
    const styles: Record<string, { bg: string, text: string, label: string }> = {
      'sale': { bg: 'bg-dash-accent-green-subtle', text: 'text-dash-accent-green', label: 'بيع' },
      'return': { bg: 'bg-dash-accent-orange-subtle', text: 'text-dash-accent-orange', label: 'مرتجع' },
      'withdrawal': { bg: 'bg-dash-accent-red-subtle', text: 'text-dash-accent-red', label: 'سحب' },
      'deposit': { bg: 'bg-dash-accent-green-subtle', text: 'text-dash-accent-green', label: 'إضافه' },
      'expense': { bg: 'bg-dash-accent-red-subtle', text: 'text-dash-accent-red', label: 'مصروفات' },
      'adjustment': { bg: 'bg-dash-accent-purple-subtle', text: 'text-dash-accent-purple', label: 'تسوية' },
      'transfer_in': { bg: 'bg-dash-accent-cyan-subtle', text: 'text-dash-accent-cyan', label: 'تحويل' },
      'transfer_out': { bg: 'bg-dash-accent-cyan-subtle', text: 'text-dash-accent-cyan', label: 'تحويل' }
    }

    const style = styles[type || ''] || { bg: 'bg-[var(--dash-bg-raised)]', text: 'text-[var(--dash-text-secondary)]', label: type || '-' }

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    )
  }

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-'
    const isPositive = amount >= 0
    return (
      <span className={isPositive ? 'text-dash-accent-green' : 'text-dash-accent-red'}>
        {isPositive ? '+' : ''}{formatPrice(amount)}
      </span>
    )
  }

  // ==================== Payment Methods Tab Functions ====================
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching payment methods:', error)
        return
      }

      setPaymentMethods(data || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
  }, [])

  const openAddPaymentMethodModal = () => {
    setIsAddPaymentMethodModalOpen(true)
  }

  const closeAddPaymentMethodModal = () => {
    setIsAddPaymentMethodModalOpen(false)
  }

  const openEditPaymentMethodModal = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod)
    setIsEditPaymentMethodModalOpen(true)
  }

  const closeEditPaymentMethodModal = () => {
    setIsEditPaymentMethodModalOpen(false)
    setSelectedPaymentMethod(null)
  }

  const handleDeletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    if (paymentMethod.name.toLowerCase() === 'cash') {
      alert('لا يمكن حذف طريقة الدفع الأساسية "Cash"')
      return
    }

    if (window.confirm(`هل أنت متأكد من حذف طريقة الدفع "${paymentMethod.name}"؟`)) {
      try {
        const { error } = await supabase
          .from('payment_methods')
          .delete()
          .eq('id', paymentMethod.id)

        if (error) {
          console.error('Error deleting payment method:', error)
          alert('حدث خطأ أثناء حذف طريقة الدفع')
          return
        }

        fetchPaymentMethods()
        activityLog({ entityType: 'payment_method', actionType: 'delete', entityId: paymentMethod.id, entityName: paymentMethod.name, description: 'حذف طريقة دفع' })
      } catch (error) {
        console.error('Error deleting payment method:', error)
        alert('حدث خطأ أثناء حذف طريقة الدفع')
      }
    }
  }

  const handlePaymentMethodAdded = () => {
    fetchPaymentMethods()
    activityLog({ entityType: 'payment_method', actionType: 'create', description: 'أضاف طريقة دفع جديدة' })
  }

  const handlePaymentMethodUpdated = () => {
    fetchPaymentMethods()
  }

  // ==================== Context Menu Functions ====================
  const handleContextMenu = (e: React.MouseEvent, tx: CashDrawerTransaction) => {
    e.preventDefault()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      transaction: tx
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, transaction: null })
  }

  const handleEditTransaction = () => {
    if (contextMenu.transaction) {
      setTransactionToEdit(contextMenu.transaction)
      setIsEditInvoiceModalOpen(true)
    }
    closeContextMenu()
  }

  const handleInvoiceUpdated = () => {
    // إعادة تحميل السجلات بعد التعديل
    refreshTransactions()
    fetchSafes() // لتحديث الأرصدة
  }

  // ==================== Date/Time Formatting ====================
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ==================== Filtered Data ====================
  const filteredSafes = safes.filter(safe =>
    safe.name.toLowerCase().includes(safesSearchTerm.toLowerCase())
  )

  // Convert pending sales to transaction format for display
  // MOVED HERE - must be defined before filteredTransactions
  const pendingSalesAsTransactions: CashDrawerTransaction[] = pendingSales.map(sale => ({
    id: `pending_${sale.local_id}`,
    drawer_id: null,
    record_id: sale.record_id,
    transaction_type: sale.invoice_type === 'Sale Return' ? 'return' : 'sale',
    amount: sale.invoice_type === 'Sale Return' ? -sale.total_amount : sale.total_amount,
    balance_after: null,
    sale_id: null,
    notes: `فاتورة معلقة: ${sale.temp_invoice_number}`,
    performed_by: sale.user_name,
    created_at: sale.created_at,
    safe_name: sale.record_name || 'لا يوجد',
    customer_name: sale.customer_name
  }))

  // Use hook transactions when online, offline transactions when offline
  // MOVED HERE - must be defined before filteredTransactions
  const activeTransactions = isUsingOfflineData ? offlineTransactions : transactions
  const allTransactions = [...pendingSalesAsTransactions, ...activeTransactions]

  // Use allTransactions for filtering (includes pending sales when offline)
  const filteredTransactions = allTransactions.filter(tx =>
    (tx.notes?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) || false) ||
    (tx.performed_by?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) || false) ||
    (tx.safe_name?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) || false) ||
    (tx.customer_name?.toLowerCase().includes(transactionSearchTerm.toLowerCase()) || false)
  )

  const filteredPaymentMethods = paymentMethods.filter(method =>
    method.name.toLowerCase().includes(paymentMethodSearchTerm.toLowerCase())
  )

  // ==================== Effects ====================
  // Click-outside handler for safe filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (safeFilterRef.current && !safeFilterRef.current.contains(e.target as Node)) {
        setIsSafeFilterOpen(false)
      }
    }
    if (isSafeFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSafeFilterOpen])

  // Click-outside handler for combined safes picker dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (combinedPickerRef.current && !combinedPickerRef.current.contains(e.target as Node)) {
        setIsCombinedPickerOpen(false)
      }
    }
    if (isCombinedPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCombinedPickerOpen])

  // Initial data fetch
  useEffect(() => {
    fetchSafes()
    fetchPaymentMethods()
  }, [fetchSafes, fetchPaymentMethods])



  // Transaction fetching and filter handling is now managed by useInfiniteTransactions hook
  // The hook automatically:
  // - Fetches when tab becomes active (enabled: activeTab === 'records')
  // - Re-fetches when filters change (reactively based on transactionFilters)

  // ==================== Offline Support Effects ====================
  // Load pending sales from IndexedDB
  useEffect(() => {
    const loadPendingSales = async () => {
      try {
        const sales = await getAllPendingSales()
        setPendingSales(sales.filter(s => s.sync_status === 'pending' || s.sync_status === 'failed'))
      } catch (error) {
        console.error('Failed to load pending sales:', error)
      }
    }
    loadPendingSales()

    // Refresh periodically
    const interval = setInterval(loadPendingSales, 5000)
    return () => clearInterval(interval)
  }, [])

  // Handle offline mode - use cached data when offline
  useEffect(() => {
    if (!isOnline && isOfflineReady) {
      setIsUsingOfflineData(true)
      // Use offline data for safes
      if (offlineData.records.length > 0) {
        const offlineSafes: Safe[] = offlineData.records.map(r => ({
          id: r.id,
          name: r.name,
          is_primary: false,
          is_active: true,
          branch_id: r.branch_id,
          created_at: null,
          updated_at: null,
          parent_id: (r as any).parent_id || null,
          safe_type: (r as any).safe_type || 'main',
          supports_drawers: (r as any).supports_drawers || false,
          show_transfers: (r as any).show_transfers !== false
        }))
        setSafes(offlineSafes)
        setActiveSafesCount(offlineSafes.length)
      }
      // Use offline data for payment methods
      if (offlineData.paymentMethods.length > 0) {
        const offlineMethods: PaymentMethod[] = offlineData.paymentMethods.map(m => ({
          id: m.id,
          name: m.name,
          is_default: null,
          is_active: m.is_active,
          is_physical: (m as any).is_physical ?? true,
          created_at: null,
          updated_at: null
        }))
        setPaymentMethods(offlineMethods)
      }
      // Use offline data for transactions
      if (offlineData.cashDrawerTransactions.length > 0) {
        const mappedOfflineTransactions: CashDrawerTransaction[] = offlineData.cashDrawerTransactions.map(t => ({
          id: t.id,
          drawer_id: t.drawer_id,
          record_id: t.record_id,
          transaction_type: t.transaction_type,
          amount: t.amount,
          balance_after: t.balance_after,
          sale_id: t.sale_id,
          notes: t.notes,
          performed_by: t.performed_by,
          created_at: t.created_at,
          safe_name: t.record_name,
          customer_name: t.customer_name
        }))
        setOfflineTransactions(mappedOfflineTransactions)
      }
    } else if (isOnline) {
      setIsUsingOfflineData(false)
    }
  }, [isOnline, isOfflineReady, offlineData])

  return (
    <div className="h-screen bg-[var(--dash-bg-surface)] overflow-hidden">
      {/* Top Header */}
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content Container */}
      <div className="h-full pt-12 overflow-y-auto scrollbar-hide bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)]" dir="rtl">
        {/* Header */}
        <div className="bg-[var(--dash-bg-raised)] p-4 flex items-center justify-between border-b border-[var(--dash-border-subtle)]">
          <div className="flex items-center gap-4">
            <BanknotesIcon className="h-6 w-6 text-dash-accent-blue" />
            <h1 className="text-xl font-bold">الخزن والمالية</h1>
            <h1 className="text-xl font-medium text-[var(--dash-text-secondary)]">
              إدارة الخزن والسجلات وطرق الدفع
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Offline Indicator */}
            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-dash-accent-orange-subtle border border-dash-accent-orange rounded-lg">
                <ExclamationTriangleIcon className="h-4 w-4 text-dash-accent-orange" />
                <span className="text-dash-accent-orange text-sm font-medium">وضع عدم الاتصال</span>
              </div>
            )}
            {/* Pending Sales Badge */}
            {pendingSalesCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-dash-accent-orange-subtle border border-dash-accent-orange rounded-lg">
                <CloudIcon className="h-4 w-4 text-dash-accent-orange" />
                <span className="text-dash-accent-orange text-sm font-medium">{pendingSalesCount} فاتورة معلقة</span>
              </div>
            )}
          </div>
        </div>

        {/* Unified Control Bar - Tabs, Filters, Count & Search in ONE row */}
        <div className="px-3 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          {/* Right Section: Tabs + Filters (for records tab) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Tabs */}
            <div className="flex bg-[var(--dash-bg-surface)] rounded-md overflow-hidden w-fit border border-[var(--dash-border-subtle)]">
              <button
                onClick={() => setActiveTab('safes')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'safes'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                <BanknotesIcon className="h-4 w-4" />
                الخزن
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'records'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                <DocumentTextIcon className="h-4 w-4" />
                السجلات
              </button>
              <button
                onClick={() => setActiveTab('payment_methods')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'payment_methods'
                    ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                <CreditCardIcon className="h-4 w-4" />
                طرق الدفع
              </button>
            </div>

            {/* Records Tab Filters */}
            {activeTab === 'records' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Multi-select safe filter */}
                <div className="relative" ref={safeFilterRef}>
                  <button
                    onClick={() => setIsSafeFilterOpen(!isSafeFilterOpen)}
                    className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] px-3 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue text-sm flex items-center gap-2 min-w-[160px]"
                  >
                    <BanknotesIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
                    {transactionFilters.safeIds.length === 0
                      ? 'جميع الخزن'
                      : `${transactionFilters.safeIds.length} خزن محددة`}
                    <ChevronDownIcon className="h-3 w-3 text-[var(--dash-text-muted)] mr-auto" />
                  </button>
                  {isSafeFilterOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg shadow-xl z-50 w-72 max-h-80 overflow-y-auto scrollbar-hide">
                      {/* Select All / Clear All */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--dash-border-subtle)] sticky top-0 bg-[var(--dash-bg-raised)] z-10">
                        <button
                          onClick={() => {
                            const allIds: string[] = ['no_safe']
                            safes.forEach(s => allIds.push(s.id))
                            setTransactionFilters(prev => ({ ...prev, safeIds: allIds }))
                          }}
                          className="text-xs text-dash-accent-blue hover:text-dash-accent-blue"
                        >
                          تحديد الكل
                        </button>
                        <button
                          onClick={() => setTransactionFilters(prev => ({ ...prev, safeIds: [] }))}
                          className="text-xs text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
                        >
                          إلغاء الكل
                        </button>
                      </div>
                      {/* "No Safe" option */}
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--dash-bg-overlay)]/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={transactionFilters.safeIds.includes('no_safe')}
                          onChange={(e) => {
                            setTransactionFilters(prev => ({
                              ...prev,
                              safeIds: e.target.checked
                                ? [...prev.safeIds, 'no_safe']
                                : prev.safeIds.filter(id => id !== 'no_safe')
                            }))
                          }}
                          className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-dash-accent-blue focus:ring-dash-accent-blue"
                        />
                        <span className="text-[var(--dash-text-secondary)] text-sm">لا يوجد</span>
                      </label>
                      {/* Safes list */}
                      {safes.filter(s => s.safe_type !== 'sub').map(mainSafe => {
                        const children = safes.filter(s => s.parent_id === mainSafe.id && s.safe_type === 'sub')
                        const hasDrawers = mainSafe.supports_drawers && children.length > 0
                        return (
                          <div key={mainSafe.id}>
                            <label className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--dash-bg-overlay)]/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={transactionFilters.safeIds.includes(mainSafe.id)}
                                onChange={(e) => {
                                  setTransactionFilters(prev => ({
                                    ...prev,
                                    safeIds: e.target.checked
                                      ? [...prev.safeIds, mainSafe.id]
                                      : prev.safeIds.filter(id => id !== mainSafe.id)
                                  }))
                                }}
                                className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-dash-accent-blue focus:ring-dash-accent-blue"
                              />
                              <span className="text-[var(--dash-text-primary)] text-sm font-medium">{mainSafe.name}</span>
                              <span className="text-[var(--dash-text-disabled)] text-xs mr-auto">{formatPrice(safeBalances[mainSafe.id] || 0)}</span>
                            </label>
                            {/* Drawer children (indented) */}
                            {hasDrawers && children.map(child => (
                              <label key={child.id} className="flex items-center gap-3 px-3 py-1.5 pr-9 hover:bg-[var(--dash-bg-overlay)]/50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={transactionFilters.safeIds.includes(child.id)}
                                  onChange={(e) => {
                                    setTransactionFilters(prev => ({
                                      ...prev,
                                      safeIds: e.target.checked
                                        ? [...prev.safeIds, child.id]
                                        : prev.safeIds.filter(id => id !== child.id)
                                    }))
                                  }}
                                  className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-dash-accent-cyan focus:ring-dash-accent-cyan"
                                />
                                <span className="text-dash-accent-cyan text-xs">{child.name}</span>
                                <span className="text-[var(--dash-text-disabled)] text-xs mr-auto">{formatPrice(safeBalances[child.id] || 0)}</span>
                              </label>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <select
                  value={transactionFilters.transactionType}
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, transactionType: e.target.value as TransactionType }))}
                  className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] px-3 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue text-sm"
                >
                  <option value="all">جميع العمليات</option>
                  <option value="sale">بيع</option>
                  <option value="return">مرتجع</option>
                  <option value="withdrawal">سحب</option>
                  <option value="deposit">إضافه</option>
                  <option value="expense">مصروفات</option>
                  <option value="adjustment">تسوية</option>
                  <option value="transfer">تحويل</option>
                </select>
                <select
                  value={transactionFilters.paymentMethod}
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] px-3 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue text-sm"
                >
                  <option value="all">جميع طرق الدفع</option>
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.name}>{method.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowDateFilterModal(true)}
                  className="px-3 py-2 bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] rounded-lg flex items-center gap-2 hover:bg-[var(--dash-bg-overlay)] border border-[var(--dash-border-default)] transition-colors text-sm"
                >
                  <CalendarDaysIcon className="h-4 w-4" />
                  {getDateFilterLabel(transactionFilters.dateFilter)}
                </button>
              </div>
            )}
          </div>

          {/* Middle: Count (for records tab) */}
          {activeTab === 'records' && (
            <span className="text-sm text-[var(--dash-text-muted)]">
              {filteredTransactions.length} سجل
            </span>
          )}

          {/* Left Section: Search (for records tab) */}
          {activeTab === 'records' && (
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="البحث في السجلات..."
                value={transactionSearchTerm}
                onChange={(e) => setTransactionSearchTerm(e.target.value)}
                className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] pl-10 pr-4 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue w-full sm:w-56 text-sm"
              />
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--dash-text-muted)]" />
            </div>
          )}
        </div>

        {/* ==================== Safes Tab Content ==================== */}
        {activeTab === 'safes' && (
          <>
            {/* Controls */}
            <div className="px-3 sm:px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={openAddSafeModal}
                    className="px-4 py-2 dash-btn-green rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    إضافة خزنة جديدة
                  </button>

                  {/* Inline Total Balance Badge */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-dash-accent-blue-subtle rounded-lg border border-dash-accent-blue/20">
                    <BanknotesIcon className="h-5 w-5 text-dash-accent-blue" />
                    <span className="text-[var(--dash-text-muted)] text-sm">الرصيد الإجمالي</span>
                    <span className="text-[var(--dash-text-primary)] font-bold text-lg">{formatPrice(totalBalance)}</span>
                  </div>

                  {/* Today's Payment Breakdown (compact) */}
                  {Object.keys(paymentMethodBreakdown).length > 0 && (
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-[var(--dash-text-disabled)] text-xs">|</span>
                      {Object.entries(paymentMethodBreakdown).map(([method, amount]) => (
                        <div key={method} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--dash-bg-raised)] rounded-md border border-[var(--dash-border-subtle)]">
                          <span className="text-[var(--dash-text-muted)] text-xs">{method}</span>
                          <span className="text-[var(--dash-text-primary)] font-medium text-xs">{formatPrice(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Edit Mode Toggle */}
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border ${
                      isEditMode
                        ? 'bg-dash-accent-blue text-white border-dash-accent-blue'
                        : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-muted)] border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]'
                    }`}
                  >
                    <PencilIcon className="h-4 w-4" />
                    وضع التعديل
                  </button>

                  {/* Combined Safes Picker */}
                  <div className="relative" ref={combinedPickerRef}>
                    <button
                      onClick={() => setIsCombinedPickerOpen(!isCombinedPickerOpen)}
                      className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] px-4 py-2 rounded-lg border border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue text-sm flex items-center gap-2 transition-colors"
                    >
                      <BanknotesIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
                      {combinedSafeIds.length === 0
                        ? 'عرض خزن مجمعة'
                        : `${combinedSafeIds.length} خزن محددة`}
                      <ChevronDownIcon className="h-3 w-3 text-[var(--dash-text-muted)] mr-auto" />
                    </button>
                    {isCombinedPickerOpen && (
                      <div className="absolute top-full right-0 mt-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg shadow-xl z-50 w-72 max-h-80 overflow-y-auto scrollbar-hide">
                        {/* Select All / Clear All */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--dash-border-subtle)] sticky top-0 bg-[var(--dash-bg-raised)] z-10">
                          <button
                            onClick={() => {
                              const allIds: string[] = []
                              safes.forEach(s => allIds.push(s.id))
                              setCombinedSafeIds(allIds)
                            }}
                            className="text-xs text-dash-accent-blue hover:text-dash-accent-blue"
                          >
                            تحديد الكل
                          </button>
                          <button
                            onClick={() => setCombinedSafeIds([])}
                            className="text-xs text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
                          >
                            إلغاء الكل
                          </button>
                        </div>
                        {/* Safes list */}
                        {safes.filter(s => s.safe_type !== 'sub').map(mainSafe => {
                          const children = safes.filter(s => s.parent_id === mainSafe.id && s.safe_type === 'sub')
                          const hasDrawers = mainSafe.supports_drawers && children.length > 0
                          return (
                            <div key={mainSafe.id}>
                              <label className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--dash-bg-overlay)]/50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={combinedSafeIds.includes(mainSafe.id)}
                                  onChange={(e) => {
                                    setCombinedSafeIds(prev =>
                                      e.target.checked
                                        ? [...prev, mainSafe.id]
                                        : prev.filter(id => id !== mainSafe.id)
                                    )
                                  }}
                                  className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-dash-accent-blue focus:ring-dash-accent-blue"
                                />
                                <span className="text-[var(--dash-text-primary)] text-sm font-medium">{mainSafe.name}</span>
                                <span className="text-[var(--dash-text-disabled)] text-xs mr-auto">{formatPrice(safeBalances[mainSafe.id] || 0)}</span>
                              </label>
                              {/* Drawer children (indented) */}
                              {hasDrawers && children.map(child => (
                                <label key={child.id} className="flex items-center gap-3 px-3 py-1.5 pr-9 hover:bg-[var(--dash-bg-overlay)]/50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={combinedSafeIds.includes(child.id)}
                                    onChange={(e) => {
                                      setCombinedSafeIds(prev =>
                                        e.target.checked
                                          ? [...prev, child.id]
                                          : prev.filter(id => id !== child.id)
                                      )
                                    }}
                                    className="w-4 h-4 rounded border-[var(--dash-border-default)] bg-[var(--dash-bg-raised)] text-dash-accent-blue focus:ring-dash-accent-blue"
                                  />
                                  <span className="text-[var(--dash-text-secondary)] text-sm">{child.name}</span>
                                  <span className="text-[var(--dash-text-disabled)] text-xs mr-auto">{formatPrice(safeBalances[child.id] || 0)}</span>
                                </label>
                              ))}
                            </div>
                          )
                        })}
                        {/* Go button */}
                        <div className="sticky bottom-0 bg-[var(--dash-bg-raised)] border-t border-[var(--dash-border-subtle)] p-2">
                          <button
                            disabled={combinedSafeIds.length < 2}
                            onClick={() => {
                              if (combinedSafeIds.length < 2) return
                              const primarySafe = safes.find(s => s.id === combinedSafeIds[0])
                              if (!primarySafe) return
                              const additionalIds = combinedSafeIds.slice(1)
                              setSelectedSafe(primarySafe)
                              setCombinedSafeIds(additionalIds)
                              setIsSafeDetailsModalOpen(true)
                              setIsCombinedPickerOpen(false)
                            }}
                            className="w-full px-4 py-2 dash-btn-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            الذهاب ({combinedSafeIds.length} خزن)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="البحث في الخزن..."
                      value={safesSearchTerm}
                      onChange={(e) => setSafesSearchTerm(e.target.value)}
                      className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] pl-10 pr-4 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue w-full sm:w-64 md:w-80"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--dash-text-muted)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Safes Card Grid */}
            <div className="mx-3 sm:mx-6">
              {(() => {
                const mainSafes = filteredSafes.filter(s => s.safe_type !== 'sub')
                if (mainSafes.length === 0) {
                  return (
                    <div className="bg-[var(--dash-bg-raised)] rounded-xl p-8 text-center text-[var(--dash-text-muted)] border border-[var(--dash-border-subtle)]">
                      لا توجد خزن متاحة
                    </div>
                  )
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mainSafes.map((mainSafe) => {
                      const children = mainSafe.supports_drawers ? safes.filter(s => s.parent_id === mainSafe.id && s.safe_type === 'sub') : []
                      const ownBalance = safeBalances[mainSafe.id] || 0
                      const childrenBalance = children.reduce((sum, child) => sum + (safeBalances[child.id] || 0), 0)
                      const totalMainBalance = ownBalance + childrenBalance

                      return (
                        <div
                          key={mainSafe.id}
                          className="bg-[var(--dash-bg-raised)] rounded-xl border border-[var(--dash-border-subtle)] hover:border-dash-accent-blue dash-card-hover transition-all cursor-pointer group flex flex-col"
                          onDoubleClick={() => openSafeDetails(mainSafe)}
                        >
                          {/* Card Header */}
                          <div className="p-4 pb-3">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-dash-accent-blue rounded-xl flex items-center justify-center shrink-0">
                                  <BanknotesIcon className="h-5 w-5 text-[var(--dash-text-primary)]" />
                                </div>
                                <div>
                                  <h3 className="text-[var(--dash-text-primary)] font-bold text-base">{mainSafe.name}</h3>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-dash-accent-blue-subtle text-dash-accent-blue">رئيسية</span>
                                    {mainSafe.supports_drawers && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-dash-accent-cyan-subtle text-dash-accent-cyan">أدراج</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${mainSafe.is_active ? 'bg-dash-accent-green-subtle text-dash-accent-green' : 'bg-dash-accent-red-subtle text-dash-accent-red'}`}>
                                      {mainSafe.is_active ? 'نشطة' : 'غير نشطة'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Edit/delete buttons - only in edit mode */}
                              {isEditMode && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditSafeModal(mainSafe) }}
                                    className="p-1.5 text-[var(--dash-text-muted)] hover:text-dash-accent-blue hover:bg-dash-accent-blue-subtle rounded-lg transition-colors"
                                    title="تعديل"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSafe(mainSafe) }}
                                    className="p-1.5 text-[var(--dash-text-muted)] hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded-lg transition-colors"
                                    title="حذف"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Balance Display */}
                            <div className="bg-[var(--dash-bg-base)]/50 rounded-lg p-3 mb-3">
                              {children.length > 0 ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-[var(--dash-text-muted)] text-xs">الرصيد</span>
                                  <span className="text-[var(--dash-text-primary)] font-bold text-lg">{formatPrice(totalMainBalance)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="text-[var(--dash-text-muted)] text-xs">الرصيد</span>
                                  <span className="text-[var(--dash-text-primary)] font-bold text-lg">{formatPrice(ownBalance)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Drawers Section - only for safes that support drawers */}
                          {mainSafe.supports_drawers && (
                            <div className="px-4 pb-3 flex-1">
                              {children.length > 0 ? (
                                <div className="space-y-2">
                                  {children.map((child) => (
                                    <div
                                      key={child.id}
                                      className="bg-dash-accent-cyan-subtle border border-dash-accent-cyan rounded-lg px-4 py-3 cursor-pointer hover:bg-dash-accent-cyan-subtle hover:border-dash-accent-cyan transition-colors flex items-center justify-between"
                                      onDoubleClick={(e) => { e.stopPropagation(); openSafeDetails(child) }}
                                    >
                                      <div>
                                        <p className="text-dash-accent-cyan text-sm font-bold">{child.name}</p>
                                        <p className="text-[var(--dash-text-primary)] text-base font-bold mt-0.5">{formatPrice(safeBalances[child.id] || 0)}</p>
                                      </div>
                                      {isEditMode && (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openEditSafeModal(child) }}
                                            className="p-1.5 text-dash-accent-blue hover:bg-dash-accent-blue-subtle rounded-lg transition-colors"
                                            title="تعديل الدرج"
                                          >
                                            <PencilIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSafe(child) }}
                                            className="p-1.5 text-dash-accent-red hover:bg-dash-accent-red-subtle rounded-lg transition-colors"
                                            title="حذف الدرج"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {/* Transfers row - only for safes with show_transfers enabled */}
                                  {mainSafe.show_transfers !== false && ownBalance !== 0 && (
                                    <div className="bg-dash-accent-blue-subtle border border-dash-accent-blue rounded-lg px-4 py-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-dash-accent-blue text-sm font-bold">التحويلات</p>
                                        <p className="text-[var(--dash-text-primary)] text-base font-bold mt-0.5">{formatPrice(ownBalance)}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-600 italic">بدون أدراج</p>
                              )}
                            </div>
                          )}

                          {/* Cash/Transfers breakdown for non-drawer safes */}
                          {!mainSafe.supports_drawers && mainSafe.show_transfers !== false && (
                            <div className="px-4 pb-3 space-y-2">
                              <div className="bg-dash-accent-green-subtle border border-dash-accent-green rounded-lg px-4 py-2">
                                <p className="text-dash-accent-green text-xs font-bold">في الخزنة</p>
                                <p className="text-[var(--dash-text-primary)] text-sm font-bold">{formatPrice(ownBalance - (transferBalances[mainSafe.id] || 0))}</p>
                              </div>
                              <div className="bg-dash-accent-blue-subtle border border-dash-accent-blue rounded-lg px-4 py-2">
                                <p className="text-dash-accent-blue text-xs font-bold">التحويلات</p>
                                <p className="text-[var(--dash-text-primary)] text-sm font-bold">{formatPrice(transferBalances[mainSafe.id] || 0)}</p>
                              </div>
                            </div>
                          )}

                          {/* Add Drawer Button - only in edit mode */}
                          {isEditMode && mainSafe.supports_drawers && (
                            <div className="px-4 pb-4">
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddSubSafeParent(mainSafe); setIsAddSafeModalOpen(true) }}
                                className="w-full py-2 border border-dashed border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-muted)] text-xs hover:text-dash-accent-cyan hover:border-dash-accent-cyan hover:bg-dash-accent-cyan-subtle transition-colors flex items-center justify-center gap-1.5"
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                                إضافة درج
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </>
        )}

        {/* ==================== Records Tab Content ==================== */}
        {activeTab === 'records' && (
          <div className="p-3 sm:p-6 pt-4">
            {/* Transactions Table */}
            {/* Offline Mode Notice */}
            {isUsingOfflineData && (
              <div className="mb-4 p-3 bg-dash-accent-orange-subtle border border-dash-accent-orange rounded-lg flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-dash-accent-orange" />
                <span className="text-dash-accent-orange text-sm">
                  أنت في وضع عدم الاتصال. يتم عرض البيانات المحفوظة من آخر مزامنة.
                </span>
              </div>
            )}

            <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-subtle)] max-h-[calc(100vh-280px)] overflow-auto">
              {isLoadingTransactions && !isUsingOfflineData ? (
                <div className="p-8 text-center text-[var(--dash-text-muted)]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dash-accent-blue"></div>
                    جاري تحميل السجلات...
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right min-w-[800px]">
                      <thead className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3 text-right font-medium">#</th>
                          <th className="py-2 px-3 text-right font-medium">نوع العملية</th>
                          <th className="py-2 px-3 text-right font-medium">طريقة الدفع</th>
                          <th className="py-2 px-3 text-right font-medium">الخزنة</th>
                          <th className="py-2 px-3 text-right font-medium">المبلغ</th>
                          <th className="py-2 px-3 text-right font-medium">الرصيد بعد</th>
                          <th className="py-2 px-3 text-right font-medium">ملاحظات</th>
                          <th className="py-2 px-3 text-right font-medium">اسم العميل</th>
                          <th className="py-2 px-3 text-right font-medium">بواسطة</th>
                          <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--dash-bg-raised)] divide-y divide-dash-border">
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map((tx, index) => {
                            const isPending = tx.id.startsWith('pending_')
                            return (
                              <tr
                                key={tx.id}
                                className={`hover:bg-[var(--dash-bg-overlay)] cursor-pointer ${isPending ? 'bg-dash-accent-orange-subtle' : ''}`}
                                onContextMenu={(e) => !isPending && handleContextMenu(e, tx)}
                              >
                                <td className="py-2 px-3 text-[var(--dash-text-primary)] font-medium">{index + 1}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    {getTransactionTypeBadge(tx.transaction_type)}
                                    {isPending && (
                                      <span className="px-2 py-0.5 rounded-full text-xs bg-dash-accent-orange-subtle text-dash-accent-orange border border-dash-accent-orange">
                                        معلق
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="text-dash-accent-blue text-xs">{tx.payment_method || 'cash'}</span>
                                </td>
                                <td className="py-2 px-3 text-[var(--dash-text-primary)]">{tx.safe_name}</td>
                                <td className="py-2 px-3">{formatAmount(tx.amount)}</td>
                                <td className="py-2 px-3 text-[var(--dash-text-secondary)]">
                                  {isPending ? <span className="text-dash-accent-orange">-</span> : formatPrice(tx.balance_after || 0)}
                                </td>
                                <td className="py-2 px-3 text-[var(--dash-text-muted)] max-w-[200px] truncate" title={tx.notes || ''}>
                                  {tx.notes || '-'}
                                </td>
                                <td className="py-2 px-3 text-[var(--dash-text-muted)]">{tx.customer_name || '-'}</td>
                                <td className="py-2 px-3 text-[var(--dash-text-muted)]">{tx.performed_by || '-'}</td>
                                <td className="py-2 px-3 text-[var(--dash-text-muted)]">{formatDateTime(tx.created_at)}</td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-[var(--dash-text-muted)]">
                              {isUsingOfflineData ? 'لا توجد سجلات محفوظة للعرض في وضع عدم الاتصال' : 'لا توجد سجلات متاحة'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Sentinel element for infinite scroll */}
                  <div ref={transactionSentinelRef} className="h-4" />
                  {/* Loading more indicator */}
                  {isLoadingMoreTransactions && (
                    <div className="flex items-center justify-center py-4 border-t border-[var(--dash-border-subtle)]">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dash-accent-blue mr-2"></div>
                      <span className="text-[var(--dash-text-muted)] text-sm">جاري تحميل المزيد...</span>
                    </div>
                  )}
                  {/* No more data indicator */}
                  {!hasMoreTransactions && filteredTransactions.length > 0 && (
                    <div className="text-center py-3 text-[var(--dash-text-disabled)] text-sm border-t border-[var(--dash-border-subtle)]">
                      تم عرض جميع السجلات ({filteredTransactions.length} سجل)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================== Payment Methods Tab Content ==================== */}
        {activeTab === 'payment_methods' && (
          <>
            {/* Statistics Cards */}
            <div className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Total Payment Methods */}
              <div className="bg-[var(--dash-bg-raised)] rounded-lg p-4 sm:p-6 border border-[var(--dash-border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--dash-text-muted)] text-sm">إجمالي طرق الدفع</p>
                    <p className="text-2xl font-bold text-[var(--dash-text-primary)] mt-1">{paymentMethods.length}</p>
                  </div>
                  <div className="bg-dash-accent-blue-subtle p-3 rounded-lg">
                    <CreditCardIcon className="h-6 w-6 text-dash-accent-blue" />
                  </div>
                </div>
              </div>

              {/* Active Payment Methods */}
              <div className="bg-[var(--dash-bg-raised)] rounded-lg p-4 sm:p-6 border border-[var(--dash-border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--dash-text-muted)] text-sm">طرق الدفع النشطة</p>
                    <p className="text-2xl font-bold text-[var(--dash-text-primary)] mt-1">
                      {paymentMethods.filter(method => method.is_active === true).length}
                    </p>
                  </div>
                  <div className="bg-dash-accent-green-subtle p-3 rounded-lg">
                    <span className="text-dash-accent-green text-2xl">✓</span>
                  </div>
                </div>
              </div>

              {/* Default Payment Method */}
              <div className="bg-[var(--dash-bg-raised)] rounded-lg p-4 sm:p-6 border border-[var(--dash-border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--dash-text-muted)] text-sm">الطريقة الافتراضية</p>
                    <p className="text-lg font-bold text-[var(--dash-text-primary)] mt-1">
                      {paymentMethods.find(method => method.is_default === true)?.name || 'غير محدد'}
                    </p>
                  </div>
                  <div className="bg-dash-accent-purple-subtle p-3 rounded-lg">
                    <span className="text-dash-accent-purple text-2xl">★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="px-3 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={openAddPaymentMethodModal}
                    className="px-4 py-2 dash-btn-green rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    إضافة طريقة دفع جديدة
                  </button>
                </div>

                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="البحث في طرق الدفع..."
                    value={paymentMethodSearchTerm}
                    onChange={(e) => setPaymentMethodSearchTerm(e.target.value)}
                    className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] pl-10 pr-4 py-2 rounded-lg border border-[var(--dash-border-default)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue w-full sm:w-64 md:w-80"
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--dash-text-muted)]" />
                </div>
              </div>
            </div>

            {/* Payment Methods Table */}
            <div className="mx-3 sm:mx-6 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden border border-[var(--dash-border-subtle)]">
              <div className="overflow-x-auto">
              <table className="w-full text-sm text-right min-w-[600px]">
                <thead className="bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)]">
                  <tr>
                    <th className="p-3 text-right font-medium">#</th>
                    <th className="p-3 text-right font-medium">اسم طريقة الدفع</th>
                    <th className="p-3 text-right font-medium">الحالة</th>
                    <th className="p-3 text-right font-medium">افتراضية</th>
                    <th className="p-3 text-right font-medium">تاريخ الإنشاء</th>
                    <th className="p-3 text-right font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--dash-bg-raised)] divide-y divide-dash-border">
                  {filteredPaymentMethods.length > 0 ? (
                    filteredPaymentMethods.map((method, index) => (
                      <tr
                        key={method.id}
                        className="hover:bg-[var(--dash-bg-overlay)]"
                      >
                        <td className="p-3 text-[var(--dash-text-primary)] font-medium">{index + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-dash-accent-blue rounded flex items-center justify-center">
                              <CreditCardIcon className="h-5 w-5 text-[var(--dash-text-primary)]" />
                            </div>
                            <span className="text-[var(--dash-text-primary)] font-medium">{method.name}</span>
                            {method.is_default === true && (
                              <span className="px-2 py-1 bg-dash-accent-purple-subtle text-dash-accent-purple rounded-full text-xs mr-2">
                                افتراضية
                              </span>
                            )}
                            {method.name.toLowerCase() === 'cash' && (
                              <span className="px-2 py-1 bg-dash-accent-orange-subtle text-dash-accent-orange rounded-full text-xs mr-2">
                                أساسية
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs mr-2 ${
                              (method as any).is_physical !== false
                                ? 'bg-dash-accent-green-subtle text-dash-accent-green'
                                : 'bg-dash-accent-blue-subtle text-dash-accent-blue'
                            }`}>
                              {(method as any).is_physical !== false ? 'فعلي' : 'رقمي'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            method.is_active === true
                              ? 'bg-dash-accent-green-subtle text-dash-accent-green'
                              : 'bg-dash-accent-red-subtle text-dash-accent-red'
                          }`}>
                            {method.is_active === true ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            method.is_default === true
                              ? 'bg-dash-accent-purple-subtle text-dash-accent-purple'
                              : 'bg-[var(--dash-bg-raised)] text-[var(--dash-text-muted)]'
                          }`}>
                            {method.is_default === true ? 'نعم' : 'لا'}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--dash-text-muted)]">{formatDate(method.created_at)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditPaymentMethodModal(method)}
                              className="px-3 py-1 text-xs dash-btn-primary rounded transition-colors flex items-center gap-1"
                            >
                              <PencilIcon className="h-3 w-3" />
                              تعديل
                            </button>
                            {method.name.toLowerCase() !== 'cash' && (
                              <button
                                onClick={() => handleDeletePaymentMethod(method)}
                                className="px-3 py-1 text-xs dash-btn-red rounded transition-colors flex items-center gap-1"
                              >
                                <TrashIcon className="h-3 w-3" />
                                حذف
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--dash-text-muted)]">
                        لا توجد طرق دفع متاحة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        <div className="p-3 sm:p-6"></div>
      </div>

      {/* ==================== Modals ==================== */}

      {/* Safe Details Modal */}
      {selectedSafe && (
        <SafeDetailsModal
          isOpen={isSafeDetailsModalOpen}
          onClose={closeSafeDetails}
          safe={selectedSafe}
          additionalSafeIds={combinedSafeIds}
          onSafeUpdated={handleSafeUpdated}
        />
      )}

      {/* Add Safe Modal */}
      <AddSafeModal
        isOpen={isAddSafeModalOpen}
        onClose={() => { closeAddSafeModal(); setAddSubSafeParent(null) }}
        onSafeAdded={handleSafeAdded}
        parentSafe={addSubSafeParent}
      />

      {/* Edit Safe Modal */}
      <EditSafeModal
        isOpen={isEditSafeModalOpen}
        onClose={closeEditSafeModal}
        onSafeUpdated={handleSafeUpdated}
        safe={safeToEdit}
        currentBalance={safeToEdit ? safeBalances[safeToEdit.id] || 0 : 0}
      />

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={isAddPaymentMethodModalOpen}
        onClose={closeAddPaymentMethodModal}
        onPaymentMethodAdded={handlePaymentMethodAdded}
      />

      {/* Edit Payment Method Modal */}
      <EditPaymentMethodModal
        isOpen={isEditPaymentMethodModalOpen}
        onClose={closeEditPaymentMethodModal}
        onPaymentMethodUpdated={handlePaymentMethodUpdated}
        paymentMethod={selectedPaymentMethod}
      />

      {/* Date Filter Modal */}
      <SimpleDateFilterModal
        isOpen={showDateFilterModal}
        onClose={() => setShowDateFilterModal(false)}
        onDateFilterChange={(filter) => setTransactionFilters(prev => ({ ...prev, dateFilter: filter }))}
        currentFilter={transactionFilters.dateFilter}
      />

      {/* Context Menu for Records */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        items={createEditContextMenuItems(handleEditTransaction)}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={isEditInvoiceModalOpen}
        onClose={() => {
          setIsEditInvoiceModalOpen(false)
          setTransactionToEdit(null)
        }}
        onInvoiceUpdated={handleInvoiceUpdated}
        saleId={transactionToEdit?.sale_id || null}
        initialRecordId={transactionToEdit?.record_id}
      />
    </div>
  )
}
