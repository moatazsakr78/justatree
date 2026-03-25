'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../supabase/client'
import { DateFilter } from '../../components/SimpleDateFilterModal'
import { getDateRangeFromFilter } from '../utils/dateFilters'

// Cursor for pagination
interface Cursor {
  created_at: string
  id: string
}

// Options for the hook
export interface UseInfiniteSafeInvoicesOptions {
  allRecordIds: string[] // All safe/record IDs (safe + children + additional)
  filteredRecordIds: string[] // Filtered record IDs based on drawer selection
  dateFilter?: DateFilter
  enabled?: boolean
  pageSize?: number // per table (default 50)
  selectedDrawerFilters: Set<string> | null
  nonDrawerExcludeTransfers: boolean
  nonDrawerTransfersOnly: boolean
}

// Return type
export interface UseInfiniteSafeInvoicesReturn {
  sales: any[]
  purchaseInvoices: any[]
  paidAmounts: Record<string, number>
  paymentBreakdowns: Record<string, { method: string; amount: number }[]>
  drawerRecordIds: Record<string, string[]>
  saleItemsCache: Record<string, any[]>
  purchaseItemsCache: Record<string, any[]>
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useInfiniteSafeInvoices(
  options: UseInfiniteSafeInvoicesOptions
): UseInfiniteSafeInvoicesReturn {
  const {
    enabled = true,
    pageSize = 50,
  } = options

  const [sales, setSales] = useState<any[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([])
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({})
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<Record<string, { method: string; amount: number }[]>>({})
  const [drawerRecordIds, setDrawerRecordIds] = useState<Record<string, string[]>>({})
  const [saleItemsCache, setSaleItemsCache] = useState<Record<string, any[]>>({})
  const [purchaseItemsCache, setPurchaseItemsCache] = useState<Record<string, any[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreSales, setHasMoreSales] = useState(true)
  const [hasMorePurchases, setHasMorePurchases] = useState(true)
  const [salesCursor, setSalesCursor] = useState<Cursor | null>(null)
  const [purchasesCursor, setPurchasesCursor] = useState<Cursor | null>(null)

  // Cached drawer transaction IDs (for drawer-filtered mode)
  const drawerSaleIdsRef = useRef<string[] | null>(null)
  const drawerPurchaseIdsRef = useRef<string[] | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  const hasMore = hasMoreSales || hasMorePurchases

  // Fetch sale IDs from cash_drawer_transactions (for drawer filter mode)
  const fetchDrawerSaleIds = useCallback(async (): Promise<string[]> => {
    const { filteredRecordIds, nonDrawerExcludeTransfers, nonDrawerTransfersOnly, dateFilter } = optionsRef.current
    const { startDate, endDate } = getDateRangeFromFilter(dateFilter || { type: 'today' })

    let txQuery = supabase
      .from('cash_drawer_transactions')
      .select('sale_id')
      .in('record_id', filteredRecordIds)
      .not('sale_id', 'is', null)

    if (nonDrawerExcludeTransfers) {
      txQuery = txQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
    }
    if (nonDrawerTransfersOnly) {
      txQuery = txQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
    }
    if (startDate) txQuery = txQuery.gte('created_at', startDate.toISOString())
    if (endDate) txQuery = txQuery.lte('created_at', endDate.toISOString())

    const { data } = await txQuery
    return Array.from(new Set((data || []).map((t: any) => t.sale_id).filter(Boolean)))
  }, [])

  // Fetch purchase invoice IDs from cash_drawer_transactions (for drawer filter mode)
  const fetchDrawerPurchaseIds = useCallback(async (): Promise<string[]> => {
    const { filteredRecordIds, nonDrawerExcludeTransfers, nonDrawerTransfersOnly, dateFilter } = optionsRef.current
    const { startDate, endDate } = getDateRangeFromFilter(dateFilter || { type: 'today' })

    let txQuery = supabase
      .from('cash_drawer_transactions')
      .select('purchase_invoice_id')
      .in('record_id', filteredRecordIds)
      .not('purchase_invoice_id', 'is', null)

    if (nonDrawerExcludeTransfers) {
      txQuery = txQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
    }
    if (nonDrawerTransfersOnly) {
      txQuery = txQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
    }
    if (startDate) txQuery = txQuery.gte('created_at', startDate.toISOString())
    if (endDate) txQuery = txQuery.lte('created_at', endDate.toISOString())

    const { data } = await txQuery
    return Array.from(new Set((data || []).map((t: any) => t.purchase_invoice_id).filter(Boolean)))
  }, [])

  // Fetch a page of sales
  const fetchSalesPage = useCallback(async (cursor: Cursor | null, drawerSaleIds: string[] | null): Promise<{ data: any[]; hasMore: boolean }> => {
    const { allRecordIds, selectedDrawerFilters, dateFilter } = optionsRef.current
    const { startDate, endDate } = getDateRangeFromFilter(dateFilter || { type: 'today' })

    const selectFields = `
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
      customer:customers(name, phone),
      cashier:user_profiles(full_name)
    `

    if (selectedDrawerFilters && selectedDrawerFilters.size > 0 && drawerSaleIds !== null) {
      // Drawer filter mode: paginate within the cached IDs
      if (drawerSaleIds.length === 0) return { data: [], hasMore: false }

      let query = supabase
        .from('sales')
        .select(selectFields)
        .in('id', drawerSaleIds)

      if (cursor) {
        query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize)

      if (error) throw error
      return { data: data || [], hasMore: (data || []).length >= pageSize }
    } else {
      // No filter: paginate by record_id
      let query = supabase
        .from('sales')
        .select(selectFields)
        .in('record_id', allRecordIds)

      if (startDate) query = query.gte('created_at', startDate.toISOString())
      if (endDate) query = query.lte('created_at', endDate.toISOString())

      if (cursor) {
        query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize)

      if (error) throw error
      return { data: data || [], hasMore: (data || []).length >= pageSize }
    }
  }, [pageSize])

  // Fetch a page of purchase invoices
  const fetchPurchasesPage = useCallback(async (cursor: Cursor | null, drawerPurchaseIds: string[] | null): Promise<{ data: any[]; hasMore: boolean }> => {
    const { allRecordIds, selectedDrawerFilters, dateFilter } = optionsRef.current
    const { startDate, endDate } = getDateRangeFromFilter(dateFilter || { type: 'today' })

    const selectFields = `
      id,
      invoice_number,
      supplier_id,
      total_amount,
      payment_status,
      notes,
      created_at,
      time,
      invoice_type,
      supplier:suppliers(name, phone),
      creator:user_profiles(full_name)
    `

    if (selectedDrawerFilters && selectedDrawerFilters.size > 0 && drawerPurchaseIds !== null) {
      if (drawerPurchaseIds.length === 0) return { data: [], hasMore: false }

      let query = supabase
        .from('purchase_invoices')
        .select(selectFields)
        .in('id', drawerPurchaseIds)

      if (cursor) {
        query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize)

      if (error) throw error
      return { data: data || [], hasMore: (data || []).length >= pageSize }
    } else {
      let query = supabase
        .from('purchase_invoices')
        .select(selectFields)
        .in('record_id', allRecordIds)

      if (startDate) query = query.gte('created_at', startDate.toISOString())
      if (endDate) query = query.lte('created_at', endDate.toISOString())

      if (cursor) {
        query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize)

      if (error) throw error
      return { data: data || [], hasMore: (data || []).length >= pageSize }
    }
  }, [pageSize])

  // Fetch paid amounts + payment breakdowns for a batch of IDs
  const fetchPaidAmountsForBatch = useCallback(async (saleIds: string[], purchaseIds: string[]) => {
    const { filteredRecordIds, nonDrawerExcludeTransfers, nonDrawerTransfersOnly } = optionsRef.current
    const newAmounts: Record<string, number> = {}
    const newBreakdowns: Record<string, { method: string; amount: number }[]> = {}
    const newDrawerRecordIds: Record<string, string[]> = {}

    // Fetch for sales
    if (saleIds.length > 0) {
      let txQuery = supabase
        .from('cash_drawer_transactions')
        .select('sale_id, amount, payment_method, record_id')
        .in('sale_id', saleIds)
        .in('record_id', filteredRecordIds)

      if (nonDrawerExcludeTransfers) {
        txQuery = txQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
      }
      if (nonDrawerTransfersOnly) {
        txQuery = txQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
      }

      const { data } = await txQuery
      if (data) {
        data.forEach((t: any) => {
          if (t.sale_id) {
            newAmounts[t.sale_id] = (newAmounts[t.sale_id] || 0) + Math.abs(t.amount || 0)
            if (!newBreakdowns[t.sale_id]) newBreakdowns[t.sale_id] = []
            newBreakdowns[t.sale_id].push({ method: t.payment_method || 'نقد', amount: Math.abs(t.amount || 0) })
            if (t.record_id) {
              if (!newDrawerRecordIds[t.sale_id]) newDrawerRecordIds[t.sale_id] = []
              if (!newDrawerRecordIds[t.sale_id].includes(t.record_id)) newDrawerRecordIds[t.sale_id].push(t.record_id)
            }
          }
        })
      }
    }

    // Fetch for purchases
    if (purchaseIds.length > 0) {
      let purchaseTxQuery = supabase
        .from('cash_drawer_transactions')
        .select('purchase_invoice_id, amount, payment_method, record_id')
        .in('purchase_invoice_id', purchaseIds)
        .in('record_id', filteredRecordIds)

      if (nonDrawerExcludeTransfers) {
        purchaseTxQuery = purchaseTxQuery.not('transaction_type', 'in', '("transfer_in","transfer_out")')
      }
      if (nonDrawerTransfersOnly) {
        purchaseTxQuery = purchaseTxQuery.in('transaction_type', ['transfer_in', 'transfer_out'])
      }

      const { data } = await purchaseTxQuery
      if (data) {
        data.forEach((t: any) => {
          if (t.purchase_invoice_id) {
            newAmounts[t.purchase_invoice_id] = (newAmounts[t.purchase_invoice_id] || 0) + Math.abs(t.amount || 0)
            if (!newBreakdowns[t.purchase_invoice_id]) newBreakdowns[t.purchase_invoice_id] = []
            newBreakdowns[t.purchase_invoice_id].push({ method: t.payment_method || 'نقد', amount: Math.abs(t.amount || 0) })
            if (t.record_id) {
              if (!newDrawerRecordIds[t.purchase_invoice_id]) newDrawerRecordIds[t.purchase_invoice_id] = []
              if (!newDrawerRecordIds[t.purchase_invoice_id].includes(t.record_id)) newDrawerRecordIds[t.purchase_invoice_id].push(t.record_id)
            }
          }
        })
      }
    }

    return { newAmounts, newBreakdowns, newDrawerRecordIds }
  }, [])

  // Fetch items cache for a batch
  const fetchItemsForBatch = useCallback(async (saleIds: string[], purchaseIds: string[]) => {
    const newSaleItems: Record<string, any[]> = {}
    const newPurchaseItems: Record<string, any[]> = {}

    if (saleIds.length > 0) {
      const { data } = await supabase
        .from('sale_items')
        .select(`
          id, sale_id, quantity, unit_price, discount, notes,
          product:products(id, name, barcode, category:categories(name))
        `)
        .in('sale_id', saleIds)

      data?.forEach((item: any) => {
        if (!newSaleItems[item.sale_id]) newSaleItems[item.sale_id] = []
        newSaleItems[item.sale_id].push(item)
      })
    }

    if (purchaseIds.length > 0) {
      const { data } = await supabase
        .from('purchase_invoice_items')
        .select(`
          id, purchase_invoice_id, quantity, unit_purchase_price, notes,
          product:products(id, name, barcode, category:categories(name))
        `)
        .in('purchase_invoice_id', purchaseIds)

      data?.forEach((item: any) => {
        const invoiceId = item.purchase_invoice_id
        if (invoiceId) {
          if (!newPurchaseItems[invoiceId]) newPurchaseItems[invoiceId] = []
          newPurchaseItems[invoiceId].push(item)
        }
      })
    }

    return { newSaleItems, newPurchaseItems }
  }, [])

  // Fetch first page
  const fetchFirstPage = useCallback(async () => {
    const { allRecordIds, selectedDrawerFilters } = optionsRef.current
    if (!enabled || allRecordIds.length === 0) return

    setIsLoading(true)
    setSales([])
    setPurchaseInvoices([])
    setPaidAmounts({})
    setPaymentBreakdowns({})
    setSaleItemsCache({})
    setPurchaseItemsCache({})
    setSalesCursor(null)
    setPurchasesCursor(null)
    setHasMoreSales(true)
    setHasMorePurchases(true)
    drawerSaleIdsRef.current = null
    drawerPurchaseIdsRef.current = null

    try {
      // If drawer filter active, fetch all matching IDs upfront
      let dSaleIds: string[] | null = null
      let dPurchaseIds: string[] | null = null
      if (selectedDrawerFilters && selectedDrawerFilters.size > 0) {
        ;[dSaleIds, dPurchaseIds] = await Promise.all([
          fetchDrawerSaleIds(),
          fetchDrawerPurchaseIds()
        ])
        drawerSaleIdsRef.current = dSaleIds
        drawerPurchaseIdsRef.current = dPurchaseIds
      }

      // Fetch first page from both tables in parallel
      const [salesResult, purchasesResult] = await Promise.all([
        fetchSalesPage(null, dSaleIds),
        fetchPurchasesPage(null, dPurchaseIds)
      ])

      const newSales = salesResult.data
      const newPurchases = purchasesResult.data

      setSales(newSales)
      setPurchaseInvoices(newPurchases)
      setHasMoreSales(salesResult.hasMore)
      setHasMorePurchases(purchasesResult.hasMore)

      // Set cursors
      if (newSales.length > 0 && salesResult.hasMore) {
        const last = newSales[newSales.length - 1]
        setSalesCursor({ created_at: last.created_at || '', id: last.id })
      } else {
        setHasMoreSales(false)
      }

      if (newPurchases.length > 0 && purchasesResult.hasMore) {
        const last = newPurchases[newPurchases.length - 1]
        setPurchasesCursor({ created_at: last.created_at || '', id: last.id })
      } else {
        setHasMorePurchases(false)
      }

      // Fetch secondary data
      const saleIds = newSales.map((s: any) => s.id)
      const purchaseIds = newPurchases.map((p: any) => p.id)

      const [{ newAmounts, newBreakdowns, newDrawerRecordIds }, { newSaleItems, newPurchaseItems }] = await Promise.all([
        fetchPaidAmountsForBatch(saleIds, purchaseIds),
        fetchItemsForBatch(saleIds, purchaseIds)
      ])

      setPaidAmounts(newAmounts)
      setPaymentBreakdowns(newBreakdowns)
      setDrawerRecordIds(newDrawerRecordIds)
      setSaleItemsCache(newSaleItems)
      setPurchaseItemsCache(newPurchaseItems)

    } catch (err) {
      console.error('Error fetching safe invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, fetchSalesPage, fetchPurchasesPage, fetchDrawerSaleIds, fetchDrawerPurchaseIds, fetchPaidAmountsForBatch, fetchItemsForBatch])

  // Load more
  const loadMore = useCallback(async () => {
    if (!enabled || (!hasMoreSales && !hasMorePurchases) || isLoadingMore) return

    setIsLoadingMore(true)

    try {
      const promises: Promise<{ type: 'sales' | 'purchases'; data: any[]; hasMore: boolean }>[] = []

      if (hasMoreSales && salesCursor) {
        promises.push(
          fetchSalesPage(salesCursor, drawerSaleIdsRef.current).then(r => ({ type: 'sales' as const, ...r }))
        )
      }
      if (hasMorePurchases && purchasesCursor) {
        promises.push(
          fetchPurchasesPage(purchasesCursor, drawerPurchaseIdsRef.current).then(r => ({ type: 'purchases' as const, ...r }))
        )
      }

      const results = await Promise.all(promises)

      let newSaleIds: string[] = []
      let newPurchaseIds: string[] = []

      for (const result of results) {
        if (result.type === 'sales') {
          if (result.data.length > 0) {
            setSales(prev => [...prev, ...result.data])
            newSaleIds = result.data.map((s: any) => s.id)
            if (result.hasMore) {
              const last = result.data[result.data.length - 1]
              setSalesCursor({ created_at: last.created_at || '', id: last.id })
            }
          }
          setHasMoreSales(result.hasMore && result.data.length > 0)
        } else {
          if (result.data.length > 0) {
            setPurchaseInvoices(prev => [...prev, ...result.data])
            newPurchaseIds = result.data.map((p: any) => p.id)
            if (result.hasMore) {
              const last = result.data[result.data.length - 1]
              setPurchasesCursor({ created_at: last.created_at || '', id: last.id })
            }
          }
          setHasMorePurchases(result.hasMore && result.data.length > 0)
        }
      }

      // Fetch secondary data for the new batch
      if (newSaleIds.length > 0 || newPurchaseIds.length > 0) {
        const [{ newAmounts, newBreakdowns, newDrawerRecordIds }, { newSaleItems, newPurchaseItems }] = await Promise.all([
          fetchPaidAmountsForBatch(newSaleIds, newPurchaseIds),
          fetchItemsForBatch(newSaleIds, newPurchaseIds)
        ])

        setPaidAmounts(prev => ({ ...prev, ...newAmounts }))
        setPaymentBreakdowns(prev => ({ ...prev, ...newBreakdowns }))
        setDrawerRecordIds(prev => ({ ...prev, ...newDrawerRecordIds }))
        setSaleItemsCache(prev => ({ ...prev, ...newSaleItems }))
        setPurchaseItemsCache(prev => ({ ...prev, ...newPurchaseItems }))
      }

    } catch (err) {
      console.error('Error loading more safe invoices:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [enabled, hasMoreSales, hasMorePurchases, isLoadingMore, salesCursor, purchasesCursor, fetchSalesPage, fetchPurchasesPage, fetchPaidAmountsForBatch, fetchItemsForBatch])

  // Refresh
  const refresh = useCallback(async () => {
    await fetchFirstPage()
  }, [fetchFirstPage])

  // Auto-fetch on option changes
  useEffect(() => {
    if (enabled && optionsRef.current.allRecordIds.length > 0) {
      fetchFirstPage()
    }
  }, [
    enabled,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    options.allRecordIds.join(','),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    options.filteredRecordIds.join(','),
    options.selectedDrawerFilters,
    options.nonDrawerExcludeTransfers,
    options.nonDrawerTransfersOnly,
    options.dateFilter?.type,
    options.dateFilter?.startDate?.toString(),
    options.dateFilter?.endDate?.toString()
  ])

  return {
    sales,
    purchaseInvoices,
    paidAmounts,
    paymentBreakdowns,
    drawerRecordIds,
    saleItemsCache,
    purchaseItemsCache,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh
  }
}

export default useInfiniteSafeInvoices
