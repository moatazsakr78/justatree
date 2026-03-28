'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  TruckIcon,
  BanknotesIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  CogIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { hasPageAccess, type UserRole } from '@/app/lib/auth/roleBasedAccess'
import { usePermissionsContext } from '@/lib/contexts/PermissionsContext'
import { PAGE_ACCESS_MAP } from '@/types/permissions'

const allSidebarItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: HomeIcon },
  { href: '/pos', label: 'نقطة البيع', icon: ShoppingCartIcon },
  { href: '/products', label: 'المنتجات', icon: CubeIcon },
  { href: '/inventory', label: 'المخزون', icon: ArchiveBoxIcon },
  { href: '/customers', label: 'العملاء', icon: UserGroupIcon },
  { href: '/suppliers', label: 'الموردين', icon: TruckIcon },
  { href: '/customer-orders', label: 'طلبات العملاء', icon: ClipboardDocumentListIcon },
  { href: '/whatsapp', label: 'محادثات واتساب', icon: ChatBubbleLeftRightIcon },
  { href: '/safes', label: 'الخزن', icon: BanknotesIcon },
  { href: '/reports', label: 'التقارير', icon: ChartBarIcon },
  { href: '/activity-logs', label: 'سجل النشاط', icon: ClipboardDocumentCheckIcon },
  { href: '/permissions', label: 'الصلاحيات', icon: ShieldCheckIcon },
  { href: '/settings', label: 'الإعدادات', icon: CogIcon },
]

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const loading = status === 'loading'
  const { hasPermission } = usePermissionsContext()

  // Filter menu items based on user role AND page access permissions
  const sidebarItems = useMemo(() => {
    const userRole = session?.user?.role as UserRole | null

    return allSidebarItems.filter(item => {
      // أولاً: التحقق من صلاحية الدور (الموجودة حالياً)
      if (!hasPageAccess(userRole, item.href)) return false

      // ثانياً: التحقق من صلاحية الصفحة (page_access.*)
      const pageCode = PAGE_ACCESS_MAP[item.href]
      if (pageCode && !hasPermission(pageCode)) return false

      return true
    })
  }, [session?.user?.role, hasPermission])

  // Close sidebar when pressing ESC
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggle()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onToggle])

  return (
    <>
      {/* Backdrop - only covers area below top header */}
      <div
        className={`fixed right-0 left-0 top-12 bottom-0 bg-black/70 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onToggle}
      />
      
      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`fixed right-0 top-12 h-[calc(100vh-3rem)] w-80 bg-[var(--dash-sidebar-bg)] flex flex-col z-50 transform transition-transform duration-300 ease-in-out shadow-dash-lg ${
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)]">
          <h2 className="text-[var(--dash-text-primary)] text-lg font-semibold">القائمة</h2>
          <button
            onClick={onToggle}
            className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-hide">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={`flex items-center gap-4 px-6 py-4 text-base font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--dash-accent-blue-subtle)] text-[var(--dash-accent-blue)] border-r-[3px] border-[var(--dash-accent-blue)]'
                    : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)] hover:text-[var(--dash-text-primary)] hover:border-r-[3px] hover:border-[var(--dash-bg-highlight)]'
                }`}
              >
                <Icon className="h-6 w-6 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer - User Profile */}
        <div className="border-t border-[var(--dash-border-default)]">
          <div className="px-6 py-4 bg-[var(--dash-bg-surface)]">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--dash-bg-highlight)] rounded-full animate-pulse"></div>
                <div>
                  <div className="h-4 bg-[var(--dash-bg-highlight)] rounded w-16 animate-pulse mb-1"></div>
                  <div className="h-3 bg-[var(--dash-bg-highlight)] rounded w-20 animate-pulse"></div>
                </div>
              </div>
            ) : session?.user ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dash-accent-purple rounded-full flex items-center justify-center overflow-hidden">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[var(--dash-text-primary)] text-base font-bold">
                      {session.user.name?.charAt(0)?.toUpperCase() || session.user.email?.charAt(0)?.toUpperCase() || 'M'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-base font-medium text-[var(--dash-text-primary)]">
                    {session.user.name || session.user.email || 'مستخدم'}
                  </p>
                  <p className="text-sm text-[var(--dash-text-muted)]">
                    {session.user.role || 'مستخدم عادي'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--dash-bg-highlight)] rounded-full flex items-center justify-center">
                  <span className="text-[var(--dash-text-primary)] text-base font-bold">?</span>
                </div>
                <div>
                  <p className="text-base font-medium text-[var(--dash-text-primary)]">غير محدد</p>
                  <p className="text-sm text-[var(--dash-text-muted)]">لا توجد بيانات</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}