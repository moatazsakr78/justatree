'use client'

import { useEffect, useRef } from 'react'
import { PencilIcon } from '@heroicons/react/24/outline'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  items: ContextMenuItem[]
}

export default function ContextMenu({ x, y, isOpen, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // تعديل موقع القائمة إذا كانت خارج الشاشة
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // تعديل الموقع الأفقي
      if (rect.right > viewportWidth) {
        menu.style.left = `${x - rect.width}px`
      }

      // تعديل الموقع الرأسي
      if (rect.bottom > viewportHeight) {
        menu.style.top = `${y - rect.height}px`
      }
    }
  }, [isOpen, x, y])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-dash-md shadow-dash-lg py-1 min-w-[160px] animate-dash-scale-in backdrop-blur-sm"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }}
          disabled={item.disabled}
          className={`w-full px-4 py-2 text-right text-sm flex items-center gap-3 transition-colors ${
            item.disabled
              ? 'text-[var(--dash-text-disabled)] cursor-not-allowed'
              : item.danger
              ? 'text-[var(--dash-accent-red)] hover:bg-[var(--dash-accent-red-subtle)]'
              : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)] hover:text-[var(--dash-text-primary)]'
          }`}
        >
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// مكون مساعد لإنشاء قائمة سياق سريعة للتعديل
export function createEditContextMenuItems(onEdit: () => void): ContextMenuItem[] {
  return [
    {
      label: 'تعديل',
      icon: <PencilIcon className="w-4 h-4" />,
      onClick: onEdit
    }
  ]
}
