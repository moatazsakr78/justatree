'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DARK_THEME, getChartConfig, formatCurrencyAr } from '../../utils/chartConfig';

interface AreaConfig {
  field: string;
  label: string;
  color: string;
}

interface TrendAreaChartProps {
  data: any[];
  xField: string;
  xLabel?: string;
  areas: AreaConfig[];
  title: string;
  formatValue?: (value: number) => string;
}

function tryFormatDate(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
    });
  }
  return String(value);
}

function tryFormatDateFull(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return String(value);
}

export default function TrendAreaChart({
  data,
  xField,
  xLabel,
  areas,
  title,
  formatValue = formatCurrencyAr,
}: TrendAreaChartProps) {
  const chartConfig = getChartConfig();

  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
        <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">{title}</h3>
        <div className="flex items-center justify-center text-[var(--dash-text-muted)]" style={{ height: 400 }}>
          لا توجد بيانات
        </div>
      </div>
    );
  }

  // Sort chronologically by xField ascending
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[xField];
    const bVal = b[xField];
    const aDate = new Date(aVal);
    const bDate = new Date(bVal);
    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return aDate.getTime() - bDate.getTime();
    }
    return String(aVal).localeCompare(String(bVal));
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: DARK_THEME.tooltipBackground,
            border: `1px solid ${DARK_THEME.tooltipBorder}`,
            borderRadius: '8px',
            padding: '12px',
            direction: 'rtl',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          }}
        >
          <p className="text-[var(--dash-text-primary)] font-semibold mb-2">
            {tryFormatDateFull(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-[var(--dash-text-secondary)]" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value || 0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
      <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={sortedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            {areas.map((area) => (
              <linearGradient key={`gradient-${area.field}`} id={`gradient-${area.field}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={area.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={area.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...chartConfig.cartesianGrid} />
          <XAxis
            dataKey={xField}
            {...chartConfig.xAxis}
            tickFormatter={tryFormatDate}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fill: DARK_THEME.textColor, fontSize: 12 } : undefined}
          />
          <YAxis
            {...chartConfig.yAxis}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ ...chartConfig.legend.wrapperStyle, paddingBottom: '12px' }}
          />
          {areas.map((area) => (
            <Area
              key={area.field}
              type="monotone"
              dataKey={area.field}
              name={area.label}
              stroke={area.color}
              strokeWidth={2}
              fill={`url(#gradient-${area.field})`}
              fillOpacity={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
