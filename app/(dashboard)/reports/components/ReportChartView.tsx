'use client';

import React from 'react';
import TopNBarChart from './charts/TopNBarChart';
import TrendAreaChart from './charts/TrendAreaChart';
import DistributionPieChart from './charts/DistributionPieChart';
import { CHART_COLORS } from '../utils/chartConfig';
import { getReportById } from '../config/reportRegistry';

type ChartType = 'bar' | 'area' | 'pie';

interface ChartConfig {
  type: ChartType;
  // For bar charts:
  nameField?: string;
  sortByField?: string;
  bars?: { field: string; label: string; color: string }[];
  topN?: number;
  // For area charts:
  xField?: string;
  areas?: { field: string; label: string; color: string }[];
  // For pie charts:
  valueField?: string;
}

const CHART_CONFIG: Record<string, ChartConfig> = {
  products: {
    type: 'bar',
    nameField: 'product_name',
    sortByField: 'total_sales_amount',
    bars: [
      { field: 'total_sales_amount', label: 'إجمالي المبيعات', color: CHART_COLORS.primary },
      { field: 'total_quantity_sold', label: 'الكمية', color: CHART_COLORS.success },
    ],
  },
  categories: {
    type: 'bar',
    nameField: 'category_name',
    sortByField: 'total_sales_amount',
    bars: [
      { field: 'total_sales_amount', label: 'إجمالي المبيعات', color: CHART_COLORS.primary },
      { field: 'products_count', label: 'عدد المنتجات', color: CHART_COLORS.cyan },
    ],
  },
  customers: {
    type: 'bar',
    nameField: 'customer_name',
    sortByField: 'total_amount',
    bars: [
      { field: 'total_amount', label: 'الإجمالي', color: CHART_COLORS.primary },
      { field: 'total_profit', label: 'الربح', color: CHART_COLORS.success },
    ],
  },
  users: {
    type: 'bar',
    nameField: 'user_name',
    sortByField: 'total_amount',
    bars: [
      { field: 'total_amount', label: 'إجمالي المبيعات', color: CHART_COLORS.primary },
      { field: 'total_profit', label: 'الربح', color: CHART_COLORS.success },
    ],
  },
  customer_invoices: {
    type: 'bar',
    nameField: 'customer_name',
    sortByField: 'total_amount',
    bars: [
      { field: 'total_amount', label: 'الإجمالي', color: CHART_COLORS.primary },
      { field: 'invoice_count', label: 'عدد الفواتير', color: CHART_COLORS.purple },
    ],
  },
  daily_sales: {
    type: 'area',
    xField: 'sale_date',
    areas: [
      { field: 'total_sales', label: 'المبيعات', color: CHART_COLORS.primary },
      { field: 'invoice_count', label: 'عدد الفواتير', color: CHART_COLORS.success },
    ],
  },
  hourly_sales: {
    type: 'pie',
    nameField: 'hour_range',
    valueField: 'total_sales',
  },
  profit_margin: {
    type: 'bar',
    nameField: 'product_name',
    sortByField: 'margin',
    bars: [
      { field: 'margin', label: 'هامش الربح %', color: CHART_COLORS.warning },
      { field: 'profit', label: 'الربح', color: CHART_COLORS.success },
    ],
  },
  payment_methods: {
    type: 'pie',
    nameField: 'payment_method_ar',
    valueField: 'total_amount',
  },
  returns: {
    type: 'bar',
    nameField: 'product_name',
    sortByField: 'total_amount',
    bars: [
      { field: 'total_amount', label: 'المبلغ', color: CHART_COLORS.danger },
      { field: 'quantity', label: 'الكمية', color: CHART_COLORS.warning },
    ],
  },
  purchase_items: {
    type: 'bar',
    nameField: 'product_name',
    sortByField: 'total_amount',
    bars: [
      { field: 'total_amount', label: 'الإجمالي', color: CHART_COLORS.success },
      { field: 'total_quantity', label: 'الكمية', color: CHART_COLORS.primary },
    ],
  },
  purchase_suppliers: {
    type: 'bar',
    nameField: 'supplier_name',
    sortByField: 'total_amount',
    bars: [
      { field: 'total_amount', label: 'إجمالي المشتريات', color: CHART_COLORS.success },
      { field: 'invoice_count', label: 'عدد الفواتير', color: CHART_COLORS.purple },
    ],
  },
  purchase_invoices: {
    type: 'area',
    xField: 'invoice_date',
    areas: [
      { field: 'total_amount', label: 'المبلغ', color: CHART_COLORS.success },
    ],
  },
  customer_balances: {
    type: 'bar',
    nameField: 'customer_name',
    sortByField: 'account_balance',
    bars: [
      { field: 'account_balance', label: 'الرصيد', color: CHART_COLORS.danger },
      { field: 'credit_limit', label: 'حد الائتمان', color: CHART_COLORS.primary },
    ],
  },
  supplier_balances: {
    type: 'bar',
    nameField: 'supplier_name',
    sortByField: 'account_balance',
    bars: [
      { field: 'account_balance', label: 'الرصيد', color: CHART_COLORS.warning },
    ],
  },
  cash_drawer: {
    type: 'area',
    xField: 'created_at',
    areas: [
      { field: 'amount', label: 'المبلغ', color: CHART_COLORS.primary },
      { field: 'balance_after', label: 'الرصيد بعد', color: CHART_COLORS.success },
    ],
  },
  customer_payments: {
    type: 'area',
    xField: 'created_at',
    areas: [
      { field: 'amount', label: 'المبلغ', color: CHART_COLORS.success },
    ],
  },
  low_stock: {
    type: 'bar',
    nameField: 'product_name',
    sortByField: 'deficit',
    bars: [
      { field: 'current_stock', label: 'المخزون الحالي', color: CHART_COLORS.danger },
      { field: 'min_stock', label: 'الحد الأدنى', color: CHART_COLORS.warning },
    ],
  },
  inventory_valuation: {
    type: 'bar',
    nameField: 'product_name',
    sortByField: 'cost_value',
    bars: [
      { field: 'cost_value', label: 'قيمة التكلفة', color: CHART_COLORS.primary },
      { field: 'retail_value', label: 'قيمة البيع', color: CHART_COLORS.success },
    ],
  },
};

interface ReportChartViewProps {
  reportId: string;
  data: any[];
  loading: boolean;
}

export default function ReportChartView({ reportId, data, loading }: ReportChartViewProps) {
  const report = getReportById(reportId);
  const config = CHART_CONFIG[reportId];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dash-accent-blue"></div>
          <span className="text-[var(--dash-text-muted)]">جاري تحميل البيانات...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <span className="text-[var(--dash-text-muted)]">لا توجد بيانات للعرض</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <span className="text-[var(--dash-text-muted)]">العرض البياني غير متاح لهذا التقرير</span>
      </div>
    );
  }

  const title = report?.titleAr || 'تقرير';

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
      <div className="bg-[var(--dash-bg-raised)] rounded-xl border border-[var(--dash-border-default)] p-6">
        {config.type === 'bar' && (
          <TopNBarChart
            data={data}
            nameField={config.nameField!}
            bars={config.bars!}
            sortByField={config.sortByField!}
            topN={config.topN || 10}
            title={title}
          />
        )}
        {config.type === 'area' && (
          <TrendAreaChart
            data={data}
            xField={config.xField!}
            areas={config.areas!}
            title={title}
          />
        )}
        {config.type === 'pie' && (
          <DistributionPieChart
            data={data}
            nameField={config.nameField!}
            valueField={config.valueField!}
            title={title}
          />
        )}
      </div>
    </div>
  );
}
