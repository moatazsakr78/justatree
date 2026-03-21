'use client';

import {
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { ActivityLogEntry } from '../hooks/useActivityLogs';

interface ActivityLogsListProps {
  logs: ActivityLogEntry[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const actionConfig: Record<string, { icon: typeof PlusCircleIcon; color: string; bg: string }> = {
  create: { icon: PlusCircleIcon, color: 'text-dash-accent-green', bg: 'bg-dash-accent-green-subtle' },
  update: { icon: PencilSquareIcon, color: 'text-dash-accent-blue', bg: 'bg-dash-accent-blue-subtle' },
  delete: { icon: TrashIcon, color: 'text-dash-accent-red', bg: 'bg-dash-accent-red-subtle' },
};

const entityLabels: Record<string, { label: string; color: string }> = {
  product: { label: 'المنتجات', color: 'bg-dash-accent-purple-subtle text-dash-accent-purple' },
  sale: { label: 'المبيعات', color: 'bg-dash-accent-green-subtle text-dash-accent-green' },
  customer: { label: 'العملاء', color: 'bg-dash-accent-blue-subtle text-dash-accent-blue' },
  supplier: { label: 'الموردين', color: 'bg-dash-accent-orange-subtle text-dash-accent-orange' },
  inventory: { label: 'المخزون', color: 'bg-dash-accent-orange-subtle text-dash-accent-orange' },
  purchase: { label: 'المشتريات', color: 'bg-dash-accent-cyan-subtle text-dash-accent-cyan' },
  order: { label: 'الطلبات', color: 'bg-dash-accent-blue-subtle text-dash-accent-blue' },
  expense: { label: 'المصروفات', color: 'bg-dash-accent-red-subtle text-dash-accent-red' },
  cash_drawer: { label: 'الخزن', color: 'bg-dash-accent-green-subtle text-dash-accent-green' },
  payment_method: { label: 'الدفع', color: 'bg-dash-accent-cyan-subtle text-dash-accent-cyan' },
  category: { label: 'الأصناف', color: 'bg-dash-accent-purple-subtle text-dash-accent-purple' },
  setting: { label: 'الإعدادات', color: 'bg-dash-accent-blue-subtle text-dash-accent-blue' },
  permission: { label: 'الصلاحيات', color: 'bg-dash-accent-orange-subtle text-dash-accent-orange' },
  user: { label: 'المستخدمين', color: 'bg-dash-accent-cyan-subtle text-dash-accent-cyan' },
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'الآن';
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'منذ يوم';
  if (diffInDays < 7) return `منذ ${diffInDays} أيام`;

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ActivityLogsList({
  logs,
  loading,
  page,
  totalPages,
  onPageChange,
}: ActivityLogsListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-[var(--dash-bg-surface)] rounded-lg">
            <div className="w-9 h-9 bg-[var(--dash-bg-overlay)] rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <div className="h-4 bg-[var(--dash-bg-overlay)] rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-[var(--dash-bg-overlay)] rounded w-1/3"></div>
            </div>
            <div className="h-5 bg-[var(--dash-bg-overlay)] rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--dash-text-muted)]">
        <PencilSquareIcon className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">لا توجد سجلات نشاط</p>
        <p className="text-sm mt-1">لم يتم تسجيل أي نشاط بعد</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {logs.map((log) => {
          const config = actionConfig[log.action_type] || actionConfig.update;
          const Icon = config.icon;
          const entity = entityLabels[log.entity_type] || { label: log.entity_type, color: 'bg-dash-accent-blue-subtle text-dash-accent-blue' };

          return (
            <div
              key={log.id}
              className="flex items-center gap-3 p-3 bg-[var(--dash-bg-surface)] rounded-lg hover:bg-[var(--dash-bg-overlay)] transition-colors"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--dash-text-primary)] text-sm truncate">{log.description}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--dash-text-muted)] mt-0.5">
                  <span className="truncate">{log.user_name}</span>
                  <span>•</span>
                  <span className="whitespace-nowrap">{formatRelativeTime(log.created_at)}</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${entity.color}`}>
                {entity.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    page === pageNum
                      ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                      : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
