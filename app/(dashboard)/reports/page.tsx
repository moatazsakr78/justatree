'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/app/components/layout/Sidebar';
import TopHeader from '@/app/components/layout/TopHeader';
import SimpleDateFilterModal, { DateFilter } from '@/app/components/SimpleDateFilterModal';
import { supabase } from '@/app/lib/supabase/client';
import SimpleFilterModal from '@/app/components/SimpleFilterModal';
import MultiFilterModal from '@/app/components/MultiFilterModal';
import {
  SimpleFiltersResult,
  MultiFiltersResult,
  initialSimpleFilters,
  initialMultiFilters,
  ActiveFilterType
} from '@/app/types/filters';
import ColumnsControlModal from '@/app/components/ColumnsControlModal';
import { useFormatPrice } from '@/lib/hooks/useCurrency';
import ToastProvider, { useToast } from '@/app/components/ui/ToastProvider';
import {
  loadTableConfig,
  updateColumnVisibility,
  hybridTableStorage
} from '@/app/lib/utils/hybridTableStorage';
import { databaseSettingsService } from '@/app/lib/services/databaseSettingsService';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// Report system imports
import { useReportTabs } from './hooks/useReportTabs';
import { getReportById, ReportDefinition } from './config/reportRegistry';
import { ReportFetchParams } from './fetchers/baseFetcher';
import * as allColumns from './columns';

// Fetcher imports
import {
  fetchProductsReport, fetchCategoriesReport, fetchCustomersReport,
  fetchUsersReport, fetchCustomerInvoicesReport, fetchDailySalesReport,
  fetchHourlySalesReport, fetchProfitMarginReport, fetchPaymentMethodsReport,
  fetchReturnsReport
} from './fetchers/salesFetchers';
import {
  fetchPurchaseItemsReport, fetchPurchaseSupplierReport, fetchPurchaseInvoicesReport
} from './fetchers/purchaseFetchers';
import {
  fetchCustomerBalancesReport, fetchSupplierBalancesReport,
  fetchCashDrawerReport, fetchCustomerPaymentsReport
} from './fetchers/financialFetchers';
import {
  fetchLowStockReport, fetchInventoryValuationReport
} from './fetchers/inventoryFetchers';

// Component imports
import ReportsDashboard from './components/ReportsDashboard';
import ReportsToolbar from './components/ReportsToolbar';
import ReportsSidebar from './components/ReportsSidebar';
import ReportsMenu from './components/ReportsMenu';
import ReportTabBar from './components/ReportTabBar';
import ReportTableView from './components/ReportTableView';
import ReportChartView from './components/ReportChartView';

// ==================== Fetcher Registry ====================
const FETCHER_MAP: Record<string, (params: ReportFetchParams) => Promise<any[]>> = {
  products: fetchProductsReport,
  categories: fetchCategoriesReport,
  customers: fetchCustomersReport,
  users: fetchUsersReport,
  customer_invoices: fetchCustomerInvoicesReport,
  daily_sales: fetchDailySalesReport,
  hourly_sales: fetchHourlySalesReport,
  profit_margin: fetchProfitMarginReport,
  payment_methods: fetchPaymentMethodsReport,
  returns: fetchReturnsReport,
  purchase_items: fetchPurchaseItemsReport,
  purchase_suppliers: fetchPurchaseSupplierReport,
  purchase_invoices: fetchPurchaseInvoicesReport,
  customer_balances: fetchCustomerBalancesReport,
  supplier_balances: fetchSupplierBalancesReport,
  cash_drawer: fetchCashDrawerReport,
  customer_payments: fetchCustomerPaymentsReport,
  low_stock: fetchLowStockReport,
  inventory_valuation: fetchInventoryValuationReport,
};

// ==================== Column Map for Column Management ====================
const COLUMN_FN_MAP: Record<string, (fp: any) => any[]> = {
  products: allColumns.getProductsTableColumns,
  categories: allColumns.getCategoriesTableColumns,
  customers: allColumns.getCustomersTableColumns,
  users: allColumns.getUsersTableColumns,
  customer_invoices: allColumns.getCustomerInvoicesTableColumns,
  daily_sales: allColumns.getDailySalesTableColumns,
  hourly_sales: allColumns.getHourlySalesTableColumns,
  profit_margin: allColumns.getProfitMarginTableColumns,
  payment_methods: allColumns.getPaymentMethodsTableColumns,
  returns: allColumns.getReturnsTableColumns,
  purchase_items: allColumns.getPurchaseItemsTableColumns,
  purchase_suppliers: allColumns.getPurchaseSupplierTableColumns,
  purchase_invoices: allColumns.getPurchaseInvoicesTableColumns,
  customer_balances: allColumns.getCustomerBalancesTableColumns,
  supplier_balances: allColumns.getSupplierBalancesTableColumns,
  cash_drawer: allColumns.getCashDrawerTableColumns,
  customer_payments: allColumns.getCustomerPaymentsTableColumns,
  low_stock: allColumns.getLowStockTableColumns,
  inventory_valuation: allColumns.getInventoryValuationTableColumns,
};

// ==================== Columns Control Modal Wrapper ====================
function ColumnsControlModalWrapper({
  reportType,
  onClose,
  onColumnsChange,
  getColumnsForModal
}: {
  reportType: string;
  onClose: () => void;
  onColumnsChange: (columns: {id: string, header: string, visible: boolean}[]) => void;
  getColumnsForModal: (reportType: string) => Promise<{id: string, header: string, visible: boolean}[]>;
}) {
  const [columns, setColumns] = useState<{id: string, header: string, visible: boolean}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadColumns = async () => {
      try {
        setLoading(true);
        const cols = await getColumnsForModal(reportType);
        setColumns(cols);
      } catch (error) {
        console.error('Failed to load columns for modal:', error);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    };
    loadColumns();
  }, [reportType, getColumnsForModal]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[var(--dash-bg-surface)] rounded-lg p-6 text-[var(--dash-text-primary)]">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dash-accent-blue"></div>
            <span>جاري تحميل إعدادات الأعمدة...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ColumnsControlModal
      isOpen={true}
      onClose={onClose}
      columns={columns}
      onColumnsChange={onColumnsChange}
    />
  );
}

// ==================== Main Page Content ====================
function ReportsPageContent() {
  const formatPrice = useFormatPrice();
  const { showToast } = useToast();

  // Layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'periodic'>('main');
  const [showReportsSidebar, setShowReportsSidebar] = useState(true);

  // Filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showSimpleFilter, setShowSimpleFilter] = useState(false);
  const [showMultiFilter, setShowMultiFilter] = useState(false);
  const [simpleFilters, setSimpleFilters] = useState<SimpleFiltersResult>(initialSimpleFilters);
  const [multiFilters, setMultiFilters] = useState<MultiFiltersResult>(initialMultiFilters);
  const [activeFilterType, setActiveFilterType] = useState<ActiveFilterType>(null);

  // Report data state
  const [reportData, setReportData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [totalSalesAmount, setTotalSalesAmount] = useState<string>('0.00');
  const [searchQuery, setSearchQuery] = useState('');

  // Column management state
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<string>('');

  // Tab management
  const { openTabs, activeTab, switchTab, openReport, closeTab, toggleViewMode } = useReportTabs();

  // Get current tab's view mode
  const activeViewMode = openTabs.find(t => t.id === activeTab)?.viewMode || 'table';

  // Clear search when switching tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // ==================== Core Fetch Function ====================
  const fetchReport = useCallback(async (
    reportId: string,
    filterOverrides?: {
      dateFilter?: DateFilter;
      simpleFilters?: SimpleFiltersResult;
      multiFilters?: MultiFiltersResult;
      activeFilterType?: ActiveFilterType;
    }
  ) => {
    const fetcher = FETCHER_MAP[reportId];
    if (!fetcher) return;

    setLoading(true);
    try {
      const params: ReportFetchParams = {
        dateFilter: filterOverrides?.dateFilter ?? dateFilter,
        simpleFilters: filterOverrides?.simpleFilters ?? simpleFilters,
        multiFilters: filterOverrides?.multiFilters ?? multiFilters,
        activeFilterType: filterOverrides?.activeFilterType ?? activeFilterType,
      };

      const data = await fetcher(params);
      setReportData(prev => ({ ...prev, [reportId]: data }));

      // Update total sales amount based on report data
      updateTotalFromData(reportId, data);
    } catch (error) {
      console.error(`Error fetching report ${reportId}:`, error);
      showToast('حدث خطأ أثناء جلب البيانات', 'error', 3000);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, simpleFilters, multiFilters, activeFilterType, showToast]);

  // ==================== Update Total from Report Data ====================
  const updateTotalFromData = (reportId: string, data: any[]) => {
    let total = 0;
    if (data.length === 0) {
      setTotalSalesAmount('0.00');
      return;
    }

    // Determine which field to sum based on the report
    const sumField =
      ['products', 'categories'].includes(reportId) ? 'total_sales_amount' :
      ['customers', 'users', 'customer_invoices', 'purchase_items', 'purchase_suppliers', 'purchase_invoices'].includes(reportId) ? 'total_amount' :
      ['daily_sales'].includes(reportId) ? 'total_sales' :
      ['hourly_sales'].includes(reportId) ? 'total_sales' :
      ['profit_margin'].includes(reportId) ? 'total_amount' :
      ['payment_methods'].includes(reportId) ? 'total_amount' :
      ['returns'].includes(reportId) ? 'total_amount' :
      ['customer_balances', 'supplier_balances'].includes(reportId) ? 'account_balance' :
      ['cash_drawer'].includes(reportId) ? 'amount' :
      ['customer_payments'].includes(reportId) ? 'amount' :
      ['inventory_valuation'].includes(reportId) ? 'cost_value' :
      ['low_stock'].includes(reportId) ? 'deficit' :
      null;

    if (sumField) {
      total = data.reduce((sum, row) => sum + (parseFloat(String(row[sumField])) || 0), 0);
    }

    // Special display for profit margin
    if (reportId === 'profit_margin') {
      const profit = data.reduce((sum, row) => sum + (parseFloat(String(row.profit)) || 0), 0);
      setTotalSalesAmount(`${total.toFixed(2)} (ربح: ${profit.toFixed(2)})`);
    } else {
      setTotalSalesAmount(total.toFixed(2));
    }
  };

  // ==================== Refresh Current Report ====================
  const refreshCurrentReport = useCallback(() => {
    if (activeTab === 'main') {
      // Refresh total sales
      fetchTotalSales();
    } else {
      fetchReport(activeTab);
    }
  }, [activeTab, fetchReport]);

  // ==================== Report Click Handler ====================
  const handleReportClick = useCallback((report: ReportDefinition) => {
    openReport(report.id, report.titleAr);
    // Only fetch if we don't have data yet
    if (!reportData[report.id]) {
      fetchReport(report.id);
    } else {
      updateTotalFromData(report.id, reportData[report.id]);
    }
  }, [openReport, reportData, fetchReport]);

  // ==================== Fetch Total Sales ====================
  const fetchTotalSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`quantity, unit_price, sales!inner(created_at)`)
        .gte('sales.created_at', '2024-01-01');

      if (!error && data) {
        const total = data.reduce((sum: number, item: any) => {
          return sum + ((item.quantity || 0) * (item.unit_price || 0));
        }, 0);
        setTotalSalesAmount(total.toFixed(2));
      }
    } catch (error) {
      console.error('Error fetching total sales:', error);
    }
  };

  // ==================== System Initialization ====================
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        await hybridTableStorage.getSystemStatus();
        const healthCheck = await databaseSettingsService.healthCheck();
        if (!healthCheck.isHealthy && healthCheck.errors.length > 0) {
          showToast('نظام الإعدادات يعمل في الوضع الاحتياطي', 'info', 2000);
        }
        await hybridTableStorage.flushPendingSaves();
      } catch (error) {
        console.error('System initialization failed:', error);
      }
    };

    initializeSystem();
    fetchTotalSales();

    return () => {
      hybridTableStorage.flushPendingSaves().catch(console.error);
    };
  }, []);

  // ==================== Column Management ====================
  const handleColumnsChange = async (updatedColumns: {id: string, header: string, visible: boolean}[]) => {
    const reportDef = getReportById(currentReportType);
    const reportType = reportDef?.reportType || 'MAIN_REPORT';
    const columnFn = COLUMN_FN_MAP[currentReportType];
    const currentColumns = columnFn ? columnFn(formatPrice) : [];

    try {
      const visibilityMap: {[key: string]: boolean} = {};
      updatedColumns.forEach(col => { visibilityMap[col.id] = col.visible; });

      const savedConfig = await loadTableConfig(reportType as any);

      const allCols = currentColumns.map((col: any, index: number) => {
        const savedCol = savedConfig?.columns.find((saved: any) => saved.id === col.id);
        const updatedCol = updatedColumns.find(updated => updated.id === col.id);
        return {
          id: col.id,
          width: savedCol?.width || col.width || 100,
          visible: updatedCol ? updatedCol.visible : (savedCol?.visible !== false),
          order: savedCol?.order !== undefined ? savedCol.order : index
        };
      });

      await updateColumnVisibility(reportType as any, visibilityMap, allCols);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tableConfigChanged', {
          detail: {
            reportType: currentReportType,
            source: 'ColumnManagement',
            action: 'visibilityUpdate',
            visibleCount: Object.values(visibilityMap).filter(Boolean).length,
            timestamp: Date.now()
          }
        }));
      }

      setShowColumnsModal(false);
    } catch (error) {
      console.error('Failed to save column visibility:', error);
      showToast('فشل في حفظ إعدادات الأعمدة', 'error', 3000);
    }
  };

  const getColumnsForModal = useCallback(async (reportId: string) => {
    const columnFn = COLUMN_FN_MAP[reportId];
    const cols = columnFn ? columnFn(formatPrice) : [];
    const reportDef = getReportById(reportId);
    const configType = reportDef?.reportType || 'MAIN_REPORT';

    try {
      const savedConfig = await loadTableConfig(configType as any);
      return cols.map((col: any) => {
        const savedCol = savedConfig?.columns.find((saved: any) => saved.id === col.id);
        return {
          id: col.id,
          header: col.header,
          visible: savedCol?.visible !== false
        };
      });
    } catch (error) {
      console.error('Failed to load columns for modal:', error);
      return cols.map((col: any) => ({ id: col.id, header: col.header, visible: true }));
    }
  }, [formatPrice]);

  // ==================== Date Filter Change ====================
  const handleDateFilterChange = useCallback((filter: DateFilter) => {
    setDateFilter(filter);
    if (activeTab !== 'main') {
      fetchReport(activeTab, { dateFilter: filter });
    }
  }, [activeTab, fetchReport]);

  // ==================== Simple Filter Apply ====================
  const handleSimpleFilterApply = useCallback((filters: SimpleFiltersResult) => {
    setSimpleFilters(filters);
    setActiveFilterType('simple');
    setMultiFilters(initialMultiFilters);
    if (activeTab !== 'main') {
      fetchReport(activeTab, {
        simpleFilters: filters,
        multiFilters: initialMultiFilters,
        activeFilterType: 'simple'
      });
    }
  }, [activeTab, fetchReport]);

  // ==================== Multi Filter Apply ====================
  const handleMultiFilterApply = useCallback((filters: MultiFiltersResult) => {
    setMultiFilters(filters);
    setActiveFilterType('multi');
    setSimpleFilters(initialSimpleFilters);
    if (activeTab !== 'main') {
      fetchReport(activeTab, {
        simpleFilters: initialSimpleFilters,
        multiFilters: filters,
        activeFilterType: 'multi'
      });
    }
  }, [activeTab, fetchReport]);

  // ==================== Tab Switch Handler ====================
  const handleTabSwitch = useCallback((tabId: string) => {
    switchTab(tabId);
    // Update total display for the tab we're switching to
    if (tabId === 'main') {
      fetchTotalSales();
    } else if (reportData[tabId]) {
      updateTotalFromData(tabId, reportData[tabId]);
    }
  }, [switchTab, reportData]);

  // ==================== Render ====================
  return (
    <div className="h-screen bg-[var(--dash-bg-surface)] overflow-hidden">
      <TopHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="h-full pt-12 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <ReportsToolbar
          currentView={currentView}
          onViewChange={setCurrentView}
          onSimpleFilterClick={() => setShowSimpleFilter(true)}
          onMultiFilterClick={() => setShowMultiFilter(true)}
          onDateFilterClick={() => setShowDateFilter(true)}
          onRefresh={refreshCurrentReport}
          onToggleChart={() => activeTab !== 'main' && toggleViewMode(activeTab)}
          isChartMode={activeViewMode === 'chart'}
          activeFilterType={activeFilterType}
          simpleFilters={simpleFilters}
          multiFilters={multiFilters}
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {currentView === 'periodic' ? (
            <ReportsDashboard
              dateFilter={dateFilter}
              onDateFilterClick={() => setShowDateFilter(true)}
            />
          ) : (
            <>
              {/* Sidebar Toggle */}
              <div className="flex">
                <button
                  onClick={() => setShowReportsSidebar(!showReportsSidebar)}
                  className="w-6 bg-[var(--dash-bg-raised)] hover:bg-[#4B5563] border-l border-[var(--dash-border-default)] flex items-center justify-center transition-colors duration-200"
                  title={showReportsSidebar ? 'إخفاء الشريط الجانبي' : 'إظهار الشريط الجانبي'}
                >
                  {showReportsSidebar ? (
                    <ChevronLeftIcon className="h-4 w-4 text-[var(--dash-text-secondary)]" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-[var(--dash-text-secondary)]" />
                  )}
                </button>
              </div>

              {/* Right Sidebar */}
              {showReportsSidebar && (
                <ReportsSidebar
                  activeTab={activeTab}
                  reportData={reportData}
                  totalSalesAmount={totalSalesAmount}
                  dateFilter={dateFilter}
                  onDateFilterClick={() => setShowDateFilter(true)}
                  formatPrice={formatPrice}
                />
              )}

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Bar */}
                <ReportTabBar
                  openTabs={openTabs}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSwitchTab={handleTabSwitch}
                  onCloseTab={closeTab}
                  onColumnsClick={(reportId) => {
                    setCurrentReportType(reportId);
                    setShowColumnsModal(true);
                  }}
                  onToggleViewMode={toggleViewMode}
                />

                {/* Content Area */}
                <div className="flex-1 overflow-hidden bg-[var(--dash-bg-surface)]">
                  {activeTab === 'main' ? (
                    <ReportsMenu onReportClick={handleReportClick} />
                  ) : activeViewMode === 'chart' ? (
                    <ReportChartView
                      reportId={activeTab}
                      data={reportData[activeTab] || []}
                      loading={loading}
                    />
                  ) : (
                    <ReportTableView
                      reportId={activeTab}
                      data={reportData[activeTab] || []}
                      loading={loading}
                      searchQuery={searchQuery}
                      formatPrice={formatPrice}
                      showToast={showToast}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================== Modals ==================== */}
      <SimpleDateFilterModal
        isOpen={showDateFilter}
        onClose={() => setShowDateFilter(false)}
        onDateFilterChange={handleDateFilterChange}
        currentFilter={dateFilter}
      />

      <SimpleFilterModal
        isOpen={showSimpleFilter}
        onClose={() => setShowSimpleFilter(false)}
        onApply={handleSimpleFilterApply}
        initialFilters={simpleFilters}
      />

      <MultiFilterModal
        isOpen={showMultiFilter}
        onClose={() => setShowMultiFilter(false)}
        onApply={handleMultiFilterApply}
        initialFilters={multiFilters}
      />

      {showColumnsModal && (
        <ColumnsControlModalWrapper
          reportType={currentReportType}
          onClose={() => setShowColumnsModal(false)}
          onColumnsChange={handleColumnsChange}
          getColumnsForModal={getColumnsForModal}
        />
      )}
    </div>
  );
}

// ==================== Export ====================
export default function ReportsPage() {
  return (
    <ToastProvider>
      <ReportsPageContent />
    </ToastProvider>
  );
}
