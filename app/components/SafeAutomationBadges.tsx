'use client'

import { useState, useRef, useEffect } from 'react'
import { PlayIcon, PauseIcon, TrashIcon, PencilIcon, ClockIcon, BoltIcon } from '@heroicons/react/24/outline'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import type { SafeAutomation } from '@/app/lib/hooks/useSafeAutomations'

const SCHEDULE_LABELS: Record<string, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري'
}

const OPERATION_LABELS: Record<string, string> = {
  withdraw: 'سحب',
  deposit: 'إيداع',
  transfer: 'تحويل'
}

const STATUS_LABELS: Record<string, string> = {
  success: 'تم بنجاح',
  skipped: 'تم تخطيه',
  error: 'خطأ'
}

interface SafeAutomationBadgesProps {
  automations: SafeAutomation[]
  onEdit: (automation: SafeAutomation) => void
  onToggleActive: (id: string) => void
  onDelete: (id: string) => void
  onExecuteNow: (id: string) => void
}

export default function SafeAutomationBadges({
  automations,
  onEdit,
  onToggleActive,
  onDelete,
  onExecuteNow
}: SafeAutomationBadgesProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; automation: SafeAutomation } | null>(null)
  const [detailsPopover, setDetailsPopover] = useState<{ automation: SafeAutomation; rect: DOMRect } | null>(null)
  const [isExecuting, setIsExecuting] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setDetailsPopover(null)
      }
    }
    if (detailsPopover) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [detailsPopover])

  if (automations.length === 0) return null

  const handleContextMenu = (e: React.MouseEvent, automation: SafeAutomation) => {
    e.preventDefault()
    setDetailsPopover(null)
    setContextMenu({ x: e.clientX, y: e.clientY, automation })
  }

  const handleClick = (e: React.MouseEvent, automation: SafeAutomation) => {
    setContextMenu(null)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDetailsPopover(prev => prev?.automation.id === automation.id ? null : { automation, rect })
  }

  const handleExecuteNow = async (id: string) => {
    setIsExecuting(id)
    try {
      await onExecuteNow(id)
    } finally {
      setIsExecuting(null)
      setDetailsPopover(null)
    }
  }

  const getContextMenuItems = (automation: SafeAutomation): ContextMenuItem[] => [
    {
      label: automation.is_active ? 'إيقاف' : 'تشغيل',
      icon: automation.is_active ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />,
      onClick: () => { onToggleActive(automation.id); setContextMenu(null) }
    },
    {
      label: 'تنفيذ الآن',
      icon: <BoltIcon className="h-4 w-4" />,
      onClick: () => { handleExecuteNow(automation.id); setContextMenu(null) }
    },
    {
      label: 'تعديل',
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: () => { onEdit(automation); setContextMenu(null) }
    },
    {
      label: 'حذف',
      icon: <TrashIcon className="h-4 w-4" />,
      danger: true,
      onClick: () => {
        if (confirm('هل أنت متأكد من حذف هذه الأتمتة؟')) {
          onDelete(automation.id)
        }
        setContextMenu(null)
      }
    }
  ]

  const formatTime = (time: string) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const period = hour >= 12 ? 'م' : 'ص'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${m} ${period}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'لم يتم'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-EG', {
      timeZone: 'Africa/Cairo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {automations.map(auto => (
          <button
            key={auto.id}
            onClick={(e) => handleClick(e, auto)}
            onContextMenu={(e) => handleContextMenu(e, auto)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border cursor-pointer ${
              auto.is_active
                ? 'bg-dash-accent-blue-subtle border-dash-accent-blue/40 text-dash-accent-blue hover:bg-dash-accent-blue/20'
                : 'bg-[var(--dash-bg-raised)] border-[var(--dash-border-subtle)] text-[var(--dash-text-disabled)] hover:bg-[var(--dash-bg-overlay)]'
            }`}
            title={`${auto.name} - ${SCHEDULE_LABELS[auto.schedule_type]} ${formatTime(auto.schedule_time)}`}
          >
            <ClockIcon className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[120px]">{auto.name}</span>
            {isExecuting === auto.id && (
              <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
            )}
            {!auto.is_active && <PauseIcon className="h-3 w-3 shrink-0" />}
          </button>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={true}
          onClose={() => setContextMenu(null)}
          items={getContextMenuItems(contextMenu.automation)}
        />
      )}

      {/* Details Popover */}
      {detailsPopover && (
        <div
          ref={popoverRef}
          className="fixed z-[70] bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg shadow-xl w-72 animate-dash-scale-in"
          style={{
            top: detailsPopover.rect.bottom + 8,
            left: Math.min(detailsPopover.rect.left, window.innerWidth - 300)
          }}
        >
          <div className="p-3 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                detailsPopover.automation.is_active
                  ? 'bg-dash-accent-green-subtle text-dash-accent-green'
                  : 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-disabled)]'
              }`}>
                {detailsPopover.automation.is_active ? 'نشط' : 'متوقف'}
              </span>
              <h4 className="text-[var(--dash-text-primary)] text-sm font-medium text-right">{detailsPopover.automation.name}</h4>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--dash-text-primary)]">{OPERATION_LABELS[detailsPopover.automation.operation_type]}</span>
                <span className="text-[var(--dash-text-muted)]">نوع العملية</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--dash-text-primary)]">
                  {detailsPopover.automation.amount_type === 'fixed'
                    ? `${detailsPopover.automation.fixed_amount}`
                    : detailsPopover.automation.amount_type === 'all_excluding_reserves'
                      ? 'الكل بدون المجنب'
                      : 'كل الرصيد'}
                </span>
                <span className="text-[var(--dash-text-muted)]">المبلغ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--dash-text-primary)]">
                  {SCHEDULE_LABELS[detailsPopover.automation.schedule_type]} - {formatTime(detailsPopover.automation.schedule_time)}
                </span>
                <span className="text-[var(--dash-text-muted)]">الجدول</span>
              </div>
              <div className="flex justify-between">
                <span className={`${
                  detailsPopover.automation.last_execution_status === 'success' ? 'text-dash-accent-green' :
                  detailsPopover.automation.last_execution_status === 'skipped' ? 'text-dash-accent-orange' :
                  detailsPopover.automation.last_execution_status === 'error' ? 'text-dash-accent-red' :
                  'text-[var(--dash-text-disabled)]'
                }`}>
                  {detailsPopover.automation.last_execution_status
                    ? `${STATUS_LABELS[detailsPopover.automation.last_execution_status]} - ${formatDate(detailsPopover.automation.last_executed_at)}`
                    : 'لم يتم التنفيذ بعد'}
                </span>
                <span className="text-[var(--dash-text-muted)]">آخر تنفيذ</span>
              </div>
              {detailsPopover.automation.next_scheduled_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--dash-text-primary)]">{formatDate(detailsPopover.automation.next_scheduled_at)}</span>
                  <span className="text-[var(--dash-text-muted)]">التنفيذ القادم</span>
                </div>
              )}

              {/* Recent Logs */}
              {detailsPopover.automation.safe_automation_logs && detailsPopover.automation.safe_automation_logs.length > 0 && (
                <div className="border-t border-[var(--dash-border-subtle)] pt-2 mt-2">
                  <span className="text-[var(--dash-text-muted)] block text-right mb-1">آخر التنفيذات</span>
                  {detailsPopover.automation.safe_automation_logs.slice(0, 3).map(log => (
                    <div key={log.id} className="flex justify-between items-center py-0.5">
                      <span className={`text-[10px] ${
                        log.status === 'success' ? 'text-dash-accent-green' :
                        log.status === 'skipped' ? 'text-dash-accent-orange' : 'text-dash-accent-red'
                      }`}>
                        {STATUS_LABELS[log.status]}{log.amount_executed ? ` (${log.amount_executed})` : ''}
                      </span>
                      <span className="text-[10px] text-[var(--dash-text-disabled)]">{formatDate(log.executed_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-[var(--dash-border-subtle)]">
              <button
                onClick={() => { handleExecuteNow(detailsPopover.automation.id) }}
                disabled={isExecuting === detailsPopover.automation.id}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 dash-btn-primary rounded text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isExecuting === detailsPopover.automation.id ? (
                  <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                ) : (
                  <BoltIcon className="h-3 w-3" />
                )}
                تنفيذ الآن
              </button>
              <button
                onClick={() => { onEdit(detailsPopover.automation); setDetailsPopover(null) }}
                className="px-2 py-1.5 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-highlight)] rounded text-xs transition-colors text-[var(--dash-text-secondary)]"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
