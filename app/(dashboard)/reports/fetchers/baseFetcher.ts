// Base Fetcher - Shared filter logic for all report fetch functions
// منطق الفلاتر المشترك بين جميع دوال جلب التقارير

import { DateFilter } from '@/app/components/SimpleDateFilterModal';

export type { SimpleFiltersResult, MultiFiltersResult, ActiveFilterType } from '@/app/types/filters';
export { initialSimpleFilters, initialMultiFilters } from '@/app/types/filters';

import type { SimpleFiltersResult, MultiFiltersResult, ActiveFilterType } from '@/app/types/filters';

// ============================
// Common Fetch Parameters
// ============================

export interface ReportFetchParams {
  dateFilter: DateFilter;
  simpleFilters: SimpleFiltersResult;
  multiFilters: MultiFiltersResult;
  activeFilterType: ActiveFilterType;
}

// ============================
// Date Range Helper
// ============================

/**
 * Converts a DateFilter into ISO date range strings.
 * Returns null for 'all' (no date filtering).
 */
export function getDateRangeForFilter(
  filter: DateFilter
): { startDate: string; endDate: string } | null {
  const now = new Date();

  switch (filter.type) {
    case 'all':
      return null;

    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    case 'current_week': {
      // Sunday of current week
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    case 'last_week': {
      // Previous Sunday to previous Saturday
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    case 'current_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      // Last day of previous month
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    case 'custom': {
      if (!filter.startDate) return null;
      const start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      const end = filter.endDate ? new Date(filter.endDate) : new Date(start);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    default:
      return null;
  }
}

// ============================
// Nested Value Helper
// ============================

/**
 * Gets a nested value from an object using dot notation.
 * Example: getNestedValue(obj, 'sales.cashier_id') -> obj.sales.cashier_id
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current != null ? current[key] : undefined;
  }, obj);
}

// ============================
// Client-Side Sales Filters
// ============================

/**
 * Applies user/customer/location/safe filters on fetched sales data client-side.
 * Supports both simple (single selection) and multi (multiple selection) filter modes.
 */
export function applyClientSalesFilters(
  data: any[],
  simpleFilters: SimpleFiltersResult,
  multiFilters: MultiFiltersResult,
  activeFilterType: ActiveFilterType,
  fieldMap: {
    cashierIdField?: string;  // e.g., 'cashier_id' or 'sales.cashier_id'
    customerIdField?: string;
    branchIdField?: string;
    recordIdField?: string;
  }
): any[] {
  if (!activeFilterType) return data;

  return data.filter((row) => {
    if (activeFilterType === 'simple') {
      // User / Cashier filter
      if (simpleFilters.userId && fieldMap.cashierIdField) {
        const value = getNestedValue(row, fieldMap.cashierIdField);
        if (value !== simpleFilters.userId) return false;
      }

      // Customer filter
      if (simpleFilters.customerId && fieldMap.customerIdField) {
        const value = getNestedValue(row, fieldMap.customerIdField);
        if (value !== simpleFilters.customerId) return false;
      }

      // Location (branch/warehouse) filter
      if (simpleFilters.locationId && fieldMap.branchIdField) {
        const value = getNestedValue(row, fieldMap.branchIdField);
        if (value !== simpleFilters.locationId) return false;
      }

      // Safe filter
      if (simpleFilters.safeId && fieldMap.recordIdField) {
        const value = getNestedValue(row, fieldMap.recordIdField);
        if (value !== simpleFilters.safeId) return false;
      }

      return true;
    }

    if (activeFilterType === 'multi') {
      // User / Cashier filter
      if (multiFilters.userIds.length > 0 && fieldMap.cashierIdField) {
        const value = getNestedValue(row, fieldMap.cashierIdField);
        if (!multiFilters.userIds.includes(value)) return false;
      }

      // Customer filter
      if (multiFilters.customerIds.length > 0 && fieldMap.customerIdField) {
        const value = getNestedValue(row, fieldMap.customerIdField);
        if (!multiFilters.customerIds.includes(value)) return false;
      }

      // Location filter
      if (multiFilters.locationIds.length > 0 && fieldMap.branchIdField) {
        const value = getNestedValue(row, fieldMap.branchIdField);
        if (!multiFilters.locationIds.includes(value)) return false;
      }

      // Safe filter
      if (multiFilters.safeIds.length > 0 && fieldMap.recordIdField) {
        const value = getNestedValue(row, fieldMap.recordIdField);
        if (!multiFilters.safeIds.includes(value)) return false;
      }

      return true;
    }

    return true;
  });
}

// ============================
// Item-Level Filters (Product / Category)
// ============================

/**
 * Applies product/category filters on sale_items nested data.
 * Filters by product_id and products.category_id.
 */
export function applyItemFilters(
  items: any[],
  simpleFilters: SimpleFiltersResult,
  multiFilters: MultiFiltersResult,
  activeFilterType: ActiveFilterType
): any[] {
  if (!activeFilterType) return items;

  return items.filter((item) => {
    if (activeFilterType === 'simple') {
      // Product filter
      if (simpleFilters.productId) {
        if (item.product_id !== simpleFilters.productId) return false;
      }

      // Category filter
      if (simpleFilters.categoryId) {
        const categoryId = item.products?.category_id;
        if (categoryId !== simpleFilters.categoryId) return false;
      }

      return true;
    }

    if (activeFilterType === 'multi') {
      // Product filter
      if (multiFilters.productIds.length > 0) {
        if (!multiFilters.productIds.includes(item.product_id)) return false;
      }

      // Category filter
      if (multiFilters.categoryIds.length > 0) {
        const categoryId = item.products?.category_id;
        if (!multiFilters.categoryIds.includes(categoryId)) return false;
      }

      return true;
    }

    return true;
  });
}
