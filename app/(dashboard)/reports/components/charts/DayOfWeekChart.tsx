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
import { DayOfWeekData, DateFilter } from '../../types/reports';
import { reportsService } from '../../services/reportsService';
import { CHART_COLORS, DARK_THEME, getChartConfig, formatCurrencyAr } from '../../utils/chartConfig';
import { TrophyIcon } from '@heroicons/react/24/solid';

interface DayOfWeekChartProps {
  dateFilter: DateFilter;
  height?: number;
}

export default function DayOfWeekChart({ dateFilter, height = 300 }: DayOfWeekChartProps) {
  const [data, setData] = useState<DayOfWeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bestDay, setBestDay] = useState<DayOfWeekData | null>(null);

  const chartConfig = getChartConfig();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const dayData = await reportsService.fetchDayOfWeekSales(dateFilter);
        // Sort by day of week for display (Sunday = 0)
        const sorted = [...dayData].sort((a, b) => {
          // Start from Saturday (6) then Sunday (0) for Arabic calendar
          const orderA = a.dayOfWeek === 6 ? 0 : a.dayOfWeek + 1;
          const orderB = b.dayOfWeek === 6 ? 0 : b.dayOfWeek + 1;
          return orderA - orderB;
        });
        setData(sorted);
        // Find best day (already sorted by totalSales in service)
        if (dayData.length > 0) {
          setBestDay(dayData[0]); // First one is the best
        }
      } catch (err) {
        console.error('Error fetching day of week sales:', err);
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
        <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">أفضل يوم في الأسبوع</h3>
        <div className="flex items-center justify-center text-dash-accent-red" style={{ height }}>
          {error}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
        <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">أفضل يوم في الأسبوع</h3>
        <div className="flex items-center justify-center text-[var(--dash-text-muted)]" style={{ height }}>
          لا توجد بيانات للفترة المحددة
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isBestDay = bestDay && item.dayOfWeek === bestDay.dayOfWeek;
      return (
        <div
          style={{
            backgroundColor: DARK_THEME.tooltipBackground,
            border: `1px solid ${isBestDay ? CHART_COLORS.success : DARK_THEME.tooltipBorder}`,
            borderRadius: '8px',
            padding: '12px',
            direction: 'rtl',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[var(--dash-text-primary)] font-semibold">{item.dayName}</p>
            {isBestDay && <TrophyIcon className="h-4 w-4 text-dash-accent-orange" />}
          </div>
          <p className="text-[var(--dash-text-secondary)]">الإجمالي: {formatCurrencyAr(item.totalSales)}</p>
          <p className="text-[var(--dash-text-secondary)]">عدد الفواتير: {item.saleCount}</p>
          <p className="text-[var(--dash-text-secondary)]">المتوسط: {formatCurrencyAr(item.avgSale)}</p>
          <p className="text-dash-accent-blue">النسبة: {item.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Find max for coloring
  const maxSales = Math.max(...data.map(d => d.totalSales));

  return (
    <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
      <div className="flex items-center justify-between mb-4">
        {bestDay && (
          <div className="flex items-center gap-2 text-sm">
            <TrophyIcon className="h-5 w-5 text-dash-accent-orange" />
            <span className="text-[var(--dash-text-muted)]">أفضل يوم: </span>
            <span className="text-dash-accent-green font-bold">{bestDay.dayName}</span>
            <span className="text-[var(--dash-text-muted)]">({formatCurrencyAr(bestDay.totalSales)})</span>
          </div>
        )}
        <h3 className="text-[var(--dash-text-primary)] font-semibold text-right">أفضل يوم في الأسبوع</h3>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid {...chartConfig.cartesianGrid} />
          <XAxis
            dataKey="dayName"
            {...chartConfig.xAxis}
            interval={0}
          />
          <YAxis
            {...chartConfig.yAxis}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalSales" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const isBestDay = bestDay && entry.dayOfWeek === bestDay.dayOfWeek;
              const intensity = entry.totalSales / maxSales;
              let color;
              if (isBestDay) {
                color = CHART_COLORS.success; // Green for best day
              } else if (intensity > 0.7) {
                color = CHART_COLORS.primary; // Blue for high
              } else if (intensity > 0.4) {
                color = CHART_COLORS.cyan; // Cyan for medium
              } else {
                color = '#4B5563'; // Gray for low
              }
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
