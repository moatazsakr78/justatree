// Financial Fetchers - Data fetching for financial reports
// دوال جلب بيانات التقارير المالية

import { supabase } from '@/app/lib/supabase/client';
import { ReportFetchParams, getDateRangeForFilter } from './baseFetcher';
import { calculateCustomerBalanceWithLinked, calculateSupplierBalanceWithLinked } from '@/app/lib/services/partyLinkingService';

// Helper to run promises in batches
async function batchProcess<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ============================
// Customer Balances Report
// تقرير أرصدة العملاء
// ============================

export async function fetchCustomerBalancesReport(params: ReportFetchParams): Promise<any[]> {
  // No date filter needed - shows current state

  // Query 1: Get all active customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, phone, city, credit_limit')
    .eq('is_active', true);

  if (customersError) throw customersError;

  if (!customers || customers.length === 0) return [];

  // Query 2: Get all customer payments (aggregated for count + last date)
  const { data: payments, error: paymentsError } = await supabase
    .from('customer_payments')
    .select('id, customer_id, created_at');

  if (paymentsError) throw paymentsError;

  // Aggregate payments by customer_id
  const paymentsByCustomer = new Map<string, { count: number; lastDate: string | null }>();

  (payments || []).forEach((payment: any) => {
    const customerId = payment.customer_id;
    if (!customerId) return;

    const existing = paymentsByCustomer.get(customerId);
    const paymentDate = payment.created_at || null;

    if (existing) {
      existing.count += 1;
      if (paymentDate && (!existing.lastDate || paymentDate > existing.lastDate)) {
        existing.lastDate = paymentDate;
      }
    } else {
      paymentsByCustomer.set(customerId, { count: 1, lastDate: paymentDate });
    }
  });

  // Query 3: Calculate real balance for each customer using partyLinkingService
  const balances = await batchProcess(customers, 20, async (customer) => {
    const result = await calculateCustomerBalanceWithLinked(customer.id);
    return { id: customer.id, balance: result.balance };
  });

  const balanceMap = new Map(balances.map(b => [b.id, b.balance]));

  // Merge customers with payment data and calculated balances
  return customers
    .map(customer => {
      const paymentInfo = paymentsByCustomer.get(customer.id) || { count: 0, lastDate: null };
      return {
        customer_name: customer.name || 'غير محدد',
        phone: customer.phone || '',
        city: (customer as any).city || '',
        account_balance: balanceMap.get(customer.id) || 0,
        credit_limit: parseFloat(String((customer as any).credit_limit)) || 0,
        payment_count: paymentInfo.count,
        last_payment_date: paymentInfo.lastDate,
      };
    })
    .sort((a, b) => Math.abs(b.account_balance) - Math.abs(a.account_balance));
}

// ============================
// Supplier Balances Report
// تقرير أرصدة الموردين
// ============================

export async function fetchSupplierBalancesReport(params: ReportFetchParams): Promise<any[]> {
  // No date filter needed - shows current state

  // Query 1: Get all active suppliers
  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .select('id, name, phone')
    .eq('is_active', true);

  if (suppliersError) throw suppliersError;

  if (!suppliers || suppliers.length === 0) return [];

  // Query 2: Get all supplier payments (aggregated for count + last date)
  const { data: payments, error: paymentsError } = await supabase
    .from('supplier_payments')
    .select('id, supplier_id, created_at');

  if (paymentsError) throw paymentsError;

  // Aggregate payments by supplier_id
  const paymentsBySupplier = new Map<string, { count: number; lastDate: string | null }>();

  (payments || []).forEach((payment: any) => {
    const supplierId = payment.supplier_id;
    if (!supplierId) return;

    const existing = paymentsBySupplier.get(supplierId);
    const paymentDate = payment.created_at || null;

    if (existing) {
      existing.count += 1;
      if (paymentDate && (!existing.lastDate || paymentDate > existing.lastDate)) {
        existing.lastDate = paymentDate;
      }
    } else {
      paymentsBySupplier.set(supplierId, { count: 1, lastDate: paymentDate });
    }
  });

  // Query 3: Calculate real balance for each supplier using partyLinkingService
  const balances = await batchProcess(suppliers, 20, async (supplier) => {
    const result = await calculateSupplierBalanceWithLinked(supplier.id);
    return { id: supplier.id, balance: result.balance };
  });

  const balanceMap = new Map(balances.map(b => [b.id, b.balance]));

  // Merge suppliers with payment data and calculated balances
  return suppliers
    .map(supplier => {
      const paymentInfo = paymentsBySupplier.get(supplier.id) || { count: 0, lastDate: null };
      return {
        supplier_name: supplier.name || 'غير محدد',
        phone: supplier.phone || '',
        account_balance: balanceMap.get(supplier.id) || 0,
        payment_count: paymentInfo.count,
        last_payment_date: paymentInfo.lastDate,
      };
    })
    .sort((a, b) => Math.abs(b.account_balance) - Math.abs(a.account_balance));
}

// ============================
// Cash Drawer Report
// تقرير حركة الخزينة
// ============================

const TRANSACTION_TYPE_AR: Record<string, string> = {
  'sale': 'بيع',
  'return': 'مرتجع',
  'deposit': 'إيداع',
  'withdrawal': 'سحب',
  'transfer_in': 'تحويل وارد',
  'transfer_out': 'تحويل صادر',
  'expense': 'مصروف',
  'invoice_cancel': 'إلغاء فاتورة',
};

function getTransactionTypeAr(type: string): string {
  return TRANSACTION_TYPE_AR[type] || type;
}

export async function fetchCashDrawerReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter } = params;
  const dateRange = getDateRangeForFilter(dateFilter);

  let query = supabase
    .from('cash_drawer_transactions')
    .select('id, created_at, transaction_type, amount, balance_after, payment_method, notes, performed_by');

  // Apply date filter on created_at
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  // Sort by created_at DESC
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((txn: any) => ({
    created_at: txn.created_at,
    transaction_type: txn.transaction_type || '',
    transaction_type_ar: getTransactionTypeAr(txn.transaction_type || ''),
    amount: parseFloat(String(txn.amount)) || 0,
    balance_after: parseFloat(String(txn.balance_after)) || 0,
    payment_method: txn.payment_method || '',
    notes: txn.notes || '',
    performed_by: txn.performed_by || '',
  }));
}

// ============================
// Customer Payments Report
// تقرير مدفوعات العملاء
// ============================

export async function fetchCustomerPaymentsReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter } = params;
  const dateRange = getDateRangeForFilter(dateFilter);

  let query = supabase
    .from('customer_payments')
    .select(`
      id,
      created_at,
      customer_id,
      amount,
      payment_method,
      reference_number,
      notes,
      customers(name)
    `);

  // Apply date filter on created_at
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  // Sort by created_at DESC
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((payment: any) => ({
    created_at: payment.created_at,
    customer_name: payment.customers?.name || 'غير محدد',
    amount: parseFloat(String(payment.amount)) || 0,
    payment_method: payment.payment_method || '',
    reference_number: payment.reference_number || '',
    notes: payment.notes || '',
  }));
}
