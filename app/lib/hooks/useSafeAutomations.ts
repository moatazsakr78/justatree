'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SafeAutomation {
  id: string
  record_id: string
  name: string
  operation_type: 'withdraw' | 'deposit' | 'transfer'
  source_id: string
  all_mode: 'full' | 'excluding_reserves' | null
  amount_type: 'fixed' | 'all_available' | 'all_excluding_reserves'
  fixed_amount: number
  target_record_id: string | null
  notes_template: string
  schedule_type: 'daily' | 'weekly' | 'monthly'
  schedule_time: string
  schedule_days_of_week: number[] | null
  schedule_day_of_month: number | null
  is_active: boolean
  last_executed_at: string | null
  last_execution_status: string | null
  next_scheduled_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  safe_automation_logs?: {
    id: string
    status: string
    message: string | null
    amount_executed: number | null
    executed_at: string
  }[]
}

export interface CreateAutomationData {
  record_id: string
  name: string
  operation_type: string
  source_id?: string
  all_mode?: string | null
  amount_type: string
  fixed_amount?: number
  target_record_id?: string | null
  notes_template?: string
  schedule_type: string
  schedule_time?: string
  schedule_days_of_week?: number[] | null
  schedule_day_of_month?: number | null
  created_by?: string
}

export function useSafeAutomations(recordId: string | null) {
  const [automations, setAutomations] = useState<SafeAutomation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAutomations = useCallback(async () => {
    if (!recordId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/safe-automations?record_id=${recordId}`)
      if (res.ok) {
        const data = await res.json()
        setAutomations(data)
      }
    } catch (e) {
      console.error('Error fetching automations:', e)
    } finally {
      setIsLoading(false)
    }
  }, [recordId])

  useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  const createAutomation = useCallback(async (data: CreateAutomationData) => {
    const res = await fetch('/api/safe-automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create automation')
    }
    const created = await res.json()
    setAutomations(prev => [created, ...prev])
    return created
  }, [])

  const updateAutomation = useCallback(async (id: string, data: Partial<SafeAutomation>) => {
    const res = await fetch(`/api/safe-automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update automation')
    }
    const updated = await res.json()
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    return updated
  }, [])

  const deleteAutomation = useCallback(async (id: string) => {
    const res = await fetch(`/api/safe-automations/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to delete automation')
    }
    setAutomations(prev => prev.filter(a => a.id !== id))
  }, [])

  const toggleActive = useCallback(async (id: string) => {
    const auto = automations.find(a => a.id === id)
    if (!auto) return
    return updateAutomation(id, { is_active: !auto.is_active } as any)
  }, [automations, updateAutomation])

  const executeNow = useCallback(async (id: string) => {
    const res = await fetch(`/api/safe-automations/${id}/execute`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to execute automation')
    }
    const result = await res.json()
    // Refresh to get updated last_executed_at
    await fetchAutomations()
    return result
  }, [fetchAutomations])

  return {
    automations,
    isLoading,
    refresh: fetchAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleActive,
    executeNow
  }
}
