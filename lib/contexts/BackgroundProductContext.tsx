'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  type BackgroundProductTask,
  type BackgroundProductSnapshot,
  type BackgroundTaskStatus,
  executeProductCreation,
  retryProductCreation,
  executeProductUpdate,
  retryProductUpdate
} from '@/app/lib/services/backgroundProductService'

interface BackgroundProductContextType {
  tasks: BackgroundProductTask[]
  activeTaskCount: number
  hasActiveTasks: boolean
  hasFailedTasks: boolean
  queueProductCreation: (
    snapshot: BackgroundProductSnapshot,
    createProduct: (data: Record<string, any>) => Promise<any>,
    onComplete?: () => void
  ) => void
  queueProductUpdate: (
    snapshot: BackgroundProductSnapshot,
    updateProduct: (productId: string, data: Record<string, any>) => Promise<any>,
    onComplete?: () => void
  ) => void
  retryTask: (taskId: string) => void
  dismissTask: (taskId: string) => void
  dismissAllCompleted: () => void
}

const BackgroundProductContext = createContext<BackgroundProductContextType | undefined>(undefined)

export function BackgroundProductProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundProductTask[]>([])
  const createProductFnRef = useRef<Map<string, (data: Record<string, any>) => Promise<any>>>(new Map())
  const updateProductFnRef = useRef<Map<string, (id: string, data: Record<string, any>) => Promise<any>>>(new Map())
  const onCompleteFnRef = useRef<Map<string, () => void>>(new Map())

  const activeTaskCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length
  const hasActiveTasks = activeTaskCount > 0
  const hasFailedTasks = tasks.some(t => t.status === 'failed')

  // beforeunload protection
  useEffect(() => {
    if (!hasActiveTasks) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasActiveTasks])

  const handleStatusChange = useCallback((taskId: string, status: BackgroundTaskStatus, progress: number) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status, progress } : t
    ))
  }, [])

  const handleComplete = useCallback((taskId: string, productId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'completed' as const, progress: 100, savedProductId: productId } : t
    ))
    // Clear File references for GC
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      return {
        ...t,
        snapshot: {
          ...t.snapshot,
          mainImageFile: null,
          additionalImageFiles: [],
          pendingVideoFiles: [],
          productColors: t.snapshot.productColors.map(c => ({ ...c, imageFile: undefined })),
          productShapes: t.snapshot.productShapes.map(s => ({ ...s, imageFile: undefined }))
        }
      }
    }))
    // Call onComplete callback (triggers fetchProducts)
    const cb = onCompleteFnRef.current.get(taskId)
    if (cb) {
      cb()
      onCompleteFnRef.current.delete(taskId)
    }
    createProductFnRef.current.delete(taskId)
    updateProductFnRef.current.delete(taskId)

    // Auto-dismiss completed task after 3 seconds
    setTimeout(() => {
      setTasks(prev => {
        const task = prev.find(t => t.id === taskId)
        if (task && task.status === 'completed') {
          createProductFnRef.current.delete(taskId)
          updateProductFnRef.current.delete(taskId)
          onCompleteFnRef.current.delete(taskId)
          return prev.filter(t => t.id !== taskId)
        }
        return prev
      })
    }, 3000)
  }, [])

  const handleError = useCallback((taskId: string, error: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'failed' as const, error } : t
    ))
  }, [])

  const queueProductCreation = useCallback((
    snapshot: BackgroundProductSnapshot,
    createProduct: (data: Record<string, any>) => Promise<any>,
    onComplete?: () => void
  ) => {
    const taskId = `bg-product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const task: BackgroundProductTask = {
      id: taskId,
      type: 'create',
      productName: snapshot.productData.name || 'منتج جديد',
      status: 'queued',
      progress: 0,
      snapshot,
      createdAt: Date.now()
    }

    createProductFnRef.current.set(taskId, createProduct)
    if (onComplete) {
      onCompleteFnRef.current.set(taskId, onComplete)
    }

    setTasks(prev => [...prev, task])

    // Start execution async
    const callbacks = {
      onStatusChange: handleStatusChange,
      onComplete: handleComplete,
      onError: handleError
    }
    executeProductCreation(task, callbacks, createProduct)
  }, [handleStatusChange, handleComplete, handleError])

  const queueProductUpdate = useCallback((
    snapshot: BackgroundProductSnapshot,
    updateProduct: (productId: string, data: Record<string, any>) => Promise<any>,
    onComplete?: () => void
  ) => {
    const taskId = `bg-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const task: BackgroundProductTask = {
      id: taskId,
      type: 'update',
      productName: snapshot.productData.name || 'تحديث منتج',
      status: 'queued',
      progress: 0,
      snapshot,
      createdAt: Date.now()
    }

    updateProductFnRef.current.set(taskId, updateProduct)
    if (onComplete) {
      onCompleteFnRef.current.set(taskId, onComplete)
    }

    setTasks(prev => [...prev, task])

    const callbacks = {
      onStatusChange: handleStatusChange,
      onComplete: handleComplete,
      onError: handleError
    }
    executeProductUpdate(task, callbacks, updateProduct)
  }, [handleStatusChange, handleComplete, handleError])

  const retryTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status !== 'failed') return

    const callbacks = {
      onStatusChange: handleStatusChange,
      onComplete: handleComplete,
      onError: handleError
    }

    // Reset error
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, error: undefined, status: 'queued' as const, progress: 0 } : t
    ))

    if (task.type === 'update') {
      const updateFn = updateProductFnRef.current.get(taskId)
      if (!updateFn) return
      retryProductUpdate(task, callbacks, updateFn)
    } else {
      const createFn = createProductFnRef.current.get(taskId)
      if (!createFn) return
      retryProductCreation(task, callbacks, createFn)
    }
  }, [tasks, handleStatusChange, handleComplete, handleError])

  const dismissTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    createProductFnRef.current.delete(taskId)
    updateProductFnRef.current.delete(taskId)
    onCompleteFnRef.current.delete(taskId)
  }, [])

  const dismissAllCompleted = useCallback(() => {
    setTasks(prev => {
      const toRemove = prev.filter(t => t.status === 'completed')
      toRemove.forEach(t => {
        createProductFnRef.current.delete(t.id)
        updateProductFnRef.current.delete(t.id)
        onCompleteFnRef.current.delete(t.id)
      })
      return prev.filter(t => t.status !== 'completed')
    })
  }, [])

  const value: BackgroundProductContextType = {
    tasks,
    activeTaskCount,
    hasActiveTasks,
    hasFailedTasks,
    queueProductCreation,
    queueProductUpdate,
    retryTask,
    dismissTask,
    dismissAllCompleted
  }

  return (
    <BackgroundProductContext.Provider value={value}>
      {children}
    </BackgroundProductContext.Provider>
  )
}

export function useBackgroundProduct() {
  const context = useContext(BackgroundProductContext)
  if (context === undefined) {
    throw new Error('useBackgroundProduct must be used within a BackgroundProductProvider')
  }
  return context
}
