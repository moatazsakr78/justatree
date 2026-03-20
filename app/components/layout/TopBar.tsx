'use client'

import { 
  HomeIcon,
  CalculatorIcon,
  UserIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  TableCellsIcon,
  PrinterIcon,
  FolderIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface TopBarProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export default function TopBar({ title, showSearch = true, actions }: TopBarProps) {
  return (
    <div className="fixed top-12 left-0 right-0 z-40 h-12 bg-dash-raised border-b border-[var(--dash-border-default)]">
      <div className="flex items-stretch justify-end h-full">
        {/* Far right - All action buttons */}
        <div className="flex h-full">
          {/* Page action icons */}
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <HomeIcon className="h-5 w-5" />
            <span className="text-xs mt-1">الرئيسية</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <CalculatorIcon className="h-5 w-5" />
            <span className="text-xs mt-1">المحاسبة</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <UserIcon className="h-5 w-5" />
            <span className="text-xs mt-1">اختيار عميل</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <ArrowPathIcon className="h-5 w-5" />
            <span className="text-xs mt-1">نقل البيانة</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <DocumentTextIcon className="h-5 w-5" />
            <span className="text-xs mt-1">عرض المدفوعات</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <TableCellsIcon className="h-5 w-5" />
            <span className="text-xs mt-1">الأعمدة</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <PrinterIcon className="h-5 w-5" />
            <span className="text-xs mt-1">نقل الطباعة</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <FolderIcon className="h-5 w-5" />
            <span className="text-xs mt-1">تحويل فرع</span>
          </button>
          <button className="flex flex-col items-center justify-center text-dash-text-secondary hover:text-dash-text-primary hover:bg-[var(--dash-bg-overlay)] cursor-pointer h-full min-w-[60px] transition-colors">
            <EyeIcon className="h-5 w-5" />
            <span className="text-xs mt-1">عرض المدخولات</span>
          </button>


        </div>
      </div>
    </div>
  )
}