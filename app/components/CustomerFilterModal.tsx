'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase/client';
import { Customer } from '../lib/hooks/useCustomers';

const FILTER_SECTIONS = [
  {
    id: 'basic',
    title: 'بيانات ناقصة',
    icon: '📋',
    fields: [
      { id: 'phone', label: 'رقم الهاتف' },
      { id: 'email', label: 'البريد الإلكتروني' },
      { id: 'address', label: 'العنوان' },
      { id: 'governorate', label: 'المحافظة' },
      { id: 'group', label: 'المجموعة' },
      { id: 'rank', label: 'التصنيف (الرتبة)' },
      { id: 'notes', label: 'ملاحظات' },
    ]
  }
];

const PRICE_TYPE_OPTIONS = [
  { value: '', label: '-- الكل --' },
  { value: 'price', label: 'سعر البيع' },
  { value: 'wholesale_price', label: 'سعر الجملة' },
  { value: 'price1', label: 'سعر 1' },
  { value: 'price2', label: 'سعر 2' },
  { value: 'price3', label: 'سعر 3' },
  { value: 'price4', label: 'سعر 4' },
];

interface CustomerFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: Set<string>, filterMode: 'OR' | 'AND', safeFilter: string, priceTypeFilter: string) => void;
  initialFilters?: Set<string>;
  initialFilterMode?: 'OR' | 'AND';
  initialSafeFilter?: string;
  initialPriceTypeFilter?: string;
}

export default function CustomerFilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters = new Set(),
  initialFilterMode = 'OR',
  initialSafeFilter = '',
  initialPriceTypeFilter = '',
}: CustomerFilterModalProps) {
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set(initialFilters));
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>(initialFilterMode);
  const [safeFilter, setSafeFilter] = useState(initialSafeFilter);
  const [priceTypeFilter, setPriceTypeFilter] = useState(initialPriceTypeFilter);
  const [records, setRecords] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Sync with initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFilters(new Set(initialFilters));
      setFilterMode(initialFilterMode);
      setSafeFilter(initialSafeFilter);
      setPriceTypeFilter(initialPriceTypeFilter);
    }
  }, [isOpen, initialFilters, initialFilterMode, initialSafeFilter, initialPriceTypeFilter]);

  // Fetch records on mount
  useEffect(() => {
    if (!isOpen) return;
    const fetchRecords = async () => {
      setIsLoadingRecords(true);
      try {
        const { data, error } = await supabase
          .from('records')
          .select('id, name')
          .order('name');
        if (!error && data) {
          setRecords(data);
        }
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setIsLoadingRecords(false);
      }
    };
    fetchRecords();
  }, [isOpen]);

  const toggleFilter = (fieldId: string) => {
    setSelectedFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(fieldId)) {
        newFilters.delete(fieldId);
      } else {
        newFilters.add(fieldId);
      }
      return newFilters;
    });
  };

  const activeFilterCount = selectedFilters.size + (safeFilter ? 1 : 0) + (priceTypeFilter ? 1 : 0);

  const handleApply = () => {
    onApply(selectedFilters, filterMode, safeFilter, priceTypeFilter);
    onClose();
  };

  const handleClear = () => {
    setSelectedFilters(new Set());
    setSafeFilter('');
    setPriceTypeFilter('');
  };

  const handleCancel = () => {
    setSelectedFilters(new Set(initialFilters));
    setFilterMode(initialFilterMode);
    setSafeFilter(initialSafeFilter);
    setPriceTypeFilter(initialPriceTypeFilter);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-[var(--dash-bg-base)] rounded-lg shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)] w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-default)]">
          <h2 className="text-lg font-bold text-white">تصفية العملاء</h2>
          <button
            onClick={handleCancel}
            className="p-1 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filter Mode Toggle */}
        <div className="px-4 py-3 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-raised)]">
          <p className="text-sm text-[var(--dash-text-secondary)] mb-2">نوع الفلترة:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('OR')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'OR'
                  ? 'bg-dash-accent-blue text-white'
                  : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-highlight)]'
              }`}
            >
              أي واحد منهم (OR)
            </button>
            <button
              onClick={() => setFilterMode('AND')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                filterMode === 'AND'
                  ? 'bg-dash-accent-blue text-white'
                  : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-highlight)]'
              }`}
            >
              كلهم معاً (AND)
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Missing Data Section */}
          {FILTER_SECTIONS.map((section) => (
            <div key={section.id} className="bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)]">
                <span>{section.icon}</span>
                <span className="text-white font-medium">{section.title}</span>
              </div>
              <div className="p-3 space-y-2">
                {section.fields.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--dash-bg-overlay)] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFilters.has(field.id)}
                      onChange={() => toggleFilter(field.id)}
                      className="w-5 h-5 rounded border-[var(--dash-border-default)] text-dash-accent-blue focus:ring-[var(--dash-accent-blue)] focus:ring-offset-0 bg-[var(--dash-bg-raised)]"
                    />
                    <span className="text-gray-200">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Linking Section */}
          <div className="bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)]">
              <span>🔗</span>
              <span className="text-white font-medium">الربط</span>
            </div>
            <div className="p-3 space-y-4">
              {/* Safe Filter */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-200 text-right">الخزنة الافتراضية</label>
                <select
                  value={safeFilter}
                  onChange={(e) => setSafeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] text-sm text-right focus:outline-none focus:ring-2 focus:ring-dash-accent-blue focus:border-transparent appearance-none cursor-pointer"
                  disabled={isLoadingRecords}
                >
                  <option value="">-- الكل --</option>
                  <option value="none">لا يوجد ربط</option>
                  {records.map(record => (
                    <option key={record.id} value={record.id}>{record.name}</option>
                  ))}
                </select>
              </div>

              {/* Price Type Filter */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-200 text-right">نوع السعر الافتراضي</label>
                <select
                  value={priceTypeFilter}
                  onChange={(e) => setPriceTypeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg text-[var(--dash-text-primary)] text-sm text-right focus:outline-none focus:ring-2 focus:ring-dash-accent-blue focus:border-transparent appearance-none cursor-pointer"
                >
                  {PRICE_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-base)]">
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--dash-text-muted)]">
                {activeFilterCount} فلتر مختار
              </span>
              <button
                onClick={handleClear}
                className="text-sm text-dash-accent-red hover:text-dash-accent-red transition-colors"
              >
                مسح الكل
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 bg-[var(--dash-bg-overlay)] text-white rounded-lg font-medium hover:bg-[var(--dash-bg-highlight)] transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleApply}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                activeFilterCount > 0
                  ? 'dash-btn-primary'
                  : 'bg-[var(--dash-bg-highlight)] text-[var(--dash-text-secondary)]'
              }`}
            >
              تطبيق {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: check if a customer is missing data for a specific field
export function isCustomerMissingData(customer: Customer, fieldId: string): boolean {
  switch (fieldId) {
    case 'phone':
      return !customer.phone || customer.phone.trim() === '';
    case 'email':
      return !customer.email || customer.email.trim() === '';
    case 'address':
      return !customer.address || customer.address.trim() === '';
    case 'governorate':
      return !customer.governorate || customer.governorate.trim() === '';
    case 'group':
      return !customer.group_id;
    case 'rank':
      return !customer.rank;
    case 'notes':
      return !customer.notes || customer.notes.trim() === '';
    default:
      return false;
  }
}

// Helper: filter customers by missing data
export function filterCustomersByMissingData(
  customers: Customer[],
  filters: Set<string>,
  mode: 'OR' | 'AND'
): Customer[] {
  if (filters.size === 0) return customers;

  const filterArray = Array.from(filters);

  return customers.filter(customer => {
    if (mode === 'OR') {
      return filterArray.some(fieldId => isCustomerMissingData(customer, fieldId));
    } else {
      return filterArray.every(fieldId => isCustomerMissingData(customer, fieldId));
    }
  });
}
