'use client';

import React from 'react';
import { XMarkIcon, CogIcon } from '@heroicons/react/24/outline';
import type { PermissionDefinition } from '@/types/permissions';
import { PERMISSION_TYPE_LABELS, PERMISSION_TYPE_COLORS } from '@/types/permissions';

interface PermissionCardProps {
  permission: PermissionDefinition;
  isRestricted: boolean; // true = CHECKED = DISABLED for role
  onToggle: (permissionCode: string, restricted: boolean) => void;
  disabled?: boolean;
}

export default function PermissionCard({
  permission,
  isRestricted,
  onToggle,
  disabled = false,
}: PermissionCardProps) {
  const handleToggle = () => {
    if (disabled) return;
    onToggle(permission.code, !isRestricted);
  };

  const typeLabel = PERMISSION_TYPE_LABELS[permission.permission_type];
  const typeColor = PERMISSION_TYPE_COLORS[permission.permission_type];

  return (
    <div
      onClick={handleToggle}
      className={`
        relative flex flex-col p-4 rounded-xl border transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
        ${isRestricted
          ? 'bg-red-500/10 border-red-500/40 hover:border-red-500'
          : 'bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)]/50 hover:border-blue-500/50'
        }
      `}
    >
      {/* Status Indicator */}
      <div
        className={`
          absolute top-3 left-3 w-2 h-2 rounded-full
          ${isRestricted ? 'bg-red-500' : 'bg-green-500'}
        `}
      />

      {/* Header: Checkbox + Title */}
      <div className="flex items-start gap-3">
        {/* Checkbox with X mark */}
        <div
          className={`
            flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${isRestricted
              ? 'bg-red-500 border-red-500'
              : 'border-[var(--dash-text-disabled)] bg-transparent hover:border-[var(--dash-text-muted)]'
            }
          `}
        >
          {isRestricted && <XMarkIcon className="w-4 h-4 text-white stroke-[3]" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[var(--dash-text-primary)] font-medium text-sm leading-tight">{permission.name}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeColor}`}>
              {typeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {permission.description && (
        <p className="text-[var(--dash-text-muted)] text-xs mt-2 mr-9 line-clamp-2">{permission.description}</p>
      )}

      {/* Status Text */}
      <div className="mt-3 mr-9">
        {isRestricted ? (
          <span className="text-xs text-red-400 font-medium">
            ممنوع
          </span>
        ) : (
          <span className="text-xs text-green-400 font-medium">
            مسموح
          </span>
        )}
      </div>
    </div>
  );
}
