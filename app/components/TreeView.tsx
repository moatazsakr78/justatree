'use client';

import React from 'react';
import {
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

export interface TreeNode {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: { selected: number; total: number };
  isExpanded?: boolean;
  children?: TreeNode[];
}

interface TreeViewProps {
  data: TreeNode[];
  onItemClick?: (item: TreeNode) => void;
  onToggle?: (nodeId: string) => void;
  selectedId?: string;
}

interface TreeNodeProps {
  node: TreeNode;
  level?: number;
  onItemClick?: (item: TreeNode) => void;
  onToggle?: (nodeId: string) => void;
  selectedId?: string;
}

const TreeNodeComponent = ({
  node,
  level = 0,
  onItemClick,
  onToggle,
  selectedId
}: TreeNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id && !hasChildren;
  const IconComponent = node.icon;

  const handleClick = () => {
    if (hasChildren && onToggle) {
      onToggle(node.id);
    }
    if (onItemClick) {
      onItemClick(node);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-all duration-200 rounded-lg mx-1 my-0.5 ${
          isSelected
            ? 'bg-dash-accent-blue text-white'
            : hasChildren
              ? 'hover:bg-[var(--dash-bg-surface)] text-gray-200'
              : 'hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
        }`}
        style={{ paddingRight: `${12 + level * 16}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {hasChildren ? (
            <button className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] flex-shrink-0 transition-colors">
              {node.isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {IconComponent ? (
            <IconComponent className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-[var(--dash-text-muted)]'}`} />
          ) : null}

          <span className={`text-sm font-medium truncate ${
            isSelected ? 'text-white' : hasChildren ? 'text-gray-200' : 'text-[var(--dash-text-secondary)]'
          }`}>
            {node.name}
          </span>
        </div>

        {/* العداد */}
        {node.count && (
          <span
            className={`
              text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2 font-medium
              ${isSelected
                ? 'bg-white/20 text-white'
                : node.count.selected > 0
                  ? 'bg-dash-accent-red-subtle text-dash-accent-red'
                  : 'bg-[var(--dash-bg-overlay)]/50 text-[var(--dash-text-muted)]'
              }
            `}
          >
            {node.count.selected}/{node.count.total}
          </span>
        )}
      </div>

      {hasChildren && node.isExpanded && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onItemClick={onItemClick}
              onToggle={onToggle}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView = ({ data, onItemClick, onToggle, selectedId }: TreeViewProps) => {
  return (
    <div className="w-full">
      {data.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          onItemClick={onItemClick}
          onToggle={onToggle}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
};

export default TreeView;
