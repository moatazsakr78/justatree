'use client';
import React from 'react';
import {
  DocumentTextIcon,
  ArrowsUpDownIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  CalendarDaysIcon,
  PresentationChartBarIcon,
  PrinterIcon,
  DocumentChartBarIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { ActiveFilterType, SimpleFiltersResult, MultiFiltersResult, getSimpleFiltersCount, getMultiFiltersCount } from '@/app/types/filters';

interface ReportsToolbarProps {
  currentView: 'main' | 'periodic';
  onViewChange: (view: 'main' | 'periodic') => void;
  onSimpleFilterClick: () => void;
  onMultiFilterClick: () => void;
  onDateFilterClick: () => void;
  onRefresh: () => void;
  activeFilterType: ActiveFilterType;
  simpleFilters: SimpleFiltersResult;
  multiFilters: MultiFiltersResult;
}

export default function ReportsToolbar({
  currentView,
  onViewChange,
  onSimpleFilterClick,
  onMultiFilterClick,
  onDateFilterClick,
  onRefresh,
  activeFilterType,
  simpleFilters,
  multiFilters,
}: ReportsToolbarProps) {
  const activeClass = 'text-dash-accent-blue bg-dash-accent-blue-subtle';
  const inactiveClass = 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]';
  const disabledClass = 'text-[var(--dash-text-disabled)] cursor-default';
  const buttonBase = 'flex flex-col items-center p-2 min-w-[80px]';

  return (
    <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-2 w-full">
      <div className="flex items-center justify-start gap-1 overflow-x-auto scrollbar-hide">
        {/* التقارير */}
        <button
          onClick={() => onViewChange('main')}
          className={`${buttonBase} cursor-pointer ${
            currentView === 'main' ? activeClass : inactiveClass
          }`}
        >
          <DocumentTextIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">التقارير</span>
        </button>

        {/* ترتيب - disabled */}
        <button
          className={`${buttonBase} ${disabledClass}`}
          title="قريبا"
        >
          <ArrowsUpDownIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">ترتيب</span>
        </button>

        {/* تصدير - disabled */}
        <button
          className={`${buttonBase} ${disabledClass}`}
          title="قريبا"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">تصدير</span>
        </button>

        {/* فلتر بسيط */}
        <button
          onClick={onSimpleFilterClick}
          className={`${buttonBase} cursor-pointer ${
            activeFilterType === 'simple' && getSimpleFiltersCount(simpleFilters) > 0
              ? activeClass
              : inactiveClass
          }`}
        >
          <FunnelIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">فلتر بسيط</span>
          {activeFilterType === 'simple' && getSimpleFiltersCount(simpleFilters) > 0 && (
            <span className="text-xs bg-dash-accent-blue-subtle text-dash-accent-blue px-1 rounded">
              {getSimpleFiltersCount(simpleFilters)}
            </span>
          )}
        </button>

        {/* فلتر متعدد */}
        <button
          onClick={onMultiFilterClick}
          className={`${buttonBase} cursor-pointer ${
            activeFilterType === 'multi' && getMultiFiltersCount(multiFilters) > 0
              ? 'text-dash-accent-green bg-dash-accent-green-subtle'
              : inactiveClass
          }`}
        >
          <FunnelIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">فلتر متعدد</span>
          {activeFilterType === 'multi' && getMultiFiltersCount(multiFilters) > 0 && (
            <span className="text-xs bg-dash-accent-green-subtle text-dash-accent-green px-1 rounded">
              {getMultiFiltersCount(multiFilters)}
            </span>
          )}
        </button>

        {/* تواريخ */}
        <button
          onClick={onDateFilterClick}
          className={`${buttonBase} cursor-pointer ${inactiveClass}`}
        >
          <CalendarDaysIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">تواريخ</span>
        </button>

        {/* عرض بياني - disabled */}
        <button
          className={`${buttonBase} ${disabledClass}`}
          title="قريبا"
        >
          <PresentationChartBarIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">عرض بياني</span>
        </button>

        {/* طباعة - disabled */}
        <button
          className={`${buttonBase} ${disabledClass}`}
          title="قريبا"
        >
          <PrinterIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">طباعة</span>
        </button>

        {/* تقرير مفصل - disabled */}
        <button
          className={`${buttonBase} ${disabledClass}`}
          title="قريبا"
        >
          <DocumentChartBarIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">تقرير مفصل</span>
        </button>

        {/* تقارير دورية */}
        <button
          onClick={() => onViewChange('periodic')}
          className={`${buttonBase} cursor-pointer ${
            currentView === 'periodic' ? activeClass : inactiveClass
          }`}
        >
          <ClockIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">تقارير دورية</span>
        </button>

        {/* تحديث */}
        <button
          onClick={onRefresh}
          className={`${buttonBase} cursor-pointer ${inactiveClass}`}
        >
          <ArrowPathIcon className="h-5 w-5 mb-1" />
          <span className="text-sm">تحديث</span>
        </button>
      </div>
    </div>
  );
}
