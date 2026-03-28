'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { Product, Branch, ProductVariant } from '../lib/hooks/useProducts'
import { 
  XMarkIcon, 
  CheckIcon,
  TagIcon,
  BuildingStorefrontIcon,
  Squares2X2Icon,
  PhotoIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface ColorAssignmentModalProps {
  product: Product
  branches: Branch[]
  isOpen: boolean
  onClose: () => void
  onAssignmentComplete: () => void
}

interface ProductColor {
  name: string
  color: string
  image?: string
}

interface BranchInventoryData {
  branchId: string
  branchName: string
  totalQuantity: number
  assignedQuantity: number
  unassignedQuantity: number
  variants: ProductVariant[]
}

export default function ColorAssignmentModal({ 
  product, 
  branches, 
  isOpen, 
  onClose, 
  onAssignmentComplete 
}: ColorAssignmentModalProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<BranchInventoryData | null>(null)
  const [colorAssignments, setColorAssignments] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testColors, setTestColors] = useState<ProductColor[] | null>(null)
  const [colorImages, setColorImages] = useState<Record<string, string>>({})

  // Debug effect to log product data when modal opens
  useEffect(() => {
    if (isOpen && product) {
      console.log('=== COLOR ASSIGNMENT DEBUG ===')
      console.log('Selected product:', product.name)
      console.log('Product ID:', product.id)
      console.log('Raw description:', product.description)
      console.log('Product colors property:', product.productColors)
      console.log('All product keys:', Object.keys(product))
      console.log('All images:', product.allImages)
      console.log('Main image:', product.main_image_url)
      console.log('Sub image:', product.sub_image_url)
      console.log('Video URL (sub-images):', product.video_url)
      
      // Try to parse description as JSON
      if (product.description) {
        try {
          const parsed = JSON.parse(product.description)
          console.log('Parsed description:', parsed)
          if (parsed.colors) {
            console.log('Colors from description:', parsed.colors)
          }
        } catch (e) {
          console.log('Description is not JSON:', product.description)
        }
      }
      console.log('==============================')
    }
  }, [isOpen, product])

  // Get product colors from multiple sources
  const productColors = useMemo((): ProductColor[] => {
    // If test colors are set, use them
    if (testColors && testColors.length > 0) {
      console.log('Using test colors:', testColors)
      return testColors
    }

    let colors: ProductColor[] = []

    // Method 1: Try to get colors from productColors property (parsed in useProducts)
    if (product.productColors && Array.isArray(product.productColors) && product.productColors.length > 0) {
      console.log('Found product colors in productColors property:', product.productColors)
      colors = product.productColors
    }
    
    // Method 2: Fallback - try to parse from description field
    else {
      try {
        if (product.description && product.description.startsWith('{')) {
          const descriptionData = JSON.parse(product.description)
          console.log('Parsed description data:', descriptionData)
          colors = descriptionData.colors || []
        }
      } catch (e) {
        console.error('Error parsing product colors from description:', e)
      }
    }

    // Method 3: Enhance colors with images from various sources
    const enhancedColors = colors.map(color => {
      let colorImage = color.image

      // Source 1: Check if color already has an image
      if (colorImage && colorImage.trim() !== '') {
        console.log(`Color ${color.name} already has image:`, colorImage)
        return { ...color, image: colorImage }
      }

      // Source 2: Look in allImages array for matching images
      if (!colorImage && product.allImages && product.allImages.length > 0) {
        // Try different matching strategies
        const colorNameLower = color.name.toLowerCase()
        const colorHex = color.color.toLowerCase().replace('#', '')
        
        const matchingImage = product.allImages.find(img => {
          const imgLower = img.toLowerCase()
          return (
            // Direct name match
            imgLower.includes(colorNameLower) ||
            // Hex color match
            imgLower.includes(colorHex) ||
            // Common color name translations
            (colorNameLower === 'أسود' && (imgLower.includes('black') || imgLower.includes('000000'))) ||
            (colorNameLower === 'أحمر' && (imgLower.includes('red') || imgLower.includes('ff0000'))) ||
            (colorNameLower === 'أزرق' && (imgLower.includes('blue') || imgLower.includes('0000ff'))) ||
            (colorNameLower === 'أخضر' && (imgLower.includes('green') || imgLower.includes('00ff00'))) ||
            (colorNameLower === 'أصفر' && (imgLower.includes('yellow') || imgLower.includes('ffff00'))) ||
            (colorNameLower === 'أبيض' && (imgLower.includes('white') || imgLower.includes('ffffff')))
          )
        })
        
        if (matchingImage) {
          colorImage = matchingImage
          console.log(`Found matching image for ${color.name} in allImages:`, matchingImage)
        }
      }

      // Source 3: Look in existing variants data for this color
      if (!colorImage && product.variantsData) {
        Object.values(product.variantsData).forEach((variants: any) => {
          if (Array.isArray(variants)) {
            const colorVariant = variants.find((v: any) => 
              v.variant_type === 'color' && v.name === color.name
            )
            if (colorVariant) {
              // Check variant's image_url
              if (colorVariant.image_url && colorVariant.image_url.trim() !== '') {
                colorImage = colorVariant.image_url
                console.log(`Found image for ${color.name} in variants image_url:`, colorImage)
              }
            }
          }
        })
      }

      // Source 4: Check video_url field which might contain sub-images array
      if (!colorImage && product.video_url) {
        try {
          const subImages = JSON.parse(product.video_url)
          if (Array.isArray(subImages)) {
            const matchingImage = subImages.find(img => 
              img.toLowerCase().includes(color.name.toLowerCase())
            )
            if (matchingImage) {
              colorImage = matchingImage
              console.log(`Found image for ${color.name} in video_url sub-images:`, colorImage)
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      return {
        ...color,
        image: colorImage
      }
    })

    console.log('Enhanced colors with images:', enhancedColors)
    
    // Special debug for each color to see what happened
    enhancedColors.forEach(color => {
      console.log(`Color "${color.name}":`, {
        name: color.name,
        color: color.color,
        hasImage: !!(color.image && color.image.trim() !== ''),
        image: color.image,
        originalColorData: colors.find(c => c.name === color.name)
      })
    })

    // Debug: log available product properties if no colors found
    if (enhancedColors.length === 0) {
      console.log('No colors found. Product data for debugging:', {
        id: product.id,
        name: product.name,
        description: product.description,
        productColors: product.productColors,
        allImages: product.allImages,
        main_image_url: product.main_image_url,
        sub_image_url: product.sub_image_url,
        video_url: product.video_url
      })
    }

    return enhancedColors
  }, [product.description, product.productColors, product.allImages, testColors])

  // Process branch inventory data
  const branchInventoryData = useMemo(() => {
    return branches.map(branch => {
      const inventory = product.inventoryData?.[branch.id] || { quantity: 0, min_stock: 0 }
      const variants = product.variantsData?.[branch.id] || []
      
      // Separate specified and unspecified variants
      const specifiedVariants = variants.filter(v => v.variant_type === 'color' && v.name !== 'غير محدد')
      const unspecifiedVariants = variants.filter(v => v.variant_type === 'color' && v.name === 'غير محدد')
      
      // Calculate quantities
      const specifiedQuantity = specifiedVariants.reduce((sum, variant) => sum + variant.quantity, 0)
      const unspecifiedVariantsQuantity = unspecifiedVariants.reduce((sum, variant) => sum + variant.quantity, 0)
      const unassignedQuantity = Math.max(0, inventory.quantity - specifiedQuantity - unspecifiedVariantsQuantity)
      const totalUnspecifiedQuantity = unspecifiedVariantsQuantity + unassignedQuantity
      
      return {
        branchId: branch.id,
        branchName: branch.name,
        totalQuantity: inventory.quantity,
        assignedQuantity: specifiedQuantity,
        unassignedQuantity: totalUnspecifiedQuantity, // This now includes both unassigned and "غير محدد" variants
        variants: specifiedVariants // Only show specified variants
      }
    })
  }, [product, branches])

  // Filter branches that have unassigned quantities
  const branchesWithUnassigned = branchInventoryData.filter(branch => branch.unassignedQuantity > 0)

  // Initialize color assignments when branch is selected
  useEffect(() => {
    if (selectedBranch && productColors.length > 0) {
      const initialAssignments: Record<string, number> = {}
      productColors.forEach((color: ProductColor) => {
        initialAssignments[color.name] = 0
      })
      setColorAssignments(initialAssignments)
    }
  }, [selectedBranch, productColors])

  // Note: consolidateExistingDuplicates function removed - no longer needed
  // The new system (product_color_shape_definitions + product_variant_quantities)
  // prevents duplicates using unique constraints

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBranchId(null)
      setSelectedBranch(null)
      setColorAssignments({})
      setTestColors(null)
      setColorImages({})
    }
  }, [isOpen])

  // Note: Auto-consolidation useEffect removed - no longer needed with new system

  const handleBranchSelect = (branchData: BranchInventoryData) => {
    setSelectedBranchId(branchData.branchId)
    setSelectedBranch(branchData)
  }

  const handleColorQuantityChange = (colorName: string, quantity: number) => {
    setColorAssignments(prev => ({
      ...prev,
      [colorName]: Math.max(0, quantity)
    }))
  }

  const handleImageUpload = (colorName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // For now, we'll create a simple blob URL for preview
    // In a real implementation, you'd upload to Supabase Storage
    const imageUrl = URL.createObjectURL(file)
    setColorImages(prev => ({
      ...prev,
      [colorName]: imageUrl
    }))
  }

  const hasColorImage = (color: ProductColor) => {
    // Check if color has an existing image from the product data
    const hasExistingImage = color.image && color.image.trim() !== ''
    // Check if user has uploaded a new image for this session
    const hasUploadedImage = colorImages[color.name] && colorImages[color.name].trim() !== ''
    
    return hasExistingImage || hasUploadedImage
  }

  const getColorImage = (color: ProductColor) => {
    // Prioritize uploaded image over existing image
    return colorImages[color.name] || color.image
  }

  const needsImageUpload = (color: ProductColor) => {
    // Only needs image upload if:
    // 1. Color doesn't have an existing image AND
    // 2. User hasn't uploaded an image in this session AND
    // 3. User has assigned a quantity > 0 to this color
    const hasExistingImage = color.image && color.image.trim() !== ''
    const hasUploadedImage = colorImages[color.name] && colorImages[color.name].trim() !== ''
    const hasAssignedQuantity = (colorAssignments[color.name] || 0) > 0
    
    return hasAssignedQuantity && !hasExistingImage && !hasUploadedImage
  }

  const getTotalAssigned = () => {
    return Object.values(colorAssignments).reduce((sum, qty) => sum + qty, 0)
  }

  const getRemainingQuantity = () => {
    return selectedBranch ? selectedBranch.unassignedQuantity - getTotalAssigned() : 0
  }

  // Get color assignment percentage for visual feedback
  const getAssignmentPercentage = () => {
    if (!selectedBranch || selectedBranch.unassignedQuantity === 0) return 0
    return Math.min((getTotalAssigned() / selectedBranch.unassignedQuantity) * 100, 100)
  }

  const getMissingImages = () => {
    return productColors.filter(color => needsImageUpload(color))
  }

  const canSave = () => {
    const totalAssigned = getTotalAssigned()
    const missingImages = getMissingImages()
    
    // Can save if:
    // 1. Total assigned > 0
    // 2. Total assigned <= available unassigned quantity
    // 3. No missing required images
    return totalAssigned > 0 && 
           totalAssigned <= (selectedBranch?.unassignedQuantity || 0) &&
           missingImages.length === 0
  }

  const handleSave = async () => {
    if (!selectedBranch || !canSave()) return

    setIsSaving(true)
    try {
      const colorsToProcess = Object.entries(colorAssignments)
        .filter(([colorName, quantity]) => quantity > 0)

      // Process each color assignment
      for (const [colorName, quantity] of colorsToProcess) {
        const color = productColors.find((c: ProductColor) => c.name === colorName)
        const imageUrl = getColorImage(color!)

        // Get the color definition ID from product_color_shape_definitions
        const { data: colorDef, error: defError } = await supabase
          .from('product_color_shape_definitions')
          .select('id')
          .eq('product_id', product.id)
          .eq('name', colorName)
          .eq('variant_type', 'color')
          .single()

        if (defError || !colorDef) {
          console.error('Error getting color definition:', defError)
          throw new Error(`لم يتم العثور على تعريف اللون: ${colorName}`)
        }

        // Get current quantity from product_variant_quantities
        const { data: currentQty, error: qtyGetError } = await supabase
          .from('product_variant_quantities')
          .select('quantity')
          .eq('variant_definition_id', colorDef.id)
          .eq('branch_id', selectedBranch.branchId)
          .single()

        if (qtyGetError && qtyGetError.code !== 'PGRST116') {
          console.error('Error getting current quantity:', qtyGetError)
          throw qtyGetError
        }

        const currentQuantity = currentQty?.quantity || 0
        const newQuantity = currentQuantity + quantity

        console.log(`${currentQuantity > 0 ? 'Updating' : 'Creating'} ${colorName}: ${currentQuantity} + ${quantity} = ${newQuantity}`)

        // Upsert the new quantity
        const { error: upsertError } = await supabase
          .from('product_variant_quantities')
          .upsert({
            variant_definition_id: colorDef.id,
            branch_id: selectedBranch.branchId,
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'variant_definition_id,branch_id'
          })

        if (upsertError) {
          console.error('Error upserting variant quantity:', upsertError)
          throw upsertError
        }
      }

      console.log('All color assignments processed successfully!')
      onAssignmentComplete()
    } catch (error) {
      console.error('Error saving color assignments:', error)

      // Provide more specific error messages
      let errorMessage = 'حدث خطأ أثناء حفظ تحديد الألوان'

      if (error && typeof error === 'object') {
        const err = error as any
        if (err.message) {
          errorMessage = `خطأ في قاعدة البيانات: ${err.message}`
        }
      }

      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-[var(--dash-shadow-lg)] border border-[var(--dash-border-default)] max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-dash-scale-in">
          
          {/* Header */}
          <div className="sticky top-0 bg-[var(--dash-bg-surface)] px-8 py-6 border-b border-[var(--dash-border-default)] flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-dash-accent-purple rounded-full flex items-center justify-center">
                <TagIcon className="h-6 w-6 text-[var(--dash-text-primary)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">تحديد ألوان المنتج</h2>
                <p className="text-dash-accent-blue font-medium">{product.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {!selectedBranch ? (
              /* Branch Selection Step */
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-dash-accent-blue-subtle rounded-lg flex items-center justify-center">
                    <BuildingStorefrontIcon className="h-5 w-5 text-dash-accent-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">اختر الفرع المراد تحديد ألوانه</h3>
                </div>

                {branchesWithUnassigned.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[var(--dash-bg-overlay)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Squares2X2Icon className="h-8 w-8 text-[var(--dash-text-muted)]" />
                    </div>
                    <p className="text-[var(--dash-text-muted)] text-lg mb-2">لا توجد كميات غير محددة الألوان</p>
                    <p className="text-[var(--dash-text-disabled)] text-sm">جميع الكميات في الفروع تم تحديد ألوانها مسبقاً</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {branchesWithUnassigned.map((branchData) => (
                      <button
                        key={branchData.branchId}
                        onClick={() => handleBranchSelect(branchData)}
                        className="bg-[var(--dash-bg-raised)] hover:bg-[#434E61] border border-[var(--dash-border-default)] rounded-xl p-6 text-right transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-dash-accent-blue-subtle rounded-lg flex items-center justify-center">
                            <BuildingStorefrontIcon className="h-6 w-6 text-dash-accent-blue" />
                          </div>
                          <h4 className="text-[var(--dash-text-primary)] font-semibold text-lg">{branchData.branchName}</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-dash-accent-blue font-bold text-xl">{branchData.totalQuantity}</span>
                            <span className="text-[var(--dash-text-muted)]">الكمية الإجمالية</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-dash-accent-green font-medium">{branchData.assignedQuantity}</span>
                            <span className="text-[var(--dash-text-muted)]">محدد الألوان</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-dash-accent-orange font-bold text-lg">{branchData.unassignedQuantity}</span>
                            <span className="text-[var(--dash-text-muted)]">غير محدد الألوان</span>
                          </div>

                          {/* Existing specified color variants */}
                          {branchData.variants.length > 0 && (
                            <div className="pt-2 border-t border-[var(--dash-border-default)]/50">
                              <p className="text-[var(--dash-text-muted)] text-sm mb-2">الألوان المحددة:</p>
                              <div className="flex flex-wrap gap-1">
                                {branchData.variants.map((variant, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-dash-accent-blue text-[var(--dash-text-primary)]"
                                  >
                                    {variant.name} ({variant.quantity})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show total unspecified quantity */}
                          {branchData.unassignedQuantity > 0 && (
                            <div className="pt-2 border-t border-[var(--dash-border-default)]/50">
                              <p className="text-[var(--dash-text-muted)] text-sm mb-2">غير المحدد الكلي:</p>
                              <div className="flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)]">
                                  غير محدد الكلي ({branchData.unassignedQuantity})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Color Assignment Step */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-dash-accent-purple-subtle rounded-lg flex items-center justify-center">
                      <TagIcon className="h-5 w-5 text-dash-accent-purple" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">تحديد كميات الألوان</h3>
                      <p className="text-[var(--dash-text-muted)] text-sm">الفرع: {selectedBranch.branchName}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedBranchId(null)
                      setSelectedBranch(null)
                      setColorAssignments({})
                    }}
                    className="px-4 py-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] bg-transparent hover:bg-[var(--dash-bg-overlay)]/20 border border-[var(--dash-border-default)] hover:border-[var(--dash-border-default)] rounded transition-colors"
                  >
                    تغيير الفرع
                  </button>
                </div>

                {/* Dynamic Unassigned Counter */}
                <div className={`rounded-xl p-4 mb-6 transition-all duration-300 ${
                  getRemainingQuantity() === 0 
                    ? 'bg-dash-accent-green-subtle border border-dash-accent-green/30'
                    : getRemainingQuantity() < 5
                    ? 'bg-dash-accent-orange-subtle border border-dash-accent-orange/30'
                    : 'bg-dash-accent-orange-subtle border border-dash-accent-orange/30'
                }`}>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        getRemainingQuantity() === 0
                          ? 'bg-dash-accent-green animate-bounce'
                          : getRemainingQuantity() < 5
                          ? 'bg-dash-accent-orange animate-pulse'
                          : 'bg-dash-accent-orange animate-pulse'
                      }`}></div>
                      <h3 className={`font-medium transition-colors duration-300 ${
                        getRemainingQuantity() === 0 
                          ? 'text-dash-accent-green' 
                          : getRemainingQuantity() < 5 
                          ? 'text-dash-accent-orange' 
                          : 'text-dash-accent-orange'
                      }`}>
                        الكميات المتبقية للتحديد
                      </h3>
                    </div>
                    <div className={`font-bold text-4xl mb-1 transition-colors duration-300 ${
                      getRemainingQuantity() === 0 
                        ? 'text-dash-accent-green' 
                        : getRemainingQuantity() < 5 
                        ? 'text-dash-accent-orange' 
                        : 'text-dash-accent-orange'
                    }`}>
                      {getRemainingQuantity()}
                    </div>
                    <p className="text-[var(--dash-text-secondary)] text-sm">
                      من أصل {selectedBranch.unassignedQuantity} غير محدد
                    </p>
                    
                    {/* Status Message */}
                    {getRemainingQuantity() === 0 ? (
                      <div className="mt-2 text-dash-accent-green text-sm font-medium">
                        ✅ تم تحديد جميع الكميات
                      </div>
                    ) : getRemainingQuantity() < 5 ? (
                      <div className="mt-2 text-dash-accent-orange text-sm font-medium">
                        ⚠️ كمية قليلة متبقية
                      </div>
                    ) : (
                      <div className="mt-2 text-[var(--dash-text-muted)] text-sm">
                        💡 حدد الألوان للكميات المتبقية
                      </div>
                    )}
                    <div className="mt-3 space-y-1 text-xs text-[var(--dash-text-muted)]">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-dash-accent-blue rounded-full"></div>
                          <span>منتج أصلي</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span>مشتريات</span>
                        </div>
                      </div>
                      <div className="text-center">
                        إجمالي غير محدد: {selectedBranch.unassignedQuantity}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-xs text-[var(--dash-text-muted)] mb-1">
                      <span>محدد حالياً: {getTotalAssigned()}</span>
                      <span>متبقي: {selectedBranch.unassignedQuantity - getTotalAssigned()}</span>
                    </div>
                    <div className="w-full bg-[var(--dash-bg-raised)] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          getRemainingQuantity() === 0 
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                            : getRemainingQuantity() < 5 
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                            : 'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}
                        style={{ 
                          width: `${Math.min(getAssignmentPercentage(), 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Color Assignment Form */}
                {productColors.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[var(--dash-bg-overlay)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TagIcon className="h-8 w-8 text-[var(--dash-text-muted)]" />
                    </div>
                    <p className="text-[var(--dash-text-muted)] text-lg mb-2">لا توجد ألوان محددة لهذا المنتج</p>
                    <p className="text-[var(--dash-text-disabled)] text-sm">يجب إضافة الألوان أولاً في صفحة تحرير المنتج</p>
                    
                    {/* Debug Info */}
                    <div className="mt-6 bg-[var(--dash-bg-base)]/50 rounded-lg p-4 text-xs text-left">
                      <p className="text-[var(--dash-text-secondary)] mb-2">Debug Info:</p>
                      <p className="text-[var(--dash-text-muted)]">Product ID: {product.id}</p>
                      <p className="text-[var(--dash-text-muted)]">Description: {product.description || 'null'}</p>
                      <p className="text-[var(--dash-text-muted)]">ProductColors: {JSON.stringify(product.productColors)}</p>
                    </div>

                    {/* Add Default Colors Button for Testing */}
                    <button
                      onClick={() => {
                        // For testing, let's use some default colors
                        const defaultTestColors: ProductColor[] = [
                          { name: 'أحمر', color: '#FF0000' },
                          { name: 'أزرق', color: '#0000FF' },
                          { name: 'أخضر', color: '#00FF00' },
                          { name: 'أصفر', color: '#FFFF00' },
                          { name: 'أسود', color: '#000000' }
                        ];
                        console.log('Setting test colors:', defaultTestColors);
                        setTestColors(defaultTestColors);
                      }}
                      className="mt-4 px-4 py-2 dash-btn-primary text-[var(--dash-text-primary)] rounded transition-colors"
                    >
                      استخدام ألوان تجريبية (للاختبار)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-[var(--dash-text-primary)] font-medium">ألوان المنتج المتاحة:</h4>
                    
                    {productColors.map((color: ProductColor) => (
                      <div key={color.name} className="bg-[var(--dash-bg-raised)] rounded-lg p-4 border border-[var(--dash-border-default)]">
                        <div className="space-y-4">
                          {/* Color Info and Quantity Controls */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-full border border-[var(--dash-border-default)]"
                                  style={{ backgroundColor: color.color }}
                                />
                                <div>
                                  <span className="text-[var(--dash-text-primary)] font-medium">{color.name}</span>
                                  {(colorAssignments[color.name] || 0) > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-dash-accent-blue">
                                          سيُضاف: {colorAssignments[color.name] || 0}
                                        </span>
                                        <span className="text-[var(--dash-text-disabled)]">•</span>
                                        <span className="text-dash-accent-orange">
                                          متبقي: {getRemainingQuantity()}
                                        </span>
                                        {/* Image status indicator */}
                                        {color.image && color.image.trim() !== '' ? (
                                          <span className="text-dash-accent-green text-xs">📷</span>
                                        ) : hasColorImage(color) ? (
                                          <span className="text-dash-accent-blue text-xs">📷✨</span>
                                        ) : (
                                          <span className="text-dash-accent-red text-xs">📷❌</span>
                                        )}
                                      </div>
                                      
                                      {/* Show existing + new calculation */}
                                      {(() => {
                                        // Check for existing specified variants (not including "غير محدد")
                                        const allVariants = product.variantsData?.[selectedBranch.branchId] || []
                                        const existingColorVariants = allVariants.filter(v => 
                                          v.variant_type === 'color' && v.name === color.name && v.name !== 'غير محدد'
                                        )
                                        const existingQuantity = existingColorVariants.reduce((sum, v) => sum + v.quantity, 0)
                                        const newQuantity = colorAssignments[color.name] || 0
                                        const totalAfter = existingQuantity + newQuantity
                                        
                                        return existingQuantity > 0 ? (
                                          <div className="text-xs text-dash-accent-purple">
                                            {existingQuantity} (موجود) + {newQuantity} (جديد) = {totalAfter} (النهائي)
                                          </div>
                                        ) : (
                                          <div className="text-xs text-dash-accent-green">
                                            لون جديد: {newQuantity}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleColorQuantityChange(color.name, (colorAssignments[color.name] || 0) - 1)}
                                  className="w-8 h-8 dash-btn-red text-[var(--dash-text-primary)] rounded-full flex items-center justify-center transition-colors"
                                  disabled={colorAssignments[color.name] <= 0}
                                >
                                  -
                                </button>
                                
                                <input
                                  type="number"
                                  value={colorAssignments[color.name] || 0}
                                  onChange={(e) => handleColorQuantityChange(color.name, parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-center"
                                  min="0"
                                  max={getRemainingQuantity() + (colorAssignments[color.name] || 0)}
                                />
                                
                                <button
                                  onClick={() => handleColorQuantityChange(color.name, (colorAssignments[color.name] || 0) + 1)}
                                  className="w-8 h-8 dash-btn-green text-[var(--dash-text-primary)] rounded-full flex items-center justify-center transition-colors"
                                  disabled={getRemainingQuantity() <= 0}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            {/* Progress Bar for this Color */}
                            {(colorAssignments[color.name] || 0) > 0 && (
                              <div className="bg-[var(--dash-bg-raised)]/50 rounded-full h-1">
                                <div 
                                  className="h-1 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(((colorAssignments[color.name] || 0) / selectedBranch.unassignedQuantity) * 100, 100)}%`,
                                    backgroundColor: color.color
                                  }}
                                ></div>
                              </div>
                            )}
                          </div>

                          {/* Image Section - Only show if quantity > 0 */}
                          {colorAssignments[color.name] > 0 && (
                            <div className="border-t border-[var(--dash-border-default)]/50 pt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[var(--dash-text-secondary)] text-sm">صورة اللون:</span>
                                
                                {hasColorImage(color) ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-12 bg-[var(--dash-bg-surface)] rounded-lg overflow-hidden border border-[var(--dash-border-default)]">
                                      <img
                                        src={getColorImage(color)}
                                        alt={color.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                          target.nextElementSibling?.classList.remove('hidden')
                                        }}
                                      />
                                      <div className="hidden w-full h-full flex items-center justify-center">
                                        <PhotoIcon className="h-6 w-6 text-[var(--dash-text-disabled)]" />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-dash-accent-green text-xs">✓ موجودة</span>
                                      {/* Only show change button if color doesn't have existing image */}
                                      {(!color.image || color.image.trim() === '') && (
                                        <button
                                          onClick={() => {
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.accept = 'image/*'
                                            input.onchange = (e) => handleImageUpload(color.name, e as any)
                                            input.click()
                                          }}
                                          className="px-2 py-1 dash-btn-primary text-[var(--dash-text-primary)] text-xs rounded transition-colors"
                                        >
                                          تغيير
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  /* Show upload button only for colors without existing images */
                                  <button
                                    onClick={() => {
                                      const input = document.createElement('input')
                                      input.type = 'file'
                                      input.accept = 'image/*'
                                      input.onchange = (e) => handleImageUpload(color.name, e as any)
                                      input.click()
                                    }}
                                    className="flex items-center gap-2 px-3 py-1 dash-btn-red text-[var(--dash-text-primary)] text-xs rounded transition-colors animate-pulse"
                                  >
                                    <PlusIcon className="h-3 w-3" />
                                    إضافة صورة (مطلوبة)
                                  </button>
                                )}
                              </div>
                              
                              {/* Warning message for colors that need images */}
                              {needsImageUpload(color) && (
                                <div className="bg-dash-accent-red-subtle border border-dash-accent-red/30 rounded-lg p-2 mt-2">
                                  <p className="text-dash-accent-red text-xs text-center">
                                    🚨 يجب إضافة صورة لهذا اللون قبل الحفظ
                                  </p>
                                </div>
                              )}
                              
                              {/* Success message for colors with images */}
                              {hasColorImage(color) && (color.image && color.image.trim() !== '') && (
                                <div className="bg-dash-accent-green-subtle border border-dash-accent-green/30 rounded-lg p-2 mt-2">
                                  <p className="text-dash-accent-green text-xs text-center">
                                    ✅ هذا اللون لديه صورة مسبقاً
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Enhanced Summary */}
                    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-4 border border-dash-accent-blue/20">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-dash-accent-blue font-medium">إجمالي سيُضاف:</span>
                          <span className="text-dash-accent-blue font-bold text-lg">
                            {getTotalAssigned()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-dash-accent-orange font-medium">المتبقي غير محدد:</span>
                          <span className="text-dash-accent-orange font-bold text-lg">
                            {getRemainingQuantity()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--dash-text-muted)]">إجمالي الكمية:</span>
                          <span className="text-[var(--dash-text-secondary)]">
                            {selectedBranch.unassignedQuantity}
                          </span>
                        </div>
                        
                        {/* Visual Feedback */}
                        {getTotalAssigned() > selectedBranch.unassignedQuantity && (
                          <div className="bg-dash-accent-red-subtle border border-dash-accent-red/30 rounded-lg p-2 mt-3">
                            <p className="text-dash-accent-red text-sm text-center">
                              ⚠️ العدد المحدد يتجاوز الكمية المتاحة
                            </p>
                          </div>
                        )}
                        
                        {getRemainingQuantity() === 0 && getTotalAssigned() > 0 && (
                          <div className="bg-dash-accent-green-subtle border border-dash-accent-green/30 rounded-lg p-2 mt-3">
                            <p className="text-dash-accent-green text-sm text-center">
                              🎉 تم تحديد جميع الكميات بنجاح!
                            </p>
                          </div>
                        )}
                        
                        {getTotalAssigned() > 0 && getRemainingQuantity() > 0 && (
                          <div className="bg-dash-accent-orange-subtle border border-dash-accent-orange/30 rounded-lg p-2 mt-3">
                            <p className="text-dash-accent-orange text-sm text-center">
                              💡 يمكنك تحديد {getRemainingQuantity()} كمية إضافية
                            </p>
                          </div>
                        )}
                        
                        {/* Missing Images Warning */}
                        {getMissingImages().length > 0 && (
                          <div className="bg-dash-accent-red-subtle border border-dash-accent-red/30 rounded-lg p-3 mt-3">
                            <div className="text-center">
                              <p className="text-dash-accent-red text-sm font-medium mb-2">
                                🚨 صور مطلوبة مفقودة
                              </p>
                              <p className="text-dash-accent-red text-xs mb-2">
                                الألوان التالية تحتاج لصور:
                              </p>
                              <div className="flex flex-wrap justify-center gap-1">
                                {getMissingImages().map((color, index) => (
                                  <span 
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-700/50 text-dash-accent-red border border-dash-accent-red/50"
                                  >
                                    <div 
                                      className="w-3 h-3 rounded-full border border-red-300 mr-1"
                                      style={{ backgroundColor: color.color }}
                                    ></div>
                                    {color.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {productColors.length > 0 && (
                  <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-[var(--dash-border-default)]">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] bg-transparent hover:bg-[var(--dash-bg-overlay)]/20 border border-[var(--dash-border-default)] hover:border-[var(--dash-border-default)] rounded transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!canSave() || isSaving}
                      className={`px-6 py-2 rounded transition-colors flex items-center gap-2 ${
                        canSave() && !isSaving
                          ? 'dash-btn-green text-[var(--dash-text-primary)]'
                          : 'bg-[var(--dash-bg-overlay)]/50 text-[var(--dash-text-muted)] cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : getMissingImages().length > 0 ? (
                        <>
                          <PhotoIcon className="h-4 w-4" />
                          يجب إضافة {getMissingImages().length} صورة
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          حفظ التحديد
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}