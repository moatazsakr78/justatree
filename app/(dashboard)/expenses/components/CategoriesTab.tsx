'use client'

import { useState, useCallback } from 'react'
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline'
import ExpenseCategoryTree from './ExpenseCategoryTree'
import ExpenseCategorySidebar from './ExpenseCategorySidebar'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import type { CategoryTreeNode } from '../services/expenseService'
import { useActivityLogger } from '@/app/lib/hooks/useActivityLogger'

export default function CategoriesTab() {
  const logActivity = useActivityLogger()
  const { categories, tree, isLoading, refresh, addCategory, editCategory, removeCategory } = useExpenseCategories()
  const [selectedNode, setSelectedNode] = useState<CategoryTreeNode | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  // Apply expanded state to tree
  const treeWithExpansion = applyExpansion(tree, expandedIds)

  const handleAddCategory = () => {
    setIsEditing(false)
    setIsSidebarOpen(true)
  }

  const handleEditCategory = () => {
    if (!selectedNode) return
    setIsEditing(true)
    setIsSidebarOpen(true)
  }

  const handleSaved = () => {
    refresh()
  }

  const handleAdd = async (params: { name: string; parentId?: string | null; color?: string }) => {
    const result = await addCategory(params)
    logActivity({
      entityType: 'expense' as any,
      actionType: 'create',
      entityId: result.id,
      entityName: result.name,
      description: `إضافة تصنيف مصروفات: ${result.name}`,
    })
    return result
  }

  const handleEdit = async (id: string, params: any) => {
    const result = await editCategory(id, params)
    logActivity({
      entityType: 'expense' as any,
      actionType: 'update',
      entityId: id,
      entityName: params.name || selectedNode?.name || '',
      description: `تعديل تصنيف مصروفات`,
    })
    return result
  }

  const handleDelete = async (id: string) => {
    const name = selectedNode?.name || ''
    await removeCategory(id)
    setSelectedNode(null)
    logActivity({
      entityType: 'expense' as any,
      actionType: 'delete',
      entityId: id,
      entityName: name,
      description: `حذف تصنيف مصروفات: ${name}`,
    })
  }

  return (
    <div className="flex h-full" style={{ minHeight: 'calc(100vh - 280px)' }}>
      {/* Tree View */}
      <div className="w-64 bg-[var(--dash-bg-raised)] border-l border-[var(--dash-border-subtle)] flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--dash-border-subtle)]">
          <span className="text-sm font-semibold text-[var(--dash-text-primary)]">التصنيفات</span>
          <div className="flex gap-1">
            {selectedNode && (
              <button
                onClick={handleEditCategory}
                className="p-1.5 rounded-md hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-yellow-400"
                title="تعديل"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleAddCategory}
              className="p-1.5 rounded-md hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-blue-400"
              title="إضافة تصنيف"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <ExpenseCategoryTree
            tree={treeWithExpansion}
            selectedId={selectedNode?.id || null}
            onSelect={setSelectedNode}
            onToggle={handleToggle}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Main Content / Sidebar */}
      {isSidebarOpen ? (
        <ExpenseCategorySidebar
          isOpen={isSidebarOpen}
          onClose={() => { setIsSidebarOpen(false); setIsEditing(false) }}
          categories={categories}
          onSave={handleSaved}
          editNode={isEditing ? selectedNode : null}
          isEditing={isEditing}
          selectedNode={selectedNode}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--dash-text-muted)]">
          <div className="text-center">
            <p className="text-lg mb-2">
              {selectedNode ? `التصنيف: ${selectedNode.name}` : 'اختر تصنيف أو أضف تصنيف جديد'}
            </p>
            {selectedNode && (
              <p className="text-sm">
                {selectedNode.children.length > 0
                  ? `يحتوي على ${selectedNode.children.length} تصنيف فرعي`
                  : 'لا يحتوي على تصنيفات فرعية'}
              </p>
            )}
            <button
              onClick={handleAddCategory}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              + إضافة تصنيف جديد
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to apply expanded state to tree nodes
function applyExpansion(nodes: CategoryTreeNode[], expandedIds: Set<string>): CategoryTreeNode[] {
  return nodes.map(node => ({
    ...node,
    isExpanded: expandedIds.has(node.id),
    children: applyExpansion(node.children, expandedIds),
  }))
}
