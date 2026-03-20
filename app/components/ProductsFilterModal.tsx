'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { ProductGridImage } from './ui/OptimizedImage'
import { useProducts, Product } from '../lib/hooks/useProductsOptimized'
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

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

interface ProductsFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onFilterApply: (selectedProducts: string[], selectedCategories: string[]) => void
  initialSelectedProducts?: string[]
  initialSelectedCategories?: string[]
}

export default function ProductsFilterModal({
  isOpen,
  onClose,
  onFilterApply,
  initialSelectedProducts = [],
  initialSelectedCategories = []
}: ProductsFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set(initialSelectedProducts))
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(initialSelectedCategories))
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // Get products data
  const { products, isLoading, error } = useProducts()

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen, fetchCategories])

  // Filter products based on search and selected category
  const filteredProducts = useMemo(() => {
    let filtered = products
    
    // Filter by category if one is selected
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category?.id === selectedCategory.id)
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLowerCase().includes(query))
      )
    }
    
    return filtered
  }, [products, selectedCategory, searchQuery])

  // Handle category checkbox change
  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }, [])

  // Handle product checkbox change
  const handleProductToggle = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }, [])

  // Handle select all products in current category
  const handleSelectAllProducts = useCallback(() => {
    const currentCategoryProducts = filteredProducts.map(p => p.id)
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      currentCategoryProducts.forEach(id => newSet.add(id))
      return newSet
    })
  }, [filteredProducts])

  // Handle deselect all products in current category
  const handleDeselectAllProducts = useCallback(() => {
    const currentCategoryProducts = filteredProducts.map(p => p.id)
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      currentCategoryProducts.forEach(id => newSet.delete(id))
      return newSet
    })
  }, [filteredProducts])

  // Apply filter
  const handleApply = useCallback(() => {
    onFilterApply(Array.from(selectedProducts), Array.from(selectedCategories))
    onClose()
  }, [selectedProducts, selectedCategories, onFilterApply, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)] max-w-7xl w-full h-[95vh] overflow-hidden flex flex-col animate-dash-scale-in">
          
          {/* Header */}
          <div className="bg-[var(--dash-bg-raised)] px-6 py-4 border-b border-[var(--dash-border-default)] flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏷️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">فلترة المنتجات</h2>
                <p className="text-[var(--dash-text-muted)] text-sm">اختر المجموعات والمنتجات المطلوبة للتقرير</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content Container */}
          <div className="flex flex-1 min-h-0">
            
            {/* Left Sidebar - Categories */}
            <div className="w-80 bg-[var(--dash-bg-raised)] border-r border-[var(--dash-border-default)] flex flex-col min-h-0">
              <div className="p-4 border-b border-[var(--dash-border-default)]">
                <h3 className="text-[var(--dash-text-primary)] font-medium mb-3">المجموعات</h3>
                
                {/* Categories List */}
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                  {categories.map(category => (
                    <label
                      key={category.id}
                      className="flex items-center gap-3 p-3 bg-[var(--dash-bg-surface)] hover:bg-[var(--dash-bg-surface)] rounded-lg cursor-pointer transition-colors border border-[var(--dash-border-default)]/30"
                    >
                      {/* Category Checkbox */}
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedCategories.has(category.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-transparent border-gray-400'
                        }`}>
                          {selectedCategories.has(category.id) && (
                            <CheckIcon className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      
                      {/* Category Name */}
                      <span 
                        className="text-[var(--dash-text-primary)] text-base font-medium flex-1 text-right"
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedCategory(category.id === selectedCategory?.id ? null : category)
                        }}
                      >
                        {category.name}
                      </span>
                      
                      {/* Product count in category */}
                      <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-600/30">
                        {products.filter(p => p.category?.id === category.id).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selection Summary */}
              <div className="p-4 border-t border-[var(--dash-border-default)] mt-auto">
                <div className="text-center space-y-2">
                  <div className="text-sm text-blue-400">
                    {selectedCategories.size} مجموعة محددة
                  </div>
                  <div className="text-sm text-green-400">
                    {selectedProducts.size} منتج محدد
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Products */}
            <div className="flex-1 flex flex-col">
              
              {/* Products Toolbar */}
              <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-6 py-3">
                <div className="flex items-center justify-between">
                  
                  {/* Left Side - Controls */}
                  <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-[var(--dash-bg-surface)] rounded-md overflow-hidden">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 transition-colors ${
                          viewMode === 'grid' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                        }`}
                      >
                        <Squares2X2Icon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`p-2 transition-colors ${
                          viewMode === 'table' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                        }`}
                      >
                        <ListBulletIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-muted)]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="اسم المنتج..."
                        className="w-80 pl-4 pr-10 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md text-white placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Select All/None */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllProducts}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        تحديد الكل
                      </button>
                      <button
                        onClick={handleDeselectAllProducts}
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  {/* Right Side - Info */}
                  <div className="flex items-center gap-4 text-sm text-[var(--dash-text-muted)]">
                    <span>عرض {filteredProducts.length} من أصل {products.length} منتج</span>
                    {selectedCategory && (
                      <span className="text-blue-400">المجموعة: {selectedCategory.name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Content */}
              <div className="flex-1 overflow-hidden bg-[var(--dash-bg-surface)] min-h-0">
                {viewMode === 'grid' ? (
                  // Grid View
                  <div className="h-full overflow-y-auto scrollbar-hide p-4">
                    <div className="grid grid-cols-6 gap-4">
                      {filteredProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className={`bg-[var(--dash-bg-raised)] rounded-lg p-3 cursor-pointer transition-all duration-200 border-2 relative group ${
                            selectedProducts.has(product.id)
                              ? 'border-blue-500 bg-[#434E61]'
                              : 'border-transparent hover:border-gray-500 hover:bg-[#434E61]'
                          }`}
                        >
                          {/* Checkbox Overlay */}
                          <div className="absolute top-2 left-2 z-20">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(product.id)}
                                onChange={() => handleProductToggle(product.id)}
                                className="sr-only"
                              />
                              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors shadow-lg ${
                                selectedProducts.has(product.id)
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'bg-black/70 border-white/70'
                              }`}>
                                {selectedProducts.has(product.id) && (
                                  <CheckIcon className="h-4 w-4 text-white" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Product Image */}
                          <div className="mb-3 relative">
                            <ProductGridImage
                              src={product.main_image_url}
                              alt={product.name}
                              priority={index < 6}
                            />
                          </div>

                          {/* Product Name */}
                          <h3 className="text-[var(--dash-text-primary)] font-medium text-sm text-center mb-2 line-clamp-2">
                            {product.name}
                          </h3>

                          {/* Product Details */}
                          <div className="space-y-1 text-xs">
                            {/* Price */}
                            <div className="flex justify-center mb-2">
                              <span className="text-blue-400 font-medium text-sm">
                                {(product.price || 0).toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Total Quantity */}
                            <div className="flex justify-between items-center">
                              <span className="text-blue-400 font-medium">
                                {(product.inventoryData && Object.values(product.inventoryData).reduce((sum: number, inv: any) => sum + (inv?.quantity || 0), 0)) || 0}
                              </span>
                              <span className="text-[var(--dash-text-muted)]">الكمية</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Table View
                  <div className="h-full overflow-y-auto scrollbar-hide">
                    <table className="w-full">
                      <thead className="bg-[var(--dash-bg-raised)] sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-right text-[var(--dash-text-primary)] font-medium">اختيار</th>
                          <th className="px-4 py-3 text-right text-[var(--dash-text-primary)] font-medium">اسم المنتج</th>
                          <th className="px-4 py-3 text-right text-[var(--dash-text-primary)] font-medium">المجموعة</th>
                          <th className="px-4 py-3 text-right text-[var(--dash-text-primary)] font-medium">السعر</th>
                          <th className="px-4 py-3 text-right text-[var(--dash-text-primary)] font-medium">الكمية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                          <tr 
                            key={product.id}
                            className={`border-b border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-raised)] ${
                              selectedProducts.has(product.id) ? 'bg-blue-500/10' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.has(product.id)}
                                  onChange={() => handleProductToggle(product.id)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  selectedProducts.has(product.id)
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-transparent border-gray-400'
                                }`}>
                                  {selectedProducts.has(product.id) && (
                                    <CheckIcon className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--dash-text-primary)]">{product.name}</td>
                            <td className="px-4 py-3 text-[var(--dash-text-secondary)]">{product.category?.name || 'غير محدد'}</td>
                            <td className="px-4 py-3 text-blue-400">{(product.price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-blue-400">
                              {(product.inventoryData && Object.values(product.inventoryData).reduce((sum: number, inv: any) => sum + (inv?.quantity || 0), 0)) || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-[var(--dash-bg-raised)] px-6 py-4 border-t border-[var(--dash-border-default)] flex items-center justify-between rounded-b-2xl flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="text-sm text-[var(--dash-text-muted)]">
                تم تحديد {selectedCategories.size} مجموعة و {selectedProducts.size} منتج
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] bg-transparent hover:bg-[var(--dash-bg-overlay)]/20 border border-[var(--dash-border-default)] hover:border-gray-500 rounded transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium"
              >
                تطبيق الفلترة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}