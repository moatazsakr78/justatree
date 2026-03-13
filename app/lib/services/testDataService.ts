import { SupabaseClient } from '@supabase/supabase-js'
import { egyptianGovernorates } from '@/app/lib/data/governorates'

const FIRST_NAMES = [
  'أحمد', 'محمد', 'علي', 'حسن', 'إبراهيم', 'عمر', 'خالد', 'يوسف', 'مصطفى', 'عبدالله',
  'فاطمة', 'عائشة', 'مريم', 'زينب', 'نورا', 'سارة', 'هدى', 'رنا', 'ليلى', 'أمل'
]

const LAST_NAMES = [
  'محمد', 'أحمد', 'حسين', 'إبراهيم', 'عبدالرحمن', 'السيد', 'الشريف', 'المنصور',
  'العربي', 'الفاروق', 'النجار', 'الحداد', 'البكري', 'الصالح', 'القاضي'
]

const COMPANY_NAMES = [
  'شركة النور للتجارة', 'مؤسسة الأمل التجارية', 'شركة الفجر للاستيراد',
  'مؤسسة البركة للتوزيع', 'شركة الرياض للتوريدات', 'مؤسسة السلام التجارية',
  'شركة الوفاء للتجارة', 'مؤسسة الإخلاص للتوزيع', 'شركة المستقبل للاستيراد',
  'مؤسسة الجودة للتوريدات', 'شركة الأصالة للتجارة', 'مؤسسة التقدم التجارية'
]

const SAFE_NAMES = [
  'خزنة الفرع الرئيسي', 'خزنة المبيعات', 'خزنة المشتريات', 'خزنة المصروفات',
  'خزنة الطوارئ', 'خزنة العملاء', 'خزنة الاستثمار', 'صندوق يومي'
]

const CITIES = ['القاهرة', 'الإسكندرية', 'الجيزة', 'المنصورة', 'طنطا', 'الزقازيق', 'أسيوط', 'سوهاج']

const PHONES = ['01000000000', '01100000000', '01200000000', '01500000000']

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPhone(): string {
  const base = random(PHONES)
  return base.slice(0, 4) + String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
}

function cityToGovernorateId(city: string): string {
  const gov = egyptianGovernorates.find(g => g.name === city)
  return gov?.id || ''
}

// Types matching each modal's formData shape
export type CustomerFormDefaults = {
  name: string
  phone: string
  governorate: string
  allowedLimit: string
}

export type SupplierFormDefaults = {
  name: string
  phone: string
  governorate: string
  allowedLimit: string
}

export type SafeFormDefaults = {
  name: string
  initialBalance: string
}

export function generateTestCustomerDefaults(): CustomerFormDefaults {
  const firstName = random(FIRST_NAMES)
  const lastName = random(LAST_NAMES)
  const city = random(CITIES)
  return {
    name: `${firstName} ${lastName} [تجريبي]`,
    phone: randomPhone(),
    governorate: cityToGovernorateId(city),
    allowedLimit: '1000',
  }
}

export function generateTestSupplierDefaults(): SupplierFormDefaults {
  const companyName = `${random(COMPANY_NAMES)} [تجريبي]`
  const city = random(CITIES)
  return {
    name: companyName,
    phone: randomPhone(),
    governorate: cityToGovernorateId(city),
    allowedLimit: '5000',
  }
}

export function generateTestSafeDefaults(): SafeFormDefaults {
  return {
    name: `${random(SAFE_NAMES)} [تجريبي]`,
    initialBalance: '0',
  }
}

async function deleteTestCustomer(supabase: SupabaseClient, id: string) {
  // Get customer's sales
  const { data: sales } = await supabase
    .from('sales')
    .select('id')
    .eq('customer_id', id)
  const saleIds = (sales || []).map((s: any) => s.id)

  if (saleIds.length > 0) {
    await supabase.from('cashbox_entries').delete().in('sale_id', saleIds)
    await supabase.from('cash_drawer_transactions').delete().in('sale_id', saleIds)
    await supabase.from('sale_items').delete().in('sale_id', saleIds)
    await supabase.from('sales').delete().eq('customer_id', id)
  }

  // Get customer's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', id)
  const orderIds = (orders || []).map((o: any) => o.id)

  if (orderIds.length > 0) {
    await supabase.from('payment_receipts').delete().in('order_id', orderIds)
    await supabase.from('order_items').delete().in('order_id', orderIds)
    await supabase.from('orders').delete().eq('customer_id', id)
  }

  await supabase.from('customer_payments').delete().eq('customer_id', id)
  await supabase.from('product_ratings').delete().eq('customer_id', id)
  await supabase.from('cart_items').delete().eq('customer_id', id)
  await supabase.from('favorites').delete().eq('customer_id', id)

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('is_test', true)
  if (error) throw error
}

async function deleteTestSupplier(supabase: SupabaseClient, id: string) {
  // Get supplier's purchase invoices
  const { data: invoices } = await supabase
    .from('purchase_invoices')
    .select('id')
    .eq('supplier_id', id)
  const invoiceIds = (invoices || []).map((i: any) => i.id)

  if (invoiceIds.length > 0) {
    await supabase.from('purchase_invoice_items').delete().in('purchase_invoice_id', invoiceIds)
    await supabase.from('purchase_invoices').delete().eq('supplier_id', id)
  }

  await supabase.from('supplier_payments').delete().eq('supplier_id', id)

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('is_test', true)
  if (error) throw error
}

async function deleteTestSafe(supabase: SupabaseClient, id: string) {
  // Delete child records (sub-safes) first
  const { data: children } = await supabase
    .from('records')
    .select('id')
    .eq('parent_id', id)

  for (const child of (children || [])) {
    const childId = (child as any).id
    // Get child's cash drawers
    const { data: childDrawers } = await supabase
      .from('cash_drawers')
      .select('id')
      .eq('record_id', childId)
    const childDrawerIds = (childDrawers || []).map((d: any) => d.id)

    if (childDrawerIds.length > 0) {
      await supabase.from('cash_drawer_transactions').delete().in('cash_drawer_id', childDrawerIds)
      await supabase.from('cash_drawers').delete().eq('record_id', childId)
    }
    await supabase.from('records').delete().eq('id', childId)
  }

  // Delete this record's cash drawers
  const { data: drawers } = await supabase
    .from('cash_drawers')
    .select('id')
    .eq('record_id', id)
  const drawerIds = (drawers || []).map((d: any) => d.id)

  if (drawerIds.length > 0) {
    await supabase.from('cash_drawer_transactions').delete().in('cash_drawer_id', drawerIds)
    await supabase.from('cash_drawers').delete().eq('record_id', id)
  }

  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', id)
    .eq('is_test', true)
  if (error) throw error
}

export async function deleteTestEntity(supabase: SupabaseClient, type: 'customer' | 'supplier' | 'safe', id: string) {
  if (type === 'customer') {
    await deleteTestCustomer(supabase, id)
  } else if (type === 'supplier') {
    await deleteTestSupplier(supabase, id)
  } else {
    await deleteTestSafe(supabase, id)
  }
}

export async function deleteAllTestData(supabase: SupabaseClient) {
  const results = { customers: 0, suppliers: 0, safes: 0 }

  // Delete all test customers
  const { data: testCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('is_test', true)
  for (const c of (testCustomers || [])) {
    await deleteTestCustomer(supabase, (c as any).id)
    results.customers++
  }

  // Delete all test suppliers
  const { data: testSuppliers } = await supabase
    .from('suppliers')
    .select('id')
    .eq('is_test', true)
  for (const s of (testSuppliers || [])) {
    await deleteTestSupplier(supabase, (s as any).id)
    results.suppliers++
  }

  // Delete all test safes
  const { data: testSafes } = await supabase
    .from('records')
    .select('id')
    .eq('is_test', true)
  for (const r of (testSafes || [])) {
    await deleteTestSafe(supabase, (r as any).id)
    results.safes++
  }

  return results
}
