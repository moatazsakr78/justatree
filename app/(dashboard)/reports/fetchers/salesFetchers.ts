// Sales Report Fetchers
// دوال جلب بيانات تقارير المبيعات

import { supabase } from '@/app/lib/supabase/client';
import { DateFilter } from '@/app/components/SimpleDateFilterModal';
import {
  ReportFetchParams,
  getDateRangeForFilter,
  applyClientSalesFilters,
  applyItemFilters,
  SimpleFiltersResult,
  MultiFiltersResult,
  ActiveFilterType
} from './baseFetcher';
import { toEgyptDateString, toEgyptHour, toEgyptDayOfWeek } from '@/app/lib/utils/date-utils';
import { getArabicDayName, formatHourRange, getPaymentMethodAr } from '../utils/chartConfig';

// ============================
// 1. Products Report
// ============================

export async function fetchProductsReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let salesQuery = supabase
    .from('sale_items')
    .select(`
      product_id,
      quantity,
      unit_price,
      products(
        id,
        name,
        price,
        wholesale_price,
        price1,
        price2,
        price3,
        price4,
        category_id,
        categories(name)
      ),
      sales!inner(
        branch_id,
        created_at,
        cashier_id,
        customer_id,
        record_id,
        branches(name)
      )
    `);

  // Apply date filter on sales.created_at via query
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('sales.created_at', dateRange.startDate)
      .lte('sales.created_at', dateRange.endDate);
  }

  // Apply product filter on query level
  if (activeFilterType === 'simple' && simpleFilters.productId) {
    salesQuery = salesQuery.eq('product_id', simpleFilters.productId);
  } else if (activeFilterType === 'multi' && multiFilters.productIds.length > 0) {
    salesQuery = salesQuery.in('product_id', multiFilters.productIds);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales data:', salesError);
    throw new Error(`خطأ في جلب البيانات: ${salesError.message}`);
  }

  // Apply client-side filters: category, user, customer, location, safe
  let filteredData = applyItemFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType
  );

  filteredData = applyClientSalesFilters(
    filteredData,
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'sales.cashier_id',
      customerIdField: 'sales.customer_id',
      branchIdField: 'sales.branch_id',
      recordIdField: 'sales.record_id',
    }
  );

  // Aggregate by product_id
  const productMap = new Map();

  filteredData.forEach((saleItem: any) => {
    const productId = saleItem.product_id;
    const product = saleItem.products;
    const branch = saleItem.sales?.branches;
    const quantity = saleItem.quantity || 0;
    const unitPrice = parseFloat(saleItem.unit_price) || 0;
    const totalAmount = quantity * unitPrice;

    if (productMap.has(productId)) {
      const existing = productMap.get(productId);
      existing.total_quantity_sold += quantity;
      existing.total_sales_amount += totalAmount;

      // Track quantities by actual selling price
      if (!existing.priceBreakdown) {
        existing.priceBreakdown = new Map();
      }
      const currentQty = existing.priceBreakdown.get(unitPrice) || 0;
      existing.priceBreakdown.set(unitPrice, currentQty + quantity);
    } else {
      const priceBreakdown = new Map();
      priceBreakdown.set(unitPrice, quantity);

      productMap.set(productId, {
        product_id: productId,
        product_name: product?.name || 'منتج غير محدد',
        category_name: product?.categories?.name || 'غير محدد',
        branch_name: branch?.name || 'غير محدد',
        total_quantity_sold: quantity,
        total_sales_amount: totalAmount,
        current_sale_price: product?.price || '0.00',
        wholesale_price: product?.wholesale_price || '0.00',
        price1: product?.price1 || '0.00',
        price2: product?.price2 || '0.00',
        price3: product?.price3 || '0.00',
        price4: product?.price4 || '0.00',
        priceBreakdown: priceBreakdown,
      });
    }
  });

  // Sort by total_quantity_sold DESC
  return Array.from(productMap.values()).sort(
    (a, b) => b.total_quantity_sold - a.total_quantity_sold
  );
}

// ============================
// 2. Categories Report
// ============================

export async function fetchCategoriesReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let salesQuery = supabase
    .from('sale_items')
    .select(`
      product_id,
      quantity,
      unit_price,
      products(
        id,
        name,
        price,
        category_id,
        categories(
          id,
          name
        )
      ),
      sales!inner(
        branch_id,
        created_at,
        cashier_id,
        customer_id,
        record_id,
        branches(name)
      )
    `);

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('sales.created_at', dateRange.startDate)
      .lte('sales.created_at', dateRange.endDate);
  }

  // Apply product filter on query level
  if (activeFilterType === 'simple' && simpleFilters.productId) {
    salesQuery = salesQuery.eq('product_id', simpleFilters.productId);
  } else if (activeFilterType === 'multi' && multiFilters.productIds.length > 0) {
    salesQuery = salesQuery.in('product_id', multiFilters.productIds);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales data:', salesError);
    throw new Error(`خطأ في جلب البيانات: ${salesError.message}`);
  }

  // Apply client-side filters: category, user, customer, location, safe
  let filteredData = applyItemFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType
  );

  filteredData = applyClientSalesFilters(
    filteredData,
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'sales.cashier_id',
      customerIdField: 'sales.customer_id',
      branchIdField: 'sales.branch_id',
      recordIdField: 'sales.record_id',
    }
  );

  // Aggregate by category
  const categoryMap = new Map();

  filteredData.forEach((saleItem: any) => {
    const product = saleItem.products;
    const category = product?.categories;
    const branch = saleItem.sales?.branches;
    const quantity = saleItem.quantity || 0;
    const unitPrice = parseFloat(saleItem.unit_price) || 0;
    const totalAmount = quantity * unitPrice;

    const categoryId = category?.id || 'uncategorized';
    const categoryName = category?.name || 'غير محدد';

    if (categoryMap.has(categoryId)) {
      const existing = categoryMap.get(categoryId);
      existing.total_quantity_sold += quantity;
      existing.total_sales_amount += totalAmount;
      existing.products_count = existing.products_count || new Set();
      existing.products_count.add(product?.id);
      existing.prices = existing.prices || [];
      existing.prices.push(unitPrice);
    } else {
      const productsSet = new Set();
      productsSet.add(product?.id);

      categoryMap.set(categoryId, {
        category_id: categoryId,
        category_name: categoryName,
        branch_name: branch?.name || 'غير محدد',
        total_quantity_sold: quantity,
        total_sales_amount: totalAmount,
        products_count: productsSet,
        prices: [unitPrice],
      });
    }
  });

  // Convert Sets to counts, calculate avg_price, sort
  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      products_count: category.products_count.size,
      avg_price:
        category.prices.length > 0
          ? category.prices.reduce((sum: number, price: number) => sum + price, 0) /
            category.prices.length
          : 0,
    }))
    .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);
}

// ============================
// 3. Customers Report
// ============================

export async function fetchCustomersReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  // Get customers with their group information
  let customersQuery = supabase
    .from('customers')
    .select(`
      id,
      name,
      phone,
      backup_phone,
      city,
      category,
      rank,
      created_at,
      group_id,
      customer_groups(name)
    `)
    .eq('is_active', true);

  // Apply customer filter on query
  if (activeFilterType === 'simple' && simpleFilters.customerId) {
    customersQuery = customersQuery.eq('id', simpleFilters.customerId);
  } else if (activeFilterType === 'multi' && multiFilters.customerIds.length > 0) {
    customersQuery = customersQuery.in('id', multiFilters.customerIds);
  }

  // Apply customer group filter on query
  if (activeFilterType === 'simple' && simpleFilters.customerGroupId) {
    customersQuery = customersQuery.eq('group_id', simpleFilters.customerGroupId);
  } else if (activeFilterType === 'multi' && multiFilters.customerGroupIds.length > 0) {
    customersQuery = customersQuery.in('group_id', multiFilters.customerGroupIds);
  }

  const { data: customersData, error: customersError } = await customersQuery;

  if (customersError) {
    console.error('Error fetching customers:', customersError);
    throw new Error(`خطأ في جلب بيانات العملاء: ${customersError.message}`);
  }

  // Get sales data with detailed items for accurate profit calculation
  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      customer_id,
      total_amount,
      created_at,
      cashier_id,
      branch_id,
      record_id,
      sale_items(
        id,
        quantity,
        unit_price,
        cost_price,
        product_id,
        products(category_id)
      )
    `)
    .neq('status', 'cancelled');

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales data:', salesError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
  }

  // Apply client-side filters on sales: user, location, safe
  const filteredSalesData = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'cashier_id',
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // Initialize all customers with zero values
  const customerMap = new Map();

  customersData?.forEach((customer: any) => {
    customerMap.set(customer.id, {
      customer_id: customer.id,
      customer_name: customer.name,
      phone: customer.phone,
      backup_phone: customer.backup_phone,
      city: customer.city,
      category: customer.category,
      rank: customer.rank,
      created_at: customer.created_at,
      invoice_count: 0,
      total_amount: 0,
      total_profit: 0,
    });
  });

  // Calculate sales statistics for each customer
  filteredSalesData.forEach((sale: any) => {
    if (!sale.customer_id || !customerMap.has(sale.customer_id)) return;

    const customerStats = customerMap.get(sale.customer_id);

    // Filter sale_items by product and category
    const filteredItems = applyItemFilters(
      sale.sale_items || [],
      simpleFilters,
      multiFilters,
      activeFilterType
    );

    if (filteredItems.length === 0) return;

    customerStats.invoice_count += 1;

    // Calculate total amount and profit from filtered items
    let saleTotal = 0;
    filteredItems.forEach((item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const costPrice = parseFloat(item.cost_price) || 0;

      saleTotal += unitPrice * quantity;
      const itemProfit = (unitPrice - costPrice) * quantity;
      customerStats.total_profit += itemProfit;
    });

    customerStats.total_amount += saleTotal;
  });

  // Sort by total_amount DESC
  return Array.from(customerMap.values()).sort(
    (a, b) => b.total_amount - a.total_amount
  );
}

// ============================
// 4. Users Report
// ============================

export async function fetchUsersReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  // Get derived roles from wholesale to exclude them too
  const { data: derivedRoles } = await supabase
    .from('user_roles')
    .select('name')
    .eq('parent_role', 'جملة')
    .eq('is_active', true);

  // Create list of roles to exclude: customers, wholesale, and any derived wholesale roles
  const rolesToExclude = ['عميل', 'جملة'];
  if (derivedRoles && derivedRoles.length > 0) {
    rolesToExclude.push(...derivedRoles.map((role: any) => role.name));
  }

  // Get users data (exclude customers, wholesale customers and their derived roles)
  const { data: usersData, error: usersError } = await supabase
    .from('user_profiles')
    .select(`
      id,
      full_name,
      phone,
      role,
      created_at,
      email,
      is_active
    `)
    .eq('is_active', true)
    .not('role', 'in', `(${rolesToExclude.map((role) => `"${role}"`).join(',')})`);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw new Error(`خطأ في جلب بيانات المستخدمين: ${usersError.message}`);
  }

  // Get sales data with detailed items for accurate profit calculation
  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      cashier_id,
      total_amount,
      created_at,
      branch_id,
      record_id,
      sale_items(
        id,
        quantity,
        unit_price,
        cost_price
      )
    `)
    .neq('status', 'cancelled');

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales data:', salesError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
  }

  // Apply client-side filters: location, safe
  const filteredSalesData = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // Initialize all users with zero values
  const userMap = new Map();

  usersData?.forEach((user: any) => {
    userMap.set(user.id, {
      user_id: user.id,
      user_name: user.full_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      total_invoices: 0,
      total_amount: 0,
      total_profit: 0,
      first_sale: null,
      last_sale: null,
    });
  });

  // Process sales data and calculate profits for each user
  filteredSalesData.forEach((sale: any) => {
    if (!sale.cashier_id) return;

    const user = userMap.get(sale.cashier_id);
    if (user) {
      user.total_invoices += 1;
      user.total_amount += parseFloat(sale.total_amount) || 0;

      // Calculate profit from sale items
      let saleProfit = 0;
      sale.sale_items?.forEach((item: any) => {
        const itemProfit =
          (parseFloat(item.unit_price) - parseFloat(item.cost_price)) *
          parseInt(item.quantity);
        saleProfit += itemProfit;
      });
      user.total_profit += saleProfit;

      // Track first and last sale dates
      const saleDate = new Date(sale.created_at);
      if (!user.first_sale || saleDate < new Date(user.first_sale)) {
        user.first_sale = sale.created_at;
      }
      if (!user.last_sale || saleDate > new Date(user.last_sale)) {
        user.last_sale = sale.created_at;
      }
    }
  });

  // Sort by total_amount DESC
  return Array.from(userMap.values()).sort(
    (a, b) => b.total_amount - a.total_amount
  );
}

// ============================
// 5. Customer Invoices Report
// ============================

export async function fetchCustomerInvoicesReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  // Get customers data with account balance
  let customersQuery = supabase
    .from('customers')
    .select('id, name, account_balance, group_id')
    .eq('is_active', true);

  // Apply customer filter
  if (activeFilterType === 'simple' && simpleFilters.customerId) {
    customersQuery = customersQuery.eq('id', simpleFilters.customerId);
  } else if (activeFilterType === 'multi' && multiFilters.customerIds.length > 0) {
    customersQuery = customersQuery.in('id', multiFilters.customerIds);
  }

  // Apply customer group filter
  if (activeFilterType === 'simple' && simpleFilters.customerGroupId) {
    customersQuery = customersQuery.eq('group_id', simpleFilters.customerGroupId);
  } else if (activeFilterType === 'multi' && multiFilters.customerGroupIds.length > 0) {
    customersQuery = customersQuery.in('group_id', multiFilters.customerGroupIds);
  }

  const { data: customersData, error: customersError } = await customersQuery;

  if (customersError) {
    console.error('Error fetching customers:', customersError);
    throw new Error(`خطأ في جلب بيانات العملاء: ${customersError.message}`);
  }

  // Get sales data with items
  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      customer_id,
      total_amount,
      created_at,
      cashier_id,
      branch_id,
      record_id,
      sale_items(quantity, product_id, products(category_id))
    `)
    .neq('status', 'cancelled')
    .not('customer_id', 'is', null);

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
  }

  // Apply client-side filters: user, location, safe
  let filteredSalesData: any[] = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'cashier_id',
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // Filter by product (check if any sale_item matches)
  if (activeFilterType === 'simple' && simpleFilters.productId) {
    filteredSalesData = filteredSalesData.filter((sale: any) =>
      sale.sale_items?.some((item: any) => item.product_id === simpleFilters.productId)
    );
  } else if (activeFilterType === 'multi' && multiFilters.productIds.length > 0) {
    filteredSalesData = filteredSalesData.filter((sale: any) =>
      sale.sale_items?.some((item: any) => multiFilters.productIds.includes(item.product_id))
    );
  }

  // Filter by category (check if any sale_item matches)
  if (activeFilterType === 'simple' && simpleFilters.categoryId) {
    filteredSalesData = filteredSalesData.filter((sale: any) =>
      sale.sale_items?.some(
        (item: any) => item.products?.category_id === simpleFilters.categoryId
      )
    );
  } else if (activeFilterType === 'multi' && multiFilters.categoryIds.length > 0) {
    filteredSalesData = filteredSalesData.filter((sale: any) =>
      sale.sale_items?.some((item: any) =>
        multiFilters.categoryIds.includes(item.products?.category_id)
      )
    );
  }

  // Process data
  const customerMap = new Map();

  customersData?.forEach((customer: any) => {
    customerMap.set(customer.id, {
      customer_id: customer.id,
      customer_name: customer.name,
      balance: customer.account_balance || 0,
      invoice_count: 0,
      total_amount: 0,
      total_items_quantity: 0,
      transaction_dates: [] as string[],
      last_transaction_date: null as string | null,
      avg_transaction_frequency: 0,
    });
  });

  filteredSalesData.forEach((sale: any) => {
    if (!sale.customer_id || !customerMap.has(sale.customer_id)) return;

    const customerStats = customerMap.get(sale.customer_id);
    customerStats.invoice_count += 1;
    customerStats.total_amount += parseFloat(sale.total_amount) || 0;
    customerStats.transaction_dates.push(sale.created_at);

    // Calculate total items quantity
    if (sale.sale_items) {
      sale.sale_items.forEach((item: any) => {
        customerStats.total_items_quantity += item.quantity || 0;
      });
    }
  });

  // Calculate transaction frequency and last date
  customerMap.forEach((stats: any) => {
    if (stats.transaction_dates.length > 0) {
      stats.transaction_dates.sort(
        (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime()
      );
      stats.last_transaction_date = stats.transaction_dates[0];

      if (stats.transaction_dates.length > 1) {
        const dates = stats.transaction_dates.map((d: string) => new Date(d).getTime());
        let totalDays = 0;
        for (let i = 0; i < dates.length - 1; i++) {
          totalDays += (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24);
        }
        stats.avg_transaction_frequency = Math.round(totalDays / (dates.length - 1));
      }
    }
    delete stats.transaction_dates;
  });

  // Filter only customers with invoices and sort by total_amount DESC
  return Array.from(customerMap.values())
    .filter((c: any) => c.invoice_count > 0)
    .sort((a: any, b: any) => b.total_amount - a.total_amount);
}

// ============================
// 6. Daily Sales Report
// ============================

export async function fetchDailySalesReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      total_amount,
      created_at,
      cashier_id,
      customer_id,
      branch_id,
      record_id,
      sale_items(product_id, products(category_id))
    `)
    .neq('status', 'cancelled');

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  } else {
    // Default to last 30 days when no filter (type='all')
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    salesQuery = salesQuery.gte('created_at', thirtyDaysAgo.toISOString());
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
  }

  // Apply client-side filters: user, customer, location, safe
  let filteredData: any[] = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'cashier_id',
      customerIdField: 'customer_id',
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // Filter by product (check if any sale_item matches)
  if (activeFilterType === 'simple' && simpleFilters.productId) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some((item: any) => item.product_id === simpleFilters.productId)
    );
  } else if (activeFilterType === 'multi' && multiFilters.productIds.length > 0) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some((item: any) => multiFilters.productIds.includes(item.product_id))
    );
  }

  // Filter by category (check if any sale_item matches)
  if (activeFilterType === 'simple' && simpleFilters.categoryId) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some(
        (item: any) => item.products?.category_id === simpleFilters.categoryId
      )
    );
  } else if (activeFilterType === 'multi' && multiFilters.categoryIds.length > 0) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some((item: any) =>
        multiFilters.categoryIds.includes(item.products?.category_id)
      )
    );
  }

  // Group by date (using Egypt timezone)
  const dailyMap = new Map();

  filteredData.forEach((sale: any) => {
    const date = new Date(sale.created_at);
    const dateKey = toEgyptDateString(date);
    const dayOfWeek = toEgyptDayOfWeek(date);

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        sale_date: dateKey,
        day_name: getArabicDayName(dayOfWeek),
        invoice_count: 0,
        total_sales: 0,
      });
    }

    const dayStats = dailyMap.get(dateKey);
    dayStats.invoice_count += 1;
    dayStats.total_sales += parseFloat(sale.total_amount) || 0;
  });

  // Calculate average and sort by date DESC
  return Array.from(dailyMap.values())
    .map((day: any) => ({
      ...day,
      avg_sale: day.invoice_count > 0 ? day.total_sales / day.invoice_count : 0,
    }))
    .sort(
      (a: any, b: any) =>
        new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
}

// ============================
// 7. Hourly Sales Report
// ============================

export async function fetchHourlySalesReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      total_amount,
      created_at,
      cashier_id,
      customer_id,
      branch_id,
      record_id,
      sale_items(product_id, products(category_id))
    `)
    .neq('status', 'cancelled');

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  } else {
    // Default to today when no filter (type='all')
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    salesQuery = salesQuery.gte('created_at', todayStart.toISOString());
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
  }

  // Apply client-side filters: user, customer, location, safe
  let filteredData: any[] = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'cashier_id',
      customerIdField: 'customer_id',
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // Filter by product (check if any sale_item matches)
  if (activeFilterType === 'simple' && simpleFilters.productId) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some((item: any) => item.product_id === simpleFilters.productId)
    );
  } else if (activeFilterType === 'multi' && multiFilters.productIds.length > 0) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some((item: any) => multiFilters.productIds.includes(item.product_id))
    );
  }

  // Filter by category (check if any sale_item matches)
  if (activeFilterType === 'simple' && simpleFilters.categoryId) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some(
        (item: any) => item.products?.category_id === simpleFilters.categoryId
      )
    );
  } else if (activeFilterType === 'multi' && multiFilters.categoryIds.length > 0) {
    filteredData = filteredData.filter((sale: any) =>
      sale.sale_items?.some((item: any) =>
        multiFilters.categoryIds.includes(item.products?.category_id)
      )
    );
  }

  // Group by hour (using Egypt timezone)
  const hourlyMap = new Map();
  let totalAllSales = 0;

  // Initialize all 24 hours
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, {
      hour: i,
      hour_range: formatHourRange(i),
      total_sales: 0,
      sales_count: 0,
    });
  }

  filteredData.forEach((sale: any) => {
    const date = new Date(sale.created_at);
    const hour = toEgyptHour(date);
    const amount = parseFloat(sale.total_amount) || 0;

    const hourStats = hourlyMap.get(hour);
    hourStats.sales_count += 1;
    hourStats.total_sales += amount;
    totalAllSales += amount;
  });

  // Calculate percentages and averages, filter hours with sales, sort by total_sales DESC
  return Array.from(hourlyMap.values())
    .map((h: any) => ({
      ...h,
      avg_sale: h.sales_count > 0 ? h.total_sales / h.sales_count : 0,
      percentage: totalAllSales > 0 ? (h.total_sales / totalAllSales) * 100 : 0,
    }))
    .filter((h: any) => h.sales_count > 0)
    .sort((a: any, b: any) => b.total_sales - a.total_sales);
}

// ============================
// 8. Profit Margin Report
// ============================

export async function fetchProfitMarginReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let saleItemsQuery = supabase
    .from('sale_items')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      cost_price,
      products(name, category_id),
      sales!inner(created_at, cashier_id, customer_id, branch_id, record_id)
    `);

  // Apply date filter
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    saleItemsQuery = saleItemsQuery
      .gte('sales.created_at', dateRange.startDate)
      .lte('sales.created_at', dateRange.endDate);
  }

  // Apply product filter on query level
  if (activeFilterType === 'simple' && simpleFilters.productId) {
    saleItemsQuery = saleItemsQuery.eq('product_id', simpleFilters.productId);
  } else if (activeFilterType === 'multi' && multiFilters.productIds.length > 0) {
    saleItemsQuery = saleItemsQuery.in('product_id', multiFilters.productIds);
  }

  const { data: saleItemsData, error: saleItemsError } = await saleItemsQuery;

  if (saleItemsError) {
    console.error('Error fetching sale items:', saleItemsError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${saleItemsError.message}`);
  }

  // Apply client-side filters: category, user, customer, location, safe
  let filteredData = applyItemFilters(
    saleItemsData || [],
    simpleFilters,
    multiFilters,
    activeFilterType
  );

  filteredData = applyClientSalesFilters(
    filteredData,
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'sales.cashier_id',
      customerIdField: 'sales.customer_id',
      branchIdField: 'sales.branch_id',
      recordIdField: 'sales.record_id',
    }
  );

  // Group by product
  const productMap = new Map();

  filteredData.forEach((item: any) => {
    const productId = item.product_id;
    const productName = item.products?.name || 'منتج غير معروف';

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product_id: productId,
        product_name: productName,
        quantity: 0,
        cost_price: 0,
        total_amount: 0,
        profit: 0,
        margin: 0,
      });
    }

    const productStats = productMap.get(productId);
    const quantity = item.quantity || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const costPrice = parseFloat(item.cost_price) || 0;

    productStats.quantity += quantity;
    productStats.cost_price += costPrice * quantity;
    productStats.total_amount += unitPrice * quantity;
  });

  // Calculate profit and margin, sort by profit DESC
  return Array.from(productMap.values())
    .map((p: any) => {
      const profit = p.total_amount - p.cost_price;
      const margin = p.total_amount > 0 ? (profit / p.total_amount) * 100 : 0;
      return {
        ...p,
        profit,
        margin,
      };
    })
    .sort((a: any, b: any) => b.profit - a.profit);
}

// ============================
// 9. Payment Methods Report (NEW)
// ============================

export async function fetchPaymentMethodsReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      payment_method,
      total_amount,
      cashier_id,
      branch_id,
      record_id,
      created_at
    `)
    .neq('status', 'cancelled');

  // Apply date filter on query
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    throw new Error(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
  }

  // Apply client-side filters: user, location, safe
  const filteredData = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'cashier_id',
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // Group by payment_method
  const methodMap = new Map<string, { payment_method: string; label: string; invoice_count: number; total_amount: number }>();
  let grandTotal = 0;

  filteredData.forEach((sale: any) => {
    const method = sale.payment_method || 'غير محدد';
    const amount = parseFloat(sale.total_amount) || 0;
    grandTotal += amount;

    if (methodMap.has(method)) {
      const existing = methodMap.get(method)!;
      existing.invoice_count += 1;
      existing.total_amount += amount;
    } else {
      methodMap.set(method, {
        payment_method: method,
        label: getPaymentMethodAr(method),
        invoice_count: 1,
        total_amount: amount,
      });
    }
  });

  // Calculate percentage and avg_invoice, sort by total_amount DESC
  return Array.from(methodMap.values())
    .map((m) => ({
      ...m,
      percentage: grandTotal > 0 ? (m.total_amount / grandTotal) * 100 : 0,
      avg_invoice: m.invoice_count > 0 ? m.total_amount / m.invoice_count : 0,
    }))
    .sort((a, b) => b.total_amount - a.total_amount);
}

// ============================
// 10. Returns Report (NEW)
// ============================

export async function fetchReturnsReport(params: ReportFetchParams): Promise<any[]> {
  const { dateFilter, simpleFilters, multiFilters, activeFilterType } = params;

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      invoice_number,
      created_at,
      total_amount,
      customer_id,
      cashier_id,
      branch_id,
      record_id,
      customers(name),
      sale_items(
        quantity,
        unit_price,
        product_id,
        products(name)
      )
    `)
    .eq('invoice_type', 'Sale Return');

  // Apply date filter on query
  const dateRange = getDateRangeForFilter(dateFilter);
  if (dateRange) {
    salesQuery = salesQuery
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  const { data: salesData, error: salesError } = await salesQuery;

  if (salesError) {
    console.error('Error fetching returns:', salesError);
    throw new Error(`خطأ في جلب بيانات المرتجعات: ${salesError.message}`);
  }

  // Apply client-side filters: user, customer, location, safe
  const filteredData = applyClientSalesFilters(
    salesData || [],
    simpleFilters,
    multiFilters,
    activeFilterType,
    {
      cashierIdField: 'cashier_id',
      customerIdField: 'customer_id',
      branchIdField: 'branch_id',
      recordIdField: 'record_id',
    }
  );

  // We need cashier names - fetch user_profiles for lookup
  const cashierIds = Array.from(new Set(filteredData.map((s: any) => s.cashier_id).filter(Boolean)));
  let cashierMap = new Map<string, string>();

  if (cashierIds.length > 0) {
    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', cashierIds);

    if (usersData) {
      usersData.forEach((u: any) => {
        cashierMap.set(u.id, u.full_name);
      });
    }
  }

  // Flatten: one row per sale_item (product line)
  const rows: any[] = [];

  filteredData.forEach((sale: any) => {
    const saleItems = sale.sale_items || [];

    // Apply product/category item-level filters
    const filteredItems = applyItemFilters(
      saleItems,
      simpleFilters,
      multiFilters,
      activeFilterType
    );

    filteredItems.forEach((item: any) => {
      rows.push({
        sale_id: sale.id,
        invoice_number: sale.invoice_number,
        created_at: sale.created_at,
        customer_name: sale.customers?.name || 'غير محدد',
        product_name: item.products?.name || 'منتج غير محدد',
        quantity: item.quantity || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total_amount: (item.quantity || 0) * (parseFloat(item.unit_price) || 0),
        cashier_name: cashierMap.get(sale.cashier_id) || 'غير محدد',
      });
    });
  });

  // Sort by created_at DESC
  return rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
