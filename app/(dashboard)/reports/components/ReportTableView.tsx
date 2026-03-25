'use client';
import React, { useMemo } from 'react';
import ResizableTable from '@/app/components/tables/ResizableTable';
import { getReportById } from '../config/reportRegistry';
import * as columns from '../columns';

interface ReportTableViewProps {
  reportId: string;
  data: any[];
  loading: boolean;
  searchQuery: string;
  formatPrice: (value: number) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

const columnMap: Record<string, (formatPrice: (value: number) => string) => any[]> = {
  products: columns.getProductsTableColumns,
  categories: columns.getCategoriesTableColumns,
  customers: columns.getCustomersTableColumns,
  users: columns.getUsersTableColumns,
  customer_invoices: columns.getCustomerInvoicesTableColumns,
  daily_sales: columns.getDailySalesTableColumns,
  hourly_sales: columns.getHourlySalesTableColumns,
  profit_margin: columns.getProfitMarginTableColumns,
  payment_methods: columns.getPaymentMethodsTableColumns,
  returns: columns.getReturnsTableColumns,
  purchase_items: columns.getPurchaseItemsTableColumns,
  purchase_suppliers: columns.getPurchaseSupplierTableColumns,
  purchase_invoices: columns.getPurchaseInvoicesTableColumns,
  customer_balances: columns.getCustomerBalancesTableColumns,
  supplier_balances: columns.getSupplierBalancesTableColumns,
  cash_drawer: columns.getCashDrawerTableColumns,
  customer_payments: columns.getCustomerPaymentsTableColumns,
  low_stock: columns.getLowStockTableColumns,
  inventory_valuation: columns.getInventoryValuationTableColumns,
};

const noop = () => {};

export default function ReportTableView({
  reportId,
  data,
  loading,
  searchQuery,
  formatPrice,
  showToast,
}: ReportTableViewProps) {
  const report = getReportById(reportId);
  const getColumns = columnMap[reportId];

  const tableColumns = useMemo(() => {
    if (!getColumns) return [];
    return getColumns(formatPrice);
  }, [getColumns, formatPrice]);

  const filteredData = useMemo(() => {
    if (!searchQuery || !report?.searchField) return data;
    const field = report.searchField;
    const query = searchQuery.toLowerCase();
    return data.filter((row) => {
      const value = row[field];
      if (value == null) return false;
      return String(value).toLowerCase().includes(query);
    });
  }, [data, searchQuery, report?.searchField]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-[var(--dash-text-primary)]">جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (!getColumns || !report) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-[var(--dash-text-muted)]">تقرير غير معروف</div>
      </div>
    );
  }

  return (
    <ResizableTable
      className="h-full w-full"
      columns={tableColumns}
      data={filteredData}
      selectedRowId={null}
      reportType={report.reportType as any} // reportType is from registry, always valid
      showToast={showToast}
      onRowClick={noop}
      onRowDoubleClick={noop}
    />
  );
}
