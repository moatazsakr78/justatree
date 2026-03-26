'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DARK_THEME, getChartConfig, formatCurrencyAr } from '../../utils/chartConfig';

interface BarConfig {
  field: string;
  label: string;
  color: string;
}

interface TopNBarChartProps {
  data: any[];
  nameField: string;
  bars: BarConfig[];
  sortByField: string;
  topN?: number;
  title: string;
  formatValue?: (value: number) => string;
}

export default function TopNBarChart({
  data,
  nameField,
  bars,
  sortByField,
  topN = 10,
  title,
  formatValue = formatCurrencyAr,
}: TopNBarChartProps) {
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

  // Sort by sortByField descending (using Math.abs for balance-type fields)
  const sorted = [...data].sort((a, b) => Math.abs(b[sortByField] || 0) - Math.abs(a[sortByField] || 0));

  // Take top N and group the rest into "أخرى"
  let chartData: any[];
  if (sorted.length > topN) {
    const topItems = sorted.slice(0, topN);
    const restItems = sorted.slice(topN);

    const othersEntry: any = { [nameField]: 'أخرى' };
    bars.forEach((bar) => {
      othersEntry[bar.field] = restItems.reduce((sum, item) => sum + (item[bar.field] || 0), 0);
    });

    chartData = [...topItems, othersEntry];
  } else {
    chartData = sorted;
  }

  // Reverse for RTL display (bottom item appears at top visually)
  chartData = [...chartData].reverse();

  const containerHeight = Math.max(400, topN * 45);

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
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          }}
        >
          <p className="text-[var(--dash-text-primary)] font-semibold mb-2">{item[nameField]}</p>
          {bars.map((bar) => (
            <p key={bar.field} className="text-[var(--dash-text-secondary)]" style={{ color: bar.color }}>
              {bar.label}: {formatValue(item[bar.field] || 0)}
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
      <ResponsiveContainer width="100%" height={containerHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid {...chartConfig.cartesianGrid} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            {...chartConfig.xAxis}
            tickFormatter={(value) => formatValue(value)}
          />
          <YAxis
            type="category"
            dataKey={nameField}
            {...chartConfig.yAxis}
            width={120}
            tick={{ fill: DARK_THEME.textColor, fontSize: 11, textAnchor: 'end' }}
            tickFormatter={(value: string) => value.length > 15 ? value.substring(0, 15) + '...' : value}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ ...chartConfig.legend.wrapperStyle, paddingBottom: '12px' }}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.field}
              dataKey={bar.field}
              name={bar.label}
              fill={bar.color}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
