'use client';

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useFormatPrice } from '@/lib/hooks/useCurrency';
import { CHART_COLORS } from '../../utils/chartConfig';

interface SparklineData {
  value: number;
}

interface KPICardProps {
  title: string;
  value: number;
  previousValue: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  sparklineData?: SparklineData[];
  formatAsCurrency?: boolean;
  loading?: boolean;
}

export default function KPICard({
  title,
  value,
  previousValue,
  icon: Icon,
  iconBgColor,
  iconColor,
  sparklineData = [],
  formatAsCurrency = true,
  loading = false,
}: KPICardProps) {
  const formatPrice = useFormatPrice();

  const percentChange = previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : value > 0 ? 100 : 0;
  const isPositive = percentChange >= 0;

  if (loading) {
    return (
      <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="h-8 bg-[var(--dash-bg-overlay)] rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-[var(--dash-bg-overlay)] rounded w-1/2"></div>
          </div>
          <div className="w-14 h-14 bg-[var(--dash-bg-overlay)] rounded-lg"></div>
        </div>
        <div className="h-12 bg-[var(--dash-bg-overlay)] rounded"></div>
        <div className="h-4 bg-[var(--dash-bg-overlay)] rounded w-1/3 mt-2"></div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--dash-bg-raised)] rounded-lg border border-[var(--dash-border-default)] p-6 hover:border-[var(--dash-border-subtle)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="text-right flex-1">
          <div className="text-3xl font-bold text-[var(--dash-text-primary)] mb-1">
            {formatAsCurrency ? formatPrice(value) : value.toLocaleString('ar-EG')}
          </div>
          <div className={`flex items-center gap-1 justify-end ${isPositive ? 'text-dash-accent-green' : 'text-dash-accent-red'}`}>
            {isPositive ? (
              <ArrowTrendingUpIcon className="h-4 w-4" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
            <span className="text-[var(--dash-text-muted)] text-xs mr-1">
              عن الفترة السابقة
            </span>
          </div>
        </div>
        <div className={`p-3 ${iconBgColor} rounded-lg`}>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
      </div>

      {sparklineData.length > 0 && (
        <div className="h-12 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? CHART_COLORS.success : CHART_COLORS.danger}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? CHART_COLORS.success : CHART_COLORS.danger}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? CHART_COLORS.success : CHART_COLORS.danger}
                fill={`url(#gradient-${title})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="text-[var(--dash-text-secondary)] text-sm text-right mt-2">{title}</div>
    </div>
  );
}
