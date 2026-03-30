import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase/client'
import type { Expense } from '../services/expenseService'

export interface DateFilter {
  type: 'all' | 'today' | 'week' | 'month' | 'custom'
  startDate?: string
  endDate?: string
}

export interface UseExpensesOptions {
  categoryId?: string
  recordId?: string
  dateFilter?: DateFilter
  searchTerm?: string
  enabled?: boolean
  pageSize?: number
}

export interface UseExpensesReturn {
  expenses: Expense[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  error: string | null
  totalAmount: number
  count: number
}

export function useExpenses(options: UseExpensesOptions = {}): UseExpensesReturn {
  const { categoryId, recordId, dateFilter, searchTerm, enabled = true, pageSize = 50 } = options

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)

  const cursorRef = useRef<{ created_at: string; id: string } | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const buildQuery = useCallback((cursor?: { created_at: string; id: string } | null) => {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(pageSize)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (recordId) {
      query = query.eq('record_id', recordId)
    }

    if (searchTerm) {
      query = query.ilike('description', `%${searchTerm}%`)
    }

    if (dateFilter && dateFilter.type !== 'all') {
      const { startDate, endDate } = getDateRange(dateFilter)
      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)
    }

    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
    }

    return query
  }, [categoryId, recordId, dateFilter, searchTerm, pageSize])

  const fetchCategoryAndSafeNames = useCallback(async (items: any[]): Promise<Expense[]> => {
    const categoryIds = Array.from(new Set(items.map(e => e.category_id).filter(Boolean)))
    const recordIds = Array.from(new Set(items.map(e => e.record_id).filter(Boolean)))

    let categoryMap: Record<string, { name: string; color: string }> = {}
    let safeMap: Record<string, string> = {}

    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('expense_categories')
        .select('id, name, color')
        .in('id', categoryIds)
      if (cats) {
        categoryMap = Object.fromEntries((cats as any[]).map(c => [c.id, { name: c.name, color: c.color }]))
      }
    }

    if (recordIds.length > 0) {
      const { data: safes } = await supabase
        .from('records')
        .select('id, name')
        .in('id', recordIds)
      if (safes) {
        safeMap = Object.fromEntries((safes as any[]).map(s => [s.id, s.name]))
      }
    }

    return items.map(e => ({
      ...e,
      category_name: categoryMap[e.category_id]?.name || '',
      category_color: categoryMap[e.category_id]?.color || '',
      safe_name: safeMap[e.record_id] || '',
    }))
  }, [])

  const load = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)
    cursorRef.current = null

    try {
      const query = buildQuery()
      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const items = data || []
      const enriched = await fetchCategoryAndSafeNames(items)

      setExpenses(enriched)
      setHasMore(items.length >= pageSize)
      setTotalAmount(enriched.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))

      if (items.length > 0) {
        const last = items[items.length - 1] as any
        cursorRef.current = { created_at: last.created_at, id: last.id }
      }
    } catch (err: any) {
      console.error('Error loading expenses:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, buildQuery, fetchCategoryAndSafeNames, pageSize])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return

    setIsLoadingMore(true)
    try {
      const query = buildQuery(cursorRef.current)
      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const items = data || []
      const enriched = await fetchCategoryAndSafeNames(items)

      setExpenses(prev => {
        const updated = [...prev, ...enriched]
        setTotalAmount(updated.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))
        return updated
      })
      setHasMore(items.length >= pageSize)

      if (items.length > 0) {
        const last = items[items.length - 1] as any
        cursorRef.current = { created_at: last.created_at, id: last.id }
      }
    } catch (err: any) {
      console.error('Error loading more expenses:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, buildQuery, fetchCategoryAndSafeNames, pageSize])

  // Reload when filters change
  useEffect(() => {
    load()
  }, [load])

  return {
    expenses,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh: load,
    error,
    totalAmount,
    count: expenses.length,
  }
}

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  const now = new Date()

  switch (filter.type) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }
    case 'week': {
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    }
    case 'custom': {
      return { startDate: filter.startDate, endDate: filter.endDate }
    }
    default:
      return {}
  }
}
