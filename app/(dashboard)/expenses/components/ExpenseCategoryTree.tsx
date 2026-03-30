'use client'

import { MinusIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline'
import type { CategoryTreeNode } from '../services/expenseService'

interface TreeNodeProps {
  node: CategoryTreeNode
  level?: number
  selectedId: string | null
  onSelect: (node: CategoryTreeNode | null) => void
  onToggle: (nodeId: string) => void
}

function TreeNode({ node, level = 0, selectedId, onSelect, onToggle }: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id

  return (
    <div>
      <div
        className={`flex items-center cursor-pointer transition-colors ${
          isSelected
            ? 'bg-dash-accent-blue text-white'
            : 'hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
        }`}
        style={{ paddingRight: `${16 + level * 24}px`, paddingLeft: '12px', paddingTop: '8px', paddingBottom: '8px' }}
        onClick={() => onSelect(isSelected ? null : node)}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              <button
                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--dash-bg-overlay)]/20"
                onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
              >
                {node.isExpanded ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
              </button>
            ) : null}
          </div>

          {node.color ? (
            <div className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: node.color + '30', border: `1.5px solid ${node.color}` }} />
          ) : (
            <FolderIcon className="h-5 w-5 text-[var(--dash-text-muted)] flex-shrink-0" />
          )}

          <span className={`text-sm truncate ${!node.is_active ? 'opacity-50 line-through' : ''}`}>
            {node.name}
          </span>
        </div>
      </div>

      {hasChildren && node.isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ExpenseCategoryTreeProps {
  tree: CategoryTreeNode[]
  selectedId: string | null
  onSelect: (node: CategoryTreeNode | null) => void
  onToggle: (nodeId: string) => void
  isLoading?: boolean
}

export default function ExpenseCategoryTree({ tree, selectedId, onSelect, onToggle, isLoading }: ExpenseCategoryTreeProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-center text-[var(--dash-text-muted)] text-sm">
        جاري تحميل التصنيفات...
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--dash-text-muted)] text-sm">
        لا توجد تصنيفات
      </div>
    )
  }

  return (
    <div className="py-2">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
