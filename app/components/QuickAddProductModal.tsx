'use client'

import { useState, useRef, useEffect } from 'react'
import {
  XMarkIcon,
  PlusIcon,
  ShoppingCartIcon,
  ArrowLeftIcon,
  PhotoIcon,
  ArrowPathIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface Category {
  id: string
  name: string
  parent_id: string | null
  is_active: boolean | null
}

interface QuickAddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToCart: (productData: any) => void
  editingItem?: any  // Item being edited (for edit mode)
  onUpdateCartItem?: (itemId: string, updatedData: any) => void  // Handler for updating cart item
}

// Persistent category selection (survives form reset)
let persistedCategoryId: string | null = null

export default function QuickAddProductModal({ isOpen, onClose, onAddToCart, editingItem, onUpdateCartItem }: QuickAddProductModalProps) {
  const isEditMode = !!editingItem
  const [productName, setProductName] = useState('')
  const [productQuantity, setProductQuantity] = useState('1')
  const [productCostPrice, setProductCostPrice] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [wholesalePrice, setWholesalePrice] = useState('')
  const [price1, setPrice1] = useState('')
  const [price2, setPrice2] = useState('')
  const [price3, setPrice3] = useState('')
  const [price4, setPrice4] = useState('')
  const [productBarcode, setProductBarcode] = useState('')
  const [productCode, setProductCode] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Category state
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(persistedCategoryId)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) throw error
        setCategories(data || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    if (isOpen) {
      fetchCategories()
      // Restore persisted category
      setSelectedCategoryId(persistedCategoryId)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (isOpen && editingItem) {
      const product = editingItem.product
      setProductName(product.name || '')
      setProductQuantity(String(editingItem.quantity || 1))
      setProductCostPrice(String(product.cost_price || ''))
      setProductPrice(String(product.price || ''))
      setWholesalePrice(String(product.wholesale_price || ''))
      setPrice1(String(product.price_1 || ''))
      setPrice2(String(product.price_2 || ''))
      setPrice3(String(product.price_3 || ''))
      setPrice4(String(product.price_4 || ''))
      setProductBarcode(product.barcode || '')
      setProductCode(product.product_code || '')
      setProductDescription(product.description || '')
      setProductImage(product.main_image_url || null)
      setSelectedCategoryId(product.category_id || null)
    } else if (isOpen && !editingItem) {
      // Reset form for new product (keep category persisted)
      resetForm()
      setSelectedCategoryId(persistedCategoryId)
    }
  }, [isOpen, editingItem])

  // Update persisted category when selection changes
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId)
    persistedCategoryId = categoryId
    setIsCategoryDropdownOpen(false)
  }

  // Get selected category name
  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return 'اختر الفئة'
    const category = categories.find(c => c.id === selectedCategoryId)
    return category?.name || 'اختر الفئة'
  }

  const resetForm = () => {
    setProductName('')
    setProductQuantity('1')
    setProductCostPrice('')
    setProductPrice('')
    setWholesalePrice('')
    setPrice1('')
    setPrice2('')
    setPrice3('')
    setPrice4('')
    setProductBarcode('')
    setProductCode('')
    setProductDescription('')
    setProductImage(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Generate random barcode
  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    setProductBarcode(`${timestamp}${random}`)
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProductImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddToCart = async () => {
    // Validate required fields
    if (!productName.trim()) {
      alert('يجب إدخال اسم المنتج')
      return
    }

    const quantity = parseInt(productQuantity) || 1
    if (quantity <= 0) {
      alert('يجب إدخال كمية صحيحة')
      return
    }

    if (!productCostPrice || parseFloat(productCostPrice) < 0) {
      alert('يجب إدخال سعر الشراء')
      return
    }

    setIsProcessing(true)

    try {
      // Create temporary product data for cart
      const tempProductData = {
        id: `temp-${Date.now()}`,
        name: productName.trim(),
        price: productPrice ? parseFloat(productPrice) : 0,
        cost_price: parseFloat(productCostPrice) || 0,
        wholesale_price: wholesalePrice ? parseFloat(wholesalePrice) : 0,
        price_1: price1 ? parseFloat(price1) : 0,
        price_2: price2 ? parseFloat(price2) : 0,
        price_3: price3 ? parseFloat(price3) : 0,
        price_4: price4 ? parseFloat(price4) : 0,
        barcode: productBarcode.trim() || null,
        product_code: productCode.trim() || null,
        description: productDescription.trim() || null,
        main_image_url: productImage,
        category_id: selectedCategoryId,
        quantity: quantity,
        isNewProduct: true
      }

      onAddToCart(tempProductData)
      handleClose()
    } catch (error: any) {
      alert(`خطأ في إضافة المنتج: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle update cart item (edit mode)
  const handleUpdateCartItem = async () => {
    // Validate required fields
    if (!productName.trim()) {
      alert('يجب إدخال اسم المنتج')
      return
    }

    const quantity = parseInt(productQuantity) || 1
    if (quantity <= 0) {
      alert('يجب إدخال كمية صحيحة')
      return
    }

    if (!productCostPrice || parseFloat(productCostPrice) < 0) {
      alert('يجب إدخال سعر الشراء')
      return
    }

    setIsProcessing(true)

    try {
      // Create updated product data
      const updatedProductData = {
        name: productName.trim(),
        price: productPrice ? parseFloat(productPrice) : 0,
        cost_price: parseFloat(productCostPrice) || 0,
        wholesale_price: wholesalePrice ? parseFloat(wholesalePrice) : 0,
        price_1: price1 ? parseFloat(price1) : 0,
        price_2: price2 ? parseFloat(price2) : 0,
        price_3: price3 ? parseFloat(price3) : 0,
        price_4: price4 ? parseFloat(price4) : 0,
        barcode: productBarcode.trim() || null,
        product_code: productCode.trim() || null,
        description: productDescription.trim() || null,
        main_image_url: productImage,
        category_id: selectedCategoryId,
        isNewProduct: true
      }

      if (onUpdateCartItem && editingItem) {
        onUpdateCartItem(editingItem.id, { ...updatedProductData, quantity })
      }
      handleClose()
    } catch (error: any) {
      alert(`خطأ في تحديث المنتج: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Side Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[var(--dash-bg-base)] z-50 shadow-[var(--dash-shadow-lg)] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-base)]">
          <button
            onClick={handleClose}
            className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-raised)] rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-white">{isEditMode ? 'تعديل المنتج' : 'إضافة منتج سريع'}</h2>
          <div className="w-9" /> {/* Spacer for alignment */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 h-[calc(100vh-140px)] scrollbar-hide">

          {/* Product Name */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              اسم المنتج <span className="text-dash-accent-red">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
              placeholder="أدخل اسم المنتج"
              disabled={isProcessing}
              autoFocus
            />
          </div>

          {/* Category Selection */}
          <div ref={categoryDropdownRef} className="relative">
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              الفئة
            </label>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              disabled={isProcessing || isLoadingCategories}
              className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all flex items-center justify-between"
            >
              <span className={selectedCategoryId ? 'text-white' : 'text-[var(--dash-text-disabled)]'}>
                {isLoadingCategories ? 'جاري التحميل...' : getSelectedCategoryName()}
              </span>
              <ChevronDownIcon className={`h-5 w-5 text-[var(--dash-text-muted)] transition-transform ${isCategoryDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isCategoryDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg shadow-[var(--dash-shadow-lg)] max-h-60 overflow-y-auto scrollbar-hide">
                {/* Clear Selection Option */}
                <button
                  type="button"
                  onClick={() => handleCategoryChange(null)}
                  className="w-full px-4 py-3 text-right text-[var(--dash-text-muted)] hover:bg-[var(--dash-border-default)] hover:text-white transition-colors border-b border-[var(--dash-border-default)]"
                >
                  بدون فئة
                </button>

                {/* Category List */}
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full px-4 py-3 text-right transition-colors ${
                      selectedCategoryId === category.id
                        ? 'bg-dash-accent-green text-white'
                        : 'text-white hover:bg-[var(--dash-border-default)]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}

                {categories.length === 0 && !isLoadingCategories && (
                  <div className="px-4 py-3 text-[var(--dash-text-muted)] text-center">
                    لا توجد فئات متاحة
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              الكمية <span className="text-dash-accent-red">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={productQuantity}
              onChange={(e) => setProductQuantity(e.target.value)}
              className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
              placeholder="1"
              disabled={isProcessing}
            />
          </div>

          {/* Purchase Price (Cost Price) */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              سعر الشراء <span className="text-dash-accent-red">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={productCostPrice}
              onChange={(e) => setProductCostPrice(e.target.value)}
              className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
              placeholder="0.00"
              disabled={isProcessing}
            />
          </div>

          {/* Selling Prices - Row 1: سعر البيع + سعر الجملة */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
                سعر البيع
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
                سعر الجملة
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Prices - Row 2: سعر 1 + سعر 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
                سعر 1
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price1}
                onChange={(e) => setPrice1(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
                سعر 2
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price2}
                onChange={(e) => setPrice2(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Prices - Row 3: سعر 3 + سعر 4 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
                سعر 3
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price3}
                onChange={(e) => setPrice3(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
                سعر 4
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price4}
                onChange={(e) => setPrice4(e.target.value)}
                className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="0.00"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Barcode with Generate Button */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              الباركود
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={productBarcode}
                onChange={(e) => setProductBarcode(e.target.value)}
                className="flex-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
                placeholder="أدخل باركود جديد"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={generateBarcode}
                disabled={isProcessing}
                className="px-4 py-3 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-border-default)] border border-[var(--dash-border-default)] text-[var(--dash-text-secondary)] rounded-lg transition-colors flex items-center gap-2"
                title="توليد باركود"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Product Code */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              كود المنتج
            </label>
            <input
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent transition-all"
              placeholder="أدخل كود المنتج"
              disabled={isProcessing}
            />
          </div>

          {/* Main Image Upload */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              الصورة الرئيسية
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
              disabled={isProcessing}
            />

            {productImage ? (
              <div className="relative">
                <img
                  src={productImage}
                  alt="صورة المنتج"
                  className="w-full h-40 object-cover rounded-lg border border-[#4A5568]"
                />
                <button
                  type="button"
                  onClick={() => setProductImage(null)}
                  className="absolute top-2 left-2 p-1.5 bg-dash-accent-red hover:bg-dash-accent-red text-white rounded-full transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2 right-2 p-1.5 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-border-default)] text-white rounded-full transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-32 border-2 border-dashed border-[var(--dash-border-default)] rounded-lg flex flex-col items-center justify-center gap-2 text-[var(--dash-text-muted)] hover:border-dash-accent-green hover:text-dash-accent-green transition-colors"
              >
                <PhotoIcon className="h-8 w-8" />
                <span className="text-sm">اضغط لاختيار صورة</span>
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[var(--dash-text-secondary)] text-sm font-medium mb-2">
              الوصف
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
              className="w-full bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-white placeholder-[var(--dash-text-disabled)] focus:ring-2 focus:ring-dash-accent-green focus:border-transparent resize-none transition-all"
              placeholder="أدخل وصف المنتج"
              disabled={isProcessing}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--dash-border-subtle)] bg-[var(--dash-bg-base)]">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-border-default)] disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <XMarkIcon className="h-5 w-5" />
              إلغاء
            </button>
            <button
              onClick={isEditMode ? handleUpdateCartItem : handleAddToCart}
              disabled={isProcessing || !productName.trim() || !productCostPrice}
              className={`flex-1 ${isEditMode ? 'dash-btn-primary' : 'dash-btn-green'} disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isEditMode ? 'جاري الحفظ...' : 'جاري الإضافة...'}
                </>
              ) : (
                <>
                  <ShoppingCartIcon className="h-5 w-5" />
                  {isEditMode ? 'حفظ التعديلات' : 'إضافة للسلة'}
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}
