'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  FolderIcon,
  FolderOpenIcon,
  CalendarDaysIcon,
  FunnelIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useExpenses } from '../hooks/useExpenses'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { deleteExpense, buildCategoryTree, type Expense, type CategoryTreeNode } from '../services/expenseService'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import { useActivityLogger } from '@/app/lib/hooks/useActivityLogger'
import { supabase } from '@/app/lib/supabase/client'
import ResizableTable from '@/app/components/tables/ResizableTable'
import ExpenseCategoryTree from './ExpenseCategoryTree'
import type { DateFilter } from '@/app/components/SimpleDateFilterModal'
import { getDateFilterLabel } from '@/app/lib/utils/dateFilters'

const SimpleDateFilterModal = dynamic(() => import('@/app/components/SimpleDateFilterModal'), { ssr: false })
const SimpleFilterModal = dynamic(() => import('@/app/components/SimpleFilterModal'), { ssr: false })
const MultiFilterModal = dynamic(() => import('@/app/components/MultiFilterModal'), { ssr: false })

interface ExpensesTabProps {
  onAddExpense: () => void
  refreshTrigger?: number
}

export default function ExpensesTab({ onAddExpense, refreshTrigger }: ExpensesTabProps) {
  const formatPrice = useFormatPrice()
  const logActivity = useActivityLogger()
  const { categories, tree } = useExpenseCategories()

  // Filter states
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' })
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSafeId, setSelectedSafeId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // UI states
  const [isGroupsHidden, setIsGroupsHidden] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showSimpleFilter, setShowSimpleFilter] = useState(false)
  const [showMultiFilter, setShowMultiFilter] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showActions, setShowActions] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const { expenses, isLoading, isLoadingMore, hasMore, loadMore, refresh, totalAmount, count } = useExpenses({
    categoryId: selectedCategoryId || undefined,
    recordId: selectedSafeId || undefined,
    dateFilter: dateFilter as any,
    searchTerm: debouncedSearch || undefined,
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger) refresh()
  }, [refreshTrigger])

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore()
    }
  }, [isLoadingMore, hasMore, loadMore])

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`هل أنت متأكد من حذف هذا المصروف؟\n${expense.description} - ${expense.amount}`)) return

    try {
      await deleteExpense(expense)
      logActivity({
        entityType: 'expense' as any,
        actionType: 'delete',
        entityId: expense.id,
        entityName: expense.description,
        description: `حذف مصروف: ${expense.description} - ${expense.amount}`,
      })
      setSelectedExpense(null)
      refresh()
    } catch (error: any) {
      alert(`خطأ: ${error.message}`)
    }
  }

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const handleCategorySelect = (node: CategoryTreeNode | null) => {
    setSelectedCategoryId(node?.id || '')
  }

  const handleSimpleFilterApply = (filters: any) => {
    setSelectedSafeId(filters.safeId || '')
    if (filters.categoryId) setSelectedCategoryId(filters.categoryId)
  }

  const handleMultiFilterApply = (filters: any) => {
    if (filters.safeIds?.length === 1) {
      setSelectedSafeId(filters.safeIds[0])
    } else if (filters.safeIds?.length > 1) {
      setSelectedSafeId(filters.safeIds[0])
    } else {
      setSelectedSafeId('')
    }
  }

  const treeWithExpansion = applyExpansion(tree, expandedIds)

  // Table columns
  const tableColumns = [
    {
      id: 'index',
      header: '#',
      accessor: '#',
      width: 50,
      render: (_value: any, _item: any, index: number) => (
        <span className="text-[var(--dash-text-muted)] font-medium">{index + 1}</span>
      ),
    },
    {
      id: 'created_at',
      header: 'التاريخ',
      accessor: 'created_at',
      width: 140,
      render: (value: string) => (
        <span className="text-[var(--dash-text-secondary)]">{formatDate(value)}</span>
      ),
    },
    {
      id: 'description',
      header: 'الوصف',
      accessor: 'description',
      width: 250,
      render: (value: string) => (
        <span className="text-[var(--dash-text-primary)] font-medium">{value}</span>
      ),
    },
    {
      id: 'category_name',
      header: 'التصنيف',
      accessor: 'category_name',
      width: 150,
      render: (value: string, item: Expense) => value ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
          style={{
            backgroundColor: (item.category_color || '#3b82f6') + '20',
            color: item.category_color || '#93c5fd',
          }}
        >
          {value}
        </span>
      ) : null,
    },
    {
      id: 'amount',
      header: 'المبلغ',
      accessor: 'amount',
      width: 140,
      render: (value: number) => (
        <span className="text-red-400 font-semibold">- {formatPrice(value)}</span>
      ),
    },
    {
      id: 'safe_name',
      header: 'الخزنة',
      accessor: 'safe_name',
      width: 140,
      render: (value: string) => value ? (
        <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-green-500/15 text-green-400">
          {value}
        </span>
      ) : null,
    },
    {
      id: 'performed_by',
      header: 'بواسطة',
      accessor: 'performed_by',
      width: 120,
      render: (value: string) => (
        <span className="text-[var(--dash-text-muted)]">{value}</span>
      ),
    },
    ...(showActions ? [{
      id: 'actions',
      header: 'الإجراءات',
      accessor: 'id',
      width: 100,
      render: (_value: any, item: Expense) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); /* edit */ }}
            className="p-1.5 rounded hover:bg-yellow-500/20 text-[var(--dash-text-muted)] hover:text-yellow-400 transition-colors"
            title="تعديل"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteExpense(item) }}
            className="p-1.5 rounded hover:bg-red-500/20 text-[var(--dash-text-muted)] hover:text-red-400 transition-colors"
            title="حذف"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    }] : []),
  ]

  // Check if any filter is active
  const hasActiveFilters = dateFilter.type !== 'all' || selectedCategoryId || selectedSafeId || debouncedSearch

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar (single bar) */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[var(--dash-border-subtle)]">
        {/* Search */}
        <div className="relative flex-1 max-w-[220px]">
          <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg pr-8 pl-3 py-1.5 text-xs text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
            placeholder="بحث..."
          />
        </div>

        {/* Simple Filter */}
        <button
          onClick={() => setShowSimpleFilter(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]/30 transition-colors"
          title="فلتر بسيط"
        >
          <FunnelIcon className="h-3.5 w-3.5" />
          فلتر بسيط
        </button>

        {/* Multi Filter */}
        <button
          onClick={() => setShowMultiFilter(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]/30 transition-colors"
          title="فلتر متعدد"
        >
          <FunnelIcon className="h-3.5 w-3.5" />
          فلتر متعدد
        </button>

        {/* Groups toggle */}
        <button
          onClick={() => setIsGroupsHidden(!isGroupsHidden)}
          className="p-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-colors bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] flex-shrink-0"
          title={isGroupsHidden ? 'إظهار التصنيفات' : 'إخفاء التصنيفات'}
        >
          {isGroupsHidden ? (
            <FolderIcon className="h-4 w-4" />
          ) : (
            <FolderOpenIcon className="h-4 w-4" />
          )}
        </button>

        {/* Actions toggle */}
        <button
          onClick={() => setShowActions(!showActions)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
            showActions
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] border-[var(--dash-border-subtle)] hover:text-[var(--dash-text-secondary)]'
          }`}
        >
          <PencilIcon className="h-3.5 w-3.5" />
          الإجراءات
        </button>

        {/* Summary */}
        <div className="mr-auto flex items-center gap-3 text-xs text-[var(--dash-text-muted)]">
          <span>{count} مصروف</span>
          <span className="text-red-400 font-medium">{formatPrice(totalAmount)}</span>
        </div>
      </div>

      {/* Content Area with Sidebar + Table */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        {!isGroupsHidden && (
          <div className="w-64 bg-[var(--dash-bg-raised)] border-l border-[var(--dash-border-subtle)] flex flex-col flex-shrink-0">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <ExpenseCategoryTree
                tree={treeWithExpansion}
                selectedId={selectedCategoryId}
                onSelect={handleCategorySelect}
                onToggle={handleToggle}
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-[var(--dash-text-muted)]">جاري التحميل...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-[var(--dash-text-muted)] mb-3">لا توجد مصروفات</p>
              <button onClick={onAddExpense} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                + تسجيل مصروف جديد
              </button>
            </div>
          ) : (
            <ResizableTable
              className="h-full w-full"
              columns={tableColumns}
              data={expenses}
              reportType="EXPENSES_REPORT"
              selectedRowId={selectedExpense?.id || null}
              onRowClick={(item) => {
                if (selectedExpense?.id === item.id) {
                  setSelectedExpense(null)
                } else {
                  setSelectedExpense(item)
                }
              }}
            />
          )}

          {isLoadingMore && (
            <div className="p-4 text-center text-xs text-[var(--dash-text-muted)]">جاري تحميل المزيد...</div>
          )}
        </div>
      </div>

      {/* Date Filter Button (bottom-right like safes) */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-center">
        <button
          onClick={() => setShowDateFilter(true)}
          className="bg-dash-accent-blue hover:brightness-[0.88] text-[var(--dash-text-primary)] rounded-lg py-2 px-8 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <CalendarDaysIcon className="h-4 w-4" />
          <span>التاريخ</span>
        </button>
        {dateFilter.type !== 'all' && (
          <div className="mt-1 text-center">
            <span className="text-xs text-dash-accent-purple">
              {dateFilter.type === 'today' && 'عرض مصروفات اليوم'}
              {dateFilter.type === 'current_week' && 'عرض مصروفات الأسبوع الحالي'}
              {dateFilter.type === 'last_week' && 'عرض مصروفات الأسبوع الماضي'}
              {dateFilter.type === 'current_month' && 'عرض مصروفات الشهر الحالي'}
              {dateFilter.type === 'last_month' && 'عرض مصروفات الشهر الماضي'}
              {dateFilter.type === 'custom' && (dateFilter as any).startDate && (dateFilter as any).endDate &&
                `من ${(dateFilter as any).startDate.toLocaleDateString('en-GB')} إلى ${(dateFilter as any).endDate.toLocaleDateString('en-GB')}`}
            </span>
          </div>
        )}
      </div>

      {/* Filter Modals */}
      <SimpleDateFilterModal
        isOpen={showDateFilter}
        onClose={() => setShowDateFilter(false)}
        onDateFilterChange={(filter) => setDateFilter(filter)}
        currentFilter={dateFilter}
      />
      <SimpleFilterModal
        isOpen={showSimpleFilter}
        onClose={() => setShowSimpleFilter(false)}
        onApply={handleSimpleFilterApply}
      />
      <MultiFilterModal
        isOpen={showMultiFilter}
        onClose={() => setShowMultiFilter(false)}
        onApply={handleMultiFilterApply}
      />
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function applyExpansion(nodes: CategoryTreeNode[], expandedIds: Set<string>): CategoryTreeNode[] {
  return nodes.map(node => ({
    ...node,
    isExpanded: expandedIds.has(node.id),
    children: applyExpansion(node.children, expandedIds),
  }))
}
