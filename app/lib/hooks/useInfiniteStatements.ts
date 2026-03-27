'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../supabase/client'
import { DateFilter } from '../../components/SimpleDateFilterModal'
import { getDateRangeFromFilter } from '../utils/dateFilters'
import { isOutgoingType } from '../utils/transactionTypes'

// Statement item type
export interface StatementItem {
  id: string
  sale_id?: string | null
  date: string
  time: string
  description: string
  type: string
  paidAmount: number
  invoiceValue: number
  balance: number
  created_at: string
  isPositive: boolean
  employee_name?: string | null
  payment_method?: string | null
  paymentBreakdown?: { method: string; amount: number }[]
  safe_name?: string | null
  index?: number
  status?: string | null
}

// Cursor for pagination
interface Cursor {
  created_at: string
  id: string
}

// Options for the hook
export interface UseInfiniteStatementsOptions {
  recordIds?: string[] // Safe/record IDs (array for multi-safe support)
  dateFilter?: DateFilter // Date range filter
  enabled?: boolean // Enable/disable fetching
  pageSize?: number // Number of records per page (default 200)
  excludeTransferTypes?: boolean // If true, exclude transfer_in/transfer_out transactions
  transferTypesOnly?: boolean // If true, only include transfer_in/transfer_out transactions
  safes?: Array<{ id: string; name: string }> // Safe list for resolving record_id to name
}

// Return type for the hook
export interface UseInfiniteStatementsReturn {
  statements: StatementItem[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  error: Error | null
  totalLoaded: number
}

export function useInfiniteStatements(
  options: UseInfiniteStatementsOptions
): UseInfiniteStatementsReturn {
  const {
    recordIds,
    dateFilter = { type: 'today' },
    enabled = true,
    pageSize = 200,
    excludeTransferTypes = false,
    transferTypesOnly = false
  } = options

  const [statements, setStatements] = useState<StatementItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<Cursor | null>(null)

  // Track if initial load has happened
  const initialLoadDone = useRef(false)

  // Ref to track the latest options
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Process transaction data into statement format
  const processTransactionToStatement = useCallback((
    tx: any,
    salesMap: Map<string, any>,
    index: number,
    safes?: Array<{ id: string; name: string }>
  ): StatementItem => {
    const amount = parseFloat(String(tx.amount || 0)) || 0
    const balanceAfter = parseFloat(String(tx.balance_after || 0)) || 0

    let typeName = 'دفعة'
    let description = tx.notes || typeName
    let invoiceValue = 0
    const isPositive = !isOutgoingType(tx.transaction_type)

    // Check if this transaction is linked to a sale
    if (tx.sale_id && salesMap.has(tx.sale_id)) {
      const sale = salesMap.get(tx.sale_id)
      invoiceValue = parseFloat(String(sale.total_amount || 0)) || 0

      // Determine type based on sale status and invoice_type
      if (sale.status === 'cancelled') {
        typeName = 'فاتورة ملغاة'
      } else if (sale.invoice_type === 'Sale Return') {
        typeName = 'مرتجع بيع'
      } else {
        typeName = 'فاتورة بيع'
      }

      // Check if this is a payment only (دفعة)
      if (sale.notes && sale.notes.includes('دفعة')) {
        typeName = 'دفعة'
      }

      description = `${typeName} - ${sale.invoice_number}`
    } else {
      // Non-sale transaction
      if (tx.transaction_type === 'withdrawal') {
        typeName = 'سحب'
      } else if (tx.transaction_type === 'adjustment') {
        typeName = 'تسوية'
      } else if (tx.transaction_type === 'expense') {
        typeName = 'مصروفات'
      } else if (tx.transaction_type === 'deposit') {
        typeName = 'إضافه'
      } else if (tx.transaction_type === 'return') {
        typeName = 'مرتجع بيع'
      } else if (tx.transaction_type === 'transfer_out') {
        typeName = 'تحويل'
      } else if (tx.transaction_type === 'transfer_in') {
        typeName = 'تحويل'
      }
      description = tx.notes || typeName
    }

    const createdDate = tx.created_at ? new Date(tx.created_at) : new Date()

    // Get employee name from sale if available
    const saleData = tx.sale_id ? salesMap.get(tx.sale_id) : null
    const employeeName = saleData?.cashier?.full_name || tx.performed_by || null

    // Get payment method - prefer from transaction, fallback to sale
    const salePaymentMethod = saleData?.payment_method || null
    const paymentMethod = tx.payment_method || salePaymentMethod || null

    // Resolve record_id to safe name
    let safeName: string | null = null
    if (tx.record_id && safes) {
      const matched = safes.find((s: { id: string; name: string }) => s.id === tx.record_id)
      safeName = matched?.name || null
    }

    return {
      id: tx.id,
      sale_id: tx.sale_id || null,
      date: createdDate.toLocaleDateString('en-GB'),
      time: createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      description,
      type: typeName,
      paidAmount: Math.abs(amount),
      invoiceValue: Math.abs(invoiceValue),
      balance: balanceAfter,
      created_at: tx.created_at || new Date().toISOString(),
      isPositive,
      employee_name: employeeName,
      payment_method: paymentMethod,
      safe_name: safeName,
      index: index + 1,
      status: saleData?.status || null
    }
  }, [])

  // Merge statements that share the same sale_id into one row
  const mergeStatementsBySale = useCallback((items: StatementItem[]): StatementItem[] => {
    const result: StatementItem[] = []
    const saleGroups = new Map<string, StatementItem[]>()

    for (const item of items) {
      if (item.sale_id) {
        const group = saleGroups.get(item.sale_id)
        if (group) {
          group.push(item)
        } else {
          saleGroups.set(item.sale_id, [item])
        }
      } else {
        result.push(item)
      }
    }

    saleGroups.forEach((group) => {
      if (group.length === 1) {
        result.push(group[0])
        return
      }

      // Find the last transaction chronologically for balance
      const sorted = [...group].sort((a: StatementItem, b: StatementItem) => {
        const cmp = a.created_at.localeCompare(b.created_at)
        if (cmp !== 0) return cmp
        return a.balance - b.balance
      })
      const last = sorted[sorted.length - 1]
      const first = group[0] // first in original order for description/type

      const totalAmount = group.reduce((sum: number, s: StatementItem) => {
        return sum + (s.isPositive ? s.paidAmount : -s.paidAmount)
      }, 0)

      const breakdown = group.map((s: StatementItem) => ({
        method: s.payment_method || '-',
        amount: s.paidAmount
      }))

      result.push({
        ...first,
        paidAmount: Math.abs(totalAmount),
        balance: last.balance,
        isPositive: totalAmount >= 0,
        paymentBreakdown: breakdown
      })
    })

    // Re-sort by created_at descending to maintain order
    result.sort((a, b) => b.created_at.localeCompare(a.created_at))

    // Re-index
    return result.map((item, i) => ({ ...item, index: i + 1 }))
  }, [])

  // Fetch sales map for a list of sale_ids
  const fetchSalesMap = useCallback(async (saleIds: string[]): Promise<Map<string, any>> => {
    const salesMap = new Map()
    if (saleIds.length === 0) return salesMap

    const { data: salesData } = await supabase
      .from('sales')
      .select(`
        id, invoice_number, total_amount, payment_method, invoice_type, created_at, time, notes, status,
        cashier:user_profiles(full_name)
      `)
      .in('id', saleIds)

    if (salesData) {
      salesData.forEach((sale: any) => {
        salesMap.set(sale.id, sale)
      })
    }

    return salesMap
  }, [])

  // Fetch a page of transactions
  const fetchPage = useCallback(async (cursorData: Cursor | null, isLoadMore: boolean = false) => {
    const currentRecordIds = optionsRef.current.recordIds
    const currentDateFilter = optionsRef.current.dateFilter || { type: 'today' }

    if (!currentRecordIds || currentRecordIds.length === 0) return { data: [], hasMore: false }

    const { startDate, endDate } = getDateRangeFromFilter(currentDateFilter)

    let query = supabase
      .from('cash_drawer_transactions')
      .select('id, sale_id, amount, balance_after, transaction_type, notes, created_at, performed_by, payment_method, record_id')

    // Apply safe filter
    if (currentRecordIds.length === 1) {
      query = query.eq('record_id', currentRecordIds[0])
    } else {
      query = query.in('record_id', currentRecordIds)
    }

    // Apply date filter at database level
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    // Exclude transfer_in/transfer_out transactions (for non-drawer safe "في الخزنة" filter)
    if (optionsRef.current.excludeTransferTypes) {
      query = query.not('transaction_type', 'in', '("transfer_in","transfer_out")')
    }

    // Only include transfer_in/transfer_out transactions (for non-drawer safe "التحويلات" filter)
    if (optionsRef.current.transferTypesOnly) {
      query = query.in('transaction_type', ['transfer_in', 'transfer_out'])
    }

    // Apply cursor for pagination (descending order - newest first)
    if (cursorData) {
      query = query.or(`created_at.lt.${cursorData.created_at},and(created_at.eq.${cursorData.created_at},id.lt.${cursorData.id})`)
    }

    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize)

    const { data, error } = await query

    if (error) throw error

    return {
      data: data || [],
      hasMore: (data || []).length >= pageSize
    }
  }, [pageSize])

  // Fetch the first page
  const fetchFirstPage = useCallback(async () => {
    if (!enabled || !optionsRef.current.recordIds || optionsRef.current.recordIds.length === 0) return

    setIsLoading(true)
    setError(null)
    setHasMore(true)
    setCursor(null)

    try {
      const { data: transactionsData, hasMore: moreAvailable } = await fetchPage(null)

      if (transactionsData.length === 0) {
        setStatements([])
        setHasMore(false)
        return
      }

      // Get unique sale_ids
      const saleIds = transactionsData
        .filter((tx: any) => tx.sale_id)
        .map((tx: any) => tx.sale_id)

      // Fetch sales data
      const salesMap = await fetchSalesMap(saleIds)

      // Process transactions into statements
      const processedStatements = transactionsData.map((tx: any, index: number) =>
        processTransactionToStatement(tx, salesMap, index, optionsRef.current.safes)
      )
      const mergedStatements = mergeStatementsBySale(processedStatements)

      setStatements(mergedStatements)

      // Set cursor for next page
      if (transactionsData.length > 0 && moreAvailable) {
        const lastItem = transactionsData[transactionsData.length - 1]
        setCursor({
          created_at: lastItem.created_at || '',
          id: lastItem.id
        })
        setHasMore(true)
      } else {
        setHasMore(false)
      }

      initialLoadDone.current = true
    } catch (err) {
      console.error('Error fetching statements:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatements([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled, fetchPage, fetchSalesMap, processTransactionToStatement, mergeStatementsBySale])

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || isLoadingMore || !cursor) return

    setIsLoadingMore(true)
    setError(null)

    try {
      const { data: transactionsData, hasMore: moreAvailable } = await fetchPage(cursor, true)

      if (transactionsData.length === 0) {
        setHasMore(false)
        return
      }

      // Get unique sale_ids
      const saleIds = transactionsData
        .filter((tx: any) => tx.sale_id)
        .map((tx: any) => tx.sale_id)

      // Fetch sales data
      const salesMap = await fetchSalesMap(saleIds)

      // Process transactions into statements with correct index
      const currentCount = statements.length
      const processedStatements = transactionsData.map((tx: any, index: number) =>
        processTransactionToStatement(tx, salesMap, currentCount + index, optionsRef.current.safes)
      )
      const mergedStatements = mergeStatementsBySale(processedStatements)

      // Append to existing statements
      setStatements(prev => {
        const combined = [...prev, ...mergedStatements]
        // Re-index after appending
        return combined.map((item, i) => ({ ...item, index: i + 1 }))
      })

      // Update cursor for next page
      if (transactionsData.length > 0 && moreAvailable) {
        const lastItem = transactionsData[transactionsData.length - 1]
        setCursor({
          created_at: lastItem.created_at || '',
          id: lastItem.id
        })
        setHasMore(true)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error loading more statements:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [enabled, hasMore, isLoadingMore, cursor, fetchPage, fetchSalesMap, processTransactionToStatement, mergeStatementsBySale, statements.length])

  // Refresh - reset and fetch first page again
  const refresh = useCallback(async () => {
    initialLoadDone.current = false
    await fetchFirstPage()
  }, [fetchFirstPage])

  // Effect to fetch first page when options change
  useEffect(() => {
    if (enabled && optionsRef.current.recordIds && optionsRef.current.recordIds.length > 0) {
      fetchFirstPage()
    }
  }, [
    enabled,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    recordIds?.join(','),
    excludeTransferTypes,
    transferTypesOnly,
    dateFilter?.type,
    dateFilter?.startDate?.toString(),
    dateFilter?.endDate?.toString()
  ])

  return {
    statements,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    error,
    totalLoaded: statements.length
  }
}

export default useInfiniteStatements
