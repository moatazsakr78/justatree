'use client';

import { useState, useCallback } from 'react';
import { DateFilter, KPIData } from '../types/reports';
import KPICardGrid from './kpi/KPICardGrid';
import SalesTrendChart from './charts/SalesTrendChart';
import CategoryPieChart from './charts/CategoryPieChart';
import TopProductsBarChart from './charts/TopProductsBarChart';
import PaymentMethodsChart from './charts/PaymentMethodsChart';
import HourlySalesChart from './charts/HourlySalesChart';
import DayOfWeekChart from './charts/DayOfWeekChart';
import { CalendarDaysIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ReportsDashboardProps {
  dateFilter: DateFilter;
  onDateFilterClick?: () => void;
}

export default function ReportsDashboard({ dateFilter, onDateFilterClick }: ReportsDashboardProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0); // Separate key for forcing refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kpiSummary, setKpiSummary] = useState<KPIData | null>(null);

  const handleKPILoad = useCallback((data: KPIData) => {
    setKpiSummary(data);
    setLastUpdated(new Date()); // Only update display time, not the key
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force re-render by updating refreshKey (not lastUpdated)
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Get filter label
  const getFilterLabel = () => {
    switch (dateFilter.type) {
      case 'today':
        return 'اليوم';
      case 'current_week':
        return 'هذا الأسبوع';
      case 'last_week':
        return 'الأسبوع الماضي';
      case 'current_month':
        return 'هذا الشهر';
      case 'last_month':
        return 'الشهر الماضي';
      case 'custom':
        if (dateFilter.startDate && dateFilter.endDate) {
          const start = dateFilter.startDate.toLocaleDateString('ar-EG');
          const end = dateFilter.endDate.toLocaleDateString('ar-EG');
          return `${start} - ${end}`;
        }
        return 'فترة مخصصة';
      default:
        return 'كل الفترات';
    }
  };

  return (
    <div className="flex-1 w-full p-4 space-y-4 overflow-y-auto scrollbar-hide" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] hover:border-[var(--dash-border-subtle)] transition-colors ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="تحديث البيانات"
          >
            <ArrowPathIcon className="h-5 w-5 text-[var(--dash-text-secondary)]" />
          </button>
          <span className="text-[var(--dash-text-muted)] text-sm">
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onDateFilterClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] hover:border-blue-500 transition-colors"
          >
            <span className="text-[var(--dash-text-primary)] font-medium">{getFilterLabel()}</span>
            <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
          </button>
          <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">لوحة التحكم</h2>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICardGrid
        key={`kpi-${refreshKey}`}
        dateFilter={dateFilter}
        onDataLoad={handleKPILoad}
      />

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesTrendChart
          key={`trend-${refreshKey}`}
          dateFilter={dateFilter}
          height={280}
        />
        <CategoryPieChart
          key={`category-${refreshKey}`}
          dateFilter={dateFilter}
          height={280}
        />
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsBarChart
          key={`products-${refreshKey}`}
          dateFilter={dateFilter}
          height={320}
          limit={10}
        />
        <PaymentMethodsChart
          key={`payments-${refreshKey}`}
          dateFilter={dateFilter}
          height={320}
        />
      </div>

      {/* Charts Grid - Row 3 - Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DayOfWeekChart
          key={`dayofweek-${refreshKey}`}
          dateFilter={dateFilter}
          height={280}
        />
        <HourlySalesChart
          key={`hourly-${refreshKey}`}
          dateFilter={dateFilter}
          height={280}
        />
      </div>

      {/* Quick Stats Summary */}
      {kpiSummary && (
        <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
          <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">ملخص سريع</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-[var(--dash-bg-surface)] rounded-lg">
              <p className="text-[var(--dash-text-muted)] text-sm mb-1">إجمالي الفواتير</p>
              <p className="text-2xl font-bold text-[var(--dash-text-primary)]">{kpiSummary.orderCount.toLocaleString('ar-EG')}</p>
            </div>
            <div className="p-3 bg-[var(--dash-bg-surface)] rounded-lg">
              <p className="text-[var(--dash-text-muted)] text-sm mb-1">عدد العملاء</p>
              <p className="text-2xl font-bold text-[var(--dash-text-primary)]">{kpiSummary.customerCount.toLocaleString('ar-EG')}</p>
            </div>
            <div className="p-3 bg-[var(--dash-bg-surface)] rounded-lg">
              <p className="text-[var(--dash-text-muted)] text-sm mb-1">نسبة الربح</p>
              <p className="text-2xl font-bold text-green-400">
                {kpiSummary.totalSales > 0
                  ? ((kpiSummary.totalProfit / kpiSummary.totalSales) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-[var(--dash-bg-surface)] rounded-lg">
              <p className="text-[var(--dash-text-muted)] text-sm mb-1">متوسط الفاتورة</p>
              <p className="text-2xl font-bold text-blue-400">
                {kpiSummary.avgOrderValue.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
