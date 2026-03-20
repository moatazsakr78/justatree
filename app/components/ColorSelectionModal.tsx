'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { XMarkIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useCurrency } from '../../lib/hooks/useCurrency'
import { PriceType } from './PriceTypeSelectionModal'

interface PurchasePricingData {
  purchasePrice: number
  salePrice: number
  wholesalePrice: number
  price1: number
  price2: number
  price3: number
  price4: number
  productCode: string
}

interface ColorSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  product: any
  onAddToCart: (selections: any, totalQuantity: number, purchasePricingData?: PurchasePricingData, shapeSelections?: { [key: string]: number }) => void
  hasRequiredForCart?: boolean
  selectedBranchId?: string
  isPurchaseMode?: boolean
  isTransferMode?: boolean
  transferFromLocation?: {
    id: number
    name: string
    type: 'branch' | 'warehouse'
  }
  selectedPriceType?: PriceType
}

export default function ColorSelectionModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  hasRequiredForCart = true,
  selectedBranchId,
  isPurchaseMode = false,
  isTransferMode = false,
  transferFromLocation,
  selectedPriceType = 'price'
}: ColorSelectionModalProps) {
  const [selections, setSelections] = useState<{[key: string]: number}>({})
  const [shapeSelections, setShapeSelections] = useState<{[key: string]: number}>({})
  const [manualQuantity, setManualQuantity] = useState(1) // للمنتجات بدون ألوان
  const [isFirstDigitInput, setIsFirstDigitInput] = useState(true) // تتبع حالة أول رقم يدخل
  const [editingColorQuantity, setEditingColorQuantity] = useState<string | null>(null)

  // Reference to the quantity input for auto-focus
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const [tempColorQuantities, setTempColorQuantities] = useState<{[key: string]: string}>({})

  // Purchase mode specific state - Always use cost_price, never fall back to selling price
  const [purchasePrice, setPurchasePrice] = useState(product?.cost_price ?? 0)
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  const [tempPrice, setTempPrice] = useState('')

  // Additional pricing fields for purchase mode
  const [salePrice, setSalePrice] = useState(product?.price ?? 0)
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesale_price ?? 0)
  const [price1, setPrice1] = useState(product?.price1 ?? 0)
  const [price2, setPrice2] = useState(product?.price2 ?? 0)
  const [price3, setPrice3] = useState(product?.price3 ?? 0)
  const [price4, setPrice4] = useState(product?.price4 ?? 0)
  const [productCode, setProductCode] = useState(product?.product_code ?? '')

  // Use dynamic currency from system settings
  const { formatPrice, getCurrentCurrency } = useCurrency()
  const currentCurrency = getCurrentCurrency('system')

  // Helper function to get display price based on selected price type
  const getDisplayPrice = (prod: any): number => {
    if (!prod) return 0;
    switch (selectedPriceType) {
      case 'wholesale_price':
        return prod.wholesale_price || 0;
      case 'price1':
        return prod.price1 || 0;
      case 'price2':
        return prod.price2 || 0;
      case 'price3':
        return prod.price3 || 0;
      case 'price4':
        return prod.price4 || 0;
      default:
        return prod.price || 0;
    }
  };

  // Reset purchase price and other fields when product changes - Always use cost_price only
  useEffect(() => {
    if (product && isPurchaseMode) {
      const initialPrice = product.cost_price ?? 0
      setPurchasePrice(initialPrice)
      setTempPrice(initialPrice.toString())

      // Reset additional pricing fields
      setSalePrice(product.price ?? 0)
      setWholesalePrice(product.wholesale_price ?? 0)
      setPrice1(product.price1 ?? 0)
      setPrice2(product.price2 ?? 0)
      setPrice3(product.price3 ?? 0)
      setPrice4(product.price4 ?? 0)
      setProductCode(product.product_code ?? '')
    }
  }, [product, isPurchaseMode])

  // إعادة تعيين حالة الإدخال عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      setSelections({})
      setShapeSelections({})
      setManualQuantity(1)
      setIsFirstDigitInput(true)
      setTempColorQuantities({})
      setEditingColorQuantity(null)
    }
  }, [isOpen])

  // منطق استخراج الألوان المتاحة
  const getProductColors = () => {
    if (!product || isPurchaseMode) return []

    const colors: any[] = []
    const unspecifiedVariants: any[] = []
    const specifiedColors: any[] = []

    // استخراج الألوان من وصف المنتج (JSON فقط)
    if (product.description) {
      try {
        // تنظيف النص قبل parsing
        let cleanedDescription = product.description.trim()
        
        // التحقق من أن النص هو JSON صحيح بالتحقق من البداية والنهاية
        const isValidJSON = (cleanedDescription.startsWith('{') && cleanedDescription.endsWith('}')) || 
                           (cleanedDescription.startsWith('[') && cleanedDescription.endsWith(']'))
        
        if (isValidJSON) {
          // إزالة أي أحرف غير صالحة في JSON
          cleanedDescription = cleanedDescription.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
          
          const descriptionData = JSON.parse(cleanedDescription)
          if (descriptionData.colors && Array.isArray(descriptionData.colors)) {
            let totalBranchQuantity = 0
            if (product.inventoryData && selectedBranchId && product.inventoryData[selectedBranchId]) {
              totalBranchQuantity = product.inventoryData[selectedBranchId]?.quantity || 0
            }

            const quantityPerColor = descriptionData.colors.length > 0
              ? Math.floor(totalBranchQuantity / descriptionData.colors.length)
              : totalBranchQuantity

            descriptionData.colors.forEach((color: any, index: number) => {
              let colorImage = color.image || null

              if (!colorImage && product.video_url) {
                try {
                  const cleanedVideoUrl = product.video_url.trim().replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
                  if ((cleanedVideoUrl.startsWith('{') && cleanedVideoUrl.endsWith('}')) || 
                      (cleanedVideoUrl.startsWith('[') && cleanedVideoUrl.endsWith(']'))) {
                    const additionalImages = JSON.parse(cleanedVideoUrl)
                    if (Array.isArray(additionalImages) && additionalImages[index]) {
                      colorImage = additionalImages[index]
                    }
                  }
                } catch (e) {
                  // تجاهل الخطأ بصمت - video_url ليس JSON صالح
                }
              }

              specifiedColors.push({
                name: color.name,
                color: color.color || '#6B7280',
                availableQuantity: quantityPerColor,
                image: colorImage
              })
            })
          }
        }
        // إذا لم يكن JSON صالح، لا نعرض أي تحذير لأن الوصف قد يكون نص عادي
      } catch (e) {
        // تجاهل الخطأ بصمت - الوصف ليس JSON صالح، وهذا أمر طبيعي
      }
    }

    // استخراج الألوان من بيانات المتغيرات
    const effectiveBranchId = isTransferMode && transferFromLocation
      ? (transferFromLocation.type === 'branch' ? transferFromLocation.id.toString() : null)
      : selectedBranchId

    if (product.variantsData && effectiveBranchId && product.variantsData[effectiveBranchId]) {
      product.variantsData[effectiveBranchId].forEach((variant: any) => {
        if (variant.variant_type === 'color') {
          if (variant.name === 'غير محدد') {
            unspecifiedVariants.push(variant)
          } else {
            const existingColor = specifiedColors.find(c => c.name === variant.name)
            if (!existingColor) {
              let colorValue = '#6B7280'

              // استخراج اللون من JSON
              try {
                if (variant.value && typeof variant.value === 'string' && variant.value.trim().startsWith('{')) {
                  // تنظيف النص قبل parsing
                  const cleanedValue = variant.value.trim().replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
                  const valueData = JSON.parse(cleanedValue)
                  if (valueData.color) colorValue = valueData.color
                }
              } catch (e) {
                console.warn('Failed to parse variant value JSON:', e, 'Value:', variant.value)
              }

              // خريطة الألوان العربية
              const colorMapping: { [key: string]: string } = {
                'أسود': '#000000', 'أبيض': '#FFFFFF', 'أحمر': '#FF0000',
                'أزرق': '#0000FF', 'أخضر': '#008000', 'أصفر': '#FFFF00',
                'برتقالي': '#FFA500', 'بنفسجي': '#800080', 'وردي': '#FFC0CB',
                'بني': '#A52A2A', 'رمادي': '#808080', 'فضي': '#C0C0C0',
                'ذهبي': '#FFD700', 'كاشمير': '#D2B48C', 'كحلي': '#000080'
              }

              if (colorMapping[variant.name]) colorValue = colorMapping[variant.name]

              let imageUrl = variant.image_url || null

              specifiedColors.push({
                name: variant.name,
                color: colorValue,
                availableQuantity: variant.quantity || 0,
                image: imageUrl
              })
            }
          }
        }
      })
    }

    colors.push(...specifiedColors)

    // إضافة "غير محدد الكلي" إذا كانت هناك كمية متاحة
    if (unspecifiedVariants.length > 0 && specifiedColors.length > 0) {
      const totalUnspecifiedQuantity = unspecifiedVariants.reduce((sum, v) => sum + v.quantity, 0)

      if (totalUnspecifiedQuantity > 0) {
        colors.push({
          name: 'غير محدد الكلي',
          color: '#6B7280',
          availableQuantity: totalUnspecifiedQuantity,
          image: null
        })
      }
    }

    return colors
  }

  const colors = getProductColors()

  // منطق استخراج الأشكال المتاحة
  const getProductShapes = () => {
    if (!product || isPurchaseMode) return []
    const shapes: any[] = []

    const effectiveBranchId = isTransferMode && transferFromLocation
      ? (transferFromLocation.type === 'branch' ? transferFromLocation.id.toString() : null)
      : selectedBranchId

    if (product.variantsData && effectiveBranchId && product.variantsData[effectiveBranchId]) {
      product.variantsData[effectiveBranchId].forEach((variant: any) => {
        if (variant.variant_type === 'shape') {
          shapes.push({
            name: variant.name || 'شكل',
            color: '#6B7280',
            availableQuantity: variant.quantity || 0,
            image: variant.image_url || null
          })
        }
      })
    }
    return shapes
  }

  const shapes = getProductShapes()

  // حساب الكمية الإجمالية: ألوان + أشكال أو manualQuantity
  const colorTotal = Object.values(selections).reduce((sum, qty) => sum + qty, 0)
  const shapeTotal = Object.values(shapeSelections).reduce((sum, qty) => sum + qty, 0)
  const hasVariants = colors.length > 0 || shapes.length > 0
  const totalQuantity = hasVariants
    ? colorTotal + shapeTotal
    : manualQuantity

  // دوال التعامل مع الكميات
  const handleQuantityChange = (colorName: string, change: number) => {
    setSelections(prev => {
      const current = prev[colorName] || 0
      const color = colors.find(c => c.name === colorName)
      const maxAvailable = color?.availableQuantity || 0

      let newValue = Math.max(0, current + change)

      if (newValue > maxAvailable) {
        newValue = maxAvailable
      }

      if (newValue === 0) {
        const { [colorName]: removed, ...rest } = prev
        return rest
      }

      return { ...prev, [colorName]: newValue }
    })
  }

  // دالة لتغيير الكمية اليدوية (للمنتجات بدون ألوان)
  const handleManualQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, manualQuantity + change)
    setManualQuantity(newQuantity)
  }

  // دوال التعامل مع كميات الأشكال
  const handleShapeQuantityChange = (shapeName: string, change: number) => {
    setShapeSelections(prev => {
      const current = prev[shapeName] || 0
      const shape = shapes.find((s: any) => s.name === shapeName)
      const maxAvailable = shape?.availableQuantity || 0

      let newValue = Math.max(0, current + change)
      if (newValue > maxAvailable) {
        newValue = maxAvailable
      }

      if (newValue === 0) {
        const { [shapeName]: removed, ...rest } = prev
        return rest
      }

      return { ...prev, [shapeName]: newValue }
    })
  }

  const selectedQuantity = Object.values(selections).reduce((sum, qty) => sum + qty, 0)
  const totalPrice = isTransferMode ? 0 : totalQuantity * (isPurchaseMode ? purchasePrice : getDisplayPrice(product))

  // تحقق من صحة البيانات
  const getValidationInfo = () => {
    if (colors.length === 0) {
      return { isValid: true, message: '' }
    }

    if (selectedQuantity > totalQuantity) {
      return {
        isValid: false,
        message: 'الكمية المحددة للألوان أكبر من الكمية المطلوبة'
      }
    }

    return { isValid: true, message: '' }
  }

  const validationInfo = getValidationInfo()

  const handleAddToCart = useCallback(() => {
    if (totalQuantity > 0 && validationInfo.isValid) {
      const shapeData = Object.keys(shapeSelections).length > 0 ? shapeSelections : undefined
      if (isPurchaseMode) {
        const pricingData: PurchasePricingData = {
          purchasePrice,
          salePrice,
          wholesalePrice,
          price1,
          price2,
          price3,
          price4,
          productCode
        }
        onAddToCart(selections, totalQuantity, pricingData, shapeData)
      } else {
        onAddToCart(selections, totalQuantity, undefined, shapeData)
      }
      onClose()
      setSelections({})
      setShapeSelections({})
      setManualQuantity(1) // إعادة تعيين الكمية اليدوية
    }
  }, [totalQuantity, validationInfo.isValid, isPurchaseMode, onAddToCart, selections, shapeSelections, purchasePrice, salePrice, wholesalePrice, price1, price2, price3, price4, productCode, onClose])

  // Enter key shortcut to add to cart
  useEffect(() => {
    if (!isOpen || !product) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        handleAddToCart()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, product, handleAddToCart])

  // Auto-focus quantity input when modal opens (for products without colors)
  useEffect(() => {
    if (isOpen && product && quantityInputRef.current) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        quantityInputRef.current?.focus()
        quantityInputRef.current?.select()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, product])

  // Early return AFTER all hooks are called
  if (!isOpen || !product) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)] w-full max-w-lg max-h-[90vh] overflow-hidden pointer-events-auto relative transform transition-transform duration-200 modal-container animate-dash-scale-in">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isPurchaseMode
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                  : isTransferMode
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}>
                <span className="text-[var(--dash-text-primary)] text-lg">{isPurchaseMode ? '🛒' : isTransferMode ? '📦' : '🎨'}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">{product.name}</h2>
                <p className={`text-sm ${
                  isPurchaseMode
                    ? 'text-green-400'
                    : isTransferMode
                      ? 'text-orange-400'
                      : 'text-blue-400'
                }`}>
                  {isTransferMode
                    ? `وضع النقل - من: ${transferFromLocation?.name || 'غير محدد'}`
                    : isPurchaseMode
                      ? 'وضع الشراء'
                      : formatPrice(getDisplayPrice(product), 'system')
                  }
                </p>
              </div>
            </div>
            <button onClick={onClose}>
              <XMarkIcon className="h-5 w-5 text-[var(--dash-text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide relative modal-content">

            {/* Total Quantity Selector */}
            <div className="bg-[var(--dash-bg-raised)] rounded-xl p-4 border border-[var(--dash-border-default)]">
              <label className="text-[var(--dash-text-secondary)] text-sm mb-3 block">الكمية الإجمالية</label>
              <div className="flex items-center justify-between gap-4">

                {/* Product Image */}
                <div className="w-20 h-20 bg-[var(--dash-bg-surface)] rounded-lg flex items-center justify-center overflow-hidden border border-[var(--dash-border-default)] flex-shrink-0 relative">
                  {product.main_image_url ? (
                    <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                  )}
                </div>

                {/* Quantity Controls - Different based on colors/shapes */}
                {hasVariants ? (
                  /* Read-only when colors/shapes exist */
                  <div className="flex items-center gap-4 flex-1 justify-center relative">
                    <div className="bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] font-bold text-xl text-center rounded-lg px-4 py-2 min-w-[80px] border-2 border-[var(--dash-border-default)]">
                      {totalQuantity}
                    </div>
                  </div>
                ) : (
                  /* Editable with buttons when no colors */
                  <div className="flex items-center gap-4 flex-1 justify-center relative">
                    <button
                      onClick={() => handleManualQuantityChange(-1)}
                      className="w-8 h-8 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                    >
                      <MinusIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
                    </button>
                    <input
                      ref={quantityInputRef}
                      type="text"
                      value={manualQuantity}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d+$/.test(value)) {
                          const num = parseInt(value) || 1
                          if (num >= 1 && num <= 9999) {
                            setManualQuantity(num)
                          }
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] font-bold text-lg text-center rounded-lg px-4 py-2 w-[70px] outline-none border-2 border-transparent focus:border-blue-500 hover:bg-[var(--dash-bg-overlay)] transition-all cursor-pointer"
                      placeholder="1"
                    />
                    <button
                      onClick={() => handleManualQuantityChange(1)}
                      className="w-8 h-8 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                    >
                      <PlusIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
                    </button>
                  </div>
                )}
              </div>

              {!isTransferMode && !isPurchaseMode && (
                <div className="text-center mt-3">
                  <span className="text-blue-400 font-bold text-lg">{formatPrice(totalPrice, 'system')}</span>
                </div>
              )}
            </div>

            {/* Purchase Price Section - Only in Purchase Mode */}
            {isPurchaseMode && (
              <div className="bg-[var(--dash-bg-raised)] rounded-xl p-4 border border-[var(--dash-border-default)]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[var(--dash-text-secondary)] text-sm">سعر الشراء للوحدة</label>
                  {product.cost_price ? (
                    <span className="text-xs text-[var(--dash-text-disabled)] bg-[var(--dash-bg-surface)] px-2 py-1 rounded">
                      آخر سعر شراء: {formatPrice(product.cost_price, 'system')}
                    </span>
                  ) : (
                    <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                      لا يوجد سعر شراء سابق
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        if (value >= 0) {
                          setPurchasePrice(value)
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] font-bold text-lg text-center rounded-lg px-4 py-3 outline-none border-2 border-transparent focus:border-green-500 hover:bg-[var(--dash-bg-overlay)] transition-all"
                      placeholder={product.cost_price ? product.cost_price.toString() : "أدخل سعر الشراء"}
                      min="0"
                      step="0.01"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] text-sm">
                      {currentCurrency}
                    </span>
                  </div>
                </div>

                {/* Total Purchase Price */}
                <div className="mt-3 pt-3 border-t border-[var(--dash-border-default)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--dash-text-muted)] text-sm">إجمالي الشراء ({totalQuantity} وحدة)</span>
                    <span className="text-green-400 font-bold text-lg">{formatPrice(totalPrice, 'system')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Pricing Fields - Only in Purchase Mode */}
            {isPurchaseMode && (
              <div className="bg-[var(--dash-bg-raised)] rounded-xl p-4 border border-[var(--dash-border-default)] space-y-4">
                <h4 className="text-[var(--dash-text-primary)] font-medium text-sm border-b border-[var(--dash-border-default)] pb-2 mb-3">أسعار البيع</h4>

                {/* Product Code */}
                {product.product_code && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[var(--dash-text-muted)] text-xs">كود المنتج:</span>
                    <span className="text-blue-400 text-sm font-medium bg-blue-500/10 px-2 py-1 rounded">{product.product_code}</span>
                  </div>
                )}

                {/* Row 1: Sale Price + Wholesale Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--dash-text-muted)] text-xs mb-1">سعر البيع</label>
                    <input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--dash-text-muted)] text-xs mb-1">سعر الجملة</label>
                    <input
                      type="number"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Row 2: Price 1 + Price 2 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--dash-text-muted)] text-xs mb-1">سعر 1</label>
                    <input
                      type="number"
                      value={price1}
                      onChange={(e) => setPrice1(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--dash-text-muted)] text-xs mb-1">سعر 2</label>
                    <input
                      type="number"
                      value={price2}
                      onChange={(e) => setPrice2(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Row 3: Price 3 + Price 4 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--dash-text-muted)] text-xs mb-1">سعر 3</label>
                    <input
                      type="number"
                      value={price3}
                      onChange={(e) => setPrice3(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--dash-text-muted)] text-xs mb-1">سعر 4</label>
                    <input
                      type="number"
                      value={price4}
                      onChange={(e) => setPrice4(parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Product Code Input */}
                <div>
                  <label className="block text-[var(--dash-text-muted)] text-xs mb-1">كود المنتج</label>
                  <input
                    type="text"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    className="w-full bg-[var(--dash-bg-surface)] text-[var(--dash-text-primary)] text-sm text-center rounded-lg px-2 py-2 outline-none border border-transparent focus:border-blue-500 transition-all"
                    placeholder="أدخل كود المنتج"
                  />
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div>
                <h3 className="text-[var(--dash-text-primary)] font-medium mb-3">اختيار الألوان</h3>

                {!validationInfo.isValid && (
                  <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{validationInfo.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {colors.map((color) => (
                    <div key={color.name} className="bg-[var(--dash-bg-raised)] rounded-xl p-4 border border-[var(--dash-border-default)] relative">

                      {/* Color Display */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-[var(--dash-bg-surface)] rounded-lg flex items-center justify-center overflow-hidden border border-[var(--dash-border-default)] flex-shrink-0 relative">
                          {color.image ? (
                            <img src={color.image} alt={color.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-lg flex items-center justify-center relative" style={{ backgroundColor: color.color }}>
                              {color.name === 'غير محدد الكلي' ? (
                                <span className="text-[var(--dash-text-primary)] text-lg font-bold">؟</span>
                              ) : (
                                <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: color.color }}></div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full border border-[var(--dash-border-default)] flex-shrink-0" style={{ backgroundColor: color.color }} />
                            <span className="text-[var(--dash-text-primary)] font-medium text-sm truncate">{color.name}</span>
                          </div>
                          <p className="text-[var(--dash-text-muted)] text-xs">متوفر: {color.availableQuantity}</p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between relative">
                        <button 
                          onClick={() => handleQuantityChange(color.name, -1)} 
                          disabled={!selections[color.name]}
                          className="w-8 h-8 bg-[var(--dash-bg-surface)] hover:bg-[var(--dash-bg-overlay)] disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                        >
                          <MinusIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
                        </button>

                        <input
                          type="number"
                          value={selections[color.name] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            const max = color.availableQuantity || 0
                            const clamped = Math.min(Math.max(0, val), max)
                            setSelections(prev => {
                              if (clamped === 0) {
                                const { [color.name]: _, ...rest } = prev
                                return rest
                              }
                              return { ...prev, [color.name]: clamped }
                            })
                          }}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          max={color.availableQuantity}
                          className="bg-[var(--dash-bg-surface)] rounded-lg px-3 py-2 w-[60px] text-center text-[var(--dash-text-primary)] font-bold outline-none border-2 border-transparent focus:border-blue-500 mx-2"
                        />

                        <button 
                          onClick={() => handleQuantityChange(color.name, 1)} 
                          disabled={(selections[color.name] || 0) >= color.availableQuantity}
                          className="w-8 h-8 bg-[var(--dash-bg-surface)] hover:bg-[var(--dash-bg-overlay)] disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                        >
                          <PlusIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shape Selection */}
            {shapes.length > 0 && (
              <div>
                <h3 className="text-[var(--dash-text-primary)] font-medium mb-3">اختيار الأشكال</h3>
                <div className="grid grid-cols-2 gap-4">
                  {shapes.map((shape: any) => (
                    <div key={shape.name} className="bg-[var(--dash-bg-raised)] rounded-xl p-4 border border-[var(--dash-border-default)] relative">

                      {/* Shape Display */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-[var(--dash-bg-surface)] rounded-lg flex items-center justify-center overflow-hidden border border-[var(--dash-border-default)] flex-shrink-0 relative">
                          {shape.image ? (
                            <img src={shape.image} alt={shape.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-lg flex items-center justify-center relative bg-[var(--dash-bg-overlay)]">
                              <span className="text-[var(--dash-text-primary)] text-lg">🔷</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[var(--dash-text-primary)] font-medium text-sm truncate">{shape.name}</span>
                          </div>
                          <p className="text-[var(--dash-text-muted)] text-xs">متوفر: {shape.availableQuantity}</p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between relative">
                        <button
                          onClick={() => handleShapeQuantityChange(shape.name, -1)}
                          disabled={!shapeSelections[shape.name]}
                          className="w-8 h-8 bg-[var(--dash-bg-surface)] hover:bg-[var(--dash-bg-overlay)] disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                        >
                          <MinusIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
                        </button>

                        <input
                          type="number"
                          value={shapeSelections[shape.name] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            const max = shape.availableQuantity || 0
                            const clamped = Math.min(Math.max(0, val), max)
                            setShapeSelections(prev => {
                              if (clamped === 0) {
                                const { [shape.name]: _, ...rest } = prev
                                return rest
                              }
                              return { ...prev, [shape.name]: clamped }
                            })
                          }}
                          onFocus={(e) => e.target.select()}
                          min="0"
                          max={shape.availableQuantity}
                          className="bg-[var(--dash-bg-surface)] rounded-lg px-3 py-2 w-[60px] text-center text-[var(--dash-text-primary)] font-bold outline-none border-2 border-transparent focus:border-blue-500 mx-2"
                        />

                        <button
                          onClick={() => handleShapeQuantityChange(shape.name, 1)}
                          disabled={(shapeSelections[shape.name] || 0) >= shape.availableQuantity}
                          className="w-8 h-8 bg-[var(--dash-bg-surface)] hover:bg-[var(--dash-bg-overlay)] disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                        >
                          <PlusIcon className="h-4 w-4 text-[var(--dash-text-primary)]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasVariants && !isPurchaseMode && (
              <div className="block md:hidden py-4">
                {/* Numeric Keypad for Mobile */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        let newValue: number;
                        if (isFirstDigitInput) {
                          // أول رقم يُكتب - استبدال القيمة الافتراضية
                          newValue = num;
                          setIsFirstDigitInput(false);
                        } else {
                          // الأرقام التالية - إضافة للقيمة الحالية
                          const currentStr = manualQuantity.toString();
                          newValue = parseInt(currentStr + num);
                        }
                        if (newValue <= 9999) {
                          setManualQuantity(newValue);
                        }
                      }}
                      className="h-12 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] active:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] text-xl font-medium rounded-lg transition-colors border border-[var(--dash-border-default)]"
                    >
                      {num}
                    </button>
                  ))}
                  {/* Clear Button */}
                  <button
                    onClick={() => {
                      setManualQuantity(1);
                      setIsFirstDigitInput(true);
                    }}
                    className="h-12 bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/30 text-red-400 text-lg font-medium rounded-lg transition-colors border border-red-600/50"
                  >
                    C
                  </button>
                  {/* Zero Button */}
                  <button
                    onClick={() => {
                      // لا نسمح بإدخال 0 كأول رقم
                      if (!isFirstDigitInput) {
                        const currentStr = manualQuantity.toString();
                        const newValue = parseInt(currentStr + '0');
                        if (newValue <= 9999) {
                          setManualQuantity(newValue);
                        }
                      }
                    }}
                    className="h-12 bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] active:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] text-xl font-medium rounded-lg transition-colors border border-[var(--dash-border-default)]"
                  >
                    0
                  </button>
                  {/* Backspace Button */}
                  <button
                    onClick={() => {
                      const currentStr = manualQuantity.toString();
                      if (currentStr.length > 1) {
                        setManualQuantity(parseInt(currentStr.slice(0, -1)));
                      } else {
                        setManualQuantity(1);
                        setIsFirstDigitInput(true);
                      }
                    }}
                    className="h-12 bg-orange-600/20 hover:bg-orange-600/30 active:bg-orange-600/30 text-orange-400 text-lg font-medium rounded-lg transition-colors border border-orange-600/50"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--dash-border-default)] relative bg-[var(--dash-bg-surface)]">
            <div className="flex gap-3">
              <button 
                onClick={onClose} 
                className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-3 rounded-lg font-medium transition-colors duration-150 relative"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddToCart}
                disabled={totalQuantity === 0 || !validationInfo.isValid}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center gap-2 relative ${
                  totalQuantity === 0 || !validationInfo.isValid
                    ? 'bg-[var(--dash-bg-overlay)] cursor-not-allowed opacity-50'
                    : isTransferMode
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : isPurchaseMode
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                } text-[var(--dash-text-primary)]`}
              >
                <ShoppingCartIcon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">
                  {!validationInfo.isValid
                    ? 'غير متاح للإضافة'
                    : isTransferMode
                      ? `إضافة للنقل (${totalQuantity})`
                      : isPurchaseMode
                        ? `إضافة للشراء (${totalQuantity})`
                        : `إضافة للسلة (${totalQuantity})`
                  }
                  <span className="hidden md:inline"> [Enter]</span>
                </span>
              </button>
            </div>
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
        
        /* ثبات النافذة ومنع التحرك غير المرغوب */
        .modal-container {
          will-change: auto;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        
        /* ثبات العناصر الداخلية */
        .modal-content * {
          position: relative;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `}</style>
    </>
  )
}
