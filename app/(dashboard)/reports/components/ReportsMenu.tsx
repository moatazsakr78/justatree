'use client';
import React from 'react';
import { REPORT_REGISTRY, REPORT_CATEGORIES, ReportDefinition } from '../config/reportRegistry';
import {
  ChartBarIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  DocumentChartBarIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface ReportsMenuProps {
  onReportClick: (report: ReportDefinition) => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  sales: ChartBarIcon,
  purchases: ShoppingCartIcon,
  financial: CurrencyDollarIcon,
  inventory: ArchiveBoxIcon,
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  blue: 'text-dash-accent-blue',
  green: 'text-dash-accent-green',
  purple: 'text-dash-accent-purple',
  orange: 'text-dash-accent-orange',
};

export default function ReportsMenu({ onReportClick }: ReportsMenuProps) {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-4">
      <div className="space-y-6">
        {REPORT_CATEGORIES.map((category) => {
          const IconComponent = CATEGORY_ICON_MAP[category.id];
          const colorClass = CATEGORY_COLOR_MAP[category.color] || 'text-dash-accent-blue';
          const reports = REPORT_REGISTRY.filter((r) => r.category === category.id);

          if (reports.length === 0) return null;

          return (
            <div key={category.id}>
              <h2 className="text-lg font-semibold text-[var(--dash-text-primary)] mb-3 text-right flex items-center gap-2">
                {IconComponent && <IconComponent className={`h-5 w-5 ${colorClass}`} />}
                {category.titleAr}
              </h2>
              <div className="bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg overflow-hidden">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => onReportClick(report)}
                    className="group w-full bg-[var(--dash-bg-raised)] hover:bg-[#3B4754] text-right text-[var(--dash-text-primary)] transition-all duration-200 flex items-center justify-between text-sm p-2"
                  >
                    {/* Left side - Report icon */}
                    <div className="flex items-center gap-2">
                      <DocumentChartBarIcon className="w-4 h-4 text-dash-accent-blue" />
                    </div>

                    {/* Center - Report name */}
                    <div className="flex-1 text-right mr-1.5">
                      <span>{report.titleAr}</span>
                    </div>

                    {/* Right side - Star for favorites */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1 hover:bg-dash-accent-orange-subtle rounded transition-colors cursor-pointer">
                        <StarIcon className="w-4 h-4 text-dash-accent-orange" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
