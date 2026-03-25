'use client';
import React, { useMemo } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { DateFilter } from '@/app/components/SimpleDateFilterModal';
import { getReportById } from '../config/reportRegistry';

interface ReportsSidebarProps {
  activeTab: string;
  reportData: Record<string, any[]>;
  totalSalesAmount: string;
  dateFilter: DateFilter;
  onDateFilterClick: () => void;
  formatPrice: (value: number) => string;
}

export default function ReportsSidebar({
  activeTab,
  reportData,
  totalSalesAmount,
  dateFilter,
  onDateFilterClick,
  formatPrice,
}: ReportsSidebarProps) {
  const activeReport = useMemo(() => {
    if (activeTab === 'main') return null;
    return getReportById(activeTab);
  }, [activeTab]);

  const data = useMemo(() => {
    if (activeTab === 'main') return [];
    return reportData[activeTab] || [];
  }, [activeTab, reportData]);

  const statistics = useMemo(() => {
    if (activeTab === 'main' || data.length === 0) return null;

    const stats: { label: string; value: string }[] = [];

    // Record count
    stats.push({ label: 'عدد السجلات', value: data.length.toLocaleString() });

    // Sum total_amount
    if (data[0] && 'total_amount' in data[0]) {
      const sum = data.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
      stats.push({ label: 'الإجمالي', value: formatPrice(sum) });
    }

    // Sum total_sales
    if (data[0] && 'total_sales' in data[0]) {
      const sum = data.reduce((acc, row) => acc + (Number(row.total_sales) || 0), 0);
      stats.push({ label: 'إجمالي المبيعات', value: formatPrice(sum) });
    }

    // Sum profit or total_profit
    const profitField = data[0] && ('total_profit' in data[0] ? 'total_profit' : 'profit' in data[0] ? 'profit' : null);
    if (profitField) {
      const sum = data.reduce((acc, row) => acc + (Number(row[profitField]) || 0), 0);
      stats.push({ label: 'الربح', value: formatPrice(sum) });
    }

    // Sum account_balance
    if (data[0] && 'account_balance' in data[0]) {
      const sum = data.reduce((acc, row) => acc + (Number(row.account_balance) || 0), 0);
      stats.push({ label: 'إجمالي الأرصدة', value: formatPrice(sum) });
    }

    // Sum cost_value
    if (data[0] && 'cost_value' in data[0]) {
      const sum = data.reduce((acc, row) => acc + (Number(row.cost_value) || 0), 0);
      stats.push({ label: 'قيمة المخزون', value: formatPrice(sum) });
    }

    // Last updated
    stats.push({
      label: 'آخر تحديث',
      value: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    });

    return stats;
  }, [activeTab, data, formatPrice]);

  // Top label for the balance box
  const balanceLabel = useMemo(() => {
    if (activeTab === 'main') return 'رصيد الحساب';
    if (activeReport) return `إجمالي ${activeReport.titleAr}`;
    return 'رصيد الحساب';
  }, [activeTab, activeReport]);

  // Date filter description
  const dateFilterDescription = useMemo(() => {
    switch (dateFilter.type) {
      case 'today':
        return 'عرض تقارير اليوم';
      case 'current_week':
        return 'عرض تقارير الأسبوع الحالي';
      case 'last_week':
        return 'عرض تقارير الأسبوع الماضي';
      case 'current_month':
        return 'عرض تقارير الشهر الحالي';
      case 'last_month':
        return 'عرض تقارير الشهر الماضي';
      case 'custom':
        if (dateFilter.startDate && dateFilter.endDate) {
          return `من ${dateFilter.startDate.toLocaleDateString('en-GB')} إلى ${dateFilter.endDate.toLocaleDateString('en-GB')}`;
        }
        return null;
      default:
        return null;
    }
  }, [dateFilter]);

  return (
    <div className="w-80 bg-[#3B4754] border-r border-[var(--dash-border-default)] flex flex-col overflow-hidden">
      {/* Balance Section */}
      <div className="p-3 border-b border-[var(--dash-border-default)] flex-shrink-0">
        <div className="bg-dash-accent-blue rounded-lg p-3 text-center text-[var(--dash-text-primary)]">
          <div className="text-xl font-bold mb-1">EGP {totalSalesAmount}</div>
          <div className="text-xs opacity-90">{balanceLabel}</div>
        </div>
      </div>

      {/* Statistics - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-3 border-b border-[var(--dash-border-default)]">
          <h3 className="text-[var(--dash-text-primary)] font-medium mb-2 text-right">
            {activeTab === 'main' || !statistics ? 'إحصائيات عامة' : 'إحصائيات التقرير'}
          </h3>
          <div className="space-y-2">
            {statistics ? (
              statistics.map((stat, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-[var(--dash-text-primary)]">{stat.value}</span>
                  <span className="text-[var(--dash-text-muted)]">{stat.label}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--dash-text-primary)]">0</span>
                  <span className="text-[var(--dash-text-muted)]">عدد السجلات</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="p-3 text-center text-[var(--dash-text-disabled)] text-sm">
          {activeTab === 'main' || !statistics
            ? 'اختر تقريراً لعرض التفاصيل'
            : 'تفاصيل إضافية للتقرير المحدد'}
        </div>
      </div>

      {/* Date Filter Button - Fixed at Bottom */}
      <div className="p-2 border-t border-[var(--dash-border-default)] flex-shrink-0 bg-[#3B4754]">
        <button
          onClick={onDateFilterClick}
          className="w-full dash-btn-primary text-[var(--dash-text-primary)] px-3 py-2 rounded font-medium flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <CalendarDaysIcon className="h-4 w-4" />
          <span>التاريخ</span>
        </button>

        {/* Current Filter Display */}
        {dateFilter.type !== 'all' && dateFilterDescription && (
          <div className="mt-1.5 text-center">
            <span className="text-xs text-dash-accent-blue break-words leading-tight">
              {dateFilterDescription}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
