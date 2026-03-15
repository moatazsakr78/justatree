/**
 * إدارة تكلفة الشراء للمنتجات
 * Purchase Cost Management for Products
 */

import { supabase } from '../supabase/client'
import { calculateWeightedAverageCost, WeightedAverageCostParams } from './weighted-average-cost'

export interface PurchaseHistoryCheck {
  hasPurchaseHistory: boolean
  canEditCost: boolean
  lastPurchaseDate: string | null
  totalPurchases: number
  message?: string
}

export interface ProductCostUpdate {
  productId: string
  newAverageCost: number
  totalQuantityPurchased: number
  totalCostAccumulated: number
  lastPurchasePrice: number
  lastPurchaseDate: string
}

/**
 * التحقق من حالة المنتج وإمكانية تعديل سعر الشراء
 * Check product status and ability to edit purchase cost
 */
export async function checkProductPurchaseHistory(productId: string): Promise<PurchaseHistoryCheck> {
  try {
    // البحث في جدول purchase_invoice_items عن المنتج
    const { data: purchaseItems, error } = await supabase
      .from('purchase_invoice_items')
      .select(`
        quantity,
        unit_purchase_price,
        created_at,
        purchase_invoice_id,
        purchase_invoices (
          invoice_date,
          is_active
        )
      `)
      .eq('product_id', productId)
      .eq('purchase_invoices.is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error checking purchase history:', error)
      return {
        hasPurchaseHistory: false,
        canEditCost: true,
        lastPurchaseDate: null,
        totalPurchases: 0,
        message: 'حدث خطأ في التحقق من تاريخ الشراء'
      }
    }

    const totalPurchases = purchaseItems?.length || 0
    const hasPurchaseHistory = totalPurchases > 0

    if (!hasPurchaseHistory) {
      return {
        hasPurchaseHistory: false,
        canEditCost: true,
        lastPurchaseDate: null,
        totalPurchases: 0,
        message: 'يمكن تعديل سعر الشراء - لا توجد فواتير شراء'
      }
    }

    // إذا كان هناك فواتير شراء، لا يمكن تعديل السعر يدوياً
    const lastPurchase = purchaseItems[0]
    const lastPurchaseDate = lastPurchase?.purchase_invoices?.invoice_date || lastPurchase?.created_at

    return {
      hasPurchaseHistory: true,
      canEditCost: false,
      lastPurchaseDate,
      totalPurchases,
      message: `لا يمكن تعديل سعر الشراء - يتم حسابه تلقائياً من ${totalPurchases} فاتورة شراء`
    }

  } catch (error) {
    console.error('Error in checkProductPurchaseHistory:', error)
    return {
      hasPurchaseHistory: false,
      canEditCost: true,
      lastPurchaseDate: null,
      totalPurchases: 0,
      message: 'حدث خطأ في التحقق من تاريخ الشراء'
    }
  }
}

/**
 * حساب وتحديث تكلفة المنتج بعد شراء جديد
 * Calculate and update product cost after new purchase
 *
 * @param preUpdateStockQuantity - إذا تم تمريره، يتم استخدامه مباشرة بدلاً من
 *   قراءة المخزون وطرح كمية الشراء (يحل مشكلة التوقيت إذا حصل بيع بينهما)
 */
export async function updateProductCostAfterPurchase(
  productId: string,
  newPurchaseQuantity: number,
  newPurchaseUnitCost: number,
  preUpdateStockQuantity?: number
): Promise<ProductCostUpdate | null> {
  try {
    // الحصول على بيانات التكلفة الحالية من product_cost_tracking
    const { data: costTracking, error: costError } = await supabase
      .from('product_cost_tracking')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (costError && costError.code !== 'PGRST116') {
      console.error('Error fetching cost tracking:', costError)
      return null
    }

    let currentStockQuantity: number

    if (preUpdateStockQuantity !== undefined) {
      // Use the pre-update quantity passed by the caller (accurate, no timing issues)
      currentStockQuantity = Math.max(0, preUpdateStockQuantity)
    } else {
      // Fallback: read current inventory and subtract purchase quantity
      // (less accurate if a sale happened between inventory update and this call)
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', productId)

      if (invError) {
        console.error('Error fetching inventory:', invError)
        return null
      }

      const inventoryAfterPurchase = inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      currentStockQuantity = Math.max(0, inventoryAfterPurchase - newPurchaseQuantity)
    }

    // ✨ سعر الشراء الحالي: نحاول من cost_tracking أولاً، ثم من products table
    let currentCostPerUnit = costTracking?.average_cost || 0

    // لو مفيش cost_tracking، نجيب من products table
    if (!costTracking) {
      const { data: product } = await supabase
        .from('products')
        .select('cost_price')
        .eq('id', productId)
        .single()

      currentCostPerUnit = product?.cost_price || 0
    }

    console.log('📊 Cost calculation inputs:', {
      productId,
      currentStockQuantity,
      currentCostPerUnit,
      newPurchaseQuantity,
      newPurchaseUnitCost,
      usedPreUpdateQty: preUpdateStockQuantity !== undefined
    })

    // حساب متوسط التكلفة المرجح الجديد
    const costParams: WeightedAverageCostParams = {
      current_stock_quantity: currentStockQuantity,
      current_cost_per_unit: currentCostPerUnit,
      new_purchase_quantity: newPurchaseQuantity,
      new_purchase_unit_cost: newPurchaseUnitCost
    }

    const result = calculateWeightedAverageCost(costParams)

    console.log('📊 Cost calculation result:', result)

    // تحديث أو إنشاء سجل product_cost_tracking
    const updateData = {
      product_id: productId,
      average_cost: result.updated_cost_per_unit,
      total_quantity_purchased: (costTracking?.total_quantity_purchased || 0) + newPurchaseQuantity,
      total_cost: (costTracking?.total_cost || 0) + (newPurchaseQuantity * newPurchaseUnitCost),
      last_purchase_price: newPurchaseUnitCost,
      last_purchase_date: new Date().toISOString(),
      has_purchase_history: true,
      updated_at: new Date().toISOString()
    }

    if (costTracking) {
      // تحديث السجل الموجود
      const { error: updateError } = await supabase
        .from('product_cost_tracking')
        .update(updateData)
        .eq('id', costTracking.id)

      if (updateError) {
        console.error('Error updating cost tracking:', updateError)
        return null
      }
    } else {
      // إنشاء سجل جديد
      const { error: insertError } = await supabase
        .from('product_cost_tracking')
        .insert(updateData)

      if (insertError) {
        console.error('Error inserting cost tracking:', insertError)
        return null
      }
    }

    // تحديث cost_price في جدول المنتجات
    const { error: productUpdateError } = await supabase
      .from('products')
      .update({
        cost_price: result.updated_cost_per_unit,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (productUpdateError) {
      console.error('Error updating product cost_price:', productUpdateError)
      return null
    }

    return {
      productId,
      newAverageCost: result.updated_cost_per_unit,
      totalQuantityPurchased: updateData.total_quantity_purchased,
      totalCostAccumulated: result.total_cost,
      lastPurchasePrice: newPurchaseUnitCost,
      lastPurchaseDate: updateData.last_purchase_date
    }

  } catch (error) {
    console.error('Error in updateProductCostAfterPurchase:', error)
    return null
  }
}

/**
 * حساب التكلفة المحدثة بدون حفظ في قاعدة البيانات (للمعاينة)
 * Calculate updated cost without saving to database (for preview)
 */
export async function previewCostUpdate(
  productId: string,
  newPurchaseQuantity: number,
  newPurchaseUnitCost: number
): Promise<{ currentCost: number; newCost: number; difference: number } | null> {
  try {
    const { data: costTracking } = await supabase
      .from('product_cost_tracking')
      .select('average_cost')
      .eq('product_id', productId)
      .single()

    const { data: inventory } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)

    const currentStockQuantity = inventory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const currentCostPerUnit = costTracking?.average_cost || 0

    const result = calculateWeightedAverageCost({
      current_stock_quantity: currentStockQuantity,
      current_cost_per_unit: currentCostPerUnit,
      new_purchase_quantity: newPurchaseQuantity,
      new_purchase_unit_cost: newPurchaseUnitCost
    })

    return {
      currentCost: currentCostPerUnit,
      newCost: result.updated_cost_per_unit,
      difference: result.updated_cost_per_unit - currentCostPerUnit
    }

  } catch (error) {
    console.error('Error in previewCostUpdate:', error)
    return null
  }
}

/**
 * إعادة حساب تكلفة المنتج من التاريخ الكامل لفواتير الشراء
 * Recalculate product cost from full purchase invoice history
 *
 * يُستخدم عند حذف فاتورة شراء أو مرتجع شراء لضمان دقة المتوسط المرجح
 */
export async function recalculateProductCostFromHistory(productId: string): Promise<ProductCostUpdate | null> {
  try {
    // جلب كل فواتير الشراء النشطة للمنتج (غير المرتجعات) مرتبة بالتاريخ
    const { data: purchaseItems, error: fetchError } = await supabase
      .from('purchase_invoice_items')
      .select(`
        quantity,
        unit_purchase_price,
        total_price,
        created_at,
        purchase_invoices!inner (
          id,
          invoice_date,
          is_active,
          invoice_type
        )
      `)
      .eq('product_id', productId)
      .eq('purchase_invoices.is_active', true)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching purchase history for recalculation:', fetchError)
      return null
    }

    // فلترة فقط فواتير الشراء العادية (غير المرتجعات)
    const normalPurchases = (purchaseItems || []).filter((item: any) => {
      const invoiceType = item.purchase_invoices?.invoice_type || ''
      return invoiceType !== 'Purchase Return'
    })

    // فلترة المرتجعات
    const returnPurchases = (purchaseItems || []).filter((item: any) => {
      const invoiceType = item.purchase_invoices?.invoice_type || ''
      return invoiceType === 'Purchase Return'
    })

    // حساب إجمالي المرتجعات
    const totalReturnedQuantity = returnPurchases.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)

    if (normalPurchases.length === 0) {
      // لا توجد فواتير شراء - نرجع التكلفة للسعر الأصلي من المنتج أو صفر
      const { data: product } = await supabase
        .from('products')
        .select('cost_price')
        .eq('id', productId)
        .single()

      // حذف سجل التكلفة إن وجد
      await supabase
        .from('product_cost_tracking')
        .delete()
        .eq('product_id', productId)

      // لو مفيش فواتير شراء خالص، نحط التكلفة = 0
      await supabase
        .from('products')
        .update({ cost_price: 0, updated_at: new Date().toISOString() })
        .eq('id', productId)

      return {
        productId,
        newAverageCost: 0,
        totalQuantityPurchased: 0,
        totalCostAccumulated: 0,
        lastPurchasePrice: 0,
        lastPurchaseDate: new Date().toISOString()
      }
    }

    // إعادة حساب المتوسط المرجح التراكمي من كل الفواتير
    let runningQuantity = 0
    let runningCost = 0
    let totalQuantityPurchased = 0
    let totalCostAccumulated = 0
    let lastPurchasePrice = 0
    let lastPurchaseDate = ''

    for (const item of normalPurchases) {
      const qty = item.quantity || 0
      const unitCost = item.unit_purchase_price || 0

      if (runningQuantity === 0 || runningCost === 0) {
        // أول شراء أو المخزون صفر - نستخدم السعر الجديد مباشرة
        runningQuantity = qty
        runningCost = qty * unitCost
      } else {
        // حساب المتوسط المرجح التراكمي
        runningCost = runningCost + (qty * unitCost)
        runningQuantity = runningQuantity + qty
      }

      totalQuantityPurchased += qty
      totalCostAccumulated += qty * unitCost
      lastPurchasePrice = unitCost
      lastPurchaseDate = (item as any).purchase_invoices?.invoice_date || item.created_at
    }

    // طرح كمية المرتجعات من الكمية الجارية
    runningQuantity = Math.max(0, runningQuantity - totalReturnedQuantity)

    const averageCost = runningQuantity > 0
      ? Math.round((runningCost / runningQuantity) * 100) / 100
      : (totalQuantityPurchased > 0 ? Math.round((totalCostAccumulated / totalQuantityPurchased) * 100) / 100 : 0)

    console.log('📊 Recalculated cost from history:', {
      productId,
      normalPurchases: normalPurchases.length,
      returnPurchases: returnPurchases.length,
      totalQuantityPurchased,
      totalCostAccumulated,
      averageCost
    })

    // تحديث أو إنشاء سجل product_cost_tracking
    const { data: existingTracking } = await supabase
      .from('product_cost_tracking')
      .select('id')
      .eq('product_id', productId)
      .single()

    const trackingData = {
      product_id: productId,
      average_cost: averageCost,
      total_quantity_purchased: totalQuantityPurchased,
      total_cost: totalCostAccumulated,
      last_purchase_price: lastPurchasePrice,
      last_purchase_date: lastPurchaseDate || new Date().toISOString(),
      has_purchase_history: true,
      updated_at: new Date().toISOString()
    }

    if (existingTracking) {
      await supabase
        .from('product_cost_tracking')
        .update(trackingData)
        .eq('id', existingTracking.id)
    } else {
      await supabase
        .from('product_cost_tracking')
        .insert(trackingData)
    }

    // تحديث cost_price في جدول المنتجات
    await supabase
      .from('products')
      .update({
        cost_price: averageCost,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    return {
      productId,
      newAverageCost: averageCost,
      totalQuantityPurchased,
      totalCostAccumulated,
      lastPurchasePrice,
      lastPurchaseDate: lastPurchaseDate || new Date().toISOString()
    }

  } catch (error) {
    console.error('Error in recalculateProductCostFromHistory:', error)
    return null
  }
}

/**
 * بيانات سجل شراء واحد
 */
export interface PurchaseHistoryItem {
  id: string
  invoiceNumber: string
  invoiceDate: string
  supplierName: string
  supplierId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
}

/**
 * بيانات آخر سعر شراء
 */
export interface LastPurchaseInfo {
  unitPrice: number
  supplierName: string
  supplierId: string
  quantity: number
  invoiceDate: string
  invoiceNumber: string
}

/**
 * جلب تاريخ أسعار الشراء للمنتج
 * Get purchase price history for a product
 */
export async function getProductPurchaseHistory(productId: string): Promise<PurchaseHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('purchase_invoice_items')
      .select(`
        id,
        quantity,
        unit_purchase_price,
        total_price,
        created_at,
        purchase_invoices (
          id,
          invoice_number,
          invoice_date,
          supplier_id,
          suppliers (
            id,
            name
          )
        )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase history:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      invoiceNumber: item.purchase_invoices?.invoice_number || '-',
      invoiceDate: item.purchase_invoices?.invoice_date || item.created_at,
      supplierName: item.purchase_invoices?.suppliers?.name || 'غير معروف',
      supplierId: item.purchase_invoices?.supplier_id || '',
      quantity: item.quantity || 0,
      unitPrice: item.unit_purchase_price || 0,
      totalPrice: item.total_price || 0,
      createdAt: item.created_at
    }))

  } catch (error) {
    console.error('Error in getProductPurchaseHistory:', error)
    return []
  }
}

/**
 * جلب آخر سعر شراء للمنتج
 * Get last purchase price info for a product
 */
export async function getLastPurchaseInfo(productId: string): Promise<LastPurchaseInfo | null> {
  try {
    const { data, error } = await supabase
      .from('purchase_invoice_items')
      .select(`
        quantity,
        unit_purchase_price,
        purchase_invoices (
          invoice_number,
          invoice_date,
          supplier_id,
          suppliers (
            id,
            name
          )
        )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No purchase history
        return null
      }
      console.error('Error fetching last purchase info:', error)
      return null
    }

    return {
      unitPrice: data.unit_purchase_price || 0,
      supplierName: (data.purchase_invoices as any)?.suppliers?.name || 'غير معروف',
      supplierId: (data.purchase_invoices as any)?.supplier_id || '',
      quantity: data.quantity || 0,
      invoiceDate: (data.purchase_invoices as any)?.invoice_date || '',
      invoiceNumber: (data.purchase_invoices as any)?.invoice_number || ''
    }

  } catch (error) {
    console.error('Error in getLastPurchaseInfo:', error)
    return null
  }
}