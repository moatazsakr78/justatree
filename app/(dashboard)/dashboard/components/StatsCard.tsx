'use client';

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { formatCurrencyAr } from '../../reports/utils/chartConfig';

interface StatsCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  format?: 'currency' | 'number';
  loading?: boolean;
  paymentBreakdown?: { method: string; amount: number }[];
}

const colorClasses = {
  blue: {
    bg: 'bg-dash-accent-blue-subtle',
    text: 'text-dash-accent-blue',
    iconBg: 'bg-dash-accent-blue-subtle',
  },
  green: {
    bg: 'bg-dash-accent-green-subtle',
    text: 'text-dash-accent-green',
    iconBg: 'bg-dash-accent-green-subtle',
  },
  purple: {
    bg: 'bg-dash-accent-purple-subtle',
    text: 'text-dash-accent-purple',
    iconBg: 'bg-dash-accent-purple-subtle',
  },
  red: {
    bg: 'bg-dash-accent-red-subtle',
    text: 'text-dash-accent-red',
    iconBg: 'bg-dash-accent-red-subtle',
  },
  orange: {
    bg: 'bg-dash-accent-orange-subtle',
    text: 'text-dash-accent-orange',
    iconBg: 'bg-dash-accent-orange-subtle',
  },
};

export default function StatsCard({
  title,
  value,
  previousValue,
  icon: Icon,
  color,
  format = 'number',
  loading = false,
  paymentBreakdown,
}: StatsCardProps) {
  const colors = colorClasses[color];

  // Calculate percentage change
  const calculateChange = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const change = calculateChange();
  const isPositive = change !== null && change >= 0;

  // Format the value
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return formatCurrencyAr(val);
    }
    return val.toLocaleString('ar-EG');
  };

  if (loading) {
    return (
      <div className="bg-[var(--dash-card-bg)] rounded-xl border border-[var(--dash-border-subtle)] shadow-dash-sm p-5 pb-6">
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-[var(--dash-bg-overlay)] rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-[var(--dash-bg-overlay)] rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-[var(--dash-bg-overlay)] rounded w-1/3"></div>
            </div>
            <div className="w-14 h-14 bg-[var(--dash-bg-overlay)] rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--dash-card-bg)] rounded-xl border border-[var(--dash-border-subtle)] shadow-dash-sm dash-card-hover p-5 pb-6 ${colors.bg} transition-colors`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[var(--dash-text-muted)] text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-[var(--dash-text-primary)] mb-2">
            {formatValue(value)}
          </p>
          {paymentBreakdown && paymentBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {paymentBreakdown.map(({ method, amount }) => (
                <span key={method} className="text-sm text-[var(--dash-text-muted)]">
                  {method}: <span className="text-[var(--dash-text-secondary)] font-medium">{formatValue(amount)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          {change !== null && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-dash-accent-green" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-dash-accent-red" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-dash-accent-green' : 'text-dash-accent-red'}`}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-[var(--dash-text-disabled)] text-xs">من السابق</span>
            </div>
          )}
          <div className={`p-3 rounded-xl ${colors.iconBg}`}>
            <Icon className={`w-8 h-8 ${colors.text}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
