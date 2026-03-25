// Inventory Fetchers - Data fetching for inventory reports
// دوال جلب بيانات تقارير المخزون

import { supabase } from '@/app/lib/supabase/client';
import { ReportFetchParams } from './baseFetcher';

// ============================
// Low Stock Report
// تقرير المنتجات تحت الحد الأدنى
// ============================

export async function fetchLowStockReport(params: ReportFetchParams): Promise<any[]> {
  // No date filter needed

  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, cost_price, price, category_id, categories(name)')
    .eq('is_active', true)
    .gt('min_stock', 0);

  if (error) throw error;

  // Filter client-side: only where stock < min_stock
  return (data || [])
    .filter((product: any) => {
      const stock = parseFloat(String(product.stock)) || 0;
      const minStock = parseFloat(String(product.min_stock)) || 0;
      return stock < minStock;
    })
    .map((product: any) => {
      const currentStock = parseFloat(String(product.stock)) || 0;
      const minStock = parseFloat(String(product.min_stock)) || 0;
      return {
        product_name: product.name || 'منتج غير معروف',
        category_name: product.categories?.name || 'غير مصنف',
        current_stock: currentStock,
        min_stock: minStock,
        deficit: minStock - currentStock,
        cost_price: parseFloat(String(product.cost_price)) || 0,
        sale_price: parseFloat(String(product.price)) || 0,
      };
    })
    .sort((a, b) => b.deficit - a.deficit);
}

// ============================
// Inventory Valuation Report
// تقرير جرد المنتجات
// ============================

export async function fetchInventoryValuationReport(params: ReportFetchParams): Promise<any[]> {
  // No date filter needed

  const { data, error } = await supabase
    .from('products')
    .select('id, name, barcode, stock, cost_price, price, category_id, categories(name)')
    .eq('is_active', true)
    .gt('stock', 0);

  if (error) throw error;

  return (data || [])
    .map((product: any) => {
      const currentStock = parseFloat(String(product.stock)) || 0;
      const costPrice = parseFloat(String(product.cost_price)) || 0;
      const salePrice = parseFloat(String(product.price)) || 0;
      return {
        product_name: product.name || 'منتج غير معروف',
        category_name: product.categories?.name || 'غير مصنف',
        barcode: product.barcode || '',
        current_stock: currentStock,
        cost_price: costPrice,
        sale_price: salePrice,
        cost_value: currentStock * costPrice,
        retail_value: currentStock * salePrice,
      };
    })
    .sort((a, b) => b.cost_value - a.cost_value);
}
