import { useState, useEffect, useCallback } from 'react'
import {
  fetchExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  buildCategoryTree,
  type ExpenseCategory,
  type CategoryTreeNode,
} from '../services/expenseService'

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [tree, setTree] = useState<CategoryTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchExpenseCategories()
      setCategories(data)
      setTree(buildCategoryTree(data))
    } catch (err: any) {
      console.error('Error loading expense categories:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addCategory = useCallback(async (params: {
    name: string
    parentId?: string | null
    icon?: string
    color?: string
  }) => {
    const newCat = await createExpenseCategory(params)
    await load()
    return newCat
  }, [load])

  const editCategory = useCallback(async (
    id: string,
    params: { name?: string; parentId?: string | null; icon?: string; color?: string; is_active?: boolean }
  ) => {
    const updated = await updateExpenseCategory(id, params)
    await load()
    return updated
  }, [load])

  const removeCategory = useCallback(async (id: string) => {
    await deleteExpenseCategory(id)
    await load()
  }, [load])

  return {
    categories,
    tree,
    isLoading,
    error,
    refresh: load,
    addCategory,
    editCategory,
    removeCategory,
  }
}
