'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Product } from '../lib/hooks/useProducts'

interface ProductExportModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  selectedProductIds: string[]
  onSelectModeRequest?: () => void
}

export default function ProductExportModal({
  isOpen,
  onClose,
  products,
  selectedProductIds,
  onSelectModeRequest
}: ProductExportModalProps) {
  const [exportOptions, setExportOptions] = useState({
    // تفاصيل المنتج
    name: true,
    code: true,
    barcode: true,
    description: true,

    // السعر
    purchasePrice: true,
    salePrice: true,
    wholesalePrice: true,
    price1: true,
    price2: true,
    price3: true,
    price4: true,

    // الصور والفيديوهات
    mainImage: true,
    additionalImages: true,
    videos: true,

    // الشكل واللون
    colors: true,
    variants: true,

    // الإعدادات
    isActive: true
  })

  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all')

  // ✨ Export progress state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [currentProductName, setCurrentProductName] = useState('')
  const [processedCount, setProcessedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  if (!isOpen) return null

  // ✨ تحويل URL إلى base64 (مع دعم الفيديوهات الكبيرة)
  const urlToBase64 = async (url: string): Promise<{ data: string; name: string; size: number } | null> => {
    try {
      console.log('🔄 Fetching:', url)

      // إضافة timeout أطول للفيديوهات
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes timeout

      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors', // تأكد من دعم CORS
        cache: 'no-cache' // تجنب مشاكل الكاش
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
        return null
      }

      console.log(`✅ Fetched ${url}, converting to blob...`)
      const blob = await response.blob()
      console.log(`📦 Blob size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          const fileName = url.split('/').pop() || 'file'
          console.log(`✅ Converted to base64: ${fileName}`)
          resolve({
            data: base64,
            name: fileName,
            size: blob.size
          })
        }
        reader.onerror = (error) => {
          console.error('FileReader error:', error)
          resolve(null)
        }
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            if (progress % 25 === 0) { // Log every 25%
              console.log(`  Progress: ${progress}%`)
            }
          }
        }
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request timeout for:', url)
        } else {
          console.error('Error converting URL to base64:', error.message)
        }
      } else {
        console.error('Unknown error converting URL to base64:', error)
      }
      return null
    }
  }

  const handleExport = async () => {
    // تحديد المنتجات المراد تصديرها
    const productsToExport = exportMode === 'all'
      ? products
      : products.filter(p => selectedProductIds.includes(p.id))

    if (productsToExport.length === 0) {
      alert('لا توجد منتجات للتصدير')
      return
    }

    // ✨ Initialize export state
    setIsExporting(true)
    setExportProgress(0)
    setProcessedCount(0)
    setTotalCount(productsToExport.length)
    setCurrentProductName('')

    console.log('🚀 Starting export process...')
    console.log(`📦 Exporting ${productsToExport.length} products`)

    try {
    // تصفية البيانات حسب الخيارات المحددة - Sequential for progress tracking
    const exportData: any[] = []

    for (let i = 0; i < productsToExport.length; i++) {
      const product = productsToExport[i]

      // ✨ Update progress
      setCurrentProductName(product.name)
      setProcessedCount(i + 1)
      setExportProgress(Math.round(((i + 1) / productsToExport.length) * 100))
      // Debug log لكل منتج - مع تفاصيل أكثر
      console.log('📤 Exporting product:', product.name)
      console.log('  - main_image_url:', product.main_image_url)
      console.log('  - additional_images:', product.additional_images)
      console.log('  - additional_images type:', typeof product.additional_images)
      console.log('  - additional_images count:', Array.isArray(product.additional_images) ? product.additional_images.length : 0)
      console.log('  - productVideos:', product.productVideos)
      console.log('  - productVideos type:', typeof product.productVideos)
      console.log('  - productVideos count:', Array.isArray(product.productVideos) ? product.productVideos.length : 0)

      // التحقق من وجود البيانات
      if (!product.additional_images || !Array.isArray(product.additional_images)) {
        console.warn('⚠️ additional_images is not an array:', product.additional_images)
      }
      if (!product.productVideos || !Array.isArray(product.productVideos)) {
        console.warn('⚠️ productVideos is not an array:', product.productVideos)
      }

      const data: any = {}

      // تفاصيل المنتج
      if (exportOptions.name) data.name = product.name
      if (exportOptions.code) data.product_code = product.product_code
      if (exportOptions.barcode) data.barcode = product.barcode
      if (exportOptions.description) {
        // ✨ استخراج النص من JSON object إذا لزم الأمر
        let description = product.description || ''
        if (typeof description === 'string' && description.startsWith('{') && description.includes('"text"')) {
          try {
            const parsed = JSON.parse(description)
            description = parsed.text || description
          } catch (e) {
            // إذا فشل التحليل، استخدم النص كما هو
            console.log('Failed to parse description JSON, using as-is')
          }
        }
        data.description = description
      }

      // السعر
      if (exportOptions.purchasePrice) data.cost_price = product.cost_price
      if (exportOptions.salePrice) data.price = product.price
      if (exportOptions.wholesalePrice) data.wholesale_price = product.wholesale_price
      if (exportOptions.price1) data.price1 = product.price1
      if (exportOptions.price2) data.price2 = product.price2
      if (exportOptions.price3) data.price3 = product.price3
      if (exportOptions.price4) data.price4 = product.price4

      // ✨ تصدير الصورة الرئيسية كـ base64
      if (exportOptions.mainImage && product.main_image_url) {
        const imageData = await urlToBase64(product.main_image_url)
        if (imageData) {
          data.main_image = imageData
        }
      }

      // ✨ تصدير الصور الإضافية كـ base64
      if (exportOptions.additionalImages && product.additional_images && product.additional_images.length > 0) {
        data.additional_images = await Promise.all(
          product.additional_images.map(async (imageUrl: string) => {
            const imageData = await urlToBase64(imageUrl)
            return imageData
          })
        )
        // إزالة القيم null
        data.additional_images = data.additional_images.filter((img: any) => img !== null)
      }

      // ✨ تصدير قائمة الفيديوهات كـ base64
      if (exportOptions.videos && product.productVideos && product.productVideos.length > 0) {
        console.log(`📹 Exporting ${product.productVideos.length} videos for product:`, product.name)

        const videosPromises = product.productVideos.map(async (video, index) => {
          try {
            console.log(`  - Processing video ${index + 1}:`, video.video_url)
            const videoData = await urlToBase64(video.video_url)

            if (!videoData) {
              console.warn(`  ⚠️ Failed to convert video ${index + 1} to base64`)
              return null
            }

            console.log(`  ✅ Video ${index + 1} converted successfully (${(videoData.size / 1024 / 1024).toFixed(2)} MB)`)

            let thumbnailData = null
            if (video.thumbnail_url) {
              console.log(`  - Processing thumbnail for video ${index + 1}`)
              thumbnailData = await urlToBase64(video.thumbnail_url)
              if (thumbnailData) {
                console.log(`  ✅ Thumbnail converted successfully`)
              }
            }

            return {
              video_data: videoData,
              thumbnail_data: thumbnailData,
              video_name: video.video_name,
              video_size: video.video_size,
              duration: video.duration,
              sort_order: video.sort_order
            }
          } catch (error) {
            console.error(`  ❌ Error processing video ${index + 1}:`, error)
            return null
          }
        })

        const videosResults = await Promise.all(videosPromises)
        // إزالة القيم null (الفيديوهات التي فشل تحميلها)
        data.product_videos = videosResults.filter(v => v !== null)

        console.log(`  📊 Successfully exported ${data.product_videos.length} out of ${product.productVideos.length} videos`)
      }

      // الشكل واللون (بدون الكميات في المخزون)
      if (exportOptions.colors) data.productColors = product.productColors
      if (exportOptions.variants) data.variantsData = product.variantsData

      // الإعدادات
      if (exportOptions.isActive) data.is_active = product.is_active

      exportData.push(data)
    } // End of for loop

    // Debug: طباعة البيانات النهائية
    console.log('📦 Final export data:', exportData)

    // إنشاء ملف JSON وتنزيله
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `products-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // 📊 إحصائيات التصدير - عدد الصور والفيديوهات الفعلية
    let totalMainImages = 0
    let totalAdditionalImages = 0
    let totalVideos = 0

    exportData.forEach(p => {
      // عد الصور الرئيسية
      if (p.main_image) {
        totalMainImages++
      }

      // عد الصور الفرعية
      if (p.additional_images && Array.isArray(p.additional_images)) {
        totalAdditionalImages += p.additional_images.length
      }

      // عد الفيديوهات من المصفوفة
      if (p.product_videos && Array.isArray(p.product_videos)) {
        totalVideos += p.product_videos.length
      }
    })

    console.log(`✅ تم تصدير ${exportData.length} منتج`)
    console.log(`   📸 الصور الرئيسية: ${totalMainImages}`)
    console.log(`   🖼️  الصور الفرعية: ${totalAdditionalImages}`)
    console.log(`   🎬 الفيديوهات: ${totalVideos}`)

    alert(
      `تم تصدير ${exportData.length} منتج بنجاح!\n\n` +
      `📊 الإحصائيات:\n` +
      `• عدد الصور الرئيسية التي تم تصديرها: ${totalMainImages}\n` +
      `• عدد الصور الفرعية التي تم تصديرها: ${totalAdditionalImages}\n` +
      `• عدد الفيديوهات التي تم تصديرها: ${totalVideos}\n\n` +
      `✅ جميع الملفات تم تضمينها في ملف JSON`
    )
    onClose()
    } catch (error) {
      console.error('❌ Export error:', error)
      alert('حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.')
    } finally {
      // ✨ Reset export state
      setIsExporting(false)
      setExportProgress(0)
      setCurrentProductName('')
      setProcessedCount(0)
      setTotalCount(0)
    }
  }

  const toggleAllOptions = (value: boolean) => {
    setExportOptions({
      name: value,
      code: value,
      barcode: value,
      description: value,
      purchasePrice: value,
      salePrice: value,
      wholesalePrice: value,
      price1: value,
      price2: value,
      price3: value,
      price4: value,
      mainImage: value,
      additionalImages: value,
      videos: value,
      colors: value,
      variants: value,
      isActive: value
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-[var(--dash-shadow-lg)] w-full max-w-2xl max-h-[90vh] overflow-hidden animate-dash-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">تصدير المنتجات</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] scrollbar-hide">
          {/* Export Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نطاق التصدير
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'all'}
                  onChange={() => setExportMode('all')}
                  className="w-4 h-4 text-dash-accent-blue"
                />
                <span className="text-gray-700">جميع المنتجات ({products.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'selected'}
                  onChange={() => setExportMode('selected')}
                  className="w-4 h-4 text-dash-accent-blue"
                  disabled={selectedProductIds.length === 0}
                />
                <span className={selectedProductIds.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                  المنتجات المحددة ({selectedProductIds.length})
                </span>
              </label>
            </div>

            {/* زر تحديد المنتجات */}
            <button
              onClick={() => {
                if (onSelectModeRequest) {
                  onSelectModeRequest()
                  onClose()
                }
              }}
              className="w-full px-4 py-2.5 bg-dash-accent-blue-subtle text-dash-accent-blue border-2 border-blue-300 rounded-lg hover:bg-dash-accent-blue-subtle transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              الانتقال إلى صفحة المنتجات لتحديد المنتجات
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => toggleAllOptions(true)}
              className="px-3 py-1.5 text-sm bg-dash-accent-green-subtle text-dash-accent-green rounded hover:bg-green-200"
            >
              تحديد الكل
            </button>
            <button
              onClick={() => toggleAllOptions(false)}
              className="px-3 py-1.5 text-sm bg-dash-accent-red-subtle text-dash-accent-red rounded hover:bg-red-200"
            >
              إلغاء الكل
            </button>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            {/* تفاصيل المنتج */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">تفاصيل المنتج</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.name}
                    onChange={(e) => setExportOptions({ ...exportOptions, name: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">اسم المنتج</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.code}
                    onChange={(e) => setExportOptions({ ...exportOptions, code: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الكود / الباركود</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.barcode}
                    onChange={(e) => setExportOptions({ ...exportOptions, barcode: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الباركود</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.description}
                    onChange={(e) => setExportOptions({ ...exportOptions, description: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الوصف</span>
                </label>
              </div>
            </div>

            {/* السعر */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">السعر</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.purchasePrice}
                    onChange={(e) => setExportOptions({ ...exportOptions, purchasePrice: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">سعر الشراء</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.salePrice}
                    onChange={(e) => setExportOptions({ ...exportOptions, salePrice: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">سعر البيع</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.wholesalePrice}
                    onChange={(e) => setExportOptions({ ...exportOptions, wholesalePrice: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">سعر الجملة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price1}
                    onChange={(e) => setExportOptions({ ...exportOptions, price1: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 1</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price2}
                    onChange={(e) => setExportOptions({ ...exportOptions, price2: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 2</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price3}
                    onChange={(e) => setExportOptions({ ...exportOptions, price3: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 3</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price4}
                    onChange={(e) => setExportOptions({ ...exportOptions, price4: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 4</span>
                </label>
              </div>
            </div>

            {/* الوسائط */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">الصور والفيديوهات</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.mainImage}
                    onChange={(e) => setExportOptions({ ...exportOptions, mainImage: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الصورة الرئيسية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.additionalImages}
                    onChange={(e) => setExportOptions({ ...exportOptions, additionalImages: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الصور الفرعية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.videos}
                    onChange={(e) => setExportOptions({ ...exportOptions, videos: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الفيديوهات</span>
                </label>
              </div>
            </div>

            {/* الشكل واللون */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">الشكل واللون</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.colors}
                    onChange={(e) => setExportOptions({ ...exportOptions, colors: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الألوان</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.variants}
                    onChange={(e) => setExportOptions({ ...exportOptions, variants: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">الأشكال (المتغيرات)</span>
                </label>
              </div>
            </div>

            {/* الإعدادات */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">الإعدادات</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.isActive}
                    onChange={(e) => setExportOptions({ ...exportOptions, isActive: e.target.checked })}
                    className="w-4 h-4 text-dash-accent-blue rounded"
                  />
                  <span className="text-sm text-gray-700">حالة المنتج (نشط/غير نشط)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          {/* ✨ Progress Bar - shown during export */}
          {isExporting && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  جاري التصدير... ({processedCount} من {totalCount})
                </span>
                <span className="text-sm font-bold text-dash-accent-blue">{exportProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              {currentProductName && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  📦 {currentProductName}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isExporting}
              className={`px-4 py-2 rounded-lg ${
                isExporting
                  ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              إلغاء
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
                isExporting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'dash-btn-primary'
              } text-white`}
            >
              {isExporting ? (
                <>
                  {/* Spinner Icon */}
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جاري التصدير...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تصدير المنتجات
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
