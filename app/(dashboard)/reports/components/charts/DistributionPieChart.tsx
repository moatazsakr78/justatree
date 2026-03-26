'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CATEGORY_COLORS, DARK_THEME, formatCurrencyAr } from '../../utils/chartConfig';

interface DistributionPieChartProps {
  data: any[];
  nameField: string;
  valueField: string;
  title: string;
  formatValue?: (value: number) => string;
  maxSlices?: number;
}

export default function DistributionPieChart({
  data,
  nameField,
  valueField,
  title,
  formatValue = formatCurrencyAr,
  maxSlices = 8,
}: DistributionPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
        <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">{title}</h3>
        <div className="flex items-center justify-center text-[var(--dash-text-muted)]" style={{ height: 450 }}>
          لا توجد بيانات
        </div>
      </div>
    );
  }

  // Sort by value descending
  const sorted = [...data].sort((a, b) => Math.abs(b[valueField] || 0) - Math.abs(a[valueField] || 0));

  // Group items beyond maxSlices into "أخرى"
  let chartData: any[];
  if (sorted.length > maxSlices) {
    const topItems = sorted.slice(0, maxSlices);
    const restItems = sorted.slice(maxSlices);
    const othersValue = restItems.reduce((sum, item) => sum + (item[valueField] || 0), 0);
    chartData = [
      ...topItems,
      { [nameField]: 'أخرى', [valueField]: othersValue },
    ];
  } else {
    chartData = sorted;
  }

  const total = chartData.reduce((sum, item) => sum + (item[valueField] || 0), 0);

  // Custom label renderer for slices > 5%
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    const item = chartData[index];
    const value = item[valueField] || 0;
    const percentage = total > 0 ? (value / total) * 100 : 0;

    if (percentage <= 5) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  // Custom center text
  const renderCenterText = ({ viewBox }: any) => {
    const { cx, cy } = viewBox;
    return (
      <g>
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill={DARK_THEME.textColor}
          fontSize={12}
        >
          الإجمالي
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize={14}
          fontWeight={700}
        >
          {formatValue(total)}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const value = item[valueField] || 0;
      const percentage = total > 0 ? (value / total) * 100 : 0;

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
          <p className="text-[var(--dash-text-secondary)]">
            القيمة: {formatValue(value)}
          </p>
          <p className="text-[var(--dash-text-secondary)]">
            النسبة: {percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend formatter
  const renderLegendText = (value: string) => {
    return <span style={{ color: DARK_THEME.textColor, fontSize: 12 }}>{value}</span>;
  };

  return (
    <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-4">
      <h3 className="text-[var(--dash-text-primary)] font-semibold mb-4 text-right">{title}</h3>
      <ResponsiveContainer width="100%" height={450}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={valueField}
            nameKey={nameField}
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            label={renderCustomLabel}
            labelLine={false}
          >
            {chartData.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                stroke="transparent"
              />
            ))}
            {renderCenterText({ viewBox: { cx: 0, cy: 0 } }) && null}
          </Pie>
          {/* Center label rendered via a custom Pie label trick - using a second invisible Pie */}
          <Pie
            data={[{ name: 'center', value: 1 }]}
            dataKey="value"
            cx="50%"
            cy="45%"
            innerRadius={0}
            outerRadius={0}
            fill="transparent"
            label={renderCenterText}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            formatter={renderLegendText}
            wrapperStyle={{ direction: 'rtl', paddingTop: '16px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
