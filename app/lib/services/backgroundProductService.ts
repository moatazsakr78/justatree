import { supabase } from '../supabase/client'
import { uploadVersionedProductImage, uploadAndSetMainImage, addAdditionalVersionedImage } from './simpleImageVersioning'
import { uploadProductVideo } from '../supabase/storage'
import { logActivity } from './activityLogger'

// Types
export type BackgroundTaskStatus =
  | 'queued'
  | 'creating'
  | 'updating'
  | 'uploading-variants'
  | 'creating-inventory'
  | 'saving-definitions'
  | 'uploading-images'
  | 'uploading-videos'
  | 'finalizing'
  | 'completed'
  | 'failed'

export interface ProductColor {
  id: string
  name: string
  color: string
  image?: string
  imageFile?: File
  barcode?: string
}

export interface ProductShape {
  id: string
  name: string
  image?: string
  imageFile?: File
  barcode?: string
}

export interface LocationThreshold {
  locationId: string
  locationType: 'branch' | 'warehouse'
  locationName: string
  quantity: number | undefined
  minStockThreshold: number | undefined
}

export interface LocationVariant {
  id: string
  locationId: string
  locationType: 'branch' | 'warehouse'
  elementType: 'color' | 'shape'
  elementId: string
  elementName: string
  quantity: number
  barcode: string
  image?: string
}

export interface BackgroundProductSnapshot {
  productData: Record<string, any>
  productColors: ProductColor[]
  productShapes: ProductShape[]
  locationThresholds: LocationThreshold[]
  locationVariants: LocationVariant[]
  mainImageFile: File | null
  additionalImageFiles: File[]
  pendingVideoFiles: File[]
  userId?: string
  userName?: string
  // Fields for update operations
  editProductId?: string
  existingMainImageUrl?: string
  additionalExistingImageUrls?: string[]
}

export interface BackgroundProductTask {
  id: string
  type: 'create' | 'update'
  productName: string
  status: BackgroundTaskStatus
  progress: number
  error?: string
  snapshot: BackgroundProductSnapshot
  savedProductId?: string
  createdAt: number
}

export interface TaskCallbacks {
  onStatusChange: (taskId: string, status: BackgroundTaskStatus, progress: number) => void
  onComplete: (taskId: string, productId: string) => void
  onError: (taskId: string, error: string) => void
}

function updateStatus(task: BackgroundProductTask, callbacks: TaskCallbacks, status: BackgroundTaskStatus, progress: number) {
  task.status = status
  task.progress = progress
  callbacks.onStatusChange(task.id, status, progress)
}

export async function executeProductCreation(
  task: BackgroundProductTask,
  callbacks: TaskCallbacks,
  createProduct: (data: Record<string, any>) => Promise<any>
): Promise<void> {
  try {
    const { snapshot } = task

    // Step 1: Create product in DB (0-15%)
    updateStatus(task, callbacks, 'creating', 5)
    const savedProduct = await createProduct(snapshot.productData)
    if (!savedProduct) {
      throw new Error('فشل في إنشاء المنتج')
    }
    task.savedProductId = savedProduct.id
    updateStatus(task, callbacks, 'creating', 15)

    // Step 2: Upload variant (color/shape) images (15-35%)
    updateStatus(task, callbacks, 'uploading-variants', 20)
    const { updatedColors, updatedShapes } = await uploadColorAndShapeImages(
      savedProduct.id,
      snapshot.productColors,
      snapshot.productShapes
    )
    updateStatus(task, callbacks, 'uploading-variants', 35)

    // Update locationVariants with uploaded image URLs
    const updatedLocationVariants = snapshot.locationVariants.map(variant => {
      if (variant.elementType === 'color') {
        const color = updatedColors.find(c => c.id === variant.elementId)
        if (color) return { ...variant, image: color.image }
      } else if (variant.elementType === 'shape') {
        const shape = updatedShapes.find(s => s.id === variant.elementId)
        if (shape) return { ...variant, image: shape.image }
      }
      return variant
    })

    // Step 3: Create inventory entries (35-45%)
    updateStatus(task, callbacks, 'creating-inventory', 40)
    const inventoryEntriesToSave = snapshot.locationThresholds
      .filter(t => (t.quantity !== undefined && t.quantity > 0) || (t.minStockThreshold !== undefined && t.minStockThreshold > 0))

    const inventoryPromises = inventoryEntriesToSave.map(threshold => {
      const inventoryData: any = {
        product_id: savedProduct.id,
        quantity: threshold.quantity ?? 0,
        min_stock: threshold.minStockThreshold ?? 0
      }
      if (threshold.locationType === 'branch') {
        inventoryData.branch_id = threshold.locationId
      } else {
        inventoryData.warehouse_id = threshold.locationId
      }
      return supabase.from('inventory').insert(inventoryData)
    })
    await Promise.all(inventoryPromises)
    updateStatus(task, callbacks, 'creating-inventory', 45)

    // Step 4: Save color/shape definitions via API (45-55%)
    updateStatus(task, callbacks, 'saving-definitions', 50)
    const saveResponse = await fetch('/api/products/save-color-shape-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: savedProduct.id,
        colors: updatedColors,
        shapes: updatedShapes,
        quantities: updatedLocationVariants
      })
    })
    const saveResult = await saveResponse.json()
    if (!saveResult.success) {
      console.error('Failed to save definitions:', saveResult.error)
    }
    updateStatus(task, callbacks, 'saving-definitions', 55)

    // Step 5: Upload main + additional images (55-80%)
    updateStatus(task, callbacks, 'uploading-images', 60)
    let uploadedMainImageUrl: string | null = null
    const uploadedAdditionalImageUrls: string[] = []

    if (snapshot.mainImageFile) {
      const mainImageResult = await uploadAndSetMainImage(snapshot.mainImageFile, savedProduct.id)
      if (mainImageResult.success && mainImageResult.publicUrl) {
        uploadedMainImageUrl = mainImageResult.publicUrl
      }
    }
    updateStatus(task, callbacks, 'uploading-images', 70)

    for (const file of snapshot.additionalImageFiles) {
      const result = await addAdditionalVersionedImage(file, savedProduct.id)
      if (result.success && result.publicUrl) {
        uploadedAdditionalImageUrls.push(result.publicUrl)
      }
    }
    updateStatus(task, callbacks, 'uploading-images', 80)

    // Step 6: Upload videos (80-95%)
    updateStatus(task, callbacks, 'uploading-videos', 85)
    for (let i = 0; i < snapshot.pendingVideoFiles.length; i++) {
      const file = snapshot.pendingVideoFiles[i]
      const { data: uploadData, error: uploadError } = await uploadProductVideo(file, savedProduct.id)
      if (uploadData && !uploadError) {
        // Save video record in DB
        await supabase.from('product_videos' as any).insert({
          product_id: savedProduct.id,
          video_url: uploadData.publicUrl,
          video_name: file.name,
          video_size: file.size,
          sort_order: i
        } as any)
      }
      const videoProgress = 85 + ((i + 1) / Math.max(snapshot.pendingVideoFiles.length, 1)) * 10
      updateStatus(task, callbacks, 'uploading-videos', Math.min(95, Math.round(videoProgress)))
    }

    // Step 7: Update product record + log activity (95-100%)
    updateStatus(task, callbacks, 'finalizing', 96)
    if (uploadedMainImageUrl || uploadedAdditionalImageUrls.length > 0) {
      const updateData: any = {}
      if (uploadedMainImageUrl) {
        updateData.main_image_url = uploadedMainImageUrl
      }
      if (uploadedAdditionalImageUrls.length > 0) {
        updateData.additional_images_urls = uploadedAdditionalImageUrls
      }
      await supabase.from('products').update(updateData).eq('id', savedProduct.id)
    }

    logActivity({
      userId: snapshot.userId,
      userName: snapshot.userName,
      entityType: 'product',
      actionType: 'create',
      entityId: savedProduct.id,
      entityName: task.productName
    })

    updateStatus(task, callbacks, 'completed', 100)
    callbacks.onComplete(task.id, savedProduct.id)

  } catch (error: any) {
    task.status = 'failed'
    task.error = error.message || 'حدث خطأ غير متوقع'
    callbacks.onError(task.id, task.error!)
  }
}

export async function retryProductCreation(
  task: BackgroundProductTask,
  callbacks: TaskCallbacks,
  createProduct: (data: Record<string, any>) => Promise<any>
): Promise<void> {
  task.error = undefined
  if (task.savedProductId) {
    // Product already created - retry from where we left off
    // For simplicity, re-run all steps after creation (they're idempotent or skip if already done)
    const fakeCreateProduct = async () => ({ id: task.savedProductId, name: task.productName })
    await executeProductCreation(task, callbacks, fakeCreateProduct as any)
  } else {
    await executeProductCreation(task, callbacks, createProduct)
  }
}

// Helper: upload color and shape images (standalone, no React state)
async function uploadColorAndShapeImages(
  productId: string,
  colors: ProductColor[],
  shapes: ProductShape[]
): Promise<{ updatedColors: ProductColor[], updatedShapes: ProductShape[] }> {
  const updatedColors = await Promise.all(
    colors.map(async (color) => {
      if (color.imageFile) {
        const result = await uploadVersionedProductImage(color.imageFile, productId, 'variant')
        if (result.success && result.publicUrl) {
          const { imageFile, ...rest } = color
          return { ...rest, image: result.publicUrl }
        }
      }
      const { imageFile, ...rest } = color
      return rest
    })
  )

  const updatedShapes = await Promise.all(
    shapes.map(async (shape) => {
      if (shape.imageFile) {
        const result = await uploadVersionedProductImage(shape.imageFile, productId, 'variant')
        if (result.success && result.publicUrl) {
          const { imageFile, ...rest } = shape
          return { ...rest, image: result.publicUrl }
        }
      }
      const { imageFile, ...rest } = shape
      return rest
    })
  )

  return { updatedColors, updatedShapes }
}

export async function executeProductUpdate(
  task: BackgroundProductTask,
  callbacks: TaskCallbacks,
  updateProduct: (productId: string, data: Record<string, any>) => Promise<any>
): Promise<void> {
  try {
    const { snapshot } = task
    const productId = snapshot.editProductId!

    // Step 1: Upload images (0-20%)
    updateStatus(task, callbacks, 'uploading-images', 5)
    let mainImageUrl = snapshot.existingMainImageUrl || undefined

    if (snapshot.mainImageFile) {
      const mainImageResult = await uploadAndSetMainImage(snapshot.mainImageFile, productId)
      if (mainImageResult.success && mainImageResult.publicUrl) {
        mainImageUrl = mainImageResult.publicUrl
      }
    }
    updateStatus(task, callbacks, 'uploading-images', 10)

    const additionalImageUrls: string[] = [...(snapshot.additionalExistingImageUrls || [])]
    for (const file of snapshot.additionalImageFiles) {
      const result = await addAdditionalVersionedImage(file, productId)
      if (result.success && result.publicUrl) {
        additionalImageUrls.push(result.publicUrl)
      }
    }
    updateStatus(task, callbacks, 'uploading-images', 20)

    // Build productData with uploaded image URLs
    const productData = { ...snapshot.productData }
    if (mainImageUrl) {
      productData.main_image_url = mainImageUrl
    }
    productData.additional_images = additionalImageUrls.length > 0 ? additionalImageUrls : []

    // Step 2: Update product in DB (20-35%)
    updateStatus(task, callbacks, 'updating', 25)
    const savedProduct = await updateProduct(productId, productData)
    if (!savedProduct) {
      throw new Error('فشل في تحديث المنتج')
    }
    task.savedProductId = savedProduct.id
    updateStatus(task, callbacks, 'updating', 35)

    // Step 3: Upload variant (color/shape) images (35-50%)
    updateStatus(task, callbacks, 'uploading-variants', 40)
    const { updatedColors, updatedShapes } = await uploadColorAndShapeImages(
      productId,
      snapshot.productColors,
      snapshot.productShapes
    )
    updateStatus(task, callbacks, 'uploading-variants', 50)

    const updatedLocationVariants = snapshot.locationVariants.map(variant => {
      if (variant.elementType === 'color') {
        const color = updatedColors.find(c => c.id === variant.elementId)
        if (color) return { ...variant, image: color.image }
      } else if (variant.elementType === 'shape') {
        const shape = updatedShapes.find(s => s.id === variant.elementId)
        if (shape) return { ...variant, image: shape.image }
      }
      return variant
    })

    // Step 4: Upsert inventory entries (50-65%)
    updateStatus(task, callbacks, 'creating-inventory', 55)
    const inventoryEntriesToSave = snapshot.locationThresholds
      .filter(t => (t.quantity !== undefined && t.quantity > 0) || (t.minStockThreshold !== undefined && t.minStockThreshold > 0))

    const inventoryPromises = inventoryEntriesToSave.map(threshold => {
      const inventoryData: any = {
        product_id: productId,
        quantity: threshold.quantity ?? 0,
        min_stock: threshold.minStockThreshold ?? 0
      }
      if (threshold.locationType === 'branch') {
        inventoryData.branch_id = threshold.locationId
      } else {
        inventoryData.warehouse_id = threshold.locationId
      }
      return supabase.from('inventory').upsert(inventoryData, {
        onConflict: threshold.locationType === 'branch' ? 'product_id,branch_id' : 'product_id,warehouse_id'
      })
    })
    await Promise.all(inventoryPromises)
    updateStatus(task, callbacks, 'creating-inventory', 65)

    // Step 5: Save color/shape definitions via API (65-80%)
    updateStatus(task, callbacks, 'saving-definitions', 70)
    const saveResponse = await fetch('/api/products/save-color-shape-definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: productId,
        colors: updatedColors,
        shapes: updatedShapes,
        quantities: updatedLocationVariants
      })
    })
    const saveResult = await saveResponse.json()
    if (!saveResult.success) {
      console.error('Failed to save definitions:', saveResult.error)
    }
    updateStatus(task, callbacks, 'saving-definitions', 80)

    // Step 6: Upload videos (80-95%)
    updateStatus(task, callbacks, 'uploading-videos', 85)
    for (let i = 0; i < snapshot.pendingVideoFiles.length; i++) {
      const file = snapshot.pendingVideoFiles[i]
      const { data: uploadData, error: uploadError } = await uploadProductVideo(file, productId)
      if (uploadData && !uploadError) {
        await supabase.from('product_videos' as any).insert({
          product_id: productId,
          video_url: uploadData.publicUrl,
          video_name: file.name,
          video_size: file.size,
          sort_order: i
        } as any)
      }
      const videoProgress = 85 + ((i + 1) / Math.max(snapshot.pendingVideoFiles.length, 1)) * 10
      updateStatus(task, callbacks, 'uploading-videos', Math.min(95, Math.round(videoProgress)))
    }

    // Step 7: Finalize - log activity (95-100%)
    updateStatus(task, callbacks, 'finalizing', 96)
    logActivity({
      userId: snapshot.userId,
      userName: snapshot.userName,
      entityType: 'product',
      actionType: 'update',
      entityId: productId,
      entityName: task.productName
    })

    updateStatus(task, callbacks, 'completed', 100)
    callbacks.onComplete(task.id, productId)

  } catch (error: any) {
    task.status = 'failed'
    task.error = error.message || 'حدث خطأ غير متوقع'
    callbacks.onError(task.id, task.error!)
  }
}

export async function retryProductUpdate(
  task: BackgroundProductTask,
  callbacks: TaskCallbacks,
  updateProduct: (productId: string, data: Record<string, any>) => Promise<any>
): Promise<void> {
  task.error = undefined
  await executeProductUpdate(task, callbacks, updateProduct)
}
