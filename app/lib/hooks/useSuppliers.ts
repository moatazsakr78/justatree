'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  category: string | null
  group_id: string | null
  account_balance: number | null
  opening_balance: number | null
  credit_limit: number | null
  rank: string | null
  city: string | null
  country: string | null
  tax_id: string | null
  company_name: string | null
  notes: string | null
  total_purchases: number | null
  last_purchase: string | null
  loyalty_points: number | null
  is_test: boolean | null
}

// Default supplier ID that should never be deleted
export const DEFAULT_SUPPLIER_ID = '00000000-0000-0000-0000-000000000001'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  // ✨ OPTIMIZED: Memoized fetch function with caching
  const fetchSuppliers = useCallback(async (force = false) => {
    try {
      // Simple cache: don't refetch if less than 5 seconds since last fetch (unless forced)
      const now = Date.now()
      if (!force && lastFetch && now - lastFetch < 5000) {
        console.log('⚡ Using cached suppliers data (< 5s old)')
        return
      }

      setIsLoading(true)
      setError(null)

      console.time('⚡ Fetch suppliers')

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.timeEnd('⚡ Fetch suppliers')

      setSuppliers((data || []).map((supplier: any) => ({
        ...supplier,
        loyalty_points: supplier.loyalty_points || 0
      })))
      setLastFetch(now)
      setError(null)
    } catch (err) {
      console.error('❌ Error fetching suppliers:', err)
      setError('فشل في تحميل الموردين')
      setSuppliers([])
    } finally {
      setIsLoading(false)
    }
  }, [lastFetch])

  // ✨ OPTIMIZED: Memoized helper functions
  const isDefaultSupplier = useCallback((supplierId: string): boolean => {
    return supplierId === DEFAULT_SUPPLIER_ID
  }, [])

  const getDefaultSupplier = useCallback((): Supplier | null => {
    return suppliers.find(supplier => supplier.id === DEFAULT_SUPPLIER_ID) || null
  }, [suppliers])

  // Initial fetch
  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])


  return {
    suppliers,
    setSuppliers, // ✨ Expose for optimistic updates
    isLoading,
    error,
    refetch: () => fetchSuppliers(true), // Force refetch
    isDefaultSupplier,
    getDefaultSupplier
  }
}