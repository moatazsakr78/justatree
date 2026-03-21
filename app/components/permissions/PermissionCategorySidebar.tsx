'use client';

import React from 'react';
import {
  ShoppingCartIcon,
  CubeIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import type { PermissionCategory, CategoryStats } from '@/types/permissions';

// Map of icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCartIcon,
  CubeIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
};

interface PermissionCategorySidebarProps {
  categories: PermissionCategory[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  categoryStats?: Record<string, CategoryStats>;
}

export default function PermissionCategorySidebar({
  categories,
  selectedCategoryId,
  onCategorySelect,
  categoryStats = {},
}: PermissionCategorySidebarProps) {
  return (
    <div className="w-64 bg-[var(--dash-bg-surface)] rounded-lg p-4">
      <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">التصنيفات</h3>

      <div className="space-y-2">
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;
          const IconComponent = category.icon ? iconMap[category.icon] || FolderIcon : FolderIcon;
          const stats = categoryStats[category.id];

          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`
                w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 text-right
                ${isSelected
                  ? 'bg-dash-accent-blue text-white'
                  : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-raised)] hover:text-[var(--dash-text-primary)]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{category.name}</span>
              </div>

              {stats && (
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${isSelected
                      ? 'bg-white/20 text-white'
                      : stats.restricted > 0
                        ? 'bg-dash-accent-red-subtle text-dash-accent-red'
                        : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-secondary)]'
                    }
                  `}
                >
                  {stats.restricted}/{stats.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
