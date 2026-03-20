'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { MinusIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline'

// Database category interface
interface Category {
  id: string
  name: string
  name_en: string | null
  parent_id: string | null
  image_url: string | null
  is_active: boolean | null
  sort_order: number | null
  created_at: string | null
  updated_at: string | null
}

// Product groups with nested structure
interface ProductGroup {
  id: string
  name: string
  isExpanded?: boolean
  isDefault?: boolean
  children?: ProductGroup[]
}

interface CategoriesTreeViewProps {
  onCategorySelect?: (category: Category | null) => void
  selectedCategoryId?: string | null
  showActionButtons?: boolean
}

// Simple tree view component matching the exact reference design
const TreeView = ({ 
  node, 
  level = 0, 
  onToggle,
  onSelect,
  selectedCategoryId,
  categories
}: { 
  node: ProductGroup
  level?: number
  onToggle: (nodeId: string) => void
  onSelect?: (category: Category | null) => void
  selectedCategoryId?: string | null
  categories?: Category[]
}) => {
  const hasChildren = node.children && node.children.length > 0
  
  const handleCategoryClick = () => {
    if (onSelect && categories) {
      const category = categories.find(cat => cat.name === node.name)
      if (category) {
        // If this category is already selected, deselect it (pass null)
        if (selectedCategoryId === node.id) {
          onSelect(null) // Deselect by passing null
        } else {
          onSelect(category) // Select the category
        }
      }
    }
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent category selection when clicking expand/collapse
    onToggle(node.id)
  }
  
  return (
    <div>
      <div 
        className={`flex items-center cursor-pointer transition-colors ${
          selectedCategoryId === node.id 
            ? 'bg-blue-600 text-white'
            : 'hover:bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
        }`}
        style={{ paddingRight: `${16 + level * 24}px`, paddingLeft: '12px', paddingTop: '8px', paddingBottom: '8px' }}
        onClick={handleCategoryClick}
      >
        <div className="flex items-center gap-2 w-full">
          {/* Fixed width container for expand/collapse button or spacer */}
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              <button 
                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--dash-bg-overlay)]/20"
                onClick={handleToggleClick}
              >
                {node.isExpanded ? (
                  <MinusIcon className="h-4 w-4" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
              </button>
            ) : null}
          </div>
          
          <FolderIcon className="h-5 w-5 text-[var(--dash-text-muted)] flex-shrink-0" />
          
          <span className="text-base text-[var(--dash-text-secondary)] truncate">
            {node.name}
          </span>
        </div>
      </div>
      
      {hasChildren && node.isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeView 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onToggle={onToggle}
              onSelect={onSelect}
              selectedCategoryId={selectedCategoryId}
              categories={categories}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesTreeView({ 
  onCategorySelect, 
  selectedCategoryId, 
  showActionButtons = false 
}: CategoriesTreeViewProps) {
  const [groups, setGroups] = useState<ProductGroup>({ id: 'loading', name: 'جاري تحميل المجموعات...', isExpanded: false, children: [] })
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Update groups whenever categories change
  useEffect(() => {
    if (categories.length > 0) {
      updateGroupsFromCategories(categories)
    } else if (categories.length === 0 && !isLoading) {
      // دائماً إظهار مجموعة "منتجات" الأساسية حتى لو لم تكن هناك مجموعات في قاعدة البيانات
      setGroups({
        id: 'products-root',
        name: 'منتجات',
        isExpanded: true,
        isDefault: true,
        children: []
      })
    }
  }, [categories, isLoading])

  // Fetch categories from database
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      // ADMIN SYSTEM: Show ALL categories, not just active ones
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Show fallback state on error
      setGroups({
        id: 'error',
        name: 'خطأ في تحميل المجموعات',
        isExpanded: false,
        children: []
      })
    } finally {
      setIsLoading(false)
    }
  }


  const updateGroupsFromCategories = (cats: Category[]) => {
    console.log('Updating groups from categories:', cats)
    
    // ADMIN SYSTEM: Find the "منتجات" category without filtering by is_active
    const productsCategory = cats.find(cat => cat.name === 'منتجات')
    console.log('Products category found:', productsCategory)
    
    // Convert flat categories to nested structure - SHOW ALL categories
    const buildTree = (parentId: string | null = null): ProductGroup[] => {
      const filtered = cats.filter(cat => cat.parent_id === parentId)
      console.log(`Building tree for parent ${parentId}, found ${filtered.length} categories:`, filtered)
      
      return filtered.map(cat => ({
        id: cat.id,
        name: cat.name,
        isExpanded: false,
        isDefault: cat.name === 'منتجات',
        children: buildTree(cat.id)
      }))
    }

    if (productsCategory) {
      // If "منتجات" exists, use it as the root with its children
      const children = buildTree(productsCategory.id)
      const newGroups = {
        id: productsCategory.id,
        name: productsCategory.name,
        isExpanded: true,
        isDefault: true,
        children: children
      }
      console.log('Setting groups with منتجات as root:', newGroups)
      setGroups(newGroups)
    } else {
      // If "منتجات" doesn't exist, create it as a virtual root
      const allOtherCategories = buildTree(null).filter(cat => cat.name !== 'منتجات')
      const newGroups = {
        id: 'products-root',
        name: 'منتجات',
        isExpanded: true,
        isDefault: true,
        children: allOtherCategories
      }
      console.log('Setting virtual منتجات as root:', newGroups)
      setGroups(newGroups)
    }
  }

  const toggleGroup = (nodeId: string) => {
    const updateNode = (node: ProductGroup): ProductGroup => {
      if (node.id === nodeId) {
        return { ...node, isExpanded: !node.isExpanded }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNode)
        }
      }
      return node
    }
    
    setGroups(updateNode(groups))
  }

  return (
    <div className="w-64 bg-[var(--dash-bg-raised)] border-l border-[var(--dash-border-subtle)] flex flex-col">
      {/* Tree View */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
        <TreeView 
          node={groups} 
          onToggle={toggleGroup}
          onSelect={onCategorySelect}
          selectedCategoryId={selectedCategoryId}
          categories={categories}
        />
      </div>
    </div>
  )
}