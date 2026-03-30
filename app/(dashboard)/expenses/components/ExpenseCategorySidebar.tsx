'use client'

import { useState, useEffect } from 'react'
import { ArrowRightIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ExpenseCategory, CategoryTreeNode } from '../services/expenseService'

interface ExpenseCategorySidebarProps {
  isOpen: boolean
  onClose: () => void
  categories: ExpenseCategory[]
  onSave: () => void
  editNode?: CategoryTreeNode | null
  isEditing?: boolean
  selectedNode?: CategoryTreeNode | null
  onAdd: (params: { name: string; parentId?: string | null; color?: string }) => Promise<any>
  onEdit: (id: string, params: { name?: string; parentId?: string | null; color?: string; is_active?: boolean }) => Promise<any>
  onDelete: (id: string) => Promise<void>
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
]

export default function ExpenseCategorySidebar({
  isOpen, onClose, categories, onSave,
  editNode, isEditing, selectedNode,
  onAdd, onEdit, onDelete
}: ExpenseCategorySidebarProps) {
  const [formData, setFormData] = useState({ name: '', parentId: '', color: '#3b82f6' })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isEditing && editNode) {
      setFormData({
        name: editNode.name || '',
        parentId: editNode.parent_id || '',
        color: editNode.color || '#3b82f6',
      })
    } else if (!isEditing) {
      setFormData({
        name: '',
        parentId: selectedNode?.id || '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }
  }, [isEditing, editNode, selectedNode, isOpen])

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم التصنيف')
      return
    }

    setIsSaving(true)
    try {
      if (isEditing && editNode) {
        await onEdit(editNode.id, {
          name: formData.name.trim(),
          parentId: formData.parentId || null,
          color: formData.color,
        })
      } else {
        await onAdd({
          name: formData.name.trim(),
          parentId: formData.parentId || null,
          color: formData.color,
        })
      }
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving category:', error)
      alert(`خطأ: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editNode) return
    if (!confirm(`هل أنت متأكد من حذف التصنيف "${editNode.name}"؟`)) return

    setIsDeleting(true)
    try {
      await onDelete(editNode.id)
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      alert(`خطأ: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async () => {
    if (!editNode) return
    setIsSaving(true)
    try {
      await onEdit(editNode.id, { is_active: !editNode.is_active })
      onSave()
      onClose()
    } catch (error: any) {
      alert(`خطأ: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Get parent categories (exclude self and children for editing)
  const parentOptions = categories.filter(cat => {
    if (isEditing && editNode) {
      return cat.id !== editNode.id
    }
    return true
  })

  const selectedParent = categories.find(c => c.id === formData.parentId)

  if (!isOpen) return null

  return (
    <div className="w-80 bg-[var(--dash-bg-raised)] border-r border-[var(--dash-border-subtle)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--dash-text-primary)]">
          {isEditing ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        </h3>
        <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">اسم التصنيف</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--dash-text-primary)] outline-none focus:border-blue-500"
            placeholder="مثال: كهرباء"
          />
        </div>

        {/* Parent */}
        <div className="relative">
          <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">التصنيف الأب</label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-subtle)] rounded-lg px-3 py-2 text-sm text-right flex items-center justify-between"
          >
            <span className={selectedParent ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}>
              {selectedParent?.name || 'بدون تصنيف أب (تصنيف رئيسي)'}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <button
                onClick={() => { setFormData(prev => ({ ...prev, parentId: '' })); setIsDropdownOpen(false) }}
                className="w-full text-right px-3 py-2 text-sm hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)]"
              >
                بدون تصنيف أب
              </button>
              {parentOptions.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setFormData(prev => ({ ...prev, parentId: cat.id })); setIsDropdownOpen(false) }}
                  className={`w-full text-right px-3 py-2 text-sm hover:bg-[var(--dash-bg-surface)] ${
                    formData.parentId === cat.id ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--dash-text-secondary)]'
                  }`}
                  style={{ paddingRight: cat.parent_id ? '28px' : '12px' }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs text-[var(--dash-text-muted)] mb-1.5">اللون</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  formData.color === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[var(--dash-border-subtle)] space-y-2">
        <button
          onClick={handleSubmit}
          disabled={isSaving || !formData.name.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {isSaving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إضافة التصنيف'}
        </button>

        {isEditing && editNode && (
          <>
            <button
              onClick={handleToggleActive}
              disabled={isSaving}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                editNode.is_active
                  ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                  : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              }`}
            >
              {editNode.is_active ? 'تعطيل التصنيف' : 'تفعيل التصنيف'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full bg-red-600/20 text-red-400 hover:bg-red-600/30 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isDeleting ? 'جاري الحذف...' : 'حذف التصنيف'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
