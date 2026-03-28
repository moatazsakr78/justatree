'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline'

export type SortOption = 'default' | 'name-asc' | 'newest' | 'oldest' | 'price-low' | 'price-high'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'الافتراضي' },
  { value: 'name-asc', label: 'أبجدي (أ-ي)' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'oldest', label: 'الأقدم' },
  { value: 'price-low', label: 'الأقل سعرًا' },
  { value: 'price-high', label: 'الأعلى سعرًا' },
]

interface ProductSortDropdownProps {
  storageKey: string
  sortOrder: SortOption
  onSortChange: (sort: SortOption) => void
  className?: string
}

export function useSortOrder(storageKey: string): [SortOption, (sort: SortOption) => void] {
  const [sortOrder, setSortOrder] = useState<SortOption>('default')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && SORT_OPTIONS.some(o => o.value === saved)) {
        setSortOrder(saved as SortOption)
      }
    } catch {}
  }, [storageKey])

  const updateSort = (sort: SortOption) => {
    setSortOrder(sort)
    try {
      localStorage.setItem(storageKey, sort)
    } catch {}
  }

  return [sortOrder, updateSort]
}

export function sortProducts<T extends { name: string; price: number; created_at?: string | null }>(
  products: T[],
  sortOrder: SortOption
): T[] {
  if (sortOrder === 'default') return products

  return [...products].sort((a, b) => {
    switch (sortOrder) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '', 'ar')
      case 'newest':
        return (b.created_at || '').localeCompare(a.created_at || '')
      case 'oldest':
        return (a.created_at || '').localeCompare(b.created_at || '')
      case 'price-low':
        return (a.price || 0) - (b.price || 0)
      case 'price-high':
        return (b.price || 0) - (a.price || 0)
      default:
        return 0
    }
  })
}

export default function ProductSortDropdown({ storageKey, sortOrder, onSortChange, className = '' }: ProductSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const currentLabel = SORT_OPTIONS.find(o => o.value === sortOrder)?.label || 'الافتراضي'
  const isActive = sortOrder !== 'default'

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
            : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
        }`}
        title={`الترتيب: ${currentLabel}`}
      >
        <ArrowsUpDownIcon className="h-4 w-4" />
        <span className="hidden lg:inline">{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-48 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg shadow-xl z-[9999] overflow-hidden">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onSortChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${
                sortOrder === option.value
                  ? 'bg-dash-accent-blue text-[var(--dash-text-primary)] font-medium'
                  : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)] hover:text-[var(--dash-text-primary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
