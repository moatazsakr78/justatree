'use client';

import Link from 'next/link';
import {
  PlusIcon,
  ShoppingCartIcon,
  UserPlusIcon,
  CubeIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const actions: QuickAction[] = [
  {
    label: 'بيع جديد',
    href: '/pos',
    icon: ShoppingCartIcon,
    color: 'bg-dash-accent-blue hover:brightness-110',
    description: 'افتح نقطة البيع',
  },
  {
    label: 'منتج جديد',
    href: '/products?action=add',
    icon: CubeIcon,
    color: 'bg-dash-accent-green hover:brightness-110',
    description: 'أضف منتج للمخزون',
  },
  {
    label: 'عميل جديد',
    href: '/customers?action=add',
    icon: UserPlusIcon,
    color: 'bg-dash-accent-purple hover:brightness-110',
    description: 'سجل عميل جديد',
  },
  {
    label: 'فاتورة مشتريات',
    href: '/suppliers?action=purchase',
    icon: DocumentTextIcon,
    color: 'bg-dash-accent-orange hover:brightness-110',
    description: 'أضف فاتورة مشتريات',
  },
  {
    label: 'مصروف جديد',
    href: '/safes?action=expense',
    icon: BanknotesIcon,
    color: 'bg-dash-accent-red hover:brightness-110',
    description: 'سجل مصروف',
  },
];

export default function QuickActions() {
  return (
    <div className="bg-[var(--dash-card-bg)] rounded-xl border border-[var(--dash-border-subtle)] shadow-dash-sm p-5">
      <h3 className="text-lg font-semibold text-[var(--dash-text-primary)] mb-4">إجراءات سريعة</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex flex-col items-center p-4 bg-[var(--dash-bg-surface)] rounded-xl hover:bg-[var(--dash-bg-overlay)] transition-all duration-200"
          >
            <div className={`p-3 rounded-xl ${action.color} text-[var(--dash-text-primary)] mb-3 transition-transform group-hover:scale-110`}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-[var(--dash-text-primary)] text-sm font-medium text-center">{action.label}</span>
            <span className="text-[var(--dash-text-disabled)] text-xs text-center mt-1 hidden sm:block">
              {action.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
