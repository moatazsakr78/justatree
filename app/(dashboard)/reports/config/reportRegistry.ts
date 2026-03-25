// Report Registry - Single source of truth for all report definitions

export interface ReportDefinition {
  id: string;
  titleAr: string;
  category: 'sales' | 'purchases' | 'financial' | 'inventory';
  reportType: string;
  searchField?: string;
  searchPlaceholder?: string;
  supportsDateFilter: boolean;
  supportsSimpleFilter: boolean;
  supportsMultiFilter: boolean;
}

export const REPORT_CATEGORIES = [
  { id: 'sales', titleAr: 'المبيعات', icon: 'ChartBarIcon', color: 'blue' },
  { id: 'purchases', titleAr: 'المشتريات', icon: 'ShoppingCartIcon', color: 'green' },
  { id: 'financial', titleAr: 'المالية', icon: 'CurrencyDollarIcon', color: 'purple' },
  { id: 'inventory', titleAr: 'المخزون', icon: 'ArchiveBoxIcon', color: 'orange' },
] as const;

export const REPORT_REGISTRY: ReportDefinition[] = [
  // ==================== المبيعات (sales) ====================
  {
    id: 'products',
    titleAr: 'الأصناف',
    category: 'sales',
    reportType: 'PRODUCTS_REPORT',
    searchField: 'product_name',
    searchPlaceholder: 'بحث باسم المنتج...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'categories',
    titleAr: 'التصنيفات الرئيسية',
    category: 'sales',
    reportType: 'CATEGORIES_REPORT',
    searchField: 'category_name',
    searchPlaceholder: 'بحث باسم التصنيف...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'customers',
    titleAr: 'العملاء',
    category: 'sales',
    reportType: 'CUSTOMERS_REPORT',
    searchField: 'customer_name',
    searchPlaceholder: 'بحث باسم العميل...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'users',
    titleAr: 'المستخدمين',
    category: 'sales',
    reportType: 'USERS_REPORT',
    searchField: 'user_name',
    searchPlaceholder: 'بحث باسم المستخدم...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'customer_invoices',
    titleAr: 'فواتير العملاء',
    category: 'sales',
    reportType: 'CUSTOMER_INVOICES_REPORT',
    searchField: 'customer_name',
    searchPlaceholder: 'بحث باسم العميل...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'daily_sales',
    titleAr: 'المبيعات اليومية',
    category: 'sales',
    reportType: 'DAILY_SALES_REPORT',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'hourly_sales',
    titleAr: 'المبيعات بالساعة',
    category: 'sales',
    reportType: 'HOURLY_SALES_REPORT',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'profit_margin',
    titleAr: 'هامش الربح',
    category: 'sales',
    reportType: 'PROFIT_MARGIN_REPORT',
    searchField: 'product_name',
    searchPlaceholder: 'بحث باسم المنتج...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'payment_methods',
    titleAr: 'طرق الدفع',
    category: 'sales',
    reportType: 'PAYMENT_METHODS_REPORT',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },
  {
    id: 'returns',
    titleAr: 'المرتجعات',
    category: 'sales',
    reportType: 'RETURNS_REPORT',
    searchField: 'product_name',
    searchPlaceholder: 'بحث باسم المنتج...',
    supportsDateFilter: true,
    supportsSimpleFilter: true,
    supportsMultiFilter: true,
  },

  // ==================== المشتريات (purchases) ====================
  {
    id: 'purchase_items',
    titleAr: 'أصناف المشتريات',
    category: 'purchases',
    reportType: 'PURCHASE_ITEMS_REPORT',
    searchField: 'product_name',
    searchPlaceholder: 'بحث باسم المنتج...',
    supportsDateFilter: true,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
  {
    id: 'purchase_suppliers',
    titleAr: 'الموردين',
    category: 'purchases',
    reportType: 'PURCHASE_SUPPLIERS_REPORT',
    searchField: 'supplier_name',
    searchPlaceholder: 'بحث باسم المورد...',
    supportsDateFilter: true,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
  {
    id: 'purchase_invoices',
    titleAr: 'فواتير المشتريات',
    category: 'purchases',
    reportType: 'PURCHASE_INVOICES_REPORT',
    searchField: 'supplier_name',
    searchPlaceholder: 'بحث باسم المورد...',
    supportsDateFilter: true,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },

  // ==================== المالية (financial) ====================
  {
    id: 'customer_balances',
    titleAr: 'أرصدة العملاء',
    category: 'financial',
    reportType: 'CUSTOMER_BALANCES_REPORT',
    searchField: 'customer_name',
    searchPlaceholder: 'بحث باسم العميل...',
    supportsDateFilter: false,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
  {
    id: 'supplier_balances',
    titleAr: 'أرصدة الموردين',
    category: 'financial',
    reportType: 'SUPPLIER_BALANCES_REPORT',
    searchField: 'supplier_name',
    searchPlaceholder: 'بحث باسم المورد...',
    supportsDateFilter: false,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
  {
    id: 'cash_drawer',
    titleAr: 'حركة الخزينة',
    category: 'financial',
    reportType: 'CASH_DRAWER_REPORT',
    supportsDateFilter: true,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
  {
    id: 'customer_payments',
    titleAr: 'مدفوعات العملاء',
    category: 'financial',
    reportType: 'CUSTOMER_PAYMENTS_REPORT',
    searchField: 'customer_name',
    searchPlaceholder: 'بحث باسم العميل...',
    supportsDateFilter: true,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },

  // ==================== المخزون (inventory) ====================
  {
    id: 'low_stock',
    titleAr: 'المنتجات تحت الحد الأدنى',
    category: 'inventory',
    reportType: 'LOW_STOCK_REPORT',
    searchField: 'product_name',
    searchPlaceholder: 'بحث باسم المنتج...',
    supportsDateFilter: false,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
  {
    id: 'inventory_valuation',
    titleAr: 'جرد المنتجات',
    category: 'inventory',
    reportType: 'INVENTORY_VALUATION_REPORT',
    searchField: 'product_name',
    searchPlaceholder: 'بحث باسم المنتج...',
    supportsDateFilter: false,
    supportsSimpleFilter: false,
    supportsMultiFilter: false,
  },
];

// ==================== Helper Functions ====================

export function getReportById(id: string): ReportDefinition | undefined {
  return REPORT_REGISTRY.find((report) => report.id === id);
}

export function getReportsByCategory(category: string): ReportDefinition[] {
  return REPORT_REGISTRY.filter((report) => report.category === category);
}
