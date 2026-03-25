// Purchase Fetchers - Data fetching for purchase reports
// دوال جلب بيانات تقارير المشتريات

import { supabase } from '@/app/lib/supabase/client';
import { ReportFetchParams, getDateRangeForFilter } from './baseFetcher';

// ============================
// Purchase Items Report
// تقرير أصناف المشتريات
// ============================

export async function fetchPurchaseItemsReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter } = params;
  const dateRange = getDateRangeForFilter(dateFilter);

  let query = supabase
    .from('purchase_invoice_items')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      total_amount,
      products(id, name, category_id, categories(name)),
      purchase_invoices!inner(created_at, supplier_id, suppliers(name))
    `);

  // Apply date filter on purchase_invoices.created_at
  if (dateRange) {
    query = query
      .gte('purchase_invoices.created_at', dateRange.startDate)
      .lte('purchase_invoices.created_at', dateRange.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by product_id
  const productMap = new Map<string, {
    product_name: string;
    category_name: string;
    total_quantity: number;
    total_unit_price: number;
    price_count: number;
    total_amount: number;
    supplier_name: string;
    last_purchase_date: string | null;
  }>();

  (data || []).forEach((item: any) => {
    const productId = item.product_id;
    if (!productId) return;

    const invoiceDate = item.purchase_invoices?.created_at || null;
    const supplierName = item.purchase_invoices?.suppliers?.name || 'غير محدد';

    const existing = productMap.get(productId);

    if (existing) {
      existing.total_quantity += (item.quantity || 0);
      existing.total_unit_price += (parseFloat(String(item.unit_price)) || 0);
      existing.price_count += 1;
      existing.total_amount += (parseFloat(String(item.total_amount)) || 0);

      // Track most recent supplier and date
      if (invoiceDate && (!existing.last_purchase_date || invoiceDate > existing.last_purchase_date)) {
        existing.last_purchase_date = invoiceDate;
        existing.supplier_name = supplierName;
      }
    } else {
      productMap.set(productId, {
        product_name: item.products?.name || 'منتج غير معروف',
        category_name: item.products?.categories?.name || 'غير مصنف',
        total_quantity: item.quantity || 0,
        total_unit_price: parseFloat(String(item.unit_price)) || 0,
        price_count: 1,
        total_amount: parseFloat(String(item.total_amount)) || 0,
        supplier_name: supplierName,
        last_purchase_date: invoiceDate,
      });
    }
  });

  return Array.from(productMap.values())
    .map(item => ({
      product_name: item.product_name,
      category_name: item.category_name,
      total_quantity: item.total_quantity,
      avg_unit_price: item.price_count > 0 ? item.total_unit_price / item.price_count : 0,
      total_amount: item.total_amount,
      supplier_name: item.supplier_name,
      last_purchase_date: item.last_purchase_date,
    }))
    .sort((a, b) => b.total_amount - a.total_amount);
}

// ============================
// Purchase Supplier Report
// تقرير موردي المشتريات
// ============================

export async function fetchPurchaseSupplierReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter } = params;
  const dateRange = getDateRangeForFilter(dateFilter);

  let query = supabase
    .from('purchase_invoices')
    .select(`
      id,
      supplier_id,
      total_amount,
      discount_amount,
      net_amount,
      created_at,
      suppliers(name, phone)
    `);

  // Apply date filter on created_at
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by supplier_id
  const supplierMap = new Map<string, {
    supplier_name: string;
    phone: string;
    invoice_count: number;
    total_amount: number;
    discount_amount: number;
    net_amount: number;
    last_invoice_date: string | null;
  }>();

  (data || []).forEach((invoice: any) => {
    const supplierId = invoice.supplier_id;
    if (!supplierId) return;

    const existing = supplierMap.get(supplierId);
    const invoiceTotal = parseFloat(String(invoice.total_amount)) || 0;
    const invoiceDiscount = parseFloat(String(invoice.discount_amount)) || 0;
    const invoiceNet = parseFloat(String(invoice.net_amount)) || 0;
    const invoiceDate = invoice.created_at || null;

    if (existing) {
      existing.invoice_count += 1;
      existing.total_amount += invoiceTotal;
      existing.discount_amount += invoiceDiscount;
      existing.net_amount += invoiceNet;

      if (invoiceDate && (!existing.last_invoice_date || invoiceDate > existing.last_invoice_date)) {
        existing.last_invoice_date = invoiceDate;
      }
    } else {
      supplierMap.set(supplierId, {
        supplier_name: invoice.suppliers?.name || 'مورد غير معروف',
        phone: invoice.suppliers?.phone || '',
        invoice_count: 1,
        total_amount: invoiceTotal,
        discount_amount: invoiceDiscount,
        net_amount: invoiceNet,
        last_invoice_date: invoiceDate,
      });
    }
  });

  return Array.from(supplierMap.values())
    .sort((a, b) => b.total_amount - a.total_amount);
}

// ============================
// Purchase Invoices Report
// تقرير فواتير المشتريات
// ============================

export async function fetchPurchaseInvoicesReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter } = params;
  const dateRange = getDateRangeForFilter(dateFilter);

  let query = supabase
    .from('purchase_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      invoice_type,
      total_amount,
      discount_amount,
      tax_amount,
      net_amount,
      payment_status,
      created_at,
      suppliers(name)
    `);

  // Apply date filter on created_at
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  // Sort by created_at DESC (flat list, no grouping)
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((invoice: any) => ({
    invoice_number: invoice.invoice_number || '-',
    invoice_date: invoice.invoice_date || invoice.created_at,
    supplier_name: invoice.suppliers?.name || 'غير محدد',
    total_amount: parseFloat(String(invoice.total_amount)) || 0,
    discount_amount: parseFloat(String(invoice.discount_amount)) || 0,
    tax_amount: parseFloat(String(invoice.tax_amount)) || 0,
    net_amount: parseFloat(String(invoice.net_amount)) || 0,
    invoice_type: invoice.invoice_type || '-',
    payment_status: invoice.payment_status || '-',
  }));
}
