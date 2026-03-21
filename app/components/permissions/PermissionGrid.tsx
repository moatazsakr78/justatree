'use client';

import React from 'react';
import PermissionCard from './PermissionCard';
import type { PermissionDefinition } from '@/types/permissions';

interface PermissionGridProps {
  permissions: PermissionDefinition[];
  restrictions: string[]; // Array of restricted permission codes
  onToggle: (permissionCode: string, restricted: boolean) => void;
  onEnableAll: () => void; // Enable all = restrict all (reverse logic)
  onDisableAll: () => void; // Disable all = unrestrict all
  categoryName?: string;
  disabled?: boolean;
}

export default function PermissionGrid({
  permissions,
  restrictions,
  onToggle,
  onEnableAll,
  onDisableAll,
  categoryName,
  disabled = false,
}: PermissionGridProps) {
  const restrictedCount = permissions.filter((p) => restrictions.includes(p.code)).length;
  const totalCount = permissions.length;

  if (permissions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--dash-text-muted)]">
        <div className="text-center">
          <p className="text-lg mb-2">لا توجد صلاحيات في هذا التصنيف</p>
          <p className="text-sm">اختر تصنيفًا آخر من القائمة الجانبية</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {categoryName && (
            <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">{categoryName}</h2>
          )}
          <span className="text-[var(--dash-text-muted)] text-sm">
            ({restrictedCount} من {totalCount} ممنوعة)
          </span>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEnableAll}
            disabled={disabled || restrictedCount === totalCount}
            className={`
              px-3 py-1.5 text-sm rounded-lg transition-colors
              ${disabled || restrictedCount === totalCount
                ? 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                : 'dash-btn-red'
              }
            `}
          >
            تفعيل الكل
          </button>
          <button
            onClick={onDisableAll}
            disabled={disabled || restrictedCount === 0}
            className={`
              px-3 py-1.5 text-sm rounded-lg transition-colors
              ${disabled || restrictedCount === 0
                ? 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                : 'dash-btn-green'
              }
            `}
          >
            إلغاء الكل
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-[var(--dash-bg-surface)] rounded-lg p-3 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-dash-accent-red" />
              <span className="text-[var(--dash-text-secondary)] text-sm">ممنوع: {restrictedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-dash-accent-green" />
              <span className="text-[var(--dash-text-secondary)] text-sm">مسموح: {totalCount - restrictedCount}</span>
            </div>
          </div>

          <div className="text-[var(--dash-text-muted)] text-sm">
            {restrictedCount === 0 ? (
              <span className="text-dash-accent-green">كل الميزات مسموحة لهذا الدور</span>
            ) : restrictedCount === totalCount ? (
              <span className="text-dash-accent-red">كل الميزات ممنوعة عن هذا الدور</span>
            ) : (
              <span>عدد القيود: {restrictedCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Cards - 4 columns with hidden scrollbar */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
          {permissions.map((permission) => (
            <PermissionCard
              key={permission.id}
              permission={permission}
              isRestricted={restrictions.includes(permission.code)}
              onToggle={onToggle}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
