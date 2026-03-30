'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  FolderIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useExpenses } from '../hooks/useExpenses'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { deleteExpense, type Expense, type CategoryTreeNode } from '../services/expenseService'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import { useActivityLogger } from '@/app/lib/hooks/useActivityLogger'
import ResizableTable from '@/app/components/tables/ResizableTable'
import type { DateFilter } from '@/app/components/SimpleDateFilterModal'

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

  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' })
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSafeId, setSelectedSafeId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showSimpleFilter, setShowSimpleFilter] = useState(false)
  const [showMultiFilter, setShowMultiFilter] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const { expenses, isLoading, isLoadingMore, hasMore, loadMore, refresh, totalAmount, count } = useExpenses({
    categoryId: selectedCategoryId || undefined,
    recordId: selectedSafeId || undefined,
    dateFilter: dateFilter as any,
    searchTerm: debouncedSearch || undefined,
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (refreshTrigger) refresh()
  }, [refreshTrigger])

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

  const handleSimpleFilterApply = (filters: any) => {
    setSelectedSafeId(filters.safeId || '')
    if (filters.categoryId) setSelectedCategoryId(filters.categoryId)
  }

  const handleMultiFilterApply = (filters: any) => {
    if (filters.safeIds?.length >= 1) setSelectedSafeId(filters.safeIds[0])
    else setSelectedSafeId('')
  }

  const treeWithExpansion = applyExpansion(tree, expandedIds)

  const tableColumns = [
    { id: 'index', header: '#', accessor: '#', width: 50,
      render: (_v: any, _i: any, idx: number) => <span className="text-[var(--dash-text-muted)] font-medium">{idx + 1}</span> },
    { id: 'created_at', header: 'التاريخ', accessor: 'created_at', width: 140,
      render: (v: string) => <span className="text-[var(--dash-text-secondary)]">{formatDate(v)}</span> },
    { id: 'description', header: 'الوصف', accessor: 'description', width: 250,
      render: (v: string) => <span className="text-[var(--dash-text-primary)] font-medium">{v}</span> },
    { id: 'category_name', header: 'التصنيف', accessor: 'category_name', width: 150,
      render: (v: string, item: Expense) => v ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
          style={{ backgroundColor: (item.category_color || '#3b82f6') + '20', color: item.category_color || '#93c5fd' }}>
          {v}
        </span>
      ) : null },
    { id: 'amount', header: 'المبلغ', accessor: 'amount', width: 140,
      render: (v: number) => <span className="text-red-400 font-semibold">- {formatPrice(v)}</span> },
    { id: 'safe_name', header: 'الخزنة', accessor: 'safe_name', width: 140,
      render: (v: string) => v ? <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-green-500/15 text-green-400">{v}</span> : null },
    { id: 'performed_by', header: 'بواسطة', accessor: 'performed_by', width: 120,
      render: (v: string) => <span className="text-[var(--dash-text-muted)]">{v}</span> },
    ...(showActions ? [{
      id: 'actions', header: 'الإجراءات', accessor: 'id', width: 100,
      render: (_v: any, item: Expense) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation() }} className="p-1.5 rounded hover:bg-yellow-500/20 text-[var(--dash-text-muted)] hover:text-yellow-400 transition-colors" title="تعديل">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteExpense(item) }} className="p-1.5 rounded hover:bg-red-500/20 text-[var(--dash-text-muted)] hover:text-red-400 transition-colors" title="حذف">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="flex h-full overflow-hidden flex-row-reverse">
      {/* Main Content (Table + Filter Bar) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[var(--dash-border-subtle)]">
          <div className="relative flex-1 max-w-[220px]">
            <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg pr-8 pl-3 py-1.5 text-xs text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
              placeholder="بحث..." />
          </div>
          <button onClick={() => setShowSimpleFilter(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]/30 transition-colors">
            <FunnelIcon className="h-3.5 w-3.5" /> فلتر بسيط
          </button>
          <button onClick={() => setShowMultiFilter(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)]/30 transition-colors">
            <FunnelIcon className="h-3.5 w-3.5" /> فلتر متعدد
          </button>
          <button onClick={() => setShowActions(!showActions)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              showActions ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] border-[var(--dash-border-subtle)] hover:text-[var(--dash-text-secondary)]'
            }`}>
            <PencilIcon className="h-3.5 w-3.5" /> الإجراءات
          </button>
          <div className="mr-auto flex items-center gap-3 text-xs text-[var(--dash-text-muted)]">
            <span>{count} مصروف</span>
            <span className="text-red-400 font-medium">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        {/* Table */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-[var(--dash-text-muted)]">جاري التحميل...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-[var(--dash-text-muted)] mb-3">لا توجد مصروفات</p>
              <button onClick={onAddExpense} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ تسجيل مصروف جديد</button>
            </div>
          ) : (
            <ResizableTable className="h-full w-full" columns={tableColumns} data={expenses} reportType="EXPENSES_REPORT"
              selectedRowId={selectedExpense?.id || null}
              onRowClick={(item) => setSelectedExpense(selectedExpense?.id === item.id ? null : item)} />
          )}
          {isLoadingMore && <div className="p-4 text-center text-xs text-[var(--dash-text-muted)]">جاري تحميل المزيد...</div>}
        </div>
      </div>

      {/* Right Sidebar (SafeDetailsModal style) */}
      {!sidebarCollapsed && (
      <div className="w-80 bg-dash-overlay border-l border-[var(--dash-border-default)] flex flex-col overflow-y-auto scrollbar-hide flex-shrink-0">
        {/* Title */}
        <div className="px-4 pt-4 pb-3">
          <h4 className="text-sm font-medium text-[var(--dash-text-primary)] text-center pb-2 border-b border-[var(--dash-border-default)]">
            تصنيفات المصروفات
          </h4>
        </div>

        {/* Categories */}
        <div className="px-4 pb-4">
          <div className="space-y-0.5">
            {treeWithExpansion.map(node => (
              <CategoryFolderNode
                key={node.id}
                node={node}
                level={0}
                selectedId={selectedCategoryId}
                onSelect={(id) => setSelectedCategoryId(selectedCategoryId === id ? '' : id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date Filter Button (bottom, same as safes) */}
        <div className="p-4">
          <button
            onClick={() => setShowDateFilter(true)}
            className="w-full bg-dash-accent-blue hover:brightness-[0.88] text-[var(--dash-text-primary)] px-4 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <CalendarDaysIcon className="h-5 w-5" />
            <span>التاريخ</span>
          </button>
          {dateFilter.type !== 'all' && (
            <div className="mt-2 text-center">
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
      </div>
      )}

      {/* Toggle Strip (same as SafeDetailsModal) */}
      <div className="flex">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-6 bg-[var(--dash-bg-raised)] hover:bg-[#4B5563] border-l border-[var(--dash-border-default)] flex items-center justify-center transition-colors duration-200"
          title={sidebarCollapsed ? 'إظهار التصنيفات' : 'إخفاء التصنيفات'}
        >
          {sidebarCollapsed ? (
            <ChevronLeftIcon className="h-4 w-4 text-[var(--dash-text-secondary)]" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-[var(--dash-text-secondary)]" />
          )}
        </button>
      </div>

      {/* Filter Modals */}
      <SimpleDateFilterModal isOpen={showDateFilter} onClose={() => setShowDateFilter(false)}
        onDateFilterChange={(filter) => setDateFilter(filter)} currentFilter={dateFilter} />
      <SimpleFilterModal isOpen={showSimpleFilter} onClose={() => setShowSimpleFilter(false)} onApply={handleSimpleFilterApply} />
      <MultiFilterModal isOpen={showMultiFilter} onClose={() => setShowMultiFilter(false)} onApply={handleMultiFilterApply} />
    </div>
  )
}

// Category folder node (like products tree but with colors)
function CategoryFolderNode({ node, level, selectedId, onSelect, onToggle }: {
  node: CategoryTreeNode; level: number; selectedId: string
  onSelect: (id: string) => void; onToggle: (id: string) => void
}) {
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id

  return (
    <div>
      <div
        className={`flex items-center cursor-pointer transition-colors rounded-lg ${
          isSelected
            ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
            : 'hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
        }`}
        style={{ paddingRight: `${12 + level * 20}px`, paddingLeft: '8px', paddingTop: '7px', paddingBottom: '7px' }}
        onClick={() => onSelect(node.id)}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              <button
                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] w-4 h-4 flex items-center justify-center rounded"
                onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
              >
                {node.isExpanded ? <MinusIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </div>

          {node.color ? (
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: node.color + '25' }}>
              <FolderIcon className="h-3.5 w-3.5" style={{ color: node.color }} />
            </div>
          ) : (
            <FolderIcon className="h-5 w-5 text-[var(--dash-text-muted)] flex-shrink-0" />
          )}

          <span className={`text-sm truncate ${!node.is_active ? 'opacity-50 line-through' : ''}`}>
            {node.name}
          </span>
        </div>
      </div>

      {hasChildren && node.isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryFolderNode key={child.id} node={child} level={level + 1}
              selectedId={selectedId} onSelect={onSelect} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

function applyExpansion(nodes: CategoryTreeNode[], expandedIds: Set<string>): CategoryTreeNode[] {
  return nodes.map(node => ({
    ...node,
    isExpanded: expandedIds.has(node.id),
    children: applyExpansion(node.children, expandedIds),
  }))
}
