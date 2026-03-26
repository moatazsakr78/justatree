'use client';
import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon, TableCellsIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { TabState } from '../hooks/useReportTabs';
import { getReportById } from '../config/reportRegistry';

interface ReportTabBarProps {
  openTabs: TabState[];
  activeTab: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onColumnsClick: (reportId: string) => void;
  onToggleViewMode: (tabId: string) => void;
}

export default function ReportTabBar({
  openTabs,
  activeTab,
  searchQuery,
  onSearchChange,
  onSwitchTab,
  onCloseTab,
  onColumnsClick,
  onToggleViewMode,
}: ReportTabBarProps) {
  // Get search placeholder from registry for active tab
  const activeReport = getReportById(activeTab);
  const searchPlaceholder = activeReport?.searchPlaceholder || 'بحث...';

  return (
    <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] flex-shrink-0">
      <div className="flex items-center overflow-x-auto scrollbar-hide">
        {/* Search Box - Left Side (only when not on main tab) */}
        {activeTab !== 'main' && (
          <div className="flex-shrink-0 px-2 py-1.5 border-r border-[var(--dash-border-default)]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-56 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md py-1.5 px-3 pr-8 text-sm text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:border-dash-accent-blue focus:ring-1 focus:ring-dash-accent-blue"
                dir="rtl"
              />
              <MagnifyingGlassIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-muted)]" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Strip */}
        {openTabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center border-r border-[var(--dash-border-default)] ${
              tab.active
                ? 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] border-b-2 border-dash-accent-blue'
                : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[#4B5563]'
            }`}
          >
            <button
              onClick={() => onSwitchTab(tab.id)}
              className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {tab.id === 'main' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <span>{tab.title}</span>
            </button>

            {/* View Mode Toggle - Only for non-main tabs */}
            {tab.id !== 'main' && (
              <div className="flex items-center mr-1 bg-[var(--dash-bg-surface)] rounded overflow-hidden border border-[var(--dash-border-default)]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tab.viewMode !== 'table') onToggleViewMode(tab.id);
                  }}
                  className={`p-1 transition-colors ${
                    tab.viewMode === 'table'
                      ? 'bg-dash-accent-blue text-white'
                      : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]'
                  }`}
                  title="عرض جدول"
                >
                  <TableCellsIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tab.viewMode !== 'chart') onToggleViewMode(tab.id);
                  }}
                  className={`p-1 transition-colors ${
                    tab.viewMode === 'chart'
                      ? 'bg-dash-accent-blue text-white'
                      : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]'
                  }`}
                  title="عرض بياني"
                >
                  <ChartBarIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Column Manager Button - Only for non-main tabs in table view */}
            {tab.id !== 'main' && tab.viewMode === 'table' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onColumnsClick(tab.id);
                }}
                className="ml-1 p-1 hover:text-dash-accent-blue hover:bg-dash-accent-blue-subtle rounded transition-colors"
                title="إدارة الأعمدة"
              >
                <TableCellsIcon className="w-4 h-4" />
              </button>
            )}

            {/* Close Tab Button - Only for non-main tabs */}
            {tab.id !== 'main' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="ml-1 p-1 hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded transition-colors"
                title="إغلاق"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
