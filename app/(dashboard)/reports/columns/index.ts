// Sales report columns
export {
  getProductsTableColumns,
  getCategoriesTableColumns,
  getCustomersTableColumns,
  getUsersTableColumns
} from './salesColumns';

// Invoice report columns
export {
  getCustomerInvoicesTableColumns,
  getDailySalesTableColumns,
  getHourlySalesTableColumns
} from './invoiceColumns';

// Profit report columns
export {
  getProfitMarginTableColumns
} from './profitColumns';

// Payment report columns
export {
  getPaymentMethodsTableColumns,
  getReturnsTableColumns
} from './paymentColumns';

// Purchase report columns
export {
  getPurchaseItemsTableColumns,
  getPurchaseSupplierTableColumns,
  getPurchaseInvoicesTableColumns
} from './purchaseColumns';

// Financial report columns
export {
  getCustomerBalancesTableColumns,
  getSupplierBalancesTableColumns,
  getCashDrawerTableColumns,
  getCustomerPaymentsTableColumns
} from './financialColumns';

// Inventory report columns
export {
  getLowStockTableColumns,
  getInventoryValuationTableColumns
} from './inventoryColumns';
