'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { HourlySalesData, DateFilter } from '../../types/reports';
import { reportsService } from '../../services/reportsService';
import { CHART_COLORS, DARK_THEME, getChartConfig, formatCurrencyAr } from '../../utils/chartConfig';

interface HourlySalesChartProps {
  dateFilter: DateFilter;
  height?: number;
}

export default function HourlySalesChart({ dateFilter, height = 300 }: HourlySalesChartProps) {
  const [data, setData] = useState<HourlySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [peakHour, setPeakHour] = useState<HourlySalesData | null>(null);

  const chartConfig = getChartConfig();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const hourly = await reportsService.fetchHourlySales(dateFilter);
        // Sort by hour for display
        const sorted = [...hourly].sort((a, b) => a.hour - b.hour);
        setData(sorted);
        // Find peak hour
        if (hourly.length > 0) {
          const peak = hourly.reduce((max, h) => h.totalSales > max.totalSales ? h : max, hourly[0]);
          setPeakHour(peak);
        }
      } catch (err) {
        console.error('Error fetching hourly sales:', err);
        setError('خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateFilter]);

  if (loading) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
        <div className="h-8 bg-[var(--dash-bg-overlay)] rounded w-1/3 mb-4"></div>
        <div className="animate-pulse bg-[var(--dash-bg-overlay)] rounded" style={{ height }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
        <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">المبيعات بالساعة</h3>
        <div className="flex items-center justify-center text-red-400" style={{ height }}>
          {error}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
        <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">المبيعات بالساعة</h3>
        <div className="flex items-center justify-center text-[var(--dash-text-muted)]" style={{ height }}>
          لا توجد بيانات للفترة المحددة
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: DARK_THEME.tooltipBackground,
            border: `1px solid ${DARK_THEME.tooltipBorder}`,
            borderRadius: '8px',
            padding: '12px',
            direction: 'rtl',
          }}
        >
          <p className="text-[var(--dash-text-primary)] font-semibold mb-2">{item.hourLabel}</p>
          <p className="text-[var(--dash-text-secondary)]">الإجمالي: {formatCurrencyAr(item.totalSales)}</p>
          <p className="text-[var(--dash-text-secondary)]">عدد العمليات: {item.saleCount}</p>
          <p className="text-[var(--dash-text-secondary)]">المتوسط: {formatCurrencyAr(item.avgSale)}</p>
          <p className="text-blue-400">النسبة: {item.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Find max sales for coloring
  const maxSales = Math.max(...data.map(d => d.totalSales));

  return (
    <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
      <div className="flex items-center justify-between mb-4">
        {peakHour && (
          <div className="text-sm">
            <span className="text-[var(--dash-text-muted)]">ساعة الذروة: </span>
            <span className="text-green-400 font-medium">{peakHour.hourLabel}</span>
          </div>
        )}
        <h3 className="text-[var(--dash-text-primary)] font-semibold text-right">المبيعات بالساعة</h3>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid {...chartConfig.cartesianGrid} />
          <XAxis
            dataKey="hour"
            {...chartConfig.xAxis}
            tickFormatter={(value) => {
              const period = value < 12 ? 'ص' : 'م';
              const hour = value === 0 ? 12 : value > 12 ? value - 12 : value;
              return `${hour}${period}`;
            }}
          />
          <YAxis
            {...chartConfig.yAxis}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalSales" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const intensity = entry.totalSales / maxSales;
              // Gradient from blue to green based on intensity
              const color = entry.totalSales === maxSales
                ? CHART_COLORS.success
                : intensity > 0.7
                  ? CHART_COLORS.cyan
                  : intensity > 0.4
                    ? CHART_COLORS.primary
                    : '#4B5563';
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
