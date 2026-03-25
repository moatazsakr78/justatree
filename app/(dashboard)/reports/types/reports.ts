// TypeScript interfaces for Reports module

export interface DateFilter {
  type: 'all' | 'today' | 'current_week' | 'last_week' | 'current_month' | 'last_month' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface KPIData {
  totalSales: number;
  totalProfit: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  invoiceCount: number;
  invoiceTotal: number;
  returnCount: number;
  returnTotal: number;
  paymentBreakdown: { method: string; amount: number }[];
  previousPeriod: {
    totalSales: number;
    totalProfit: number;
    orderCount: number;
    customerCount: number;
    avgOrderValue: number;
    invoiceCount: number;
    invoiceTotal: number;
    returnCount: number;
    returnTotal: number;
  };
}

export interface SalesTrendPoint {
  date: string;
  displayDate: string;
  sales: number;
  profit: number;
  orderCount: number;
}

export interface TopProductData {
  id: string;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
}

export interface TopCustomerData {
  id: string;
  customerName: string;
  phone: string;
  invoiceCount: number;
  totalSpent: number;
  avgOrder: number;
  accountBalance: number;
}

export interface CategoryDistribution {
  id: string;
  categoryName: string;
  totalRevenue: number;
  percentage: number;
  invoiceCount: number;
  [key: string]: string | number;
}

export interface PaymentMethodData {
  method: string;
  methodAr: string;
  count: number;
  totalAmount: number;
  percentage: number;
  [key: string]: string | number;
}

export interface HourlySalesData {
  hour: number;
  hourLabel: string;
  saleCount: number;
  totalSales: number;
  avgSale: number;
  percentage: number;
}

export interface DayOfWeekData {
  dayOfWeek: number;
  dayName: string;
  saleCount: number;
  totalSales: number;
  avgSale: number;
  percentage: number;
}

export interface ReceivableData {
  id: string;
  customerName: string;
  phone: string;
  accountBalance: number;
  totalPurchases: number;
  totalPayments: number;
  lastTransactionDate: string | null;
}

export interface PayableData {
  id: string;
  supplierName: string;
  phone: string;
  accountBalance: number;
  totalPurchases: number;
  totalPayments: number;
  lastTransactionDate: string | null;
}

export interface ExpenseData {
  category: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface RevenueVsProfitData {
  date: string;
  displayDate: string;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface DashboardData {
  kpis: KPIData;
  salesTrend: SalesTrendPoint[];
  topProducts: TopProductData[];
  topCustomers: TopCustomerData[];
  categoryDistribution: CategoryDistribution[];
  paymentMethods: PaymentMethodData[];
  hourlySales: HourlySalesData[];
  dayOfWeekSales: DayOfWeekData[];
}

export interface ReportConfig {
  id: string;
  title: string;
  titleAr: string;
  category: 'sales' | 'purchases' | 'financial' | 'inventory';
  hasChart: boolean;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
}

// Sale Type Breakdown (ground vs online)
export interface SaleTypeBreakdownData {
  ground: {
    invoiceCount: number; invoiceTotal: number;
    returnCount: number; returnTotal: number;
    total: number; profit: number; percentage: number;
  };
  online: {
    invoiceCount: number; invoiceTotal: number;
    returnCount: number; returnTotal: number;
    total: number; profit: number; percentage: number;
    shippingTotal: number;
  };
}

export interface SaleTypeTrendPoint {
  date: string;
  displayDate: string;
  groundSales: number;
  onlineSales: number;
  groundCount: number;
  onlineCount: number;
}

// Helper type for chart data
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// ==================== Report-Specific Data Interfaces ====================

// Payment Methods Report
export interface PaymentMethodReportData {
  payment_method: string;
  payment_method_ar: string;
  invoice_count: number;
  total_amount: number;
  percentage: number;
  avg_invoice: number;
}

// Returns Report
export interface ReturnReportData {
  sale_id: string;
  invoice_number: string;
  created_at: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  cashier_name: string;
}

// Purchase Items Report
export interface PurchaseItemReportData {
  product_name: string;
  category_name: string;
  total_quantity: number;
  avg_unit_price: number;
  total_amount: number;
  supplier_name: string;
  last_purchase_date: string;
}

// Purchase Supplier Report
export interface PurchaseSupplierReportData {
  supplier_name: string;
  phone: string;
  invoice_count: number;
  total_amount: number;
  discount_amount: number;
  net_amount: number;
  last_invoice_date: string;
}

// Purchase Invoice Report
export interface PurchaseInvoiceReportData {
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_status: string;
  invoice_type: string;
}

// Customer Balance Report
export interface CustomerBalanceReportData {
  customer_name: string;
  phone: string;
  city: string;
  account_balance: number;
  credit_limit: number;
  payment_count: number;
  last_payment_date: string | null;
}

// Supplier Balance Report
export interface SupplierBalanceReportData {
  supplier_name: string;
  phone: string;
  account_balance: number;
  payment_count: number;
  last_payment_date: string | null;
}

// Cash Drawer Report
export interface CashDrawerReportData {
  created_at: string;
  transaction_type: string;
  transaction_type_ar: string;
  amount: number;
  balance_after: number;
  payment_method: string;
  notes: string;
  performed_by: string;
}

// Customer Payment Report
export interface CustomerPaymentReportData {
  created_at: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  notes: string;
}

// Low Stock Report
export interface LowStockReportData {
  product_name: string;
  category_name: string;
  current_stock: number;
  min_stock: number;
  deficit: number;
  cost_price: number;
  sale_price: number;
}

// Inventory Valuation Report
export interface InventoryValuationReportData {
  product_name: string;
  category_name: string;
  barcode: string;
  current_stock: number;
  cost_price: number;
  sale_price: number;
  cost_value: number;
  retail_value: number;
}
