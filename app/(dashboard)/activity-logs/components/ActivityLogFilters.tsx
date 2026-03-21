'use client';

import { useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { ActivityLogsFilters } from '../hooks/useActivityLogs';

interface ActivityLogFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ActivityLogsFilters;
  onApply: (filters: ActivityLogsFilters) => void;
  mode: 'entity' | 'action';
}

const entityTypeOptions: { value: string; label: string }[] = [
  { value: 'product', label: 'المنتجات' },
  { value: 'sale', label: 'المبيعات' },
  { value: 'customer', label: 'العملاء' },
  { value: 'supplier', label: 'الموردين' },
  { value: 'inventory', label: 'المخزون' },
  { value: 'purchase', label: 'المشتريات' },
  { value: 'order', label: 'الطلبات' },
  { value: 'expense', label: 'المصروفات' },
  { value: 'cash_drawer', label: 'الخزن' },
  { value: 'payment_method', label: 'طرق الدفع' },
  { value: 'category', label: 'الأصناف' },
  { value: 'setting', label: 'الإعدادات' },
  { value: 'permission', label: 'الصلاحيات' },
  { value: 'user', label: 'المستخدمين' },
];

const actionTypeOptions: { value: string; label: string }[] = [
  { value: 'create', label: 'إضافة' },
  { value: 'update', label: 'تعديل' },
  { value: 'delete', label: 'حذف' },
];

export default function ActivityLogFilters({
  isOpen,
  onClose,
  filters,
  onApply,
  mode,
}: ActivityLogFiltersProps) {
  const options = mode === 'entity' ? entityTypeOptions : actionTypeOptions;
  const currentSelected = mode === 'entity' ? filters.entityTypes : filters.actionTypes;
  const [selected, setSelected] = useState<string[]>(currentSelected);

  if (!isOpen) return null;

  const toggleItem = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleApply = () => {
    const newFilters = { ...filters };
    if (mode === 'entity') {
      newFilters.entityTypes = selected;
    } else {
      newFilters.actionTypes = selected;
    }
    onApply(newFilters);
    onClose();
  };

  const handleClear = () => {
    setSelected([]);
    const newFilters = { ...filters };
    if (mode === 'entity') {
      newFilters.entityTypes = [];
    } else {
      newFilters.actionTypes = [];
    }
    onApply(newFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--dash-bg-raised)] rounded-xl border border-[var(--dash-border-default)] w-full max-w-sm mx-4 max-h-[80vh] flex flex-col shadow-[var(--dash-shadow-lg)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)]">
          <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
            {mode === 'entity' ? 'نوع العملية' : 'نوع الإجراء'}
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => toggleItem(option.value)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-dash-accent-blue-subtle border border-dash-accent-blue text-dash-accent-blue'
                    : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                <span className="text-sm">{option.label}</span>
                {isSelected && <CheckIcon className="w-4 h-4" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 p-4 border-t border-[var(--dash-border-default)]">
          <button
            onClick={handleClear}
            className="flex-1 py-2 text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] bg-[var(--dash-bg-surface)] rounded-lg transition-colors"
          >
            مسح الكل
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 text-sm dash-btn-primary rounded-lg transition-colors"
          >
            تطبيق {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
