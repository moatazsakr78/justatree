'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'

export interface Customer {
  id: string
  name: string
  phone: string | null
  backup_phone: string | null
  email: string | null
  address: string | null
  city: string | null
  loyalty_points: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  group_id: string | null
  rank: string | null
  category: string | null
  credit_limit: number | null
  account_balance: number | null
  company_name: string | null
  contact_person: string | null
  country: string | null
  tax_id: string | null
  notes: string | null
  user_id: string | null
  profile_image_url: string | null
  governorate: string | null
  default_record_id: string | null
  default_price_type: string | null
}

// Default customer ID that should never be deleted
export const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  // ✨ OPTIMIZED: Memoized fetch function with caching
  const fetchCustomers = useCallback(async (force = false) => {
    try {
      // Simple cache: don't refetch if less than 5 seconds since last fetch (unless forced)
      const now = Date.now()
      if (!force && lastFetch && now - lastFetch < 5000) {
        console.log('⚡ Using cached customers data (< 5s old)')
        return
      }

      setIsLoading(true)
      setError(null)

      console.time('⚡ Fetch customers')

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.timeEnd('⚡ Fetch customers')

      setCustomers(data || [])
      setLastFetch(now)
      setError(null)
    } catch (err) {
      console.error('❌ Error fetching customers:', err)
      setError('فشل في تحميل العملاء')
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }, [lastFetch])

  // ✨ OPTIMIZED: Memoized helper functions
  const isDefaultCustomer = useCallback((customerId: string): boolean => {
    return customerId === DEFAULT_CUSTOMER_ID
  }, [])

  const getDefaultCustomer = useCallback((): Customer | null => {
    return customers.find(customer => customer.id === DEFAULT_CUSTOMER_ID) || null
  }, [customers])

  // Initial fetch
  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])


  return {
    customers,
    setCustomers, // ✨ Expose for optimistic updates
    isLoading,
    error,
    refetch: () => fetchCustomers(true), // Force refetch
    isDefaultCustomer,
    getDefaultCustomer
  }
}