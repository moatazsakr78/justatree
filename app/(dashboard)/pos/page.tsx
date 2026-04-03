"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import POSSearchInput, { POSSearchInputRef } from "../../components/pos/POSSearchInput";

// Local storage key for POS column visibility
const POS_COLUMN_VISIBILITY_KEY = 'pos-column-visibility-v2';
import { useCart, CartProvider } from "@/lib/contexts/CartContext";
import ToastProvider, { useToast } from "@/app/components/ui/ToastProvider";
import { useCartBadge } from "@/lib/hooks/useCartBadge";
import { useUserProfile } from "@/lib/contexts/UserProfileContext";
import { useCurrentBranch } from "@/lib/contexts/CurrentBranchContext";
import { usePermissionCheck } from "@/lib/hooks/usePermissionCheck";
import dynamic from 'next/dynamic';
import { useCompanySettings } from "@/lib/hooks/useCompanySettings";
import {
  ProductGridImage,
  ProductModalImage,
  ProductThumbnail,
} from "../../components/ui/OptimizedImage";
import { usePerformanceMonitor } from "../../lib/utils/performanceMonitor";
import { useSystemCurrency, useFormatPrice } from "@/lib/hooks/useCurrency";
import { preloadImagesInBackground, getPreloadStats } from "@/lib/utils/imagePreloader";
import { getLastPurchaseInfo, LastPurchaseInfo } from "@/app/lib/utils/purchase-cost-management";
import { useActivityLogger } from "@/app/lib/hooks/useActivityLogger";
const CartModal = dynamic(() => import("@/app/components/CartModal"), { ssr: false });
const PurchaseHistoryModal = dynamic(() => import("@/app/components/PurchaseHistoryModal"), { ssr: false });
const MobileProductDetailsModal = dynamic(() => import("@/app/components/pos/MobileProductDetailsModal"), { ssr: false });

// Editable Field Component for inline editing
interface EditableFieldProps {
  value: number;
  type?: string;
  step?: string;
  onUpdate: (value: number) => void;
  className?: string;
}

function EditableField({
  value,
  type = "text",
  step,
  onUpdate,
  className = "",
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const handleClick = () => {
    setIsEditing(true);
    setTempValue(value.toString());
  };

  const handleSubmit = () => {
    const numValue = parseFloat(tempValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate(numValue);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTempValue(value.toString());
    }
  };

  if (isEditing) {
    return (
      <input
        type={type}
        step={step}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyPress}
        className={`${className} ring-1 ring-dash-accent-blue`}
        autoFocus
        onFocus={(e) => e.target.select()}
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className={`${className} cursor-pointer`}
      title="اضغط للتعديل"
    >
      {value}
    </span>
  );
}

import { supabase } from "../../lib/supabase/client";
import { roundMoney } from "../../lib/utils/money";
import { useAuth } from "@/lib/useAuth";
import { Category } from "../../types";
import ResizableTable from "../../components/tables/ResizableTable";
import Sidebar from "../../components/layout/Sidebar";
import TopHeader from "../../components/layout/TopHeader";
// Types stay as static imports (erased at compile time)
import type { SelectedParty, PartyType } from "../../components/PartySelectionModal";
import type { PriceType } from "../../components/PriceTypeSelectionModal";
import { getPriceTypeName } from "../../components/PriceTypeSelectionModal";
// Static imports for always-visible components
import PaymentSplit from "../../components/PaymentSplit";
import ProductGridSkeleton from "../../components/ui/ProductGridSkeleton";
// Dynamic imports for modals and heavy components (loaded on demand)
const RecordsSelectionModal = dynamic(() => import("../../components/RecordsSelectionModal"), { ssr: false });
const CustomerSelectionModal = dynamic(() => import("../../components/CustomerSelectionModal"), { ssr: false });
const PartySelectionModal = dynamic(() => import("../../components/PartySelectionModal"), { ssr: false });
const PriceTypeSelectionModal = dynamic(() => import("../../components/PriceTypeSelectionModal"), { ssr: false });
const HistoryModal = dynamic(() => import("../../components/HistoryModal"), { ssr: false });
const AddToCartModal = dynamic(() => import("../../components/AddToCartModal"), { ssr: false });
const ColorSelectionModal = dynamic(() => import("../../components/ColorSelectionModal"), { ssr: false });
const SupplierSelectionModal = dynamic(() => import("../../components/SupplierSelectionModal"), { ssr: false });
const TransferLocationModal = dynamic(() => import("../../components/TransferLocationModal"), { ssr: false });
const QuickAddProductModal = dynamic(() => import("../../components/QuickAddProductModal"), { ssr: false });
const ColumnsControlModal = dynamic(() => import("../../components/ColumnsControlModal"), { ssr: false });
const POSTabletView = dynamic(() => import("../../components/POSTabletView"), { ssr: false });
const DiscountModal = dynamic(() => import("../../components/DiscountModal"), { ssr: false });
const PostponedInvoicesModal = dynamic(() => import("../../components/PostponedInvoicesModal"), { ssr: false });
const CashDrawerModal = dynamic(() => import("../../components/CashDrawerModal"), { ssr: false });
const ExpenseAdditionModal = dynamic(() => import("../../components/ExpenseAdditionModal"), { ssr: false });
import { useProducts, Product } from "../../lib/hooks/useProductsOptimized";
import { usePersistentSelections } from "../../lib/hooks/usePersistentSelections";
import { usePOSTabs } from "@/lib/hooks/usePOSTabs";
import {
  createSalesInvoice,
  CartItem,
} from "../../lib/invoices/createSalesInvoice";
import { createPurchaseInvoice } from "../../lib/invoices/createPurchaseInvoice";
import { createTransferInvoice } from "../../lib/invoices/createTransferInvoice";
import { getOrCreateSupplierForCustomer } from "../../lib/services/partyLinkingService";
import {
  Squares2X2Icon,
  ListBulletIcon,
  PlusIcon,
  ShoppingCartIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ArrowsRightLeftIcon,
  UserIcon,
  BanknotesIcon,
  TableCellsIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  ClockIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  ArrowUturnLeftIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  FolderIcon,
  MinusIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TruckIcon,
  TrashIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import ProductSortDropdown, { useSortOrder, sortProducts } from "../../components/ui/ProductSortDropdown";

function POSPageContent() {
  // OPTIMIZED: Performance monitoring for POS page
  const { startRender, endRender } = usePerformanceMonitor("POSPage");
  const systemCurrency = useSystemCurrency();
  const formatPrice = useFormatPrice();
  const { companyName, logoUrl } = useCompanySettings();
  const { user } = useAuth();

  // Get user profile for default branch
  const { profile: userProfile, isAdmin } = useUserProfile();

  // Get current branch from context (managed via TopHeader)
  const { currentBranch: contextBranch, setCurrentBranch: setContextBranch, isLoading: isBranchLoading } = useCurrentBranch();

  // Permission check for changing branch
  const { can: hasPermission } = usePermissionCheck();
  const canChangeBranch = isAdmin || hasPermission('pos.change_branch');

  // Activity logger
  const activityLog = useActivityLogger();

  // Search is handled by POSSearchInput component - receives debounced value directly
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchInputRef = useRef<POSSearchInputRef>(null);

  // Callback to receive debounced search value from POSSearchInput
  const handleSearchChange = useCallback((query: string) => {
    setDebouncedSearchQuery(query);
  }, []);
  const cartContainerRef = useRef<HTMLDivElement>(null);

  // Keep CartContext for website functionality
  const {
    cartItems: webCartItems,
    addToCart: webAddToCart,
    removeFromCart: webRemoveFromCart,
    updateQuantity: webUpdateQuantity,
    clearCart: webClearCart,
  } = useCart();
  const { cartBadgeCount } = useCartBadge();

  // POS Tabs Management
  const {
    tabs: posTabs,
    activeTab: activePOSTab,
    activeTabId,
    addTab,
    addTabWithCustomer,
    addTabWithCustomerAndCart,
    createTabFromMainWithCart,
    updateTabCustomerAndTitle,
    updateTabTransferLocations,
    closeTab,
    switchTab,
    updateActiveTabCart,
    updateActiveTabSelections,
    updateActiveTabMode,
    clearActiveTabCart,
    postponeTab,
    restoreTab,
    refreshPostponedTabs,
    postponedTabs,
    isLoading: isLoadingTabs,
  } = usePOSTabs();

  const { showToast } = useToast();

  // Wrapper for postponeTab that shows toast feedback
  const handlePostponeTab = useCallback(async (tabId: string) => {
    const success = await postponeTab(tabId);
    if (success) {
      showToast('تم تأجيل الفاتورة بنجاح', 'success');
    } else if (tabId !== 'main') {
      showToast('فشل حفظ الفاتورة المؤجلة', 'error');
    }
  }, [postponeTab, showToast]);

  // Dedicated POS Cart State (separate from website cart)
  const [cartItems, setCartItems] = useState<any[]>([]);
  const cartItemsRef = useRef<any[]>([]);
  useEffect(() => { cartItemsRef.current = cartItems; }, [cartItems]);
  const prevCartLengthRef = useRef(0);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [selectedPartyType, setSelectedPartyType] = useState<PartyType>('customer');
  const [selectedSupplierForSale, setSelectedSupplierForSale] = useState<any>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [sortOrder, setSortOrder] = useSortOrder('pos-sort-order');

  // Search Mode: all = الكل, name = الاسم, code = الكود, barcode = الباركود
  type SearchMode = 'all' | 'name' | 'code' | 'barcode';
  const [searchMode, setSearchMode] = useState<SearchMode>('all');

  const [isCartOpen, setIsCartOpen] = useState(false); // Default closed for mobile - show products first
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [showColorSelectionModal, setShowColorSelectionModal] = useState(false);
  const [modalProduct, setModalProduct] = useState<any>(null);
  const [lastPurchaseInfo, setLastPurchaseInfo] = useState<LastPurchaseInfo | null>(null);
  const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);

  // Purchase Mode States
  const [isPurchaseMode, setIsPurchaseMode] = useState(false);
  const [showPurchaseModeConfirm, setShowPurchaseModeConfirm] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showCartSearch, setShowCartSearch] = useState(false);
  const [cartSearchQuery, setCartSearchQuery] = useState('');
  const [highlightedCartItemId, setHighlightedCartItemId] = useState<string | null>(null);
  const [cartSearchMatchIds, setCartSearchMatchIds] = useState<string[]>([]);
  const [cartSearchMatchIndex, setCartSearchMatchIndex] = useState(0);
  const cartSearchInputRef = useRef<HTMLInputElement>(null);
  const [pendingCartProduct, setPendingCartProduct] = useState<{product: any, quantity: number, selectedColor?: string, selectedShape?: string, newPrice: number, existingPrice: number, _colorSelections?: any, _shapeSelections?: any} | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSupplierModalForNewPurchase, setIsSupplierModalForNewPurchase] = useState(false); // لتمييز إذا كان لبدء شراء جديد
  const [showQuickAddProductModal, setShowQuickAddProductModal] =
    useState(false);
  const [editingCartItem, setEditingCartItem] = useState<any>(null);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<{
    [key: string]: boolean;
  }>({});
  const posVisibilityLoadedRef = useRef(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedCustomerForPurchase, setSelectedCustomerForPurchase] = useState<any>(null);

  // Returns State - simple toggle
  const [isReturnMode, setIsReturnMode] = useState(false);

  // Price Type Selection State
  // Initialize from active tab's priceType or default to "price"
  const [selectedPriceType, setSelectedPriceTypeState] = useState<PriceType>("price");
  const [isPriceTypeModalOpen, setIsPriceTypeModalOpen] = useState(false);

  // Sync priceType with active tab when tab changes
  useEffect(() => {
    if (!isLoadingTabs && activePOSTab) {
      const tabPriceType = activePOSTab.selections?.priceType || "price";
      setSelectedPriceTypeState(tabPriceType as PriceType);
    }
  }, [activeTabId, activePOSTab, isLoadingTabs]);

  // Custom setter that updates both local state AND tab selections
  const setSelectedPriceType = useCallback((priceType: PriceType) => {
    setSelectedPriceTypeState(priceType);
    // Also update the tab's selections to persist the price type
    if (activePOSTab) {
      updateActiveTabSelections({
        priceType: priceType
      });
    }
  }, [activePOSTab, updateActiveTabSelections]);

  // Transfer Mode States
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [transferFromLocation, setTransferFromLocation] = useState<any>(null);
  const [transferToLocation, setTransferToLocation] = useState<any>(null);
  const [isTransferLocationModalOpen, setIsTransferLocationModalOpen] =
    useState(false);

  // Print Receipt States
  const [showPrintReceiptModal, setShowPrintReceiptModal] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);

  // Add Tab Modal States
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [showNewTabCustomerModal, setShowNewTabCustomerModal] = useState(false);
  const [isPartyModalForNewTab, setIsPartyModalForNewTab] = useState(false);
  const [isPartyModalForPurchase, setIsPartyModalForPurchase] = useState(false);
  const [showMobileDetailsModal, setShowMobileDetailsModal] = useState(false);

  // Payment Split States
  const [paymentSplitData, setPaymentSplitData] = useState<any[]>([]);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [invoiceCounter, setInvoiceCounter] = useState(0);

  // Change Calculator States (حساب الباقي)
  const [paidAmount, setPaidAmount] = useState<string>("");

  // Discount States
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [cartDiscountType, setCartDiscountType] = useState<"percentage" | "fixed">("percentage");

  // Postponed Invoices States
  const [isPostponedModalOpen, setIsPostponedModalOpen] = useState(false);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  // Close Tab Confirmation States
  const [showCloseTabConfirm, setShowCloseTabConfirm] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  // Context Menu Customer Change State
  const [contextMenuCustomerTabId, setContextMenuCustomerTabId] = useState<string | null>(null);
  // Context Menu Transfer Location Change State
  const [contextMenuTransferTabId, setContextMenuTransferTabId] = useState<string | null>(null);

  // Cash Drawer States
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Edit Invoice Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState<any>(null);
  const [editItemsLoaded, setEditItemsLoaded] = useState(false);

  // Use persistent selections hook for main tab defaults only
  // تمرير فرع الموظف من CurrentBranchContext بدلاً من user_profiles
  const {
    selections: globalSelections,
    isLoaded: selectionsLoaded,
    setRecord: setGlobalRecord,
    setCustomer: setGlobalCustomer,
    setBranch: setGlobalBranch,
    clearSelections: clearGlobalSelections,
    clearSelectionsExceptRecord: clearGlobalSelectionsExceptRecord,
    resetToDefaultCustomer,
    hasRequiredForCart: globalHasRequiredForCart,
    hasRequiredForSale: globalHasRequiredForSale,
    setSubSafe: setGlobalSubSafe,
    defaultCustomer, // Default customer for new tabs
    defaultBranch,   // Default branch for the user
  } = usePersistentSelections(contextBranch?.id);

  // Sync branch from context to selections when context branch changes
  useEffect(() => {
    if (contextBranch) {
      // Always sync globalSelections (main tab) with context
      if (!globalSelections.branch || globalSelections.branch.id !== contextBranch.id) {
        setGlobalBranch(contextBranch);
      }
      // Also sync the active tab's branch if it's not the main tab
      if (activeTabId !== 'main' && !isLoadingTabs && activePOSTab) {
        if (!activePOSTab.selections.branch || activePOSTab.selections.branch.id !== contextBranch.id) {
          updateActiveTabSelections({ branch: contextBranch });
        }
      }
    }
  }, [contextBranch, globalSelections.branch, setGlobalBranch, activeTabId, isLoadingTabs, activePOSTab, updateActiveTabSelections]);

  // Get selections from active tab (tab-specific selections)
  const selections = useMemo(() => {
    // For main tab, use global selections
    if (activeTabId === 'main') {
      return globalSelections;
    }
    // While tabs are loading, use globalSelections as fallback (loaded from localStorage synchronously)
    if (isLoadingTabs || !activePOSTab) {
      return globalSelections;
    }
    // For other tabs, use tab-specific selections
    return activePOSTab.selections;
  }, [activeTabId, activePOSTab?.selections, globalSelections, isLoadingTabs]);

  // Ensure main tab always shows default customer
  // When a non-default customer is selected on main, a new tab is auto-created,
  // so globalSelections.customer should always be the default when on main tab
  useEffect(() => {
    if (activeTabId === 'main' && defaultCustomer && selectionsLoaded) {
      const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
      const currentCustomer = globalSelections.customer;
      const isAlreadyDefault = !currentCustomer ||
        currentCustomer.id === DEFAULT_CUSTOMER_ID ||
        currentCustomer.name === 'عميل';
      if (!isAlreadyDefault) {
        setGlobalCustomer(defaultCustomer);
      }
    }
  }, [activeTabId, defaultCustomer, selectionsLoaded, globalSelections.customer, setGlobalCustomer]);

  // Functions to update selections (tab-aware)
  const setRecord = useCallback((record: any) => {
    if (activeTabId === 'main') {
      setGlobalRecord(record);
    } else {
      updateActiveTabSelections({ record });
    }
  }, [activeTabId, setGlobalRecord, updateActiveTabSelections]);

  const setCustomer = useCallback((customer: any) => {
    if (activeTabId === 'main') {
      setGlobalCustomer(customer);
    } else {
      const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
      const isDefault = customer?.id === DEFAULT_CUSTOMER_ID || customer?.name === 'عميل';
      const newTitle = isDefault ? 'نقطة البيع' : (customer?.name || 'فاتورة جديدة');
      updateTabCustomerAndTitle(activeTabId, customer, newTitle);
    }
  }, [activeTabId, setGlobalCustomer, updateTabCustomerAndTitle]);

  const setBranch = useCallback((branch: any) => {
    if (activeTabId === 'main') {
      setGlobalBranch(branch);
    } else {
      updateActiveTabSelections({ branch });
    }
  }, [activeTabId, setGlobalBranch, updateActiveTabSelections]);

  const clearSelections = useCallback(() => {
    if (activeTabId === 'main') {
      clearGlobalSelections();
    } else {
      updateActiveTabSelections({ customer: null, branch: null, record: null, subSafe: null });
    }
  }, [activeTabId, clearGlobalSelections, updateActiveTabSelections]);

  const clearSelectionsExceptRecord = useCallback(() => {
    if (activeTabId === 'main') {
      clearGlobalSelectionsExceptRecord();
    } else {
      updateActiveTabSelections({ customer: null, branch: null });
    }
  }, [activeTabId, clearGlobalSelectionsExceptRecord, updateActiveTabSelections]);

  const hasRequiredForCart = useCallback(() => {
    return selections.branch !== null || contextBranch !== null;
  }, [selections.branch, contextBranch]);

  const hasRequiredForSale = useCallback(() => {
    // عند البيع لمورد، نتحقق من وجود المورد بدلاً من العميل
    if (selectedPartyType === 'supplier') {
      return selections.record && selectedSupplierForSale && selections.branch;
    }
    // البيع العادي لعميل
    return selections.record && selections.customer && selections.branch;
  }, [selections.record, selections.customer, selections.branch, selectedPartyType, selectedSupplierForSale]);

  // Current branch for cart items - الفرع الحالي لإضافته للمنتجات في السلة
  const currentBranch = useMemo(() => {
    return selections.branch || contextBranch;
  }, [selections.branch, contextBranch]);

  // إظهار اسم الفرع جنب كل منتج فقط لو فيه أكتر من فرع في السلة
  const showBranchPerItem = useMemo(() => {
    if (cartItems.length === 0) return false;
    const branchIds = cartItems.map(item => item.branch_id).filter(Boolean);
    const uniqueBranches = new Set(branchIds);
    console.log('Branch check:', {
      cartItemsCount: cartItems.length,
      branchIds,
      uniqueCount: uniqueBranches.size,
      cartItems: cartItems.map(item => ({ id: item.id, name: item.product?.name, branch_id: item.branch_id, branch_name: item.branch_name }))
    });
    return uniqueBranches.size > 1;
  }, [cartItems]);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Selected Category for filtering products
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Category tree expanded nodes state
  const [expandedCategoryNodes, setExpandedCategoryNodes] = useState<Set<string>>(new Set());

  // Build category tree structure for hierarchical display
  interface CategoryTreeNode {
    id: string;
    name: string;
    parent_id: string | null;
    children: CategoryTreeNode[];
    isExpanded: boolean;
  }

  // Build tree from flat categories
  const buildCategoryTree = useCallback((cats: Category[]): CategoryTreeNode | null => {
    // Find the root "منتجات" category
    const productsCategory = cats.find(cat => cat.name === 'منتجات' && !cat.parent_id);

    const buildNode = (cat: Category): CategoryTreeNode => {
      const children = cats
        .filter(c => c.parent_id === cat.id && c.is_active)
        .map(c => buildNode(c));

      return {
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        children,
        isExpanded: expandedCategoryNodes.has(cat.id) || cat.name === 'منتجات'
      };
    };

    if (productsCategory) {
      return buildNode(productsCategory);
    }

    // If no "منتجات" category exists, create virtual root
    const rootCategories = cats
      .filter(c => !c.parent_id && c.is_active)
      .map(c => buildNode(c));

    return {
      id: 'products-root',
      name: 'منتجات',
      parent_id: null,
      children: rootCategories,
      isExpanded: true
    };
  }, [expandedCategoryNodes]);

  // Get the category tree
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories, buildCategoryTree]);

  // Toggle category node expansion
  const toggleCategoryNode = useCallback((nodeId: string) => {
    setExpandedCategoryNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Get all descendant category IDs for filtering (so selecting parent shows all children's products)
  const getAllDescendantCategoryIds = useCallback((categoryId: string | null): Set<string> => {
    if (!categoryId) return new Set();

    const descendants = new Set<string>([categoryId]);

    const addChildren = (parentId: string) => {
      categories
        .filter(c => c.parent_id === parentId && c.is_active)
        .forEach(child => {
          descendants.add(child.id);
          addChildren(child.id);
        });
    };

    addChildren(categoryId);
    return descendants;
  }, [categories]);

  // Category IDs to filter products (includes selected + all descendants)
  const categoryFilterIds = useMemo(() => {
    return getAllDescendantCategoryIds(selectedCategoryId);
  }, [selectedCategoryId, getAllDescendantCategoryIds]);

  // Get selected category name for display
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const category = categories.find(c => c.id === selectedCategoryId);
    return category?.name || null;
  }, [selectedCategoryId, categories]);

  // ✨ OPTIMIZED: Use useProductsOptimized for inventory data + better performance
  const { products, branches, isLoading, error, fetchProducts } = useProducts();

  // ✨ PERFORMANCE: Branch lookup map for O(1) access instead of O(n) find()
  const branchLookup = useMemo(() => {
    const map = new Map<string, typeof branches[0]>();
    branches.forEach(branch => map.set(branch.id, branch));
    return map;
  }, [branches]);

  // Device Detection for Tablet View
  const [isTabletDevice, setIsTabletDevice] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      setWindowWidth(width);

      const isMobile = /mobile|android.*mobile|webos|blackberry|opera mini|iemobile/.test(userAgent);
      const isTablet = (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(userAgent) ||
                        (width >= 768 && width <= 1280)) &&
                       !isMobile;

      setIsTabletDevice(isTablet);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Fetch last purchase info when product modal opens
  useEffect(() => {
    if (showProductModal && modalProduct?.id) {
      setLastPurchaseInfo(null); // Reset while loading
      getLastPurchaseInfo(modalProduct.id).then(setLastPurchaseInfo);
    }
  }, [showProductModal, modalProduct?.id]);

  // Cleanup: Clear any stale edit invoice data from localStorage on page load
  // This prevents old data from interfering with new edit sessions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const isEdit = urlParams.get('edit') === 'true';

    // Only clear if we're NOT in edit mode - if we are, let the initEditMode handle it
    if (!isEdit) {
      localStorage.removeItem('pos_edit_invoice');
    }
  }, []);

  // Edit Mode: Check URL params, load invoice data, and fetch sale items
  // Track if edit mode has been initialized to prevent re-running
  const editModeInitializedRef = useRef(false);

  useEffect(() => {
    const initEditMode = async () => {
      // Skip if already initialized
      if (editModeInitializedRef.current) {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const isEdit = urlParams.get('edit') === 'true';
      const saleId = urlParams.get('saleId');

      if (!isEdit || !saleId) {
        return;
      }

      // Mark as initialized
      editModeInitializedRef.current = true;

      // Don't set isEditMode here - let the tab control the edit mode state
      // The edit mode will be set in the tab via updateActiveTabMode after tab creation

      // Read edit data from localStorage for customer info (localStorage is shared between tabs)
      const editDataStr = typeof window !== 'undefined'
        ? localStorage.getItem('pos_edit_invoice')
        : null;
      let customerData: any = null;
      let localStorageItems: any[] = [];

      if (editDataStr) {
        try {
          const editData = JSON.parse(editDataStr);
          customerData = editData;
          localStorageItems = editData.items || [];

          // العميل الافتراضي: لا يمكن تعديل فواتيره - حذف فقط
          if (customerData?.customerId === '00000000-0000-0000-0000-000000000001') {
            alert('لا يمكن تعديل فواتير العميل الافتراضي - يمكن الحذف فقط');
            if (typeof window !== 'undefined') {
              localStorage.removeItem('pos_edit_invoice');
              // Clear URL params and reload
              window.history.replaceState({}, '', '/pos');
            }
            return;
          }

          // Clear localStorage after reading
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pos_edit_invoice');
          }
        } catch (error) {
          console.error('Error parsing edit invoice data:', error);
        }
      }

      // Fetch sale items from database
      try {
        const { data: saleItemsData, error } = await supabase
          .from('sale_items')
          .select(`
            id,
            quantity,
            unit_price,
            discount,
            product_id,
            product:products(
              id,
              name,
              barcode,
              main_image_url,
              price,
              cost_price,
              wholesale_price,
              half_wholesale_price,
              category:categories(name)
            )
          `)
          .eq('sale_id', saleId);

        // Also fetch sale info for invoice number
        const { data: saleData } = await supabase
          .from('sales')
          .select('invoice_number, customer_id')
          .eq('id', saleId)
          .single();

        // العميل الافتراضي: لا يمكن تعديل فواتيره - حذف فقط (تحقق إضافي من قاعدة البيانات)
        if (saleData?.customer_id === '00000000-0000-0000-0000-000000000001') {
          alert('لا يمكن تعديل فواتير العميل الافتراضي - يمكن الحذف فقط');
          window.history.replaceState({}, '', '/pos');
          return;
        }

        // Store invoice number for later use (don't set state here)
        const invoiceNumber = saleData?.invoice_number || '';

        // Build cart items from fetched data
        let newCartItems: any[] = [];

        if (!error && saleItemsData && saleItemsData.length > 0) {
          saleItemsData.forEach((item: any) => {
            const productData = item.product;

            if (productData) {
              newCartItems.push({
                id: `edit-${item.id}-${Date.now()}-${Math.random()}`,
                product: productData,
                quantity: item.quantity,
                price: item.unit_price,
                totalPrice: item.unit_price * item.quantity,
                discount: item.discount || 0,
                isEditItem: true
              });
            }
          });
        }

        // Fallback to localStorage items if database query failed or returned empty
        if (newCartItems.length === 0 && localStorageItems.length > 0) {
          newCartItems = localStorageItems.map((item: any, index: number) => ({
            id: `edit-local-${index}-${Date.now()}-${Math.random()}`,
            product: {
              id: item.productId,
              name: item.productName,
              barcode: item.barcode,
              main_image_url: item.main_image_url
            },
            quantity: item.quantity,
            price: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            discount: item.discount || 0,
            isEditItem: true
          }));
        }

        // Create customer object for the new tab
        const customerForTab = customerData?.customerId ? {
          id: customerData.customerId,
          name: customerData.customerName,
          phone: customerData.customerPhone
        } : null;

        // Create tab title with customer name (like when selecting a customer from POS)
        const tabTitle = customerForTab?.name || 'تعديل فاتورة';

        // Store edit invoice data for the new tab
        const editData = {
          ...customerData,
          saleId: saleId,
          invoiceNumber: invoiceNumber
        };

        if (newCartItems.length > 0) {
          // Create a new tab with the customer name and cart items (like when selecting a customer)
          // Pass edit mode options directly to avoid race conditions
          addTabWithCustomerAndCart(customerForTab, newCartItems, tabTitle, {
            branch: globalSelections.branch,
            record: globalSelections.record,
            subSafe: globalSelections.subSafe,
            priceType: selectedPriceType,
          }, {
            isEditMode: true,
            editInvoiceData: editData,
          });
          setEditItemsLoaded(true);
        } else {
          // Even if no cart items, create a tab with customer name
          if (customerForTab) {
            addTabWithCustomerAndCart(customerForTab, [], tabTitle, {
              branch: globalSelections.branch,
              record: globalSelections.record,
              subSafe: globalSelections.subSafe,
              priceType: selectedPriceType,
            }, {
              isEditMode: true,
              editInvoiceData: editData,
            });
          }
          setEditItemsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading edit items:', error);

        // Create customer object for the new tab
        const customerForTab = customerData?.customerId ? {
          id: customerData.customerId,
          name: customerData.customerName,
          phone: customerData.customerPhone
        } : null;

        // Create tab title with customer name
        const tabTitle = customerForTab?.name || 'تعديل فاتورة';

        // Store edit invoice data for the new tab
        const editData = {
          ...customerData,
          saleId: saleId,
          invoiceNumber: ''
        };

        // Fallback to localStorage items if exception occurred
        if (localStorageItems.length > 0) {
          const fallbackItems = localStorageItems.map((item: any, index: number) => ({
            id: `edit-local-${index}-${Date.now()}-${Math.random()}`,
            product: {
              id: item.productId,
              name: item.productName,
              barcode: item.barcode,
              main_image_url: item.main_image_url
            },
            quantity: item.quantity,
            price: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            discount: item.discount || 0,
            isEditItem: true
          }));

          // Create a new tab with the customer name and cart items
          // Pass edit mode options directly to avoid race conditions
          addTabWithCustomerAndCart(customerForTab, fallbackItems, tabTitle, {
            branch: globalSelections.branch,
            record: globalSelections.record,
            subSafe: globalSelections.subSafe,
            priceType: selectedPriceType,
          }, {
            isEditMode: true,
            editInvoiceData: editData,
          });
          setEditItemsLoaded(true);
        } else {
          // Even if no items, create a tab with customer name
          if (customerForTab) {
            addTabWithCustomerAndCart(customerForTab, [], tabTitle, {
              branch: globalSelections.branch,
              record: globalSelections.record,
              subSafe: globalSelections.subSafe,
              priceType: selectedPriceType,
            }, {
              isEditMode: true,
              editInvoiceData: editData,
            });
          }
          setEditItemsLoaded(true);
        }
      }
    };

    initEditMode();
  }, [addTabWithCustomerAndCart, globalSelections.branch, globalSelections.record, selectedPriceType]);

  // Generate dynamic table columns based on branches - same as Products page
  const dynamicTableColumns = useMemo(() => {
    const baseColumns = [
      {
        id: "index",
        header: "#",
        accessor: "#",
        width: 60,
        render: (value: any, item: any, index: number) => (
          <span className="text-[var(--dash-text-muted)] font-medium">{index + 1}</span>
        ),
      },
      {
        id: "name",
        header: "اسم المنتج",
        accessor: "name",
        width: 200,
        render: (value: string) => (
          <span className="text-[var(--dash-text-primary)] font-medium">{value}</span>
        ),
      },
      {
        id: "group",
        header: "المجموعة",
        accessor: "category",
        width: 100,
        render: (value: any) => (
          <span className="text-[var(--dash-text-secondary)]">{value?.name || "غير محدد"}</span>
        ),
      },
      {
        id: "totalQuantity",
        header: "كمية كلية",
        accessor: "totalQuantity",
        width: 120,
        render: (value: number) => (
          <span className="text-dash-accent-blue font-medium">قطعة {value}</span>
        ),
      },
      {
        id: "buyPrice",
        header: "سعر الشراء",
        accessor: "cost_price",
        width: 120,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "sellPrice",
        header: "سعر البيع",
        accessor: "price",
        width: 120,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "wholeSalePrice",
        header: "سعر الجملة",
        accessor: "wholesale_price",
        width: 120,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "sellPrice1",
        header: "سعر 1",
        accessor: "price1",
        width: 100,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "sellPrice2",
        header: "سعر 2",
        accessor: "price2",
        width: 100,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "sellPrice3",
        header: "سعر 3",
        accessor: "price3",
        width: 100,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "sellPrice4",
        header: "سعر 4",
        accessor: "price4",
        width: 100,
        render: (value: number) => (
          <span className="text-[var(--dash-text-primary)]">{(value || 0).toFixed(2)}</span>
        ),
      },
      {
        id: "location",
        header: "الموقع",
        accessor: "location",
        width: 100,
        render: (value: string) => (
          <span className="text-[var(--dash-text-secondary)]">{value || "-"}</span>
        ),
      },
      {
        id: "barcode",
        header: "الباركود",
        accessor: "barcode",
        width: 150,
        render: (value: string) => (
          <span className="text-[var(--dash-text-secondary)] font-mono text-sm">
            {value || "-"}
          </span>
        ),
      },
    ];

    // Add dynamic branch quantity columns
    const branchColumns = branches.map((branch) => ({
      id: `branch_${branch.id}`,
      header: branch.name,
      accessor: `branch_${branch.id}`,
      width: 120,
      render: (value: any, item: Product) => {
        const inventoryData = item.inventoryData?.[branch.id];
        const quantity = inventoryData?.quantity || 0;
        return (
          <span className="text-dash-accent-blue font-medium">قطعة {quantity}</span>
        );
      },
    }));

    // Add dynamic branch min stock columns
    const minStockColumns = branches.map((branch) => ({
      id: `min_stock_${branch.id}`,
      header: `منخفض - ${branch.name}`,
      accessor: `min_stock_${branch.id}`,
      width: 150,
      render: (value: any, item: Product) => {
        const inventoryData = item.inventoryData?.[branch.id];
        const minStock = inventoryData?.min_stock || 0;
        const quantity = inventoryData?.quantity || 0;

        // Show warning style if quantity is below or equal to min stock
        const isLowStock = quantity <= minStock && minStock > 0;

        return (
          <span
            className={`font-medium ${isLowStock ? "text-dash-accent-red" : "text-dash-accent-orange"}`}
          >
            {minStock} قطعة
          </span>
        );
      },
    }));

    // Add dynamic branch variants columns
    const variantColumns = branches.map((branch) => ({
      id: `variants_${branch.id}`,
      header: `الأشكال والألوان - ${branch.name}`,
      accessor: `variants_${branch.id}`,
      width: 250,
      render: (value: any, item: Product) => {
        const variants = item.variantsData?.[branch.id] || [];
        const colorVariants = variants.filter(
          (v) => v.variant_type === "color",
        );
        const shapeVariants = variants.filter(
          (v) => v.variant_type === "shape",
        );

        // If no color variants from variants table, try to get colors from description
        let descriptionColors: any[] = [];
        if (
          colorVariants.length === 0 &&
          item.productColors &&
          item.productColors.length > 0
        ) {
          descriptionColors = item.productColors.map((color, index) => ({
            name: color.name,
            quantity: Math.floor(
              (item.inventoryData?.[branch.id]?.quantity || 0) /
                (item.productColors?.length || 1),
            ),
            variant_type: "color",
            color: color.color,
          }));
        }

        // Helper function to get variant color
        const getVariantColor = (variant: any) => {
          if (variant.variant_type === "color") {
            // If variant has color property (from description), use it directly
            if (variant.color) {
              return variant.color;
            }

            // Try to find the color from product colors
            const productColor = item.productColors?.find(
              (c) => c.name === variant.name,
            );
            if (productColor?.color) {
              return productColor.color;
            }

            // Try to parse color from variant value if it's JSON
            try {
              if (variant.value && variant.value.startsWith("{")) {
                const valueData = JSON.parse(variant.value);
                if (valueData.color) {
                  return valueData.color;
                }
              }
            } catch (e) {
              // If parsing fails, use default
            }
          }
          return "#6B7280"; // Default gray color
        };

        // Helper function to get text color based on background
        const getTextColor = (bgColor: string) => {
          // Convert hex to RGB
          const hex = bgColor.replace("#", "");
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);

          // Calculate luminance
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Return white for dark colors, black for light colors
          return luminance > 0.5 ? "#000000" : "#FFFFFF";
        };

        // Calculate unassigned quantity
        const totalInventoryQuantity =
          item.inventoryData?.[branch.id]?.quantity || 0;

        // Combine all variants (from database and description)
        const allColorVariants = [...colorVariants, ...descriptionColors];
        const allVariants = [...allColorVariants, ...shapeVariants];

        const assignedQuantity = allVariants.reduce(
          (sum, variant) => sum + variant.quantity,
          0,
        );
        const unassignedQuantity = totalInventoryQuantity - assignedQuantity;

        return (
          <div className="flex flex-wrap gap-1">
            {allVariants.map((variant, index) => {
              const bgColor = getVariantColor(variant);
              const textColor = getTextColor(bgColor);

              return (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    borderColor: bgColor === "#6B7280" ? "#6B7280" : bgColor,
                  }}
                >
                  {variant.name} ({variant.quantity})
                </span>
              );
            })}

            {/* Show unassigned quantity if any */}
            {unassignedQuantity > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-[var(--dash-text-primary)] bg-[var(--dash-bg-overlay)] border border-[var(--dash-border-default)]">
                غير محدد ({unassignedQuantity})
              </span>
            )}
          </div>
        );
      },
    }));

    const activityColumn = {
      id: "activity",
      header: "نشيط",
      accessor: "is_active",
      width: 80,
      render: (value: boolean) => (
        <div className="flex justify-center">
          <div
            className={`w-3 h-3 rounded-full ${value ? "bg-dash-accent-green" : "bg-dash-accent-red"}`}
          ></div>
        </div>
      ),
    };

    return [
      ...baseColumns,
      ...branchColumns,
      ...minStockColumns,
      ...variantColumns,
      activityColumn,
    ];
  }, [branches]);

  // Get all columns for columns control modal
  const getAllColumns = () => {
    return dynamicTableColumns.map((col) => ({
      id: col.id,
      header: col.header,
      visible: visibleColumns[col.id] !== false,
    }));
  };

  // Load column visibility from localStorage on mount
  useEffect(() => {
    if (posVisibilityLoadedRef.current) return;

    try {
      const savedData = localStorage.getItem(POS_COLUMN_VISIBILITY_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setVisibleColumns(parsed);
        console.log('✅ Loaded POS column visibility from localStorage');
      }
      posVisibilityLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading POS column visibility:', error);
      posVisibilityLoadedRef.current = true;
    }
  }, []);

  // Handle columns visibility change - saves to localStorage
  const handleColumnsChange = useCallback((updatedColumns: any[]) => {
    const newVisibleColumns: { [key: string]: boolean } = {};
    updatedColumns.forEach((col) => {
      newVisibleColumns[col.id] = col.visible;
    });
    setVisibleColumns(newVisibleColumns);

    // Save to localStorage
    try {
      localStorage.setItem(POS_COLUMN_VISIBILITY_KEY, JSON.stringify(newVisibleColumns));
      console.log('✅ Saved POS column visibility to localStorage');
    } catch (error) {
      console.error('Error saving POS column visibility:', error);
    }
  }, []);

  // Filter visible columns
  const visibleTableColumns = dynamicTableColumns.filter(
    (col) => visibleColumns[col.id] !== false,
  );

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleRecordsModal = () => {
    setIsRecordsModalOpen(!isRecordsModalOpen);
  };

  const toggleCustomerModal = () => {
    // Open unified party selection modal with tabs
    setIsPartyModalOpen(!isPartyModalOpen);
  };

  const toggleCategoriesModal = () => {
    setIsCategoriesModalOpen(!isCategoriesModalOpen);
  };

  const toggleHistoryModal = () => {
    setIsHistoryModalOpen(!isHistoryModalOpen);
  };

  const handleRecordSelect = (record: any, subSafe?: any) => {
    setRecord(record);
    if (activeTabId === 'main') {
      setGlobalSubSafe(subSafe || null);
    } else {
      updateActiveTabSelections({ subSafe: subSafe || null });
    }
    setIsRecordsModalOpen(false);
  };

  const handleCustomerSelect = (customerRaw: any) => {
    // Enrich customer with default_record_name from joined data
    const customer = {
      ...customerRaw,
      default_record_name: customerRaw.default_record_name || customerRaw.default_record?.name || null,
    };
    // Default customer UUID
    const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
    const isDefault = customer?.id === DEFAULT_CUSTOMER_ID || customer?.name === 'عميل';
    const newTitle = isDefault ? 'نقطة البيع' : (customer?.name || 'فاتورة جديدة');

    // If coming from context menu (change customer for specific tab)
    if (contextMenuCustomerTabId) {
      const targetTabId = contextMenuCustomerTabId;

      // If main tab and selecting non-default customer
      if (targetTabId === 'main' && !isDefault) {
        if (cartItems.length > 0) {
          // Transfer cart to new customer tab
          createTabFromMainWithCart(
            customer,
            cartItems,
            {
              branch: globalSelections.branch,
              record: globalSelections.record,
              subSafe: globalSelections.subSafe,
              priceType: selectedPriceType,
            },
            defaultCustomer
          );
          setCartItems([]);
          console.log("Transferred cart to new customer tab from context menu:", customer?.name);
        } else {
          // Empty cart - create new tab
          addTabWithCustomer(customer, {
            branch: globalSelections.branch,
            record: globalSelections.record,
            subSafe: globalSelections.subSafe,
            priceType: selectedPriceType,
          });
          console.log("Created new tab for customer from context menu:", customer?.name);
        }
      } else {
        // Update the specific tab's customer and title
        updateTabCustomerAndTitle(targetTabId, customer, newTitle);
        console.log("Changed customer for tab:", targetTabId, "to:", customer?.name);
      }

      setContextMenuCustomerTabId(null);
    }
    // Normal behavior - not from context menu
    else if (activeTabId === 'main' && !isDefault) {
      if (cartItems.length > 0) {
        // Transfer cart to new customer tab
        createTabFromMainWithCart(
          customer,
          cartItems,
          {
            branch: globalSelections.branch,
            record: globalSelections.record,
            subSafe: globalSelections.subSafe,
            priceType: selectedPriceType,
          },
          defaultCustomer
        );
        // Clear local cart state (main tab cart is reset by createTabFromMainWithCart)
        setCartItems([]);
        console.log("Transferred cart to new customer tab:", customer?.name);
      } else {
        // Empty cart - create new tab for the customer (main tab should never change)
        addTabWithCustomer(customer, {
          branch: globalSelections.branch,
          record: globalSelections.record,
          subSafe: globalSelections.subSafe,
          priceType: selectedPriceType,
        });
        console.log("Created new tab for customer:", customer?.name);
      }
    } else {
      // Either not main tab OR selecting default customer - update customer and apply defaults
      setCustomer(customer);

      // Apply customer's default price type if set
      if (customer?.default_price_type) {
        setSelectedPriceType(customer.default_price_type);
      }

      console.log("Selected customer:", customer);
    }

    setIsCustomerModalOpen(false);
  };

  // Handler for creating a new tab with selected customer (from + button)
  const handleNewTabCustomerSelect = (customer: any) => {
    // Always create a new tab with the selected customer
    // Include default_record_name from the joined record data
    const customerWithRecordName = {
      ...customer,
      default_record_name: customer.default_record?.name || null,
    };
    addTabWithCustomer(customerWithRecordName, {
      branch: globalSelections.branch,
      record: selections.record,
      subSafe: selections.subSafe,
      priceType: selectedPriceType,
    });
    setShowNewTabCustomerModal(false);
    console.log("Created new tab with customer:", customer);
  };

  const handleBranchSelect = (branch: any) => {
    // Update context branch (this will trigger sync to selections via effect)
    setContextBranch(branch);
    // Also update local selections immediately
    setBranch(branch);
    console.log("Selected branch:", branch);
  };

  // Handler for party selection (unified customer/supplier modal)
  const handlePartySelect = (party: SelectedParty) => {
    if (party.type === 'customer') {
      // Handle as customer selection
      const customer = {
        id: party.id,
        name: party.name,
        phone: party.phone,
        calculated_balance: party.balance,
        default_record_id: party.default_record_id,
        default_price_type: party.default_price_type,
        default_record_name: party.default_record_name,
      };
      handleCustomerSelect(customer);
      setSelectedPartyType('customer');
      setSelectedSupplierForSale(null);
    } else {
      // Handle as supplier selection for sale
      const supplier = {
        id: party.id,
        name: party.name,
        phone: party.phone,
        account_balance: party.balance,
      };
      setSelectedSupplierForSale(supplier);
      setSelectedPartyType('supplier');
      // Keep current customer selection for record purposes
      console.log("Selected supplier for sale:", supplier);
    }
    setIsPartyModalOpen(false);
  };

  // Handler for party selection when creating new tab (from + button)
  const handleNewTabPartySelect = (party: SelectedParty) => {
    if (party.type === 'customer') {
      // Create new tab with customer
      const customer = {
        id: party.id,
        name: party.name,
        phone: party.phone,
        calculated_balance: party.balance,
        default_record_id: party.default_record_id,
        default_price_type: party.default_price_type,
        default_record_name: party.default_record_name,
      };
      addTabWithCustomer(customer, {
        branch: globalSelections.branch,
        record: selections.record,
        subSafe: selections.subSafe,
        priceType: selectedPriceType,
      });
    } else {
      // Create new tab for supplier (sale to supplier)
      const supplier = {
        id: party.id,
        name: party.name,
        phone: party.phone,
        account_balance: party.balance,
      };
      // Create tab with default customer but set supplier for sale
      addTabWithCustomer(defaultCustomer, {
        branch: globalSelections.branch,
        record: selections.record,
        subSafe: selections.subSafe,
        priceType: selectedPriceType,
      });
      // Set the supplier for this new tab
      setSelectedSupplierForSale(supplier);
      setSelectedPartyType('supplier');
    }
    setIsPartyModalOpen(false);
    setIsPartyModalForNewTab(false);
  };

  // Handler for party selection when entering purchase mode (from شراء button)
  const handlePartySelectForPurchase = async (party: SelectedParty) => {
    if (party.type === 'supplier') {
      // الشراء من مورد (الحالة العادية)
      const supplier = {
        id: party.id,
        name: party.name,
        phone: party.phone,
        account_balance: party.balance,
      };
      // تفعيل وضع الشراء
      setIsPurchaseMode(true);
      setSelectedSupplier(supplier);
      setSelectedCustomerForPurchase(null);

      // إنشاء tab جديد باسم المورد
      const tabName = supplier.name;
      addTab(tabName, {
        customer: null,
        branch: globalSelections.branch,
        record: globalSelections.record,
        subSafe: globalSelections.subSafe,
        priceType: 'cost_price',
        isPurchaseMode: true,
        selectedSupplier: supplier,
        selectedCustomerForPurchase: null,
      });
    } else {
      // الشراء من عميل - إنشاء/جلب المورد المرتبط تلقائياً
      const customer = {
        id: party.id,
        name: party.name,
        phone: party.phone,
        calculated_balance: party.balance,
        default_record_id: party.default_record_id,
        default_price_type: party.default_price_type,
      };

      // إنشاء/جلب المورد المرتبط بالعميل
      const linkResult = await getOrCreateSupplierForCustomer(party.id);

      if (linkResult.success && linkResult.id) {
        // جلب بيانات المورد المرتبط
        const linkedSupplier = {
          id: linkResult.id,
          name: customer.name, // نفس اسم العميل
          phone: customer.phone,
          isLinkedToCustomer: true,
        };

        // تفعيل وضع الشراء مع المورد المرتبط
        setIsPurchaseMode(true);
        setSelectedSupplier(linkedSupplier);
        setSelectedCustomerForPurchase(customer);

        // إنشاء tab جديد باسم العميل
        const tabName = `شراء - ${customer.name}`;
        addTab(tabName, {
          customer: customer,
          branch: globalSelections.branch,
          record: globalSelections.record,
          subSafe: globalSelections.subSafe,
          priceType: 'cost_price',
          isPurchaseMode: true,
          selectedSupplier: linkedSupplier,
          selectedCustomerForPurchase: customer,
        });
      } else {
        // فشل في إنشاء المورد المرتبط
        alert(`فشل في ربط العميل بمورد: ${linkResult.error || 'خطأ غير معروف'}`);
        return;
      }
    }
    setIsPartyModalOpen(false);
    setIsPartyModalForPurchase(false);
  };

  // Handler for tab close with confirmation
  const handleCloseTab = (tabId: string) => {
    if (tabId === 'main') return; // Main tab cannot be closed

    // Find the tab to check if it has items
    const tab = posTabs.find(t => t.id === tabId);

    if (tab && tab.cartItems && tab.cartItems.length > 0) {
      // Has items - show confirmation
      setTabToClose(tabId);
      setShowCloseTabConfirm(true);
    } else {
      // No items - close directly
      closeTab(tabId);
    }
  };

  // Confirm close handler
  const confirmCloseTab = () => {
    if (tabToClose) {
      closeTab(tabToClose);
    }
    setShowCloseTabConfirm(false);
    setTabToClose(null);
  };

  // Cancel close handler
  const cancelCloseTab = () => {
    setShowCloseTabConfirm(false);
    setTabToClose(null);
  };

  // Categories fetching function
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    startRender();
    fetchCategories();
    endRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Ref to track previous activeTabId for cart sync
  const prevCartSyncTabIdRef = useRef<string | null>(null);

  // Sync cart with active tab - wait for tabs to load from database first
  useEffect(() => {
    // Don't sync until tabs are loaded from database
    if (isLoadingTabs) {
      return;
    }

    // Only sync cart when tab actually changes (not when tab data changes)
    if (prevCartSyncTabIdRef.current === activeTabId) {
      return;
    }
    prevCartSyncTabIdRef.current = activeTabId;

    if (activePOSTab) {
      setCartItems(activePOSTab.cartItems || []);
    }
  }, [activeTabId, activePOSTab, isLoadingTabs]);

  // Ref to track previous activeTabId to only restore on actual tab switch
  const prevActiveTabIdRef = useRef<string | null>(null);

  // Sync modes and selections from active tab after loading
  // Only runs when activeTabId changes (tab switch), not when tab data changes
  useEffect(() => {
    if (isLoadingTabs || !activePOSTab) {
      return;
    }

    // Only restore if we actually switched tabs (not just tab data changed)
    if (prevActiveTabIdRef.current === activeTabId) {
      return;
    }
    prevActiveTabIdRef.current = activeTabId;

    // Restore modes from saved tab
    if (activePOSTab.isPurchaseMode !== undefined) {
      setIsPurchaseMode(activePOSTab.isPurchaseMode);
    }
    if (activePOSTab.isTransferMode !== undefined) {
      setIsTransferMode(activePOSTab.isTransferMode);
    }
    if (activePOSTab.isReturnMode !== undefined) {
      setIsReturnMode(activePOSTab.isReturnMode);
    }
    if (activePOSTab.selectedSupplier !== undefined) {
      setSelectedSupplier(activePOSTab.selectedSupplier);
    }
    if (activePOSTab.selectedCustomerForPurchase !== undefined) {
      setSelectedCustomerForPurchase(activePOSTab.selectedCustomerForPurchase);
    }
    if (activePOSTab.transferFromLocation !== undefined) {
      setTransferFromLocation(activePOSTab.transferFromLocation);
    }
    if (activePOSTab.transferToLocation !== undefined) {
      setTransferToLocation(activePOSTab.transferToLocation);
    }
    // Restore edit mode from saved tab
    setIsEditMode(activePOSTab.isEditMode || false);
    setEditInvoiceData(activePOSTab.editInvoiceData || null);
    // Reset editItemsLoaded when switching tabs to allow loading items for the new tab
    if (!activePOSTab.isEditMode) {
      setEditItemsLoaded(false);
    }

    console.log('POS: Restored modes from tab:', {
      isPurchaseMode: activePOSTab.isPurchaseMode,
      isTransferMode: activePOSTab.isTransferMode,
      isReturnMode: activePOSTab.isReturnMode,
      isEditMode: activePOSTab.isEditMode,
    });
  }, [activeTabId, activePOSTab, isLoadingTabs]);

  // Save modes to tab when they change
  useEffect(() => {
    if (isLoadingTabs || !activePOSTab) {
      return;
    }

    // Only save if modes actually changed from what's in the tab
    const modesChanged =
      activePOSTab.isPurchaseMode !== isPurchaseMode ||
      activePOSTab.isTransferMode !== isTransferMode ||
      activePOSTab.isReturnMode !== isReturnMode ||
      activePOSTab.isEditMode !== isEditMode ||
      JSON.stringify(activePOSTab.editInvoiceData) !== JSON.stringify(editInvoiceData) ||
      JSON.stringify(activePOSTab.selectedSupplier) !== JSON.stringify(selectedSupplier) ||
      JSON.stringify(activePOSTab.selectedCustomerForPurchase) !== JSON.stringify(selectedCustomerForPurchase) ||
      JSON.stringify(activePOSTab.transferFromLocation) !== JSON.stringify(transferFromLocation) ||
      JSON.stringify(activePOSTab.transferToLocation) !== JSON.stringify(transferToLocation);

    if (modesChanged) {
      updateActiveTabMode({
        isPurchaseMode,
        isTransferMode,
        isReturnMode,
        isEditMode,
        editInvoiceData,
        selectedSupplier,
        selectedCustomerForPurchase,
        transferFromLocation,
        transferToLocation,
      });
    }
  }, [isPurchaseMode, isTransferMode, isReturnMode, isEditMode, editInvoiceData, selectedSupplier, selectedCustomerForPurchase, transferFromLocation, transferToLocation, isLoadingTabs, activePOSTab, updateActiveTabMode]);

  // OPTIMIZED: Pre-built search index for O(1) lookups instead of O(n) filtering
  // Index structure: Map<string, Set<string>> where key is search term and value is Set of product IDs
  const searchIndex = useMemo(() => {
    const nameIndex = new Map<string, Set<string>>();
    const codeIndex = new Map<string, Set<string>>();
    const barcodeIndex = new Map<string, Set<string>>();

    // Helper to add term prefixes to index (enables prefix matching)
    const addToIndex = (index: Map<string, Set<string>>, term: string, productId: string) => {
      if (!term) return;
      const normalized = term.toLowerCase();
      // Add full term and all prefixes for fast prefix matching
      for (let i = 1; i <= normalized.length; i++) {
        const prefix = normalized.slice(0, i);
        if (!index.has(prefix)) index.set(prefix, new Set());
        index.get(prefix)!.add(productId);
      }
    };

    // Helper for product codes: strips hyphens and indexes all suffixes for substring matching
    // e.g. "AR-578" → stripped "ar578" → suffixes "ar578","r578","578","78","8" → each gets all prefixes indexed
    const addToCodeIndex = (index: Map<string, Set<string>>, term: string, productId: string) => {
      if (!term) return;
      const stripped = term.toLowerCase().replace(/-/g, '');
      for (let start = 0; start < stripped.length; start++) {
        for (let end = start + 1; end <= stripped.length; end++) {
          const key = stripped.slice(start, end);
          if (!index.has(key)) index.set(key, new Set());
          index.get(key)!.add(productId);
        }
      }
    };

    products.forEach((product) => {
      // Index name words (each word separately for partial matching)
      const nameWords = product.name.toLowerCase().split(/\s+/);
      nameWords.forEach(word => {
        addToIndex(nameIndex, word, product.id);
      });
      // Also index full name for exact substring matching
      addToIndex(nameIndex, product.name, product.id);

      // Index product code (substring matching, hyphens ignored)
      if (product.product_code) {
        addToCodeIndex(codeIndex, product.product_code, product.id);
      }

      // Index barcode
      if (product.barcode) {
        addToIndex(barcodeIndex, product.barcode, product.id);
      }
    });

    return { nameIndex, codeIndex, barcodeIndex };
  }, [products]);

  // ✨ PERFORMANCE FIX: Product lookup map for O(1) access instead of O(n) find()
  const productMap = useMemo(() =>
    new Map(products.map(p => [p.id, p])),
  [products]);

  // OPTIMIZED: Memoized product filtering using search index
  // Returns Set of matching product IDs for O(1) lookup
  const filteredProductIds = useMemo(() => {
    const hasSearchFilter = !!debouncedSearchQuery;
    const hasCategoryFilter = selectedCategoryId !== null && categoryFilterIds.size > 0;

    // No filters - show all
    if (!hasSearchFilter && !hasCategoryFilter) return null;

    let matchingIds: Set<string>;

    if (!hasSearchFilter) {
      // Only category filter - use all product IDs
      matchingIds = new Set(products.map(p => p.id));
    } else {
      const query = debouncedSearchQuery.toLowerCase();
      const codeQuery = query.replace(/-/g, ''); // Strip hyphens for code lookups
      matchingIds = new Set<string>();

      // Use search index for fast lookup based on search mode
      // Supports multi-word search: finds products containing ALL words (in any order)
      const getMatchesFromIndex = (index: Map<string, Set<string>>, queryOverride?: string) => {
        // Split query into words
        const q = queryOverride ?? query;
        const words = q.split(/\s+/).filter(w => w.length > 0);

        if (words.length === 0) return new Set<string>();

        // For single word, use direct lookup (prefix matching)
        if (words.length === 1) {
          return index.get(words[0]) || new Set<string>();
        }

        // For multiple words: find products matching ALL words (intersection)
        let result: Set<string> | null = null;

        for (const word of words) {
          const matches = index.get(word);
          if (!matches || matches.size === 0) {
            return new Set<string>(); // If any word has no matches, return empty
          }

          if (result === null) {
            result = new Set(matches);
          } else {
            // Intersection: keep only products that match this word too
            const newResult = new Set<string>();
            result.forEach(id => {
              if (matches.has(id)) {
                newResult.add(id);
              }
            });
            result = newResult;
          }
        }

        return result || new Set<string>();
      };

      switch (searchMode) {
        case 'all':
          // Combine matches from all indexes
          const nameMatches = getMatchesFromIndex(searchIndex.nameIndex);
          const codeMatches = getMatchesFromIndex(searchIndex.codeIndex, codeQuery);
          const barcodeMatches = getMatchesFromIndex(searchIndex.barcodeIndex);
          nameMatches.forEach(id => matchingIds.add(id));
          codeMatches.forEach(id => matchingIds.add(id));
          barcodeMatches.forEach(id => matchingIds.add(id));
          break;
        case 'name':
          getMatchesFromIndex(searchIndex.nameIndex).forEach(id => matchingIds.add(id));
          break;
        case 'code':
          getMatchesFromIndex(searchIndex.codeIndex, codeQuery).forEach(id => matchingIds.add(id));
          break;
        case 'barcode':
          getMatchesFromIndex(searchIndex.barcodeIndex).forEach(id => matchingIds.add(id));
          break;
      }
    }

    // Apply category filter - using productMap for O(1) lookup instead of O(n) find()
    if (hasCategoryFilter) {
      const categoryFilteredIds = new Set<string>();
      matchingIds.forEach(id => {
        const product = productMap.get(id); // O(1) instead of products.find() O(n)
        if (product?.category_id && categoryFilterIds.has(product.category_id)) {
          categoryFilteredIds.add(id);
        }
      });
      return categoryFilteredIds;
    }

    return matchingIds;
  }, [productMap, debouncedSearchQuery, searchMode, selectedCategoryId, categoryFilterIds, searchIndex]);

  // Helper function to check if product matches search
  const isProductVisible = useCallback((productId: string) => {
    return filteredProductIds === null || filteredProductIds.has(productId);
  }, [filteredProductIds]);

  // For backward compatibility - filtered products array (used for count display etc.)
  const filteredProducts = useMemo(() => {
    const hasSearchFilter = !!debouncedSearchQuery;
    const hasCategoryFilter = selectedCategoryId !== null && categoryFilterIds.size > 0;

    if (!hasSearchFilter && !hasCategoryFilter) return products;
    return products.filter((p) => filteredProductIds?.has(p.id));
  }, [products, debouncedSearchQuery, selectedCategoryId, categoryFilterIds, filteredProductIds]);

  // ✨ PERFORMANCE: Pre-compute inventory totals to avoid O(n²) calculations in render
  // This calculates totalQuantity and branchQuantities once when products/branches change
  const productsWithComputedInventory = useMemo(() => {
    return products.map(product => ({
      ...product,
      _computed: {
        totalQuantity: product.inventoryData
          ? Object.values(product.inventoryData).reduce(
              (sum: number, inv: any) => sum + (inv?.quantity || 0), 0
            )
          : 0,
        branchQuantities: product.inventoryData
          ? Object.entries(product.inventoryData).map(([locationId, inventory]: [string, any]) => ({
              locationId,
              quantity: (inventory as any)?.quantity || 0,
              name: branchLookup.get(locationId)?.name || `موقع ${locationId.slice(0, 8)}`
            }))
          : []
      }
    }));
  }, [products, branchLookup]);

  // ✨ PERFORMANCE FIX: Pre-filter products to only render visible ones in DOM
  // Instead of rendering all 1000+ products and hiding with CSS class "hidden"
  // This reduces DOM nodes from 1000+ to ~12-50 (visible products only)
  const VISIBLE_PRODUCTS_LIMIT = 50; // Limit initial render for performance
  const [showAllProducts, setShowAllProducts] = useState(false);

  const visibleProducts = useMemo(() => {
    let filtered;
    if (filteredProductIds === null) {
      filtered = productsWithComputedInventory;
    } else {
      filtered = productsWithComputedInventory.filter(p => filteredProductIds.has(p.id));
    }
    // Apply sorting
    filtered = sortProducts(filtered, sortOrder);
    // When no filter is applied, limit to VISIBLE_PRODUCTS_LIMIT unless user wants all
    if (filteredProductIds === null && !showAllProducts && filtered.length > VISIBLE_PRODUCTS_LIMIT) {
      return filtered.slice(0, VISIBLE_PRODUCTS_LIMIT);
    }
    return filtered;
  }, [productsWithComputedInventory, filteredProductIds, showAllProducts, sortOrder]);

  // Reset showAllProducts when filter changes
  useEffect(() => {
    if (filteredProductIds !== null) {
      setShowAllProducts(false);
    }
  }, [filteredProductIds]);

  // Check if there are more products to show
  const hasMoreProducts = filteredProductIds === null &&
    !showAllProducts &&
    productsWithComputedInventory.length > VISIBLE_PRODUCTS_LIMIT;

  // OPTIMIZED: Memoized refresh handler
  const handleRefresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  // OPTIMIZED: Preload product images progressively - first 50 immediately, rest in batches
  useEffect(() => {
    if (isLoading || products.length === 0) {
      return;
    }

    // Only preload first 50 images initially for faster initial render
    const INITIAL_PRELOAD_COUNT = 50;
    const BATCH_SIZE = 30;
    const BATCH_DELAY = 1000; // 1 second between batches

    const allImageUrls = products.map(p => p.main_image_url).filter(Boolean) as string[];

    // Preload first batch immediately (visible viewport)
    const initialImages = allImageUrls.slice(0, INITIAL_PRELOAD_COUNT);
    preloadImagesInBackground(initialImages, () => {
      console.log(`POS: Preloaded initial ${initialImages.length} images`);
    });

    // Preload remaining images in batches to avoid blocking UI
    const remainingImages = allImageUrls.slice(INITIAL_PRELOAD_COUNT);
    if (remainingImages.length > 0) {
      let batchIndex = 0;
      const preloadNextBatch = () => {
        const start = batchIndex * BATCH_SIZE;
        const batch = remainingImages.slice(start, start + BATCH_SIZE);
        if (batch.length > 0) {
          preloadImagesInBackground(batch, () => {
            batchIndex++;
            if (batchIndex * BATCH_SIZE < remainingImages.length) {
              setTimeout(preloadNextBatch, BATCH_DELAY);
            } else {
              const stats = getPreloadStats();
              console.log(`POS: Finished preloading all ${stats.preloaded} images`);
            }
          });
        }
      };
      // Start batch preloading after initial load settles
      setTimeout(preloadNextBatch, 2000);
    }
  }, [products, isLoading]);

  // Close tab context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (tabContextMenu) {
        setTabContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tabContextMenu]);

  // Helper function to get product price based on selected price type
  // لو السعر مش موجود بيرجع 0 مش سعر البيع - علشان المستخدم يلاحظ إن السعر ناقص
  const getProductPriceByType = useCallback((product: any): number => {
    if (!product) return 0;
    switch (selectedPriceType) {
      case "price":
        return product.price || 0;
      case "wholesale_price":
        return product.wholesale_price || 0;
      case "price1":
        return product.price1 || 0;
      case "price2":
        return product.price2 || 0;
      case "price3":
        return product.price3 || 0;
      case "price4":
        return product.price4 || 0;
      default:
        return product.price || 0;
    }
  }, [selectedPriceType]);

  // =============================================
  // 🔍 نظام البحث المتقدم بالباركود
  // =============================================

  // دالة صوت التنبيه عند إضافة منتج بالباركود
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000; // Hz
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 100); // 100ms beep
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  // Map للبحث السريع بالباركود (منتج أساسي + ألوان/أشكال)
  const barcodeMap = useMemo(() => {
    const map = new Map<string, { product: any; variantName?: string; variantType?: 'color' | 'shape' }>();

    products.forEach((product) => {
      // باركود المنتج الأساسي
      if (product.barcode) {
        map.set(product.barcode.toLowerCase(), { product });
      }

      // باركودات المنتج الإضافية
      if (product.barcodes && Array.isArray(product.barcodes)) {
        product.barcodes.forEach((bc: string) => {
          if (bc && !map.has(bc.toLowerCase())) {
            map.set(bc.toLowerCase(), { product });
          }
        });
      }

      // باركود الألوان من colors (من جدول product_color_shape_definitions)
      const productColors = (product as any).colors;
      if (productColors && Array.isArray(productColors)) {
        productColors.forEach((color: any) => {
          if (color.barcode) {
            map.set(color.barcode.toLowerCase(), {
              product,
              variantName: color.name,
              variantType: 'color'
            });
          }
        });
      }

      // باركود الأشكال من shapes (من جدول product_color_shape_definitions)
      const productShapes = (product as any).shapes;
      if (productShapes && Array.isArray(productShapes)) {
        productShapes.forEach((shape: any) => {
          if (shape.barcode) {
            map.set(shape.barcode.toLowerCase(), {
              product,
              variantName: shape.name,
              variantType: 'shape'
            });
          }
        });
      }
    });

    return map;
  }, [products]);

  // Ref للتتبع - سيتم استخدامه في useEffect لاحقاً
  const barcodeAddedRef = useRef<string | null>(null);

  // =============================================

  // OPTIMIZED: Memoized POS Cart Functions
  const handleAddToCart = useCallback(
    (product: any, quantity: number, selectedColor?: string, selectedShape?: string) => {
      console.log("Adding to cart:", {
        productId: product.id,
        quantity,
        selectedColor,
        selectedShape,
        branchId: currentBranch?.id,
        branchName: currentBranch?.name,
      });

      const newProductPrice = isPurchaseMode
        ? (product.cost_price || 0)
        : getProductPriceByType(product);

      // Check for existing item with different price BEFORE setCartItems
      const currentCart = cartItemsRef.current;
      const existingItem = currentCart.find((item) => item.product.id === product.id);

      if (existingItem) {
        const existingPrice = existingItem.totalPrice
          ? existingItem.totalPrice / existingItem.quantity
          : existingItem.price;

        if (Math.abs(existingPrice - newProductPrice) >= 0.01) {
          // Different price → show confirmation dialog (don't touch cart)
          setPendingCartProduct({ product, quantity, selectedColor, selectedShape, newPrice: newProductPrice, existingPrice });
          setShowDuplicateConfirm(true);
          return;
        }
      }

      // Same price or new product → proceed with cart update
      setCartItems((prev) => {
        const existingItemIndex = prev.findIndex(
          (item) => item.product.id === product.id,
        );

        let newCart;
        if (existingItemIndex >= 0) {
          // Same price → merge (increment quantity)
          const newCartItems = [...prev];
          const updatedItem = { ...newCartItems[existingItemIndex] };

          if (selectedColor) {
            if (!updatedItem.selectedColors) updatedItem.selectedColors = {};
            updatedItem.selectedColors[selectedColor] =
              (updatedItem.selectedColors[selectedColor] || 0) + quantity;
            const colorsTotal = updatedItem.selectedColors
              ? Object.values(updatedItem.selectedColors).reduce(
                  (total: number, colorQty) => total + (colorQty as number), 0)
              : 0;
            const shapesTotal = updatedItem.selectedShapes
              ? Object.values(updatedItem.selectedShapes).reduce(
                  (total: number, shapeQty) => total + (shapeQty as number), 0)
              : 0;
            updatedItem.quantity = colorsTotal + shapesTotal || updatedItem.quantity;
          } else if (selectedShape) {
            if (!updatedItem.selectedShapes) updatedItem.selectedShapes = {};
            updatedItem.selectedShapes[selectedShape] =
              (updatedItem.selectedShapes[selectedShape] || 0) + quantity;
            const colorsTotal = updatedItem.selectedColors
              ? Object.values(updatedItem.selectedColors).reduce(
                  (total: number, colorQty) => total + (colorQty as number), 0)
              : 0;
            const shapesTotal = Object.values(updatedItem.selectedShapes).reduce(
              (total: number, shapeQty) => total + (shapeQty as number), 0);
            updatedItem.quantity = colorsTotal + shapesTotal || updatedItem.quantity;
          } else {
            updatedItem.quantity += quantity;
          }

          updatedItem.total = updatedItem.price * updatedItem.quantity;
          if (updatedItem.totalPrice) {
            const unitPrice = updatedItem.totalPrice / (updatedItem.quantity - quantity);
            updatedItem.totalPrice = unitPrice * updatedItem.quantity;
          }
          newCartItems[existingItemIndex] = updatedItem;
          newCart = newCartItems;
        } else {
          // New product - create new cart item
          const newCartItem = {
            id: product.id.toString(),
            product: product,
            quantity: quantity,
            price: newProductPrice,
            total: newProductPrice * quantity,
            selectedColors: selectedColor
              ? { [selectedColor]: quantity }
              : undefined,
            selectedShapes: selectedShape
              ? { [selectedShape]: quantity }
              : undefined,
            color: selectedColor || null,
            branch_id: currentBranch?.id || '',
            branch_name: currentBranch?.name || '',
          };

          newCart = [...prev, newCartItem];
        }

        // Update active tab cart
        updateActiveTabCart(newCart);
        return newCart;
      });
    },
    [updateActiveTabCart, getProductPriceByType, isPurchaseMode, currentBranch],
  );

  // Confirm adding duplicate product with different price as separate entry
  const confirmDuplicateAdd = useCallback(() => {
    if (!pendingCartProduct) return;
    const { product, quantity, newPrice } = pendingCartProduct;
    // Get color/shape data stored from handleColorSelection
    const colorSelections = (pendingCartProduct as any)._colorSelections;
    const shapeSelections = (pendingCartProduct as any)._shapeSelections;

    setCartItems((prev) => {
      const newItem: any = {
        id: product.id.toString() + '-' + Date.now(),
        product: product,
        quantity: quantity,
        price: newPrice,
        total: newPrice * quantity,
        selectedColors: colorSelections || null,
        selectedShapes: shapeSelections || null,
        branch_id: currentBranch?.id || '',
        branch_name: currentBranch?.name || '',
      };
      const newCart = [...prev, newItem];
      updateActiveTabCart(newCart);
      return newCart;
    });

    setShowDuplicateConfirm(false);
    setPendingCartProduct(null);
  }, [pendingCartProduct, currentBranch, updateActiveTabCart]);

  const cancelDuplicateAdd = useCallback(() => {
    setShowDuplicateConfirm(false);
    setPendingCartProduct(null);
  }, []);

  // Ref to hold the latest handleAddToCart function to avoid re-renders
  const handleAddToCartRef = useRef(handleAddToCart);
  useEffect(() => {
    handleAddToCartRef.current = handleAddToCart;
  }, [handleAddToCart]);

  // OPTIMIZED: Remove from Cart
  const removeFromCart = useCallback((itemId: string) => {
    setCartItems((prev) => {
      const newCart = prev.filter((item) => item.id !== itemId);
      updateActiveTabCart(newCart);
      return newCart;
    });
  }, [updateActiveTabCart]);

  // OPTIMIZED: Clear Cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    clearActiveTabCart();
    // Reset discount when clearing cart
    setCartDiscount(0);
    setCartDiscountType("percentage");
  }, [clearActiveTabCart]);

  // Discount Functions
  const handleApplyItemDiscount = useCallback((itemId: string, discount: number, discountType: "percentage" | "fixed") => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, discount, discountType }
          : item
      )
    );
  }, []);

  const handleApplyCartDiscount = useCallback((discount: number, discountType: "percentage" | "fixed") => {
    setCartDiscount(discount);
    setCartDiscountType(discountType);
  }, []);

  const handleRemoveItemDiscount = useCallback((itemId: string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, discount: undefined, discountType: undefined }
          : item
      )
    );
  }, []);

  const handleRemoveCartDiscount = useCallback(() => {
    setCartDiscount(0);
    setCartDiscountType("percentage");
  }, []);

  // Calculate total with discounts
  const calculateTotalWithDiscounts = useCallback(() => {
    // First calculate items total with item-level discounts
    let itemsTotal = cartItems.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      if (item.discount) {
        if (item.discountType === "percentage") {
          itemTotal -= (itemTotal * item.discount) / 100;
        } else {
          itemTotal -= item.discount;
        }
      }
      return sum + Math.max(0, itemTotal);
    }, 0);

    // Then apply cart-level discount
    if (cartDiscount > 0) {
      if (cartDiscountType === "percentage") {
        itemsTotal -= (itemsTotal * cartDiscount) / 100;
      } else {
        itemsTotal -= cartDiscount;
      }
    }

    return Math.max(0, itemsTotal);
  }, [cartItems, cartDiscount, cartDiscountType]);

  // حساب الربح السري
  const calculateProfit = useCallback(() => {
    return cartItems.reduce((totalProfit, item) => {
      const costPrice = item.cost_price || item.product?.cost_price || 0
      const sellingPrice = item.price
      const quantity = item.quantity
      // حساب الربح مع خصم المنتج
      let itemTotal = sellingPrice * quantity
      if (item.discount) {
        if (item.discountType === "percentage") {
          itemTotal -= (itemTotal * item.discount) / 100
        } else {
          itemTotal -= item.discount
        }
      }
      const itemProfit = itemTotal - (costPrice * quantity)
      return totalProfit + itemProfit
    }, 0)
  }, [cartItems])

  // Reset paid amount when customer changes (not auto-fill - cashier types actual amount)
  useEffect(() => {
    if (isPurchaseMode) return;
    // Clear paid amount when switching customers
    setPaidAmount("");
  }, [isPurchaseMode, selections.customer?.id]);

  // Auto-scroll السلة لآخر منتج عند الإضافة فقط (مش عند التعديل أو الحذف)
  useEffect(() => {
    if (cartContainerRef.current && cartItems.length > prevCartLengthRef.current) {
      setTimeout(() => {
        if (cartContainerRef.current) {
          cartContainerRef.current.scrollTop = cartContainerRef.current.scrollHeight;
        }
      }, 50);
    }
    prevCartLengthRef.current = cartItems.length;
  }, [cartItems.length]);

  // Cart search: scroll to matching item and highlight it
  const handleCartSearch = useCallback((query: string) => {
    setCartSearchQuery(query);
    if (!query.trim()) {
      setHighlightedCartItemId(null);
      setCartSearchMatchIds([]);
      setCartSearchMatchIndex(0);
      return;
    }
    const matches = cartItems.filter((item) =>
      item.product?.name?.toLowerCase().includes(query.toLowerCase())
    );
    const matchIds = matches.map((m) => m.id);
    setCartSearchMatchIds(matchIds);
    setCartSearchMatchIndex(0);
    if (matchIds.length > 0) {
      setHighlightedCartItemId(matchIds[0]);
      setTimeout(() => {
        const el = document.getElementById(`cart-item-${matchIds[0]}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } else {
      setHighlightedCartItemId(null);
    }
  }, [cartItems]);

  const navigateCartSearchMatch = useCallback((direction: 'next' | 'prev') => {
    if (cartSearchMatchIds.length === 0) return;
    const newIndex = direction === 'next'
      ? (cartSearchMatchIndex + 1) % cartSearchMatchIds.length
      : (cartSearchMatchIndex - 1 + cartSearchMatchIds.length) % cartSearchMatchIds.length;
    setCartSearchMatchIndex(newIndex);
    const id = cartSearchMatchIds[newIndex];
    setHighlightedCartItemId(id);
    setTimeout(() => {
      const el = document.getElementById(`cart-item-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [cartSearchMatchIds, cartSearchMatchIndex]);

  // =============================================
  // 🔍 useEffect للإضافة المباشرة عند مسح الباركود
  // =============================================
  useEffect(() => {
    // تخطي إذا لم يكن هناك نص بحث
    if (!debouncedSearchQuery.trim()) {
      barcodeAddedRef.current = null;
      return;
    }

    const trimmedQuery = debouncedSearchQuery.trim().toLowerCase();

    // تجنب إضافة نفس الباركود مرتين متتاليتين
    if (barcodeAddedRef.current === trimmedQuery) {
      return;
    }

    // البحث عن تطابق في الـ map
    const match = barcodeMap.get(trimmedQuery);

    // في وضع 'barcode': دائماً حاول المطابقة
    // في وضع 'all': فقط أضف تلقائياً لو وجد تطابق دقيق للباركود
    if (searchMode !== 'barcode' && !match) {
      return;
    }

    if (match) {
      const { product, variantName, variantType } = match;

      // التحقق من المتطلبات قبل الإضافة
      if (isPurchaseMode) {
        if (!selectedSupplier || (!selections.branch && !contextBranch) || !selections.record) {
          return; // لا تضيف - المتطلبات غير مكتملة
        }
      } else if (isTransferMode) {
        if (!transferFromLocation || !transferToLocation) {
          return;
        }
      } else {
        if (!hasRequiredForCart()) {
          return;
        }
      }

      // حفظ الباركود الذي تم إضافته
      barcodeAddedRef.current = trimmedQuery;

      // إضافة للسلة
      const productPrice = isPurchaseMode
        ? (product.cost_price || 0)
        : getProductPriceByType(product);

      const productWithPrice = {
        ...product,
        price: isTransferMode ? 0 : productPrice,
      };

      if (variantName && variantType === 'color') {
        // إضافة مع اللون المحدد
        handleAddToCartRef.current(productWithPrice, 1, variantName);
      } else if (variantName && variantType === 'shape') {
        // إضافة مع الشكل المحدد
        handleAddToCartRef.current(productWithPrice, 1, undefined, variantName);
      } else {
        // إضافة بدون لون أو شكل
        handleAddToCartRef.current(productWithPrice, 1);
      }

      // صوت التنبيه
      playBeep();

      // مسح البحث وإعادة التركيز بعد تأخير قصير
      setTimeout(() => {
        searchInputRef.current?.clearSearch();
        barcodeAddedRef.current = null;
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [debouncedSearchQuery, searchMode, barcodeMap, isPurchaseMode, isTransferMode, selectedSupplier, selections.branch, selections.record, transferFromLocation, transferToLocation, hasRequiredForCart, getProductPriceByType, playBeep]);

  const handleColorSelection = async (
    selections: { [key: string]: number },
    totalQuantity: number,
    purchasePricingData?: {
      purchasePrice: number;
      salePrice: number;
      wholesalePrice: number;
      price1: number;
      price2: number;
      price3: number;
      price4: number;
      productCode: string;
    },
    shapeSelections?: { [key: string]: number },
  ) => {
    if (!modalProduct) return;

    // في وضع الشراء، تحديث بيانات المنتج في قاعدة البيانات
    if (isPurchaseMode && purchasePricingData) {
      try {
        const { error } = await supabase
          .from('products')
          .update({
            price: purchasePricingData.salePrice,
            wholesale_price: purchasePricingData.wholesalePrice,
            price1: purchasePricingData.price1,
            price2: purchasePricingData.price2,
            price3: purchasePricingData.price3,
            price4: purchasePricingData.price4,
            product_code: purchasePricingData.productCode || null,
          })
          .eq('id', modalProduct.id);

        if (error) {
          console.error('خطأ في تحديث أسعار المنتج:', error);
        } else {
          console.log('✅ تم تحديث أسعار المنتج بنجاح');
        }
      } catch (err) {
        console.error('خطأ في تحديث أسعار المنتج:', err);
      }
    }

    const productWithPrice = {
      ...modalProduct,
      price:
        isPurchaseMode && purchasePricingData?.purchasePrice !== undefined
          ? purchasePricingData.purchasePrice
          : getProductPriceByType(modalProduct),
    };

    const newPrice = productWithPrice.price || 0;

    // Check for existing item with different price BEFORE modifying cart
    const currentCart = cartItemsRef.current;
    const existingCartItem = currentCart.find((item) => item.product.id === modalProduct.id);

    if (existingCartItem) {
      const existingUnitPrice = existingCartItem.totalPrice
        ? existingCartItem.totalPrice / existingCartItem.quantity
        : existingCartItem.price;

      if (Math.abs(existingUnitPrice - newPrice) >= 0.01) {
        // Different price → show confirmation dialog
        setPendingCartProduct({
          product: productWithPrice,
          quantity: totalQuantity,
          selectedColor: Object.keys(selections).length > 0 ? JSON.stringify(selections) : undefined,
          selectedShape: shapeSelections && Object.keys(shapeSelections).length > 0 ? JSON.stringify(shapeSelections) : undefined,
          newPrice,
          existingPrice: existingUnitPrice,
          // Store full data for confirmDuplicateAdd
          _colorSelections: Object.keys(selections).length > 0 ? selections : null,
          _shapeSelections: shapeSelections && Object.keys(shapeSelections).length > 0 ? shapeSelections : null,
        });
        setShowDuplicateConfirm(true);
        // Close color modal but DON'T add to cart yet
        setShowColorSelectionModal(false);
        setModalProduct(null);
        return;
      }
    }

    // Same price or new product → proceed normally
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.product.id === modalProduct.id,
      );

      if (existingItemIndex >= 0) {
        // المنتج موجود بنفس السعر - دمج
        const newCartItems = [...prev];
        const existingItem = { ...newCartItems[existingItemIndex] };

        const hasColors = Object.keys(selections).length > 0;
        const hasShapes = shapeSelections && Object.keys(shapeSelections).length > 0;

        if (hasColors || hasShapes) {
          if (hasColors) {
            if (!existingItem.selectedColors) existingItem.selectedColors = {};
            for (const [color, qty] of Object.entries(selections)) {
              existingItem.selectedColors[color] = (existingItem.selectedColors[color] || 0) + (qty as number);
            }
          }
          if (hasShapes) {
            if (!existingItem.selectedShapes) existingItem.selectedShapes = {};
            for (const [shape, qty] of Object.entries(shapeSelections!)) {
              existingItem.selectedShapes[shape] = (existingItem.selectedShapes[shape] || 0) + (qty as number);
            }
          }
          const colorTotal = existingItem.selectedColors
            ? Object.values(existingItem.selectedColors).reduce((sum: number, q) => sum + (q as number), 0)
            : 0;
          const shapeTotal = existingItem.selectedShapes
            ? Object.values(existingItem.selectedShapes).reduce((sum: number, q) => sum + (q as number), 0)
            : 0;
          existingItem.quantity = colorTotal + shapeTotal;
        } else {
          existingItem.quantity += totalQuantity;
        }
        existingItem.total = newPrice * existingItem.quantity;

        newCartItems[existingItemIndex] = existingItem;
        updateActiveTabCart(newCartItems);
        return newCartItems;
      } else {
        // منتج جديد
        const newCartItem: any = {
          id: productWithPrice.id.toString(),
          product: productWithPrice,
          quantity: totalQuantity,
          selectedColors: Object.keys(selections).length > 0 ? selections : null,
          selectedShapes: shapeSelections && Object.keys(shapeSelections).length > 0 ? shapeSelections : null,
          price: newPrice,
          total: newPrice * totalQuantity,
          branch_id: currentBranch?.id || '',
          branch_name: currentBranch?.name || '',
        };

        const newCart = [...prev, newCartItem];
        updateActiveTabCart(newCart);
        return newCart;
      }
    });

    // إغلاق النافذة
    setShowColorSelectionModal(false);
    setModalProduct(null);

    // مسح البحث وإعادة التركيز على حقل البحث
    searchInputRef.current?.clearSearch();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleProductClick = (product: any) => {
    // Check if required selections are made before allowing cart operations
    if (isPurchaseMode) {
      if (!selectedSupplier || (!selections.branch && !contextBranch) || !selections.record) {
        alert("يجب تحديد المورد والفرع والخزنة أولاً قبل إضافة المنتجات للسلة");
        return;
      }
    } else if (isTransferMode) {
      if (!transferFromLocation || !transferToLocation) {
        alert("يجب تحديد مصدر ووجهة النقل أولاً");
        return;
      }
      // Handle transfer mode product selection
      handleTransferProductClick(product);
      return;
    } else {
      if (!hasRequiredForCart()) {
        alert("يجب تحديد الفرع أولاً قبل إضافة المنتجات للسلة");
        return;
      }
    }

    setModalProduct(product);

    // عرض نافذة اختيار الألوان دائماً
    // ستتعامل النافذة مع عرض الألوان أو إخفائها حسب المنتج
    setShowColorSelectionModal(true);
  };

  // Calculate cart total from CartContext items
  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  // Handle invoice creation
  const handleCreateInvoice = async () => {
    // Freeze selections to prevent mid-execution state changes (race condition protection)
    const frozenSelections = {
      record: selections.record,
      subSafe: selections.subSafe,
      customer: selections.customer,
      branch: selections.branch,
    };

    console.log('🔵 handleCreateInvoice - Selections Snapshot:', {
      activeTabId,
      recordId: frozenSelections.record?.id,
      recordName: frozenSelections.record?.name,
      subSafeId: frozenSelections.subSafe?.id,
      isMainTab: activeTabId === 'main',
      globalRecordId: globalSelections?.record?.id,
      globalRecordName: globalSelections?.record?.name,
    });

    // Validate based on current mode
    if (isTransferMode) {
      if (!transferFromLocation || !transferToLocation) {
        alert("يجب تحديد مصدر ووجهة النقل قبل تأكيد النقل");
        return;
      }
      if (!selections.record) {
        alert("يجب تحديد الخزنة أولاً قبل إنشاء فاتورة النقل");
        return;
      }
    } else if (isPurchaseMode) {
      if (!hasRequiredForPurchase()) {
        alert("يجب تحديد الخزنة والمورد والمخزن قبل تأكيد الطلب");
        return;
      }
    } else {
      if (!hasRequiredForSale()) {
        if (selectedPartyType === 'supplier') {
          alert("يجب تحديد الخزنة والمورد والفرع قبل تأكيد الطلب");
        } else {
          alert("يجب تحديد الخزنة والعميل والفرع قبل تأكيد الطلب");
        }
        return;
      }

      // حساب إجمالي المبلغ المدفوع من بيانات تقسيم الدفع
      const totalPaid = paymentSplitData.reduce((sum, p) => sum + (p.amount || 0), 0);

      // استخدام الإجمالي بعد الخصم للتحقق من صحة الدفع
      const discountedTotal = calculateTotalWithDiscounts();

      // عند البيع لمورد - لا نطبق قواعد العميل الافتراضي
      if (selectedPartyType !== 'supplier') {
        const isDefaultCustomer = selections.customer?.id === '00000000-0000-0000-0000-000000000001';

        // التحقق من صحة المدفوعات للعميل الافتراضي
        if (isDefaultCustomer) {
          // التحقق من حقل المبلغ المدفوع (الكاش) - لازم يكون >= الإجمالي
          const enteredPaid = parseFloat(paidAmount);
          if (paidAmount && !isNaN(enteredPaid) && enteredPaid < discountedTotal) {
            alert('المبلغ المدفوع أقل من قيمة الفاتورة - العميل الكاش لازم يدفع الإجمالي أو أكتر');
            return;
          }
          // العميل الافتراضي: المبلغ المدفوع يجب أن يكون >= قيمة الفاتورة (الباقي/الفكة مسموح)
          if (totalPaid < discountedTotal) {
            alert('العميل الافتراضي لا يقبل البيع بالآجل - يجب دفع قيمة الفاتورة كاملة');
            return;
          }
        }
        // العملاء العاديين: يمكنهم الدفع بأي مبلغ (الفائض يُخصم من رصيدهم أو يصبح رصيد دائن)
      }
      // عند البيع لمورد - يمكن البيع بأي مبلغ (سداد مديونية)
    }

    // In edit mode, allow empty cart (user might want to delete all items)
    const tabIsEditModeCheck = activePOSTab?.isEditMode || false;
    if (cartItems.length === 0 && !tabIsEditModeCheck) {
      const emptyCartMessage = isTransferMode
        ? "لا يمكن إنشاء فاتورة نقل بدون منتجات"
        : isReturnMode
          ? isPurchaseMode
            ? "لا يمكن إنشاء مرتجع شراء بدون منتجات"
            : "لا يمكن إنشاء مرتجع بيع بدون منتجات"
          : isPurchaseMode
            ? "لا يمكن إنشاء فاتورة شراء بدون منتجات"
            : "لا يمكن إنشاء فاتورة بدون منتجات";
      alert(emptyCartMessage);
      return;
    }

    setIsProcessingInvoice(true);

    try {
      // Handle Edit Mode - Update existing invoice
      // Use tab's edit mode state directly to avoid sync issues
      const tabIsEditMode = activePOSTab?.isEditMode || false;
      const tabEditInvoiceData = activePOSTab?.editInvoiceData || null;

      if (tabIsEditMode && tabEditInvoiceData) {
        const saleId = tabEditInvoiceData.saleId;

        // Get the original sale total
        const { data: originalSale } = await supabase
          .from('sales')
          .select('total_amount, customer_id')
          .eq('id', saleId)
          .single();

        const originalTotal = originalSale?.total_amount || 0;

        // Calculate new total from cart (with discounts)
        const newTotal = cartItems.reduce((sum, item) => {
          let itemTotal = item.price * item.quantity;
          if (item.discount) {
            if (item.discountType === "percentage") {
              itemTotal -= (itemTotal * item.discount) / 100;
            } else {
              itemTotal -= item.discount;
            }
          }
          return sum + Math.max(0, itemTotal);
        }, 0);

        // حساب الربح الجديد
        const newProfit = cartItems.reduce((sum, item) => {
          const costPrice = item.cost_price || item.product?.cost_price || 0;
          let itemTotal = item.price * item.quantity;
          if (item.discount) {
            if (item.discountType === "percentage") {
              itemTotal -= (itemTotal * item.discount) / 100;
            } else {
              itemTotal -= item.discount;
            }
          }
          itemTotal = Math.max(0, itemTotal);
          return sum + (itemTotal - (costPrice * item.quantity));
        }, 0);

        // Fetch old item IDs first (so we only delete these specific items later)
        const { data: oldItems } = await supabase
          .from('sale_items')
          .select('id')
          .eq('sale_id', saleId);
        const oldItemIds = oldItems?.map((i: any) => i.id) || [];

        // Insert new sale items FIRST (safe - old items still exist as fallback)
        const newSaleItems = cartItems.map(item => ({
          sale_id: saleId,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.price,
          cost_price: item.product.cost_price || 0,
          discount: item.discount || 0,
          notes: '',
          branch_id: item.branch_id || selections.branch?.id || ''
        }));

        const { error: insertError } = await supabase
          .from('sale_items')
          .insert(newSaleItems);

        if (insertError) {
          // Old items are still intact - no data loss
          throw new Error(`خطأ في إضافة المنتجات الجديدة: ${insertError.message}`);
        }

        // Delete old sale items AFTER new ones succeed (by specific IDs)
        if (oldItemIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('sale_items')
            .delete()
            .in('id', oldItemIds);

          if (deleteError) {
            console.warn('Failed to delete old sale items:', deleteError.message);
            // Non-fatal: new items exist, old items will just be extra
          }
        }

        // Update sale total and profit
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            total_amount: newTotal,
            profit: newProfit
          })
          .eq('id', saleId);

        if (updateError) {
          throw new Error(`خطأ في تحديث الفاتورة: ${updateError.message}`);
        }

        // رصيد العميل سيُحسب تلقائياً من دالة calculate_customer_balances()
        // لا حاجة لتحديث account_balance يدوياً - الدالة تجمع المبيعات تلقائياً
        const totalDifference = newTotal - originalTotal;

        // تحديث رصيد الخزنة عند تعديل الفاتورة
        if (totalDifference !== 0) {
          // جلب معاملة الخزنة الأصلية لهذه الفاتورة
          const { data: originalTransaction } = await supabase
            .from('cash_drawer_transactions')
            .select('id, drawer_id, amount, record_id')
            .eq('sale_id', saleId)
            .eq('transaction_type', 'sale')
            .single();

          if (originalTransaction) {
            // جلب رصيد الخزنة الحالي
            const { data: drawer } = await supabase
              .from('cash_drawers')
              .select('id, current_balance')
              .eq('id', originalTransaction.drawer_id)
              .single();

            if (drawer) {
              // تحديث رصيد الخزنة بالفرق
              const newDrawerBalance = roundMoney((drawer.current_balance || 0) + totalDifference);

              await supabase
                .from('cash_drawers')
                .update({
                  current_balance: newDrawerBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('id', drawer.id);

              // تحديث المعاملة الأصلية بالمبلغ الجديد
              await supabase
                .from('cash_drawer_transactions')
                .update({
                  amount: originalTransaction.amount + totalDifference,
                  balance_after: newDrawerBalance
                })
                .eq('id', originalTransaction.id);

              // إضافة سجل تعديل الفاتورة
              await supabase
                .from('cash_drawer_transactions')
                .insert({
                  drawer_id: drawer.id,
                  record_id: originalTransaction.record_id,
                  transaction_type: 'invoice_edit',
                  amount: Math.abs(totalDifference),
                  balance_after: newDrawerBalance,
                  sale_id: saleId,
                  notes: `تعديل فاتورة رقم ${tabEditInvoiceData.invoiceNumber} - الفرق: ${totalDifference}`,
                  performed_by: 'system'
                });

              console.log(`✅ Cash drawer updated after edit: ${totalDifference >= 0 ? '+' : ''}${totalDifference}, new balance: ${newDrawerBalance}`);
            }
          }
        }

        // Success! Show message
        alert(`تم تعديل الفاتورة رقم ${tabEditInvoiceData.invoiceNumber} بنجاح`);
        activityLog({ entityType: 'sale', actionType: 'update', entityId: saleId, entityName: `فاتورة #${tabEditInvoiceData.invoiceNumber}` });

        // Clear cart and close the edit tab
        clearCart();

        // Clean URL params (remove edit mode params)
        const url = new URL(window.location.href);
        url.searchParams.delete('edit');
        url.searchParams.delete('saleId');
        window.history.replaceState({}, '', url.toString());

        // Close the current edit tab (returns to main tab or previous tab)
        if (activeTabId !== 'main') {
          closeTab(activeTabId);
        }

        return;
      }

      if (isTransferMode) {
        // Handle transfer invoice creation
        // Transform cartItems to match TransferCartItem interface
        const transferCartItems = cartItems.map((item) => ({
          id: item.id,
          product: item.product || { name: "Unknown Product" },
          quantity: item.quantity,
          selectedColors: item.selected_color
            ? { [item.selected_color]: item.quantity }
            : undefined,
          isTransfer: true,
        }));

        const transferInvoice = await createTransferInvoice({
          cartItems: transferCartItems,
          transferFromLocation,
          transferToLocation,
          record: selections.record,
        });

        // Store transfer invoice data for printing
        setLastInvoiceData({
          invoiceNumber: transferInvoice.invoiceNumber,
          totalAmount: 0, // No amount in transfer
          cartItems: cartItems,
          isTransfer: true,
          date: new Date(),
          fromLocation: transferFromLocation,
          toLocation: transferToLocation,
          transferType: "transfer",
        });

        // Show print confirmation modal
        setShowPrintReceiptModal(true);
        activityLog({ entityType: 'purchase', actionType: 'create', entityId: transferInvoice.invoiceId, entityName: `نقل #${transferInvoice.invoiceNumber}` });

        // Clear cart and close the transfer tab
        clearCart();
        if (activeTabId !== 'main') {
          closeTab(activeTabId);
        } else {
          exitTransferMode();
        }
      } else if (isPurchaseMode) {
        // Handle purchase invoice creation (or return)
        // Transform cartItems to match sales invoice CartItem interface
        const purchaseCartItems = cartItems.map((item) => ({
          id: item.id,
          product: item.product || { name: "Unknown Product" },
          quantity: item.quantity,
          selectedColors: item.selected_color
            ? { [item.selected_color]: item.quantity }
            : null,
          price: item.price,
          total: item.price * item.quantity,
        }));

        // حساب المبلغ المدفوع من PaymentSplit أو من حقل paidAmount
        const paidFromSplit = paymentSplitData.reduce((sum, p) => sum + (p.amount || 0), 0);
        const actualPaidAmount = paidFromSplit > 0 ? paidFromSplit : (parseFloat(paidAmount) || 0);

        const result = await createPurchaseInvoice({
          cartItems: purchaseCartItems,
          selections: {
            supplier: selectedSupplier,
            branch: selections.branch,
            record: selections.record,
            subSafe: selections.subSafe,
          },
          paymentMethod: "cash",
          notes: isReturnMode
            ? `مرتجع شراء - ${cartItems.length} منتج`
            : `فاتورة شراء - ${cartItems.length} منتج`,
          isReturn: isReturnMode,
          paidAmount: actualPaidAmount,
        });

        // Check if payment failed
        if (actualPaidAmount > 0 && !result.paymentCreated) {
          console.error('❌ Payment failed:', result.paymentError)
          alert(`تم إنشاء الفاتورة لكن فشل تسجيل الدفعة: ${result.paymentError || 'خطأ غير معروف'}`)
        }

        // Store invoice data for printing
        setLastInvoiceData({
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount,
          cartItems: cartItems,
          isReturn: isReturnMode,
          isPurchaseMode: true,
          date: new Date(),
          supplier: selectedSupplier,
          branch: selections.branch,
          record: selections.record,
          cashTendered: parseFloat(paidAmount) || 0,
          primaryPaymentMethod: 'كاش',
        });

        // Show print confirmation modal
        setShowPrintReceiptModal(true);
        activityLog({ entityType: 'purchase', actionType: 'create', entityId: result.invoiceId, entityName: `فاتورة شراء #${result.invoiceNumber}` });
      } else {
        // Handle sales invoice creation (or return)
        // Transform cartItems to match sales invoice CartItem interface
        const salesCartItems = cartItems.map((item) => {
          // حساب الإجمالي بعد خصم المنتج
          let itemTotal = item.price * item.quantity;
          if (item.discount) {
            if (item.discountType === "percentage") {
              itemTotal -= (itemTotal * item.discount) / 100;
            } else {
              itemTotal -= item.discount;
            }
          }
          itemTotal = Math.max(0, itemTotal);

          return {
            id: item.id,
            product: item.product || { name: "Unknown Product" },
            quantity: item.quantity,
            selectedColors: item.selected_color
              ? { [item.selected_color]: item.quantity }
              : null,
            price: item.price,
            total: itemTotal,
            discount: item.discount,
            discountType: item.discountType,
            branch_id: item.branch_id || selections.branch?.id || '',
            branch_name: item.branch_name || selections.branch?.name || '',
          };
        });

        // Save customer balance BEFORE invoice creation (for receipt)
        const balanceBefore = selections.customer?.calculated_balance || 0;

        const result = await createSalesInvoice({
          cartItems: salesCartItems,
          selections: {
            customer: frozenSelections.customer,
            branch: frozenSelections.branch,
            record: frozenSelections.record,
            subSafe: frozenSelections.subSafe,
          },
          notes: isReturnMode
            ? `مرتجع بيع - ${cartItems.length} منتج`
            : selectedPartyType === 'supplier'
              ? `بيع لمورد - ${cartItems.length} منتج`
              : `فاتورة بيع - ${cartItems.length} منتج`,
          isReturn: isReturnMode, // Pass return mode flag
          paymentSplitData: paymentSplitData, // Pass payment split data
          creditAmount: creditAmount, // Pass credit amount
          userId: user?.id || null, // Pass current user ID for tracking
          userName: user?.name || null, // Pass current user name for performed_by
          // Party type support (customer or supplier)
          partyType: selectedPartyType,
          supplierId: selectedPartyType === 'supplier' ? selectedSupplierForSale?.id : null,
          supplierName: selectedPartyType === 'supplier' ? selectedSupplierForSale?.name : null,
          // Cart-level discount
          cartDiscount: cartDiscount,
          cartDiscountType: cartDiscountType,
        });

        // Fetch customer's updated data and calculate balance after invoice creation
        let customerForReceipt = selections.customer;
        let calculatedBalance = 0;
        if (selections.customer && selections.customer.id !== '00000000-0000-0000-0000-000000000001') {
          // Fetch customer basic info including opening_balance
          const { data: customerData } = await supabase
            .from('customers')
            .select('id, name, phone, address, city, opening_balance')
            .eq('id', selections.customer.id)
            .single();

          // Calculate customer balance from sales and payments (exclude cancelled)
          const [salesRes, paymentsRes] = await Promise.all([
            supabase
              .from('sales')
              .select('total_amount')
              .eq('customer_id', selections.customer.id)
              .neq('status', 'cancelled'),
            supabase
              .from('customer_payments')
              .select('amount, notes')
              .eq('customer_id', selections.customer.id)
              .neq('status', 'cancelled')
          ]);

          const salesTotal = (salesRes.data || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);

          // Separate loans (سلفة) from regular payments (دفعة)
          let totalRegularPayments = 0;
          let totalLoans = 0;
          (paymentsRes.data || []).forEach((payment: any) => {
            const isLoan = payment.notes?.startsWith('سلفة');
            if (isLoan) {
              totalLoans += (payment.amount || 0);
            } else {
              totalRegularPayments += (payment.amount || 0);
            }
          });

          const openingBalance = customerData?.opening_balance || 0;
          // Correct formula: opening_balance + sales + loans - payments
          calculatedBalance = openingBalance + salesTotal + totalLoans - totalRegularPayments;

          if (customerData) {
            customerForReceipt = { ...selections.customer, ...customerData, calculatedBalance };
          } else {
            customerForReceipt = { ...selections.customer, calculatedBalance };
          }
        }

        // Build payment method names map for the receipt
        const paymentMethodNames: Record<string, number> = {}
        if (paymentSplitData && paymentSplitData.length > 0) {
          paymentSplitData.filter(p => p.amount > 0).forEach(p => {
            const name = (p as any).paymentMethodName || 'cash'
            paymentMethodNames[name] = (paymentMethodNames[name] || 0) + p.amount
          })
        }

        // Store invoice data for printing
        setLastInvoiceData({
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount,
          cartItems: cartItems,
          isReturn: isReturnMode,
          isPurchaseMode: false,
          date: new Date(),
          customer: customerForReceipt,
          branch: selections.branch,
          record: selections.record,
          paymentSplitData: paymentSplitData,
          creditAmount: creditAmount,
          paymentMethodNames: paymentMethodNames,
          cashTendered: parseFloat(paidAmount) || 0,
          primaryPaymentMethod: paymentSplitData[0]?.paymentMethodName || 'كاش',
          isDefaultCustomer: selections.customer?.id === defaultCustomer?.id,
          balanceBefore: balanceBefore,
          balanceAfter: calculatedBalance,
        });

        // Show print confirmation modal
        setShowPrintReceiptModal(true);
        activityLog({ entityType: 'sale', actionType: 'create', entityId: result.invoiceId, entityName: `فاتورة ${isReturnMode ? 'مرتجع' : ''} #${result.invoiceNumber}` });
      }

      // Clear cart after successful invoice creation
      clearCart();

      // Reset PaymentSplit to default (cash)
      setInvoiceCounter(prev => prev + 1);

      // Reset paid amount (change calculator)
      setPaidAmount("");

      // Close tab if not the main tab
      if (activeTabId !== 'main') {
        closeTab(activeTabId);
      }

      // Reset to default customer after sales (not purchase or transfer)
      if (!isPurchaseMode && !isTransferMode) {
        await resetToDefaultCustomer();
        // Reset price type to default (سعر البيع) after invoice
        setSelectedPriceType("price");
      }

      // Exit return mode after successful return
      if (isReturnMode) {
        setIsReturnMode(false);
      }

      // Real-time subscriptions handle inventory updates automatically
      // No need for handleRefresh() - it causes products to disappear/flicker
    } catch (error: any) {
      console.error("Invoice creation error:", error);
      console.error("Cart items at time of error:", cartItems);
      console.error("Selections at time of error:", {
        customer: selections.customer,
        branch: selections.branch,
        record: selections.record,
      });

      const errorType = isReturnMode
        ? isPurchaseMode
          ? "مرتجع الشراء"
          : "مرتجع البيع"
        : isPurchaseMode
          ? "فاتورة الشراء"
          : "الفاتورة";
      alert(`خطأ في إنشاء ${errorType}: ${error.message}`);
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  // Y keyboard shortcut to confirm order
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' ||
                             activeElement?.tagName === 'TEXTAREA' ||
                             activeElement?.getAttribute('contenteditable') === 'true';

      if ((e.key === 'y' || e.key === 'Y') && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        handleCreateInvoice();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  });

  // Purchase Mode Functions
  const handlePurchaseModeToggle = () => {
    // افتح نافذة اختيار الطرف (عميل/مورد) مع تحديد المورد كافتراضي
    // يمكن للمستخدم التبديل للعميل إذا أراد (مثلاً للشراء من عميل)
    setIsPartyModalForPurchase(true);
    setIsPartyModalOpen(true);
  };

  const confirmPurchaseMode = () => {
    setIsPurchaseMode(true);
    setShowPurchaseModeConfirm(false);
    // Clear customer/branch but preserve record (safe) when switching to purchase mode
    clearSelectionsExceptRecord();
    clearCart();
  };

  const cancelPurchaseMode = () => {
    setShowPurchaseModeConfirm(false);
  };

  const exitPurchaseMode = () => {
    setIsPurchaseMode(false);
    setIsReturnMode(false); // Also exit return mode
    setSelectedCustomerForPurchase(null); // Reset customer for purchase
    // Clear customer/branch but preserve record (safe) when exiting purchase mode
    clearSelectionsExceptRecord();
    clearCart();
  };

  // Handler لاختيار المورد وتفعيل وضع الشراء
  const handleSupplierSelectForPurchase = (supplier: any) => {
    // تفعيل وضع الشراء
    setIsPurchaseMode(true);
    setSelectedSupplier(supplier);
    setSelectedCustomerForPurchase(null); // Reset customer when selecting supplier directly

    // إنشاء tab جديد باسم المورد
    const tabName = supplier.name;
    addTab(tabName, {
      customer: null,
      branch: globalSelections.branch,
      record: globalSelections.record,
      subSafe: globalSelections.subSafe,
      priceType: 'cost_price',
      isPurchaseMode: true,
      selectedSupplier: supplier,
    });

    // إغلاق نافذة المورد وإعادة تعيين الـ flag
    setIsSupplierModalOpen(false);
    setIsSupplierModalForNewPurchase(false);
  };

  // Handler لتغيير المورد في وضع الشراء (بدون فتح tab جديد)
  const handleSupplierChange = (supplier: any) => {
    setSelectedSupplier(supplier);
    setSelectedCustomerForPurchase(null); // Reset customer when changing to supplier
    setIsSupplierModalOpen(false);
    setIsSupplierModalForNewPurchase(false);
  };

  // Transfer Mode Functions
  const handleTransferModeToggle = () => {
    // Just open the transfer location modal — don't clear cart or change modes on current tab
    setIsTransferLocationModalOpen(true);
  };

  const handleTransferLocationConfirm = (
    fromLocation: any,
    toLocation: any,
  ) => {
    setIsTransferLocationModalOpen(false);
    const title = `\u2066${fromLocation.name} → ${toLocation.name}\u2069`;

    // If changing transfer locations for an existing tab (from context menu)
    if (contextMenuTransferTabId) {
      const targetTabId = contextMenuTransferTabId;
      updateTabTransferLocations(targetTabId, fromLocation, toLocation, title);
      // Update local state if this is the active tab
      if (targetTabId === activeTabId) {
        setTransferFromLocation(fromLocation);
        setTransferToLocation(toLocation);
      }
      setContextMenuTransferTabId(null);
      return;
    }

    // Create a NEW TAB for this transfer (LTR isolate to prevent BiDi reordering)
    addTab(title, {
      branch: selections.branch,
      record: selections.record,
      subSafe: selections.subSafe,
      priceType: selectedPriceType,
      isTransferMode: true,
      transferFromLocation: fromLocation,
      transferToLocation: toLocation,
    });
    // Set local mode states for the new active tab
    setIsTransferMode(true);
    setIsPurchaseMode(false);
    setIsReturnMode(false);
    setTransferFromLocation(fromLocation);
    setTransferToLocation(toLocation);
    setSelectedCustomerForPurchase(null);
  };

  const exitTransferMode = () => {
    setIsTransferMode(false);
    setTransferFromLocation(null);
    setTransferToLocation(null);
    clearCart();
  };

  const handleTransferProductClick = async (product: any) => {
    setModalProduct(product);

    console.log("نقل المنتج:", product);
    console.log("من:", transferFromLocation);
    console.log("إلى:", transferToLocation);

    // Always use ColorSelectionModal for consistency in transfer mode
    // This modal will handle products with or without colors properly
    setShowColorSelectionModal(true);
  };

  const toggleSupplierModal = () => {
    setIsSupplierModalOpen(!isSupplierModalOpen);
  };

  const handleQuickAddProduct = (product: any) => {
    setSelectedProduct(product);
    setShowQuickAddProductModal(true);
  };

  const handleQuickAddToCart = (productData: any) => {
    // Use the main handleAddToCart function to ensure consistent grouping
    handleAddToCart(productData, productData.quantity);

    // مسح البحث وإعادة التركيز على حقل البحث
    searchInputRef.current?.clearSearch();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Handle update cart item (for editing new products in purchase mode)
  const handleUpdateCartItem = (itemId: string, updatedData: any) => {
    const newCart = cartItems.map(item =>
      item.id === itemId
        ? {
            ...item,
            product: { ...item.product, ...updatedData },
            price: updatedData.cost_price || item.price,
            quantity: updatedData.quantity || item.quantity
          }
        : item
    );
    setCartItems(newCart);
    updateActiveTabCart(newCart);
    setShowQuickAddProductModal(false);
    setEditingCartItem(null);
  };

  // Check if all required selections are made for purchase mode
  const hasRequiredForPurchase = () => {
    return selectedSupplier && selections.branch && selections.record;
  };

  // Check if all required selections are made (works for both modes)
  const hasAllRequiredSelections = () => {
    // In edit mode, skip validation - the original invoice already had valid selections
    // User is just modifying items, not creating a new invoice
    if (activePOSTab?.isEditMode) {
      return true;
    }

    if (isTransferMode) {
      return transferFromLocation && transferToLocation && selections.record;
    } else if (isPurchaseMode) {
      return hasRequiredForPurchase();
    } else {
      return hasRequiredForSale();
    }
  };

  // Helper function to convert numbers to Arabic words
  const numberToArabicWords = (num: number): string => {
    if (num === 0) return 'صفر';

    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];

    let result = '';
    const intNum = Math.floor(num);

    // Thousands
    const thousands = Math.floor(intNum / 1000);
    if (thousands > 0) {
      if (thousands === 1) result += 'ألف';
      else if (thousands === 2) result += 'ألفان';
      else if (thousands >= 3 && thousands <= 10) result += ones[thousands] + ' آلاف';
      else result += numberToArabicWords(thousands) + ' ألف';
      result += ' و';
    }

    const remainder = intNum % 1000;
    const hundredsDigit = Math.floor(remainder / 100);
    const tensRemainder = remainder % 100;
    const tensDigit = Math.floor(tensRemainder / 10);
    const onesDigit = tensRemainder % 10;

    // Hundreds
    if (hundredsDigit > 0) {
      result += hundreds[hundredsDigit];
      if (tensRemainder > 0) result += ' و';
    }

    // Tens and ones
    if (tensRemainder >= 10 && tensRemainder < 20) {
      result += teens[tensRemainder - 10];
    } else {
      if (tensDigit > 0) {
        result += tens[tensDigit];
        if (onesDigit > 0) result += ' و';
      }
      if (onesDigit > 0) {
        result += ones[onesDigit];
      }
    }

    return result.trim().replace(/\s*و$/, '');
  };

  // Print Receipt Function
  const printReceipt = (invoiceData?: any) => {
    const dataToUse = invoiceData || lastInvoiceData;
    if (!dataToUse) {
      alert("لا توجد بيانات فاتورة للطباعة");
      return;
    }

    // Create receipt content based on the image format
    const receiptContent = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة رقم ${dataToUse.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 13px;
              line-height: 1.3;
              color: #000;
              background: white;
              width: 100%;
              margin: 0;
              padding: 0;
            }
            
            .receipt-header {
              text-align: center;
              margin-bottom: 3px;
              padding: 0 2px;
            }
            
            .company-logo {
              width: 60px;
              height: auto;
              margin: 0 auto 4px auto;
              display: block;
              max-height: 60px;
              object-fit: contain;
            }
            
            .company-logo-fallback {
              display: none;
            }
            
            .company-name {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 2px;
              color: #000;
            }
            
            .receipt-date {
              font-size: 11px;
              margin-bottom: 1px;
            }
            
            .receipt-address {
              font-size: 10px;
              margin-bottom: 1px;
            }
            
            .receipt-phone {
              font-size: 10px;
            }

            .customer-info {
              margin: 10px 20px;
              padding: 8px;
              border: 1px dashed #333;
              background-color: #f9f9f9;
            }

            .customer-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
            }

            .customer-label {
              font-weight: 600;
              color: #333;
            }

            .customer-value {
              color: #000;
            }

            .items-table {
              width: calc(100% - 40px);
              border-collapse: collapse;
              margin: 3px 20px;
              border: 1px solid #000;
              table-layout: fixed; /* Forces table to use full width */
            }
            
            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 7px;
              text-align: center;
              font-size: 14px;
              font-weight: 400;
            }
            
            .items-table th {
              background-color: #f5f5f5;
              font-weight: 600;
              font-size: 14px;
            }
            
            /* Column width optimization for 80mm thermal paper */
            .items-table th:nth-child(1),
            .items-table td:nth-child(1) {
              width: 45%; /* Item name - reduced slightly */
            }
            
            .items-table th:nth-child(2),
            .items-table td:nth-child(2) {
              width: 12%; /* Quantity - reduced slightly */
            }
            
            .items-table th:nth-child(3),
            .items-table td:nth-child(3) {
              width: 18%; /* Price - same */
            }
            
            .items-table th:nth-child(4),
            .items-table td:nth-child(4) {
              width: 25%; /* Total - increased for full visibility */
              text-align: right !important; /* Align value column to the right */
              padding-right: 4px !important;
            }

            .item-name {
              text-align: right !important;
              padding-right: 12px !important;
              padding-left: 2px !important;
              font-size: 15px;
              font-weight: bold;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
            }

            .total-row {
              border-top: 2px solid #000;
              font-weight: 700;
              font-size: 12px;
            }
            .tbl-close {
              height: 0;
              border-top: 2px solid #000;
              width: calc(100% - 40px);
              margin: 0 20px;
            }

            .payment-section {
              margin-top: 8px;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              padding: 0 2px;
            }

            /* Payment grid - div-based for thermal printer reliability */
            .pay-grid {
              margin: 5px 4px;
              font-size: 11px;
            }
            .pay-hline {
              height: 0;
              border-top: 1px solid #000;
            }
            .pay-hline-thick {
              height: 0;
              border-top: 2px solid #000;
            }
            .pay-row {
              display: flex;
              align-items: stretch;
              min-height: 22px;
            }
            .pay-cell {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 3px 6px;
            }
            .pay-cell-head {
              font-weight: bold;
            }
            .pay-sep {
              width: 0;
              border-left: 1px solid #000;
            }
            .pay-row-border {
              border-left: 1px solid #000;
              border-right: 1px solid #000;
            }

            .footer {
              text-align: center;
              margin-top: 8px;
              font-size: 9px;
              border-top: 1px solid #000;
              padding: 3px 2px 0 2px;
            }

            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              body {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 0 1.5mm !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .company-logo {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .no-print {
                display: none;
              }
              
              .items-table {
                margin: 3px 0;
                width: 100% !important;
              }
              
              .items-table th,
              .items-table td {
                padding: 2px;
              }

              .pay-grid {
                margin: 5px 0 !important;
                width: 100% !important;
              }

              .tbl-close {
                width: 100% !important;
                margin: 0 !important;
                border-top: 2px solid #000 !important;
              }

              /* Ensure no containers limit width */
              * {
                max-width: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <img
              src="${logoUrl || (window.location.origin + '/assets/logo/El Farouk Group2.png')}"
              alt="${companyName}"
              class="company-logo"
              onerror="this.style.display='none'; document.querySelector('.company-logo-fallback').style.display='block';"
            />
            <div class="company-logo-fallback" style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">🏢</div>
            <div class="company-name">${companyName}</div>
            <div class="receipt-date">${new Date().toLocaleDateString("ar-EG")} - ${new Date().toLocaleDateString("en-US")}</div>
            <div class="receipt-address">${selections.branch?.name || "الفرع الرئيسي"}</div>
            <div class="receipt-phone">${selections.branch?.phone || "01102862856"}</div>
          </div>

          ${
            // Show customer info for non-default customers only (if they have at least one field)
            dataToUse.customer &&
            dataToUse.customer.id !== '00000000-0000-0000-0000-000000000001' &&
            (dataToUse.customer.name || dataToUse.customer.phone || dataToUse.customer.address || dataToUse.customer.city)
              ? `
          <div class="customer-info">
            ${dataToUse.customer.name ? `<div class="customer-row"><span class="customer-label">العميل:</span> <span class="customer-value">${dataToUse.customer.name}</span></div>` : ''}
            ${dataToUse.customer.phone ? `<div class="customer-row"><span class="customer-label">الهاتف:</span> <span class="customer-value">${dataToUse.customer.phone}</span></div>` : ''}
            ${dataToUse.customer.address ? `<div class="customer-row"><span class="customer-label">العنوان:</span> <span class="customer-value">${dataToUse.customer.address}</span></div>` : ''}
            ${dataToUse.customer.city ? `<div class="customer-row"><span class="customer-label">المدينة:</span> <span class="customer-value">${dataToUse.customer.city}</span></div>` : ''}
          </div>
              `
              : ''
          }

          <table class="items-table">
            <thead>
              <tr>
                <th class="item-name">الصنف</th>
                <th>كمية</th>
                <th>سعر</th>
                <th>قيمة</th>
              </tr>
            </thead>
            <tbody>
              ${dataToUse.cartItems
                .map(
                  (item: any) => `
                <tr>
                  <td class="item-name">${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toFixed(0)}</td>
                  <td>${(item.price * item.quantity).toFixed(0)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td class="item-name">-</td>
                <td>${dataToUse.cartItems.length}</td>
                <td>= اجمالي =</td>
                <td>${dataToUse.totalAmount.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
          <div class="tbl-close"></div>

          ${(() => {
            const pmNames = dataToUse.paymentMethodNames || {}
            const pmKeys = Object.keys(pmNames)
            const hasCreditAmount = (dataToUse.creditAmount || 0) > 0
            const isNonDefaultCustomer = dataToUse.customer && dataToUse.customer.id !== '00000000-0000-0000-0000-000000000001'
            const cashTendered = dataToUse.cashTendered || 0
            const changeAmount = cashTendered - dataToUse.totalAmount

            let paymentRows = ''
            if (pmKeys.length > 0) {
              paymentRows = pmKeys.map(name =>
                `<div class="pay-row pay-row-border"><div class="pay-cell">${pmNames[name].toFixed(0)}</div><div class="pay-sep"></div><div class="pay-cell">${name}</div></div><div class="pay-hline"></div>`
              ).join('')
            } else {
              paymentRows = `<div class="pay-row pay-row-border"><div class="pay-cell">${dataToUse.totalAmount.toFixed(0)}</div><div class="pay-sep"></div><div class="pay-cell">${dataToUse.primaryPaymentMethod || 'كاش'}</div></div><div class="pay-hline"></div>`
            }
            if (hasCreditAmount && !isNonDefaultCustomer) {
              paymentRows += `<div class="pay-row pay-row-border"><div class="pay-cell" style="color: #c00;">${(dataToUse.creditAmount || 0).toFixed(0)}</div><div class="pay-sep"></div><div class="pay-cell" style="color: #c00;">آجل</div></div><div class="pay-hline"></div>`
            }
            if (dataToUse.isDefaultCustomer && cashTendered > 0) {
              paymentRows += `<div class="pay-row pay-row-border"><div class="pay-cell" style="font-weight: bold;">${cashTendered.toFixed(0)}</div><div class="pay-sep"></div><div class="pay-cell" style="font-weight: bold;">المدفوع</div></div><div class="pay-hline"></div>`
            }
            if (dataToUse.isDefaultCustomer && cashTendered > 0 && changeAmount > 0) {
              paymentRows += `<div class="pay-row pay-row-border"><div class="pay-cell" style="font-weight: bold;">${changeAmount.toFixed(0)}</div><div class="pay-sep"></div><div class="pay-cell" style="font-weight: bold;">الباقي</div></div><div class="pay-hline"></div>`
            }

            return `
          <div class="payment-section">
            ${numberToArabicWords(dataToUse.totalAmount)} جنيهاً

            <div class="pay-grid">
              <div class="pay-hline"></div>
              <div class="pay-row pay-row-border">
                <div class="pay-cell pay-cell-head">المبلغ</div>
                <div class="pay-sep"></div>
                <div class="pay-cell pay-cell-head">طريقة الدفع</div>
              </div>
              <div class="pay-hline"></div>
              ${paymentRows}
              <div class="pay-hline-thick"></div>
            </div>
            ${isNonDefaultCustomer ? `
            <div style="margin-top: 6px; font-size: 11px; text-align: center;">
              <div>الرصيد السابق: <strong>${(dataToUse.balanceBefore || 0).toFixed(0)}</strong></div>
              <div>الرصيد الحالي: <strong>${(dataToUse.balanceAfter || 0).toFixed(0)}</strong></div>
            </div>
            ` : ''}
          </div>`
          })()}

          <div class="footer">
            ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB", { hour12: false })} by: ${selections.record?.name || "kassem"}
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">طباعة</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">إغلاق</button>
          </div>
        </body>
      </html>
    `;

    // Open new window with receipt content
    const printWindow = window.open(
      "",
      "_blank",
      "width=450,height=650,scrollbars=yes,resizable=yes",
    );
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();

      // Auto-focus the print window
      printWindow.focus();

      // Optional: Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert("يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة");
    }
  };

  // Print Preview Receipt - for printing current cart before confirmation (as review/draft)
  const printPreviewReceipt = () => {
    if (cartItems.length === 0) {
      alert("السلة فارغة - لا يوجد منتجات للطباعة");
      return;
    }

    // Calculate total with any discounts applied
    const totalAmount = calculateTotalWithDiscounts();

    // Get paid amount from payment split if available
    const paidFromSplit = paymentSplitData.reduce((sum, p) => sum + (p.amount || 0), 0);
    const actualPaid = paidFromSplit > 0 ? paidFromSplit : (parseFloat(paidAmount) || totalAmount);
    const remainingCredit = Math.max(0, totalAmount - actualPaid);

    // Create preview receipt content (similar to invoice but marked as "مراجعة")
    const previewReceiptContent = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>مراجعة الطلب</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Arial', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 13px;
              line-height: 1.3;
              color: #000;
              background: white;
              width: 100%;
              margin: 0;
              padding: 0;
            }

            .preview-banner {
              background: #ff9800;
              color: white;
              text-align: center;
              padding: 8px;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
              border: 2px dashed #e65100;
            }

            .receipt-header {
              text-align: center;
              margin-bottom: 3px;
              padding: 0 2px;
            }

            .company-logo {
              width: 60px;
              height: auto;
              margin: 0 auto 4px auto;
              display: block;
              max-height: 60px;
              object-fit: contain;
            }

            .company-logo-fallback {
              display: none;
            }

            .company-name {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 2px;
              color: #000;
            }

            .receipt-date {
              font-size: 11px;
              margin-bottom: 1px;
            }

            .receipt-address {
              font-size: 10px;
              margin-bottom: 1px;
            }

            .receipt-phone {
              font-size: 10px;
            }

            .customer-info {
              margin: 10px 20px;
              padding: 8px;
              border: 1px dashed #333;
              background-color: #f9f9f9;
            }

            .customer-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 11px;
            }

            .customer-label {
              font-weight: 600;
              color: #333;
            }

            .customer-value {
              color: #000;
            }

            .items-table {
              width: calc(100% - 40px);
              border-collapse: collapse;
              margin: 3px 20px;
              border: 1px solid #000;
              table-layout: fixed;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 7px;
              text-align: center;
              font-size: 14px;
              font-weight: 400;
            }

            .items-table th {
              background-color: #f5f5f5;
              font-weight: 600;
              font-size: 14px;
            }

            .items-table th:nth-child(1),
            .items-table td:nth-child(1) {
              width: 45%;
            }

            .items-table th:nth-child(2),
            .items-table td:nth-child(2) {
              width: 12%;
            }

            .items-table th:nth-child(3),
            .items-table td:nth-child(3) {
              width: 18%;
            }

            .items-table th:nth-child(4),
            .items-table td:nth-child(4) {
              width: 25%;
              text-align: right !important;
              padding-right: 4px !important;
            }

            .item-name {
              text-align: right !important;
              padding-right: 12px !important;
              padding-left: 2px !important;
              font-size: 15px;
              font-weight: bold;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
            }

            .total-row {
              border-top: 2px solid #000;
              font-weight: 700;
              font-size: 12px;
            }

            .payment-section {
              margin-top: 8px;
              text-align: center;
              font-size: 11px;
              padding: 0 2px;
            }

            .payment-table {
              width: calc(100% - 40px);
              border-collapse: collapse;
              margin: 5px 20px;
              border: 1px solid #000;
            }

            .payment-table th,
            .payment-table td {
              border: 1px solid #000;
              padding: 4px;
              text-align: center;
              font-size: 11px;
            }

            .payment-table-close {
              height: 2px;
              background: #000;
              width: calc(100% - 40px);
              margin: 0 20px;
            }

            .footer {
              text-align: center;
              margin-top: 8px;
              font-size: 9px;
              border-top: 1px solid #000;
              padding: 3px 2px 0 2px;
            }

            .preview-footer-note {
              background: #fff3cd;
              border: 1px dashed #ffc107;
              padding: 5px;
              margin: 8px 20px;
              text-align: center;
              font-size: 10px;
              color: #856404;
            }

            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }

              body {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 0 1.5mm !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .preview-banner {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .company-logo {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .no-print {
                display: none;
              }

              .items-table {
                margin: 3px 0;
                width: 100% !important;
              }

              .items-table th,
              .items-table td {
                padding: 2px;
              }

              * {
                max-width: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="preview-banner">
            ⚠️ مراجعة الطلب - ليست فاتورة نهائية ⚠️
          </div>

          <div class="receipt-header">
            <img
              src="${logoUrl || (window.location.origin + '/assets/logo/El Farouk Group2.png')}"
              alt="${companyName}"
              class="company-logo"
              onerror="this.style.display='none'; document.querySelector('.company-logo-fallback').style.display='block';"
            />
            <div class="company-logo-fallback" style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">🏢</div>
            <div class="company-name">${companyName}</div>
            <div class="receipt-date">${new Date().toLocaleDateString("ar-EG")} - ${new Date().toLocaleDateString("en-US")}</div>
            <div class="receipt-address">${selections.branch?.name || "الفرع الرئيسي"}</div>
            <div class="receipt-phone">${selections.branch?.phone || "01102862856"}</div>
          </div>

          ${
            // Show customer info if customer is selected and not default
            selections.customer &&
            selections.customer.id !== '00000000-0000-0000-0000-000000000001' &&
            (selections.customer.name || selections.customer.phone || selections.customer.address || selections.customer.city)
              ? `
          <div class="customer-info">
            ${selections.customer.name ? `<div class="customer-row"><span class="customer-label">العميل:</span> <span class="customer-value">${selections.customer.name}</span></div>` : ''}
            ${selections.customer.phone ? `<div class="customer-row"><span class="customer-label">الهاتف:</span> <span class="customer-value">${selections.customer.phone}</span></div>` : ''}
            ${selections.customer.address ? `<div class="customer-row"><span class="customer-label">العنوان:</span> <span class="customer-value">${selections.customer.address}</span></div>` : ''}
            ${selections.customer.city ? `<div class="customer-row"><span class="customer-label">المدينة:</span> <span class="customer-value">${selections.customer.city}</span></div>` : ''}
          </div>
              `
              : ''
          }

          <table class="items-table">
            <thead>
              <tr>
                <th class="item-name">الصنف</th>
                <th>كمية</th>
                <th>سعر</th>
                <th>قيمة</th>
              </tr>
            </thead>
            <tbody>
              ${cartItems
                .map(
                  (item: any) => `
                <tr>
                  <td class="item-name">${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${(item.price || 0).toFixed(0)}</td>
                  <td>${((item.price || 0) * item.quantity).toFixed(0)}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total-row">
                <td class="item-name">-</td>
                <td>${cartItems.length}</td>
                <td>= اجمالي =</td>
                <td>${totalAmount.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>

          ${
            // Show payment section for non-default customers
            selections.customer &&
            selections.customer.id !== '00000000-0000-0000-0000-000000000001'
              ? `
          <div class="payment-section">
            ${numberToArabicWords(totalAmount)} جنيهاً

            <table class="payment-table">
              <tr>
                <th>مدفوع</th>
                <th>متبقي</th>
                <th>رصيد العميل الحالي</th>
              </tr>
              <tr>
                <td>${actualPaid.toFixed(0)}</td>
                <td>${remainingCredit.toFixed(0)}</td>
                <td>${(selections.customer?.credit_balance || selections.customer?.calculatedBalance || 0).toFixed(0)}</td>
              </tr>
            </table>
          </div>
              `
              : `
          <div class="payment-section">
            ${numberToArabicWords(totalAmount)} جنيهاً
          </div>
              `
          }

          <div class="preview-footer-note">
            📋 هذه مراجعة للطلب وليست فاتورة رسمية - يرجى التأكيد للحصول على الفاتورة النهائية
          </div>

          <div class="footer">
            ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB", { hour12: false })} by: ${selections.record?.name || "kassem"}
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer;">طباعة المراجعة</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">إغلاق</button>
          </div>
        </body>
      </html>
    `;

    // Open new window with preview receipt content
    const printWindow = window.open(
      "",
      "_blank",
      "width=450,height=700,scrollbars=yes,resizable=yes",
    );
    if (printWindow) {
      printWindow.document.write(previewReceiptContent);
      printWindow.document.close();
      printWindow.focus();

      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert("يرجى السماح بالنوافذ المنبثقة لطباعة المراجعة");
    }
  };

  // Open PDF Preview - for viewing/sharing current cart as PDF (without printing)
  const openPDFPreview = () => {
    if (cartItems.length === 0) {
      alert("السلة فارغة - لا يوجد منتجات للمعاينة");
      return;
    }

    // Calculate total with any discounts applied
    const totalAmount = calculateTotalWithDiscounts();

    // Get paid amount from payment split if available
    const paidFromSplit = paymentSplitData.reduce((sum, p) => sum + (p.amount || 0), 0);
    const actualPaid = paidFromSplit > 0 ? paidFromSplit : (parseFloat(paidAmount) || totalAmount);
    const remainingCredit = Math.max(0, totalAmount - actualPaid);

    // Create PDF-style preview content
    const pdfPreviewContent = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>معاينة الطلب - ${selections.customer?.name || 'عميل'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Cairo', 'Arial', sans-serif;
              font-size: 14px;
              line-height: 1.5;
              color: #000;
              background: #f5f5f5;
              padding: 20px;
            }

            .pdf-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }

            .preview-banner {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 12px;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              border-radius: 8px;
            }

            .receipt-header {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 2px dashed #ddd;
            }

            .company-logo {
              width: 80px;
              height: auto;
              margin: 0 auto 10px auto;
              display: block;
              max-height: 80px;
              object-fit: contain;
            }

            .company-name {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 5px;
              color: #333;
            }

            .receipt-date {
              font-size: 12px;
              color: #666;
              margin-bottom: 3px;
            }

            .receipt-address,
            .receipt-phone {
              font-size: 11px;
              color: #888;
            }

            .customer-info {
              margin: 15px 0;
              padding: 12px;
              border: 1px solid #e0e0e0;
              background-color: #fafafa;
              border-radius: 8px;
            }

            .customer-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 13px;
            }

            .customer-label {
              font-weight: 600;
              color: #555;
            }

            .customer-value {
              color: #000;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 10px 8px;
              text-align: center;
              font-size: 13px;
            }

            .items-table th {
              background-color: #f8f9fa;
              font-weight: 600;
              color: #333;
            }

            .items-table td:first-child {
              text-align: right;
              font-weight: 500;
            }

            .total-row {
              background-color: #e8f5e9;
              font-weight: 700;
            }

            .payment-section {
              margin-top: 15px;
              padding: 15px;
              background: #f0f7ff;
              border-radius: 8px;
              text-align: center;
            }

            .payment-total-text {
              font-size: 14px;
              color: #1976d2;
              margin-bottom: 10px;
            }

            .payment-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            .payment-table th,
            .payment-table td {
              border: 1px solid #bbdefb;
              padding: 8px;
              text-align: center;
              font-size: 12px;
            }

            .payment-table th {
              background: #e3f2fd;
              color: #1565c0;
            }

            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
              color: #999;
              padding-top: 10px;
              border-top: 1px dashed #ddd;
            }

            .preview-note {
              background: #fff8e1;
              border: 1px solid #ffecb3;
              padding: 10px;
              margin: 15px 0;
              text-align: center;
              font-size: 12px;
              color: #f57c00;
              border-radius: 8px;
            }

            .action-buttons {
              display: flex;
              gap: 10px;
              justify-content: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #eee;
            }

            .btn {
              padding: 12px 24px;
              font-size: 14px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              transition: all 0.3s ease;
            }

            .btn-primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }

            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .btn-secondary {
              background: #6c757d;
              color: white;
            }

            .btn-secondary:hover {
              background: #5a6268;
            }

            .btn-success {
              background: #28a745;
              color: white;
            }

            .btn-success:hover {
              background: #218838;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .pdf-container {
                box-shadow: none;
                max-width: none;
              }

              .action-buttons {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <div class="preview-banner">
              📋 معاينة الطلب
            </div>

            <div class="receipt-header">
              <img
                src="${logoUrl || (window.location.origin + '/assets/logo/El Farouk Group2.png')}"
                alt="${companyName}"
                class="company-logo"
                onerror="this.style.display='none';"
              />
              <div class="company-name">${companyName}</div>
              <div class="receipt-date">${new Date().toLocaleDateString("ar-EG")} - ${new Date().toLocaleTimeString("ar-EG")}</div>
              <div class="receipt-address">${selections.branch?.name || "الفرع الرئيسي"}</div>
              <div class="receipt-phone">${selections.branch?.phone || "01102862856"}</div>
            </div>

            ${
              selections.customer &&
              selections.customer.id !== '00000000-0000-0000-0000-000000000001' &&
              (selections.customer.name || selections.customer.phone || selections.customer.address || selections.customer.city)
                ? `
            <div class="customer-info">
              ${selections.customer.name ? `<div class="customer-row"><span class="customer-label">العميل:</span> <span class="customer-value">${selections.customer.name}</span></div>` : ''}
              ${selections.customer.phone ? `<div class="customer-row"><span class="customer-label">الهاتف:</span> <span class="customer-value">${selections.customer.phone}</span></div>` : ''}
              ${selections.customer.address ? `<div class="customer-row"><span class="customer-label">العنوان:</span> <span class="customer-value">${selections.customer.address}</span></div>` : ''}
              ${selections.customer.city ? `<div class="customer-row"><span class="customer-label">المدينة:</span> <span class="customer-value">${selections.customer.city}</span></div>` : ''}
            </div>
                `
                : ''
            }

            <table class="items-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${cartItems
                  .map(
                    (item: any) => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.quantity}</td>
                    <td>${(item.price || 0).toFixed(2)} ج.م</td>
                    <td>${((item.price || 0) * item.quantity).toFixed(2)} ج.م</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td>الإجمالي</td>
                  <td>${cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)}</td>
                  <td>-</td>
                  <td>${totalAmount.toFixed(2)} ج.م</td>
                </tr>
              </tbody>
            </table>

            ${
              selections.customer &&
              selections.customer.id !== '00000000-0000-0000-0000-000000000001'
                ? `
            <div class="payment-section">
              <div class="payment-total-text">
                ${numberToArabicWords(totalAmount)} جنيهاً مصرياً
              </div>

              <table class="payment-table">
                <tr>
                  <th>المبلغ المدفوع</th>
                  <th>المتبقي</th>
                  <th>رصيد العميل</th>
                </tr>
                <tr>
                  <td>${actualPaid.toFixed(2)} ج.م</td>
                  <td>${remainingCredit.toFixed(2)} ج.م</td>
                  <td>${(selections.customer?.credit_balance || selections.customer?.calculatedBalance || 0).toFixed(2)} ج.م</td>
                </tr>
              </table>
            </div>
                `
                : `
            <div class="payment-section">
              <div class="payment-total-text">
                ${numberToArabicWords(totalAmount)} جنيهاً مصرياً
              </div>
            </div>
                `
            }

            <div class="preview-note">
              ⚠️ هذه معاينة للطلب وليست فاتورة نهائية - يمكنك إرسالها للعميل للمراجعة
            </div>

            <div class="footer">
              تم إنشاء المعاينة: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB", { hour12: false })} | ${selections.record?.name || "kassem"}
            </div>

            <div class="action-buttons">
              <button onclick="window.print()" class="btn btn-primary">🖨️ طباعة</button>
              <button onclick="copyToClipboard()" class="btn btn-success">📋 نسخ النص</button>
              <button onclick="window.close()" class="btn btn-secondary">✕ إغلاق</button>
            </div>
          </div>

          <script>
            function copyToClipboard() {
              const items = ${JSON.stringify(cartItems.map((item: any) => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price || 0,
                total: (item.price || 0) * item.quantity
              })))};

              let text = "📋 *معاينة الطلب*\\n";
              text += "━━━━━━━━━━━━━━━━━━\\n";
              text += "🏪 ${companyName}\\n";
              text += "📅 ${new Date().toLocaleDateString("ar-EG")}\\n";
              ${selections.customer?.name ? `text += "👤 العميل: ${selections.customer.name}\\n";` : ''}
              text += "━━━━━━━━━━━━━━━━━━\\n\\n";

              items.forEach((item, index) => {
                text += (index + 1) + ". " + item.name + "\\n";
                text += "   الكمية: " + item.quantity + " | السعر: " + item.price.toFixed(2) + " ج.م\\n";
                text += "   الإجمالي: " + item.total.toFixed(2) + " ج.م\\n\\n";
              });

              text += "━━━━━━━━━━━━━━━━━━\\n";
              text += "💰 *الإجمالي الكلي: ${totalAmount.toFixed(2)} ج.م*\\n";
              text += "━━━━━━━━━━━━━━━━━━\\n\\n";
              text += "⚠️ هذه معاينة وليست فاتورة نهائية";

              navigator.clipboard.writeText(text).then(() => {
                alert("تم نسخ تفاصيل الطلب! يمكنك لصقها في WhatsApp أو أي تطبيق آخر");
              }).catch(() => {
                alert("فشل النسخ، يرجى المحاولة مرة أخرى");
              });
            }
          </script>
        </body>
      </html>
    `;

    // Open new window with PDF preview content
    const previewWindow = window.open(
      "",
      "_blank",
      "width=500,height=800,scrollbars=yes,resizable=yes",
    );
    if (previewWindow) {
      previewWindow.document.write(pdfPreviewContent);
      previewWindow.document.close();
      previewWindow.focus();
    } else {
      alert("يرجى السماح بالنوافذ المنبثقة لمعاينة الفاتورة");
    }
  };

  // Render Tablet View if tablet device detected
  if (isTabletDevice) {
    return (
      <>
        <POSTabletView
          products={products}
          filteredProducts={filteredProducts}
          isLoading={isLoading}
          error={error}
          onSearchChange={handleSearchChange}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          cartItems={cartItems}
          setCartItems={setCartItems}
          isCartOpen={isCartOpen}
          setIsCartOpen={setIsCartOpen}
          cartTotal={cartTotal}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          updateActiveTabCart={updateActiveTabCart}
          selections={selections}
          isPurchaseMode={isPurchaseMode}
          isTransferMode={isTransferMode}
          isReturnMode={isReturnMode}
          selectedSupplier={selectedSupplier}
          setIsRecordsModalOpen={setIsRecordsModalOpen}
          setIsCustomerModalOpen={setIsCustomerModalOpen}
          setIsHistoryModalOpen={setIsHistoryModalOpen}
          setIsSupplierModalOpen={setIsSupplierModalOpen}
          setShowQuickAddProductModal={setShowQuickAddProductModal}
          setShowColumnsModal={setShowColumnsModal}
          handleProductClick={handleProductClick}
          selectedProduct={selectedProduct}
          showColorSelectionModal={showColorSelectionModal}
          setShowColorSelectionModal={setShowColorSelectionModal}
          modalProduct={modalProduct}
          setModalProduct={setModalProduct}
          handleColorSelection={handleColorSelection}
          hasRequiredForCart={hasRequiredForCart}
          transferFromLocation={transferFromLocation}
          handleCreateInvoice={handleCreateInvoice}
          hasAllRequiredSelections={hasAllRequiredSelections}
          isProcessingInvoice={isProcessingInvoice}
          setPaymentSplitData={setPaymentSplitData}
          setCreditAmount={setCreditAmount}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          posTabs={posTabs}
          activeTab={activePOSTab}
          switchTab={switchTab}
          closeTab={closeTab}
          setShowAddTabModal={setShowAddTabModal}
          setShowNewTabCustomerModal={setShowNewTabCustomerModal}
          setShowPurchaseModeConfirm={setShowPurchaseModeConfirm}
          setIsTransferMode={setIsTransferMode}
          setTransferFromLocation={setTransferFromLocation}
          setTransferToLocation={setTransferToLocation}
          setIsTransferLocationModalOpen={setIsTransferLocationModalOpen}
          setIsReturnMode={setIsReturnMode}
          clearSelections={clearSelections}
        />

        {/* Modals */}
        <RecordsSelectionModal
          isOpen={isRecordsModalOpen}
          onClose={() => setIsRecordsModalOpen(false)}
          onSelectRecord={handleRecordSelect}
        />

        <CustomerSelectionModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectCustomer={handleCustomerSelect}
        />

        {/* Customer Selection Modal for New Tab (from + button) */}
        <CustomerSelectionModal
          isOpen={showNewTabCustomerModal}
          onClose={() => setShowNewTabCustomerModal(false)}
          onSelectCustomer={handleNewTabCustomerSelect}
        />

        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />

        <SupplierSelectionModal
          isOpen={isSupplierModalOpen}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setIsSupplierModalForNewPurchase(false);
          }}
          onSelect={isSupplierModalForNewPurchase ? handleSupplierSelectForPurchase : handleSupplierChange}
          selectedSupplier={selectedSupplier}
          isPurchaseMode={isSupplierModalForNewPurchase}
        />

        <TransferLocationModal
          isOpen={isTransferLocationModalOpen}
          onClose={() => setIsTransferLocationModalOpen(false)}
          onConfirm={handleTransferLocationConfirm}
        />

        <QuickAddProductModal
          isOpen={showQuickAddProductModal}
          onClose={() => {
            setShowQuickAddProductModal(false);
            setEditingCartItem(null);
          }}
          onAddToCart={handleQuickAddToCart}
          editingItem={editingCartItem}
          onUpdateCartItem={handleUpdateCartItem}
        />

        <ColumnsControlModal
          isOpen={showColumnsModal}
          onClose={() => setShowColumnsModal(false)}
          columns={getAllColumns()}
          onColumnsChange={handleColumnsChange}
        />

        {/* Add Tab Modal */}
        {showAddTabModal && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center" onClick={() => setShowAddTabModal(false)}>
            <div className="bg-[var(--dash-bg-surface)] rounded-lg p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[var(--dash-text-primary)] text-lg font-medium mb-4">إضافة نافذة بيع جديدة</h3>
              <input
                type="text"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="اسم النافذة..."
                className="w-full px-4 py-2 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue mb-4"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newTabName.trim()) {
                    // Inherit selections from current tab, but ALWAYS use default customer
                    addTab(newTabName.trim(), {
                      customer: defaultCustomer || globalSelections.customer,
                      branch: globalSelections.branch,
                      record: selections.record,
                      subSafe: selections.subSafe,
                      priceType: selectedPriceType,
                    });
                    setNewTabName("");
                    setShowAddTabModal(false);
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setNewTabName("");
                    setShowAddTabModal(false);
                  }}
                  className="px-4 py-2 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    if (newTabName.trim()) {
                      // Inherit selections from current tab, but ALWAYS use default customer
                      addTab(newTabName.trim(), {
                        customer: defaultCustomer || globalSelections.customer,
                        branch: globalSelections.branch,
                        record: selections.record,
                        subSafe: selections.subSafe,
                        priceType: selectedPriceType,
                      });
                      setNewTabName("");
                      setShowAddTabModal(false);
                    }
                  }}
                  className="px-4 py-2 dash-btn-primary rounded transition-colors"
                  disabled={!newTabName.trim()}
                >
                  موافق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Mode Confirmation Modal */}
        {showPurchaseModeConfirm && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowPurchaseModeConfirm(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">
                      تفعيل وضع الشراء
                    </h2>
                    <p className="text-[var(--dash-text-muted)] text-sm">
                      {isPurchaseMode
                        ? "إيقاف وضع الشراء والعودة لوضع البيع"
                        : "تفعيل وضع الشراء من الموردين"}
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[var(--dash-text-primary)] mb-4">
                    {isPurchaseMode
                      ? "هل تريد إيقاف وضع الشراء والعودة لوضع البيع؟"
                      : "هل تريد تفعيل وضع الشراء من الموردين؟"}
                  </p>
                  {!isPurchaseMode && (
                    <div className="bg-dash-accent-blue-subtle border border-dash-accent-blue rounded-lg p-4">
                      <p className="text-dash-accent-blue text-sm">
                        📝 في وضع الشراء، سيتم تحديد المورد والمخزن بدلاً من
                        العميل والفرع.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-[var(--dash-border-default)]">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPurchaseModeConfirm(false)}
                      className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-3 rounded-lg font-medium transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        setIsPurchaseMode(!isPurchaseMode);
                        if (isPurchaseMode) {
                          setSelectedSupplier(null);
                        }
                        setShowPurchaseModeConfirm(false);
                      }}
                      className="flex-1 dash-btn-purple py-3 rounded-lg font-medium transition-colors"
                    >
                      {isPurchaseMode ? "إيقاف وضع الشراء" : "تفعيل وضع الشراء"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Print Receipt Confirmation Modal */}
        {showPrintReceiptModal && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowPrintReceiptModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-dash-accent-green to-dash-accent-blue rounded-full flex items-center justify-center">
                      <PrinterIcon className="h-5 w-5 text-[var(--dash-text-primary)]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">
                        طباعة الفاتورة
                      </h2>
                      <p className="text-[var(--dash-text-muted)] text-sm">
                        تم إنشاء الفاتورة بنجاح
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="bg-dash-accent-green-subtle border border-dash-accent-green rounded-lg p-4 mb-4">
                    <p className="text-dash-accent-green text-sm flex items-center gap-2 mb-2">
                      <span className="text-dash-accent-green">✅</span>
                      تم إنشاء{" "}
                      {lastInvoiceData?.isReturn ? "المرتجع" : "الفاتورة"} بنجاح
                    </p>
                    <div className="text-[var(--dash-text-primary)] text-sm space-y-1">
                      <p>
                        رقم الفاتورة:{" "}
                        <span className="font-bold">
                          {lastInvoiceData?.invoiceNumber}
                        </span>
                      </p>
                      <p>
                        الإجمالي:{" "}
                        <span className="font-bold text-dash-accent-green">
                          {formatPrice(
                            lastInvoiceData?.totalAmount || 0,
                            "system",
                          )}
                        </span>
                      </p>
                      <p>
                        عدد الأصناف:{" "}
                        <span className="font-bold">
                          {lastInvoiceData?.cartItems?.length}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[var(--dash-text-primary)] font-medium text-center mb-4">
                    هل تريد طباعة الفاتورة؟
                  </p>
                </div>

                <div className="p-6 border-t border-[var(--dash-border-default)]">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPrintReceiptModal(false)}
                      className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-3 rounded-lg font-medium transition-colors"
                    >
                      لا، شكراً
                    </button>
                    <button
                      onClick={() => {
                        printReceipt(lastInvoiceData);
                        setShowPrintReceiptModal(false);
                      }}
                      className="flex-1 dash-btn-primary py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <PrinterIcon className="h-5 w-5" />
                      نعم، اطبع الفاتورة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--dash-bg-surface)]">
      {/* Top Header */}
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} pageTitle={isPurchaseMode ? 'نقطة الشراء' : 'نقطة البيع'} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content Container - Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
          {/* Action Buttons Bar - Desktop Version (hidden on mobile) */}
          <div className="hidden md:block bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-2 w-full mt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Selection Buttons - First three buttons grouped together */}
                <button
                  onClick={toggleRecordsModal}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all relative ${
                    selections.record ? 'text-dash-accent-green hover:text-dash-accent-green' : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
                  }`}
                >
                  <BanknotesIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">
                    {selections.record?.name ? (
                      selections.subSafe?.name ? (
                        <>
                          <span>{selections.record.name}</span>
                          {' '}
                          <span className="text-dash-accent-orange text-xs">{selections.subSafe.name}</span>
                        </>
                      ) : selections.record.name
                    ) : 'الخزنة'}
                  </span>
                  {!selections.record && (
                    <div className="w-1 h-1 bg-dash-accent-red rounded-full mt-1"></div>
                  )}
                </button>

                {/* Party Selection Button (Customer/Supplier) - Hidden in Purchase Mode */}
                {!isPurchaseMode && (
                  <button
                    onClick={() => setIsPartyModalOpen(true)}
                    className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all relative ${
                      selectedPartyType === 'supplier'
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                    }`}
                    title={selectedPartyType === 'customer'
                      ? `العميل: ${selections.customer?.name || 'غير محدد'}`
                      : `المورد: ${selectedSupplierForSale?.name || 'غير محدد'}`}
                  >
                    {selectedPartyType === 'customer' ? (
                      <>
                        <UserIcon className="h-5 w-5 mb-1" />
                        <span className="text-sm truncate max-w-[70px]">
                          {selections.customer?.name || 'اختر عميل'}
                        </span>
                      </>
                    ) : (
                      <>
                        <TruckIcon className="h-5 w-5 mb-1" />
                        <span className="text-sm truncate max-w-[70px]">
                          {selectedSupplierForSale?.name || 'اختر مورد'}
                        </span>
                      </>
                    )}
                    {(selectedPartyType === 'customer' && !selections.customer) ||
                     (selectedPartyType === 'supplier' && !selectedSupplierForSale) ? (
                      <div className="w-1 h-1 bg-dash-accent-red rounded-full mt-1"></div>
                    ) : null}
                  </button>
                )}

                {/* Price Type Button */}
                {!isPurchaseMode && !isTransferMode && (
                  <button
                    onClick={() => setIsPriceTypeModalOpen(true)}
                    className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all relative ${
                      selectedPriceType !== "price"
                        ? "text-dash-accent-blue hover:text-dash-accent-blue"
                        : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                    }`}
                  >
                    <CurrencyDollarIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">السعر</span>
                    {selectedPriceType !== "price" && (
                      <div className="w-1 h-1 bg-dash-accent-blue rounded-full mt-1"></div>
                    )}
                  </button>
                )}

                {/* Separator */}
                <div className="h-8 w-px bg-[var(--dash-bg-overlay)] mx-2"></div>

                {/* Other Action Buttons */}
                {/* زر الأعمدة مخفي مؤقتاً لتوفير المساحة
                <button
                  onClick={() => setShowColumnsModal(true)}
                  className="flex flex-col items-center p-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] cursor-pointer min-w-[80px]"
                >
                  <TableCellsIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">الأعمدة</span>
                </button>
                */}

                <button
                  onClick={toggleHistoryModal}
                  className="flex flex-col items-center p-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] cursor-pointer min-w-[80px]"
                >
                  <ClockIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">التاريخ</span>
                </button>

                <button
                  onClick={handleTransferModeToggle}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    isTransferMode
                      ? "text-dash-accent-green hover:text-dash-accent-green"
                      : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                  }`}
                >
                  <ArrowsRightLeftIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">نقل</span>
                </button>

                <button
                  onClick={toggleCategoriesModal}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all relative ${
                    selectedCategoryId
                      ? "text-dash-accent-blue hover:text-dash-accent-blue"
                      : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                  }`}
                >
                  <div className="relative">
                    <Squares2X2Icon className="h-5 w-5 mb-1" />
                    {selectedCategoryId && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-dash-accent-blue rounded-full"></span>
                    )}
                  </div>
                  <span className="text-sm">{selectedCategoryName || 'الفئات'}</span>
                </button>

                {/* Discount Button */}
                {!isPurchaseMode && !isTransferMode && (
                  <button
                    onClick={() => setIsDiscountModalOpen(true)}
                    className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                      cartDiscount > 0 || cartItems.some(item => item.discount && item.discount > 0)
                        ? "text-dash-accent-orange hover:text-dash-accent-orange"
                        : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                    }`}
                  >
                    <ReceiptPercentIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">خصم</span>
                    {(cartDiscount > 0 || cartItems.some(item => item.discount && item.discount > 0)) && (
                      <div className="w-1 h-1 bg-dash-accent-orange rounded-full mt-1"></div>
                    )}
                  </button>
                )}

                {/* Postponed Invoices Button */}
                <button
                  onClick={() => setIsPostponedModalOpen(true)}
                  className={`relative flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    postponedTabs.length > 0
                      ? "text-dash-accent-orange hover:text-dash-accent-orange"
                      : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                  }`}
                >
                  <ClockIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">الفواتير</span>
                  {postponedTabs.length > 0 && (
                    <div className="absolute top-0 right-2 w-5 h-5 bg-dash-accent-orange rounded-full flex items-center justify-center text-xs text-[var(--dash-text-primary)] font-bold">
                      {postponedTabs.length}
                    </div>
                  )}
                </button>

                {/* Cash Drawer Button */}
                <button
                  onClick={() => setIsCashDrawerModalOpen(true)}
                  disabled={!selections.record}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    selections.record
                      ? "text-dash-accent-green hover:text-dash-accent-green"
                      : "text-[var(--dash-text-disabled)] cursor-not-allowed"
                  }`}
                  title={selections.record ? `درج ${selections.record.name}` : "يجب اختيار سجل أولاً"}
                >
                  <CurrencyDollarIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">الدرج</span>
                </button>

                {/* Expense/Addition Button */}
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  disabled={!selections.record}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    selections.record
                      ? "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                      : "text-[var(--dash-text-disabled)] cursor-not-allowed"
                  }`}
                  title={selections.record ? `مصروفات/إضافة - ${selections.record.name}` : "يجب اختيار سجل أولاً"}
                >
                  <DocumentTextIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">مصروفات</span>
                </button>

                <button
                  onClick={printPreviewReceipt}
                  disabled={cartItems.length === 0}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    cartItems.length === 0
                      ? "text-[var(--dash-text-disabled)] cursor-not-allowed"
                      : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                  }`}
                  title="طباعة مراجعة للطلب الحالي"
                >
                  <PrinterIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">طباعة</span>
                </button>

                <button
                  onClick={openPDFPreview}
                  disabled={cartItems.length === 0}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    cartItems.length === 0
                      ? "text-[var(--dash-text-disabled)] cursor-not-allowed"
                      : "text-dash-accent-blue hover:text-dash-accent-blue"
                  }`}
                  title="معاينة الفاتورة للإرسال للعميل"
                >
                  <EyeIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">معاينة</span>
                </button>
              </div>

              {/* Right Side - Cart, Purchase Mode Toggle & Returns */}
              <div className="flex items-center gap-2">
                {/* Returns Button */}
                <button
                  onClick={() => setIsReturnMode(!isReturnMode)}
                  className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] transition-all ${
                    isReturnMode
                      ? "text-dash-accent-orange hover:text-dash-accent-orange"
                      : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                  }`}
                >
                  <ArrowUturnLeftIcon className="h-5 w-5 mb-1" />
                  <span className="text-sm">مرتجع</span>
                </button>

                {/* Separator */}
                <div className="h-8 w-px bg-[var(--dash-bg-overlay)] mx-1"></div>

                {isPurchaseMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowQuickAddProductModal(true)}
                      className="flex flex-col items-center p-2 text-dash-accent-green hover:text-dash-accent-green cursor-pointer min-w-[80px] transition-all"
                    >
                      <PlusIcon className="h-5 w-5 mb-1" />
                      <span className="text-sm">منتج جديد</span>
                    </button>
                    <button
                      onClick={handlePurchaseModeToggle}
                      className="flex flex-col items-center p-2 text-dash-accent-blue hover:text-dash-accent-blue cursor-pointer min-w-[80px] transition-all"
                    >
                      <ShoppingBagIcon className="h-5 w-5 mb-1" />
                      <span className="text-sm">شراء</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handlePurchaseModeToggle}
                    className="flex flex-col items-center p-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] cursor-pointer min-w-[80px] transition-all"
                  >
                    <ShoppingBagIcon className="h-5 w-5 mb-1" />
                    <span className="text-sm">شراء</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Bar - Mobile Version (shown only on mobile) */}
          <div className="block md:hidden bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-2 py-2 w-full mt-12">
            <div className="flex items-center justify-start gap-1 overflow-x-auto scrollbar-hide">
              {/* Action Buttons */}
              {/* زر الأعمدة مخفي مؤقتاً لتوفير المساحة
              <button
                onClick={() => setShowColumnsModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors"
              >
                <TableCellsIcon className="h-4 w-4" />
                <span className="text-xs">الأعمدة</span>
              </button>
              */}

              <button
                onClick={toggleHistoryModal}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors"
              >
                <ClockIcon className="h-4 w-4" />
                <span className="text-xs">التاريخ</span>
              </button>

              <button
                onClick={handleTransferModeToggle}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors ${
                  isTransferMode
                    ? "dash-btn-green"
                    : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                }`}
              >
                <ArrowsRightLeftIcon className="h-4 w-4" />
                <span className="text-xs">نقل</span>
              </button>

              <button
                onClick={toggleCategoriesModal}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedCategoryId
                    ? "dash-btn-primary border-dash-accent-blue"
                    : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span className="text-xs">{selectedCategoryName || 'الفئات'}</span>
              </button>

              {/* Discount Button - Mobile */}
              {!isPurchaseMode && !isTransferMode && (
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors relative ${
                    cartDiscount > 0 || cartItems.some(item => item.discount && item.discount > 0)
                      ? "bg-dash-accent-orange text-[var(--dash-text-primary)] hover:brightness-90 border-dash-accent-orange"
                      : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                  }`}
                >
                  <ReceiptPercentIcon className="h-4 w-4" />
                  <span className="text-xs">خصم</span>
                  {(cartDiscount > 0 || cartItems.some(item => item.discount && item.discount > 0)) && (
                    <div className="w-1 h-1 bg-dash-accent-orange rounded-full absolute -top-1 -right-1"></div>
                  )}
                </button>
              )}

              {/* Postponed Invoices Button - Mobile */}
              <button
                onClick={() => setIsPostponedModalOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors relative ${
                  postponedTabs.length > 0
                    ? "bg-dash-accent-orange text-[var(--dash-text-primary)] hover:brightness-90 border-dash-accent-orange"
                    : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                }`}
                title="الفواتير المؤجلة"
              >
                <ClockIcon className="h-4 w-4" />
                <span className="text-xs">الفواتير</span>
                {postponedTabs.length > 0 && (
                  <span className="bg-dash-accent-orange text-[var(--dash-bg-deepest)] text-xs px-1.5 rounded-full font-bold">
                    {postponedTabs.length}
                  </span>
                )}
              </button>

              <button
                onClick={printPreviewReceipt}
                disabled={cartItems.length === 0}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors ${
                  cartItems.length === 0
                    ? "bg-[var(--dash-bg-surface)] text-[var(--dash-text-disabled)] cursor-not-allowed"
                    : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                }`}
                title="طباعة مراجعة للطلب الحالي"
              >
                <PrinterIcon className="h-4 w-4" />
                <span className="text-xs">طباعة</span>
              </button>

              <button
                onClick={openPDFPreview}
                disabled={cartItems.length === 0}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors ${
                  cartItems.length === 0
                    ? "bg-[var(--dash-bg-surface)] text-[var(--dash-text-disabled)] cursor-not-allowed"
                    : "bg-[var(--dash-bg-surface)] text-dash-accent-blue hover:text-dash-accent-blue hover:bg-[var(--dash-bg-overlay)]"
                }`}
                title="معاينة الفاتورة للإرسال للعميل"
              >
                <EyeIcon className="h-4 w-4" />
                <span className="text-xs">معاينة</span>
              </button>

              {/* Returns Button */}
              <button
                onClick={() => setIsReturnMode(!isReturnMode)}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--dash-border-default)] rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors ${
                  isReturnMode
                    ? "bg-dash-accent-orange text-[var(--dash-text-primary)] hover:brightness-90"
                    : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                }`}
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                <span className="text-xs">مرتجع</span>
              </button>

              {/* Purchase Mode Button */}
              {isPurchaseMode ? (
                <>
                  <button
                    onClick={() => setShowQuickAddProductModal(true)}
                    className="flex items-center gap-2 px-3 py-2 dash-btn-green border border-dash-accent-green rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="text-xs">منتج جديد</span>
                  </button>
                  <button
                    onClick={handlePurchaseModeToggle}
                    className="flex items-center gap-2 px-3 py-2 dash-btn-primary border border-dash-accent-blue rounded cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors"
                  >
                    <ShoppingBagIcon className="h-4 w-4" />
                    <span className="text-xs">شراء</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handlePurchaseModeToggle}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] cursor-pointer whitespace-nowrap flex-shrink-0 transition-colors"
                >
                  <ShoppingBagIcon className="h-4 w-4" />
                  <span className="text-xs">شراء</span>
                </button>
              )}
            </div>
          </div>

          {/* POS Tabs Bar - Mobile Version */}
          <div className="block md:hidden bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)] px-2 py-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {/* POS Tabs */}
              <div className="flex items-center flex-shrink-0">
                {posTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center border-l border-[var(--dash-border-default)] first:border-l-0 ${
                      tab.active
                        ? tab.isTransferMode
                          ? 'bg-dash-accent-green text-[var(--dash-text-primary)]'
                          : tab.isPurchaseMode
                            ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                            : 'bg-dash-accent-orange text-[var(--dash-text-primary)]'
                        : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                    }`}
                  >
                    <button
                      onClick={() => switchTab(tab.id)}
                      className="px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <span>{tab.title}</span>
                    </button>
                    {tab.id !== 'main' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tab.id);
                        }}
                        className="p-1 hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded transition-colors"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add New Tab Button */}
                <button
                  onClick={() => {
                    setIsPartyModalForNewTab(true);
                    setIsPartyModalOpen(true);
                  }}
                  className="px-2 py-1.5 text-dash-accent-green hover:text-dash-accent-green hover:bg-dash-accent-green-subtle transition-colors flex items-center border-l border-[var(--dash-border-default)]"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>

              {/* زرار الخزنة */}
              <button
                onClick={toggleRecordsModal}
                className={`flex items-center gap-1 px-2 py-1.5 bg-[var(--dash-bg-raised)] border rounded text-xs whitespace-nowrap flex-shrink-0 ${
                  selections.record ? 'border-dash-accent-green text-dash-accent-green hover:text-dash-accent-green hover:bg-dash-accent-green-subtle' : 'border-[var(--dash-border-default)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
              >
                <BanknotesIcon className="h-3.5 w-3.5" />
                <span>
                  {selections.record?.name ? (
                    selections.subSafe?.name ? (
                      <>
                        <span className="text-[var(--dash-text-primary)]">{selections.record.name}</span>
                        {' '}
                        <span className="text-dash-accent-orange">{selections.subSafe.name}</span>
                      </>
                    ) : selections.record.name
                  ) : 'الخزنة'}
                </span>
              </button>

              {/* زرار السعر */}
              {!isPurchaseMode && !isTransferMode && (
                <button
                  onClick={() => setIsPriceTypeModalOpen(true)}
                  className={`flex items-center gap-1 px-2 py-1.5 border border-[var(--dash-border-default)] rounded text-xs whitespace-nowrap flex-shrink-0 ${
                    selectedPriceType !== "price"
                      ? "bg-dash-accent-blue text-[var(--dash-text-primary)] border-dash-accent-blue"
                      : "bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                  }`}
                >
                  <CurrencyDollarIcon className="h-3.5 w-3.5" />
                  <span>{getPriceTypeName(selectedPriceType)}</span>
                </button>
              )}

              {/* زرار عرض التفاصيل */}
              <button
                onClick={() => setShowMobileDetailsModal(true)}
                className="flex items-center gap-1 px-2 py-1.5 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] text-xs whitespace-nowrap flex-shrink-0"
              >
                <EyeIcon className="h-3.5 w-3.5" />
                <span>عرض</span>
              </button>
            </div>
          </div>

          {/* Combined Selection Display & POS Tabs Bar (hidden on mobile) */}
          <div className="hidden md:flex bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)] items-center justify-between">
            {/* Right Side: Selection Display */}
            <div className="flex items-center gap-6 text-sm px-4 py-2">
              {/* Customer/Supplier */}
              <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
                {isPurchaseMode ? "المورد" : "العميل"}:{" "}
                <span className="text-[var(--dash-text-primary)] font-medium">
                  {isPurchaseMode
                    ? selectedSupplier
                      ? selectedSupplier.name
                      : "غير محدد"
                    : selections.customer
                      ? selections.customer.name
                      : "غير محدد"}
                </span>
              </span>

              {/* Branch */}
              <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
                الفرع:{" "}
                <span className="text-[var(--dash-text-primary)] font-medium">
                  {selections.branch
                    ? selections.branch.name
                    : "غير محدد"}
                </span>
              </span>

              {/* Record */}
              <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
                الخزنة:{" "}
                <span className="text-[var(--dash-text-primary)] font-medium">
                  {selections.record ? selections.record.name : "غير محدد"}
                </span>
                {selections.subSafe?.name && (
                  <>
                    {" "}
                    <span className="text-dash-accent-orange font-medium">
                      {selections.subSafe.name}
                    </span>
                  </>
                )}
              </span>

              {/* Price Type Display */}
              {!isPurchaseMode && !isTransferMode && (
                <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
                  السعر:{" "}
                  <span className={`font-medium ${selectedPriceType !== "price" ? "text-dash-accent-blue" : "text-[var(--dash-text-primary)]"}`}>
                    {getPriceTypeName(selectedPriceType)}
                  </span>
                </span>
              )}

              {/* Clear all button - if any selections exist */}
              {(selections.customer ||
                selections.branch ||
                selections.record ||
                selectedSupplier) && (
                <button
                  onClick={() => {
                    clearSelections();
                    if (isPurchaseMode) {
                      setSelectedSupplier(null);
                    }
                  }}
                  className="text-xs text-[var(--dash-text-muted)] hover:text-dash-accent-red transition-colors px-2 py-1 rounded whitespace-nowrap"
                >
                  مسح الكل
                </button>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-[var(--dash-bg-overlay)]"></div>

            {/* Left Side: POS Tabs */}
            <div className="flex items-center overflow-x-auto scrollbar-hide flex-1">
              {posTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center border-l border-[var(--dash-border-default)] ${
                    tab.active
                      ? tab.isTransferMode
                        ? 'bg-dash-accent-green text-[var(--dash-text-primary)]'
                        : tab.isPurchaseMode
                          ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                          : 'bg-dash-accent-orange text-[var(--dash-text-primary)]'
                      : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                  }`}
                  onContextMenu={(e) => {
                    // Show context menu for all tabs
                    e.preventDefault();
                    e.stopPropagation();
                    setTabContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                  }}
                >
                  <button
                    onClick={() => switchTab(tab.id)}
                    className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <span>{tab.title}</span>
                  </button>

                  {tab.id !== 'main' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                      className="ml-1 p-1 hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded transition-colors"
                      title="إغلاق"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add New Tab Button - Opens party selection (customer/supplier) to create new tab */}
              <button
                onClick={() => {
                  setIsPartyModalForNewTab(true);
                  setIsPartyModalOpen(true);
                }}
                className="px-3 py-2 text-dash-accent-green hover:text-dash-accent-green hover:bg-dash-accent-green-subtle transition-colors flex items-center gap-1 border-l border-[var(--dash-border-default)]"
                title="إضافة نافذة بيع جديدة (عميل أو مورد)"
              >
                <PlusIcon className="w-4 h-4" />
              </button>

            </div>

            {/* Tab Context Menu for Postponing */}
            {tabContextMenu && (
              <div
                className="fixed z-50 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg shadow-xl py-1 min-w-[160px]"
                style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTabContextMenu(null);
                }}
              >
                {tabContextMenu.tabId === 'main' ? (
                  // Main tab context menu - can only postpone if there are items
                  <>
                    {cartItems.length > 0 ? (
                      <button
                        onClick={() => {
                          // Save current cart items before any changes
                          const itemsToPostpone = [...cartItems];
                          const tabName = selections.customer?.name || 'فاتورة مؤجلة';
                          const customerToSave = selections.customer;
                          const branchToSave = selections.branch;
                          const recordToSave = selections.record;
                          const subSafeToSave = selections.subSafe;
                          const priceTypeToSave = selectedPriceType;

                          // Create new tab with the saved items
                          const newTabId = addTabWithCustomerAndCart(
                            customerToSave,
                            itemsToPostpone,
                            tabName,
                            {
                              branch: branchToSave,
                              record: recordToSave,
                              subSafe: subSafeToSave,
                              priceType: priceTypeToSave,
                            }
                          );

                          // Postpone the newly created tab
                          setTimeout(() => {
                            // Postpone the new tab (this switches to main tab)
                            handlePostponeTab(newTabId);

                            // Make sure main tab is selected
                            switchTab('main');

                            // Clear cart after a delay to ensure useEffect has run
                            setTimeout(() => {
                              setCartItems([]);
                              updateActiveTabCart([]);
                              resetToDefaultCustomer();
                            }, 150);
                          }, 100);
                          setTabContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-right text-sm text-[var(--dash-text-secondary)] hover:bg-dash-accent-orange-subtle hover:text-dash-accent-orange flex items-center gap-2 transition-colors"
                      >
                        <ClockIcon className="h-4 w-4" />
                        تأجيل الفاتورة
                      </button>
                    ) : (
                      <div className="px-4 py-2 text-right text-sm text-[var(--dash-text-disabled)] flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        أضف منتجات للتأجيل
                      </div>
                    )}
                    {/* Change Customer Button for Main Tab */}
                    <button
                      onClick={() => {
                        setContextMenuCustomerTabId(tabContextMenu.tabId);
                        setIsCustomerModalOpen(true);
                        setTabContextMenu(null);
                      }}
                      className="w-full px-4 py-2 text-right text-sm text-[var(--dash-text-secondary)] hover:bg-dash-accent-blue-subtle hover:text-dash-accent-blue flex items-center gap-2 transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      تغيير العميل
                    </button>
                  </>
                ) : (
                  // Non-main tab context menu
                  <>
                    <button
                      onClick={() => {
                        const tab = posTabs.find(t => t.id === tabContextMenu.tabId);
                        if (tab && tab.cartItems && tab.cartItems.length > 0) {
                          handlePostponeTab(tabContextMenu.tabId);
                        }
                        setTabContextMenu(null);
                      }}
                      className={`w-full px-4 py-2 text-right text-sm flex items-center gap-2 transition-colors ${
                        (posTabs.find(t => t.id === tabContextMenu.tabId)?.cartItems?.length || 0) > 0
                          ? 'text-[var(--dash-text-secondary)] hover:bg-dash-accent-orange-subtle hover:text-dash-accent-orange'
                          : 'text-[var(--dash-text-disabled)] cursor-not-allowed'
                      }`}
                      disabled={(posTabs.find(t => t.id === tabContextMenu.tabId)?.cartItems?.length || 0) === 0}
                    >
                      <ClockIcon className="h-4 w-4" />
                      تأجيل الفاتورة
                    </button>
                    {/* Change Customer / Transfer Button for Non-main Tab */}
                    {posTabs.find(t => t.id === tabContextMenu.tabId)?.isTransferMode ? (
                      <button
                        onClick={() => {
                          setContextMenuTransferTabId(tabContextMenu.tabId);
                          setIsTransferLocationModalOpen(true);
                          setTabContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-right text-sm text-[var(--dash-text-secondary)] hover:bg-dash-accent-green-subtle hover:text-dash-accent-green flex items-center gap-2 transition-colors"
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                        تغيير النقل
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setContextMenuCustomerTabId(tabContextMenu.tabId);
                          setIsCustomerModalOpen(true);
                          setTabContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-right text-sm text-[var(--dash-text-secondary)] hover:bg-dash-accent-blue-subtle hover:text-dash-accent-blue flex items-center gap-2 transition-colors"
                      >
                        <UserIcon className="h-4 w-4" />
                        تغيير العميل
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop Toolbar - Original Design (hidden on mobile) */}
          <div className="hidden md:block bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left Side Elements */}
              <div className="flex items-center gap-2">
                {/* Search with Mode Indicator */}
                <POSSearchInput
                  ref={searchInputRef}
                  onSearch={handleSearchChange}
                  searchMode={searchMode}
                  onSearchModeChange={setSearchMode}
                  isMobile={false}
                />

                {/* View Mode Toggle */}
                <div className="flex bg-[var(--dash-bg-surface)] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-dash-accent-blue text-[var(--dash-text-primary)]"
                        : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "table"
                        ? "bg-dash-accent-blue text-[var(--dash-text-primary)]"
                        : "text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]"
                    }`}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Sort Order */}
                <ProductSortDropdown
                  storageKey="pos-sort-order"
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                />
              </div>

              {/* Right Side - Change Calculator + Secret Info */}
              {!isTransferMode && (
                <div className="flex items-start gap-6">
                  {/* معلومات سرية - ربح الفاتورة ورصيد العميل (فقط في وضع البيع) */}
                  {!isPurchaseMode && (
                    <div className="flex items-center gap-4 text-xs text-[var(--dash-text-disabled)] font-mono self-center">
                      {/* PD: الربح - يظهر دائماً مع وجود منتجات (مخفي كباركود) */}
                      {cartItems.length > 0 && (
                        <span title="ربح الفاتورة">
                          PD0{calculateProfit().toFixed(0)}U68
                        </span>
                      )}
                      {/* قبل/بعد: رصيد العميل - يظهر فقط مع عميل غير افتراضي */}
                      {selections.customer && selections.customer.id !== defaultCustomer?.id && cartItems.length > 0 && (
                        <>
                          <span className="text-dash-accent-red" title="رصيد العميل قبل">
                            قبل: {(selections.customer.calculated_balance || 0).toFixed(0)}
                          </span>
                          <span className="text-dash-accent-green" title="رصيد العميل بعد">
                            بعد: {((selections.customer.calculated_balance || 0) + (isReturnMode ? -1 : 1) * calculateTotalWithDiscounts() - paymentSplitData.reduce((sum, p) => sum + (p.amount || 0), 0)).toFixed(0)}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Mobile Unified Toolbar - New Design (shown only on mobile) */}
          <div className="block md:hidden bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-3 flex-shrink-0">
            {/* Single Horizontal Row - Search Bar, View Toggle, Cart Toggle, Customer Info, Branch Info, Record Info, Clear All */}
            <div
              className="flex items-center gap-3 overflow-x-auto scrollbar-hide"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* 1. Search Bar with Mode Indicator */}
              <POSSearchInput
                onSearch={handleSearchChange}
                searchMode={searchMode}
                onSearchModeChange={setSearchMode}
                className="flex-shrink-0 w-72"
                isMobile={true}
              />

              {/* 2. Cart Toggle Button */}
              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="p-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-colors bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] flex-shrink-0"
                title={isCartOpen ? "إخفاء السلة" : "إظهار السلة"}
              >
                {isCartOpen ? (
                  <ShoppingBagIcon className="h-4 w-4" />
                ) : (
                  <ShoppingCartIcon className="h-4 w-4" />
                )}
              </button>

              {/* 3. Product Count */}
              <span className="text-xs text-[var(--dash-text-muted)] whitespace-nowrap">
                عرض {filteredProducts.length} من {products.length}
              </span>

              {/* 3. View Toggle (Images or Tables) */}
              <div className="flex bg-[var(--dash-bg-surface)] rounded-md overflow-hidden flex-shrink-0 border border-[var(--dash-border-default)]">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-dash-accent-blue text-[var(--dash-text-primary)]"
                      : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                  }`}
                  title="عرض الصور"
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 transition-colors ${
                    viewMode === "table"
                      ? "bg-dash-accent-blue text-[var(--dash-text-primary)]"
                      : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]"
                  }`}
                  title="عرض الجداول"
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Sort Order (Mobile) */}
              <ProductSortDropdown
                storageKey="pos-sort-order"
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {/* Products Content Container - Smart sizing for both layout and scroll */}
          <div className="flex-1 relative overflow-hidden">
            {/* Show cart on mobile when isCartOpen is true */}
            {isCartOpen && (
              <div className="md:hidden fixed inset-0 z-50">
                {/* Mobile Cart View */}
                <div className="h-full bg-[var(--dash-bg-raised)] border-t-2 border-gray-500 flex flex-col">
                  {/* Cart Items Area - Full Height */}
                  <div className="flex-1 border-t-2 border-gray-500 flex flex-col min-h-0">
                    {cartItems.length === 0 ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        {/* Cart Header - Always visible */}
                        <div className="p-4 border-b border-[var(--dash-border-default)] flex-shrink-0">
                          <div className="flex items-center gap-2">
                            {/* Close button */}
                            <button
                              onClick={() => setIsCartOpen(false)}
                              className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] mr-2"
                              title="إغلاق السلة"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <span className="text-[var(--dash-text-primary)] font-medium">السلة</span>
                            <span className="bg-[var(--dash-bg-overlay)] px-2 py-1 rounded text-xs text-[var(--dash-text-muted)]">
                              0
                            </span>
                          </div>
                        </div>
                        {/* Empty State */}
                        <div className="flex flex-col justify-center items-center flex-1 p-8">
                          <ShoppingCartIcon className="h-24 w-24 text-[var(--dash-text-disabled)] mb-8" />
                          <p className="text-[var(--dash-text-muted)] text-sm text-center mb-4">
                            اضغط على المنتجات لإضافتها للسلة
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-0">
                        {/* Cart Header */}
                        <div className="px-3 py-2 border-b border-[var(--dash-border-default)] flex-shrink-0">
                          <div className="flex items-center gap-2">
                            {/* Close button for mobile */}
                            <button
                              onClick={() => setIsCartOpen(false)}
                              className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                              title="إغلاق السلة"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div
                              className="flex items-center gap-1.5 flex-1 cursor-text"
                              onClick={() => { setShowCartSearch(true); setTimeout(() => cartSearchInputRef.current?.focus(), 100); }}
                            >
                              <MagnifyingGlassIcon className="h-3.5 w-3.5 text-[var(--dash-text-disabled)] flex-shrink-0" />
                              {showCartSearch ? (
                                <>
                                  <input
                                    ref={cartSearchInputRef}
                                    type="text"
                                    value={cartSearchQuery}
                                    onChange={(e) => handleCartSearch(e.target.value)}
                                    placeholder="بحث في السلة..."
                                    className="bg-transparent text-sm text-[var(--dash-text-primary)] placeholder:text-[var(--dash-text-disabled)] outline-none flex-1"
                                    autoFocus
                                    onBlur={() => { if (!cartSearchQuery) { setShowCartSearch(false); setCartSearchMatchIds([]); setCartSearchMatchIndex(0); } }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setShowCartSearch(false);
                                        setCartSearchQuery('');
                                        setHighlightedCartItemId(null);
                                        setCartSearchMatchIds([]);
                                        setCartSearchMatchIndex(0);
                                        (e.target as HTMLInputElement).blur();
                                      } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        navigateCartSearchMatch(e.shiftKey ? 'prev' : 'next');
                                      }
                                    }}
                                  />
                                  {cartSearchQuery && cartSearchMatchIds.length > 0 && (
                                    <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={(e) => e.preventDefault()}>
                                      <span className="text-[var(--dash-text-muted)] text-xs whitespace-nowrap">{cartSearchMatchIndex + 1}/{cartSearchMatchIds.length}</span>
                                      <button
                                        onClick={() => navigateCartSearchMatch('prev')}
                                        className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] p-0.5"
                                      >
                                        <ChevronUpIcon className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => navigateCartSearchMatch('next')}
                                        className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] p-0.5"
                                      >
                                        <ChevronDownIcon className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                  {cartSearchQuery && (
                                    <button
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => { setCartSearchQuery(''); setHighlightedCartItemId(null); setCartSearchMatchIds([]); setCartSearchMatchIndex(0); cartSearchInputRef.current?.focus(); }}
                                      className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                                    >
                                      <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[var(--dash-text-disabled)] text-xs">بحث</span>
                              )}
                            </div>
                            <span className="text-[var(--dash-text-primary)] font-medium text-sm whitespace-nowrap">منتجات السلة: {cartItems.length}</span>
                          </div>
                        </div>

                        {/* Transfer Direction Header */}
                        {isTransferMode && transferFromLocation && transferToLocation && (
                          <div className="px-4 py-2 bg-dash-accent-green-subtle border-b border-dash-accent-green flex-shrink-0">
                            <div className="flex items-center justify-center gap-2 text-sm" dir="ltr">
                              <span className="text-dash-accent-green font-medium">{transferFromLocation.name}</span>
                              <span className="text-dash-accent-green">→</span>
                              <span className="text-dash-accent-green font-medium">{transferToLocation.name}</span>
                            </div>
                          </div>
                        )}

                        {/* Cart Items */}
                        <div
                          ref={cartContainerRef}
                          className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {(() => {
                            // Group cart items by product.id for multi-price display
                            const groups: { productId: string; items: typeof cartItems }[] = [];
                            const groupMap = new Map<string, typeof cartItems>();
                            cartItems.forEach((item) => {
                              const pid = item.product.id;
                              if (!groupMap.has(pid)) {
                                const items: typeof cartItems = [];
                                groupMap.set(pid, items);
                                groups.push({ productId: pid, items });
                              }
                              groupMap.get(pid)!.push(item);
                            });

                            return groups.map((group) => {
                              const isMultiPrice = group.items.length > 1;
                              const firstItem = group.items[0];

                              // Helper to render quantity/price controls for a single cart entry
                              const renderItemControls = (item: any, showRemove = true) => (
                                <div key={item.id} className={`flex items-center justify-between ${isMultiPrice ? 'py-2 border-b border-[var(--dash-border-default)] last:border-b-0' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--dash-text-muted)] text-xs">الكمية:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newQuantity = parseInt(e.target.value) || 1;
                                        setCartItems((prev) => {
                                          const newCart = prev.map((cartItem) => {
                                            if (cartItem.id === item.id) {
                                              const pricePerUnit = newQuantity / cartItem.quantity;
                                              let newSelectedColors = null;
                                              if (cartItem.selectedColors) {
                                                newSelectedColors = Object.fromEntries(
                                                  Object.entries(cartItem.selectedColors).map(([color, count]) => [
                                                    color, Math.round((count as number) * pricePerUnit),
                                                  ])
                                                );
                                              }
                                              let newSelectedShapes = null;
                                              if (cartItem.selectedShapes) {
                                                newSelectedShapes = Object.fromEntries(
                                                  Object.entries(cartItem.selectedShapes).map(([shape, count]) => [
                                                    shape, Math.round((count as number) * pricePerUnit),
                                                  ])
                                                );
                                              }
                                              const unitPrice = cartItem.isCustomPrice && cartItem.totalPrice
                                                ? cartItem.totalPrice / cartItem.quantity
                                                : cartItem.price;
                                              return {
                                                ...cartItem,
                                                quantity: newQuantity,
                                                selectedColors: newSelectedColors,
                                                selectedShapes: newSelectedShapes,
                                                totalPrice: unitPrice * newQuantity,
                                              };
                                            }
                                            return cartItem;
                                          });
                                          updateActiveTabCart(newCart);
                                          return newCart;
                                        });
                                      }}
                                      className="w-16 px-2 py-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-xs text-center"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--dash-text-muted)] text-xs">السعر:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={((item.totalPrice || (item.price * item.quantity) || 0) / item.quantity).toFixed(2)}
                                      onChange={(e) => {
                                        const newPrice = parseFloat(e.target.value) || 0;
                                        setCartItems((prev) => {
                                          const newCart = prev.map((cartItem) =>
                                            cartItem.id === item.id
                                              ? { ...cartItem, isCustomPrice: true, totalPrice: cartItem.quantity * newPrice }
                                              : cartItem,
                                          );
                                          updateActiveTabCart(newCart);
                                          return newCart;
                                        });
                                      }}
                                      className="w-20 px-2 py-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-xs text-center"
                                    />
                                  </div>

                                  <span className="text-dash-accent-green font-bold text-xs">
                                    {formatPrice(item.totalPrice || (item.price * item.quantity) || 0, "system")}
                                  </span>

                                  {showRemove && (
                                    <button
                                      onClick={() => removeFromCart(item.id)}
                                      className="text-dash-accent-red hover:text-dash-accent-red p-0.5"
                                      title="إزالة"
                                    >
                                      <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              );

                              if (!isMultiPrice) {
                                // Single item - render normally
                                const item = firstItem;
                                return (
                                  <div
                                    key={item.id}
                                    id={`cart-item-${item.id}`}
                                    className={`bg-[var(--dash-bg-surface)] rounded-lg p-3 border transition-all duration-300 ${highlightedCartItemId === item.id ? 'border-yellow-400 ring-2 ring-yellow-400 bg-yellow-400/10' : 'border-[var(--dash-border-default)]'}`}
                                  >
                                    <div className="flex gap-3 mb-2">
                                      <div className="w-12 h-12 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden flex-shrink-0">
                                        <ProductThumbnail src={item.product.main_image_url} alt={item.product.name} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <h4 className="font-medium text-[var(--dash-text-primary)] text-sm truncate">{item.product.name}</h4>
                                            {showBranchPerItem && item.branch_name && (
                                              <span className="text-xs text-dash-accent-blue bg-dash-accent-blue-subtle px-2 py-0.5 rounded-full flex-shrink-0 border border-dash-accent-blue">{item.branch_name}</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {isPurchaseMode && item.product?.isNewProduct && (
                                              <button onClick={() => { setEditingCartItem(item); setShowQuickAddProductModal(true); }} className="text-dash-accent-blue hover:text-dash-accent-blue p-1" title="تعديل المنتج">
                                                <PencilIcon className="h-4 w-4" />
                                              </button>
                                            )}
                                            <button onClick={() => removeFromCart(item.id)} className="text-dash-accent-red hover:text-dash-accent-red p-1" title="إزالة من السلة">
                                              <XMarkIcon className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[var(--dash-text-muted)] text-xs">الكمية:</span>
                                            <input type="number" min="1" value={item.quantity}
                                              onChange={(e) => {
                                                const newQuantity = parseInt(e.target.value) || 1;
                                                setCartItems((prev) => {
                                                  const newCart = prev.map((cartItem) => {
                                                    if (cartItem.id === item.id) {
                                                      const pricePerUnit = newQuantity / cartItem.quantity;
                                                      let newSelectedColors = null;
                                                      if (cartItem.selectedColors) {
                                                        newSelectedColors = Object.fromEntries(Object.entries(cartItem.selectedColors).map(([color, count]) => [color, Math.round((count as number) * pricePerUnit)]));
                                                      }
                                                      let newSelectedShapes = null;
                                                      if (cartItem.selectedShapes) {
                                                        newSelectedShapes = Object.fromEntries(Object.entries(cartItem.selectedShapes).map(([shape, count]) => [shape, Math.round((count as number) * pricePerUnit)]));
                                                      }
                                                      const unitPrice = cartItem.isCustomPrice && cartItem.totalPrice ? cartItem.totalPrice / cartItem.quantity : cartItem.price;
                                                      return { ...cartItem, quantity: newQuantity, selectedColors: newSelectedColors, selectedShapes: newSelectedShapes, totalPrice: unitPrice * newQuantity };
                                                    }
                                                    return cartItem;
                                                  });
                                                  updateActiveTabCart(newCart);
                                                  return newCart;
                                                });
                                              }}
                                              className="w-16 px-2 py-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-xs text-center"
                                            />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[var(--dash-text-muted)] text-xs">السعر:</span>
                                            <input type="number" min="0" step="0.01"
                                              value={((item.totalPrice || (item.price * item.quantity) || 0) / item.quantity).toFixed(2)}
                                              onChange={(e) => {
                                                const newPrice = parseFloat(e.target.value) || 0;
                                                setCartItems((prev) => {
                                                  const newCart = prev.map((cartItem) => cartItem.id === item.id ? { ...cartItem, isCustomPrice: true, totalPrice: cartItem.quantity * newPrice } : cartItem);
                                                  updateActiveTabCart(newCart);
                                                  return newCart;
                                                });
                                              }}
                                              className="w-20 px-2 py-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-xs text-center"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-dash-accent-green font-bold text-sm">
                                        {formatPrice(item.totalPrice || (item.price * item.quantity) || 0, "system")}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              // Multi-price group - distinct card with orange border
                              const groupTotal = group.items.reduce((sum, item) => sum + (item.totalPrice || (item.price * item.quantity) || 0), 0);
                              const totalQty = group.items.reduce((sum, item) => sum + item.quantity, 0);
                              const isGroupHighlighted = group.items.some(i => highlightedCartItemId === i.id);
                              return (
                                <div
                                  key={group.productId}
                                  id={`cart-item-${group.items[0].id}`}
                                  className={`bg-[var(--dash-bg-surface)] rounded-lg p-3 border-2 transition-all duration-300 ${isGroupHighlighted ? 'border-yellow-400 ring-2 ring-yellow-400 bg-yellow-400/10' : 'border-dash-accent-orange'}`}
                                >
                                  {/* Shared product header */}
                                  <div className="flex gap-3 mb-2">
                                    <div className="w-12 h-12 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden flex-shrink-0">
                                      <ProductThumbnail src={firstItem.product.main_image_url} alt={firstItem.product.name} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <h4 className="font-medium text-[var(--dash-text-primary)] text-sm truncate">{firstItem.product.name}</h4>
                                          <span className="text-xs text-dash-accent-orange bg-dash-accent-orange-subtle px-2 py-0.5 rounded-full flex-shrink-0 border border-dash-accent-orange">
                                            {group.items.length} أسعار
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-[var(--dash-text-muted)] text-xs mt-1">
                                        إجمالي الكمية: {totalQty}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sub-rows for each price entry */}
                                  <div className="bg-[var(--dash-bg-raised)] rounded-md px-2 mt-1">
                                    {group.items.map((item) => renderItemControls(item, true))}
                                  </div>

                                  {/* Combined total */}
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-dash-accent-orange/30">
                                    <span className="text-[var(--dash-text-muted)] text-xs">الإجمالي</span>
                                    <span className="text-dash-accent-green font-bold text-sm">
                                      {formatPrice(groupTotal, "system")}
                                    </span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart Footer */}
                  <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)] flex-shrink-0">
                    {/* Payment Split Component - Show in sales, return, and purchase mode (not transfer or edit mode) */}
                    {!isTransferMode && !activePOSTab?.isEditMode && (
                      <PaymentSplit
                        key={invoiceCounter}
                        totalAmount={calculateTotalWithDiscounts()}
                        onPaymentsChange={(payments, credit) => {
                          setPaymentSplitData(payments);
                          setCreditAmount(credit);
                        }}
                        isDefaultCustomer={isPurchaseMode ? false : selections.customer?.id === '00000000-0000-0000-0000-000000000001'}
                        isReturnMode={isReturnMode}
                        isPurchaseMode={isPurchaseMode}
                      />
                    )}

                    {/* Single row layout for total and button */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Total/Transfer info section */}
                      <div className="flex-shrink-0">
                        {!isTransferMode ? (
                          <div className="text-right">
                            {(cartDiscount > 0 || cartItems.some(item => item.discount && item.discount > 0)) ? (
                              <>
                                <div className="text-[var(--dash-text-primary)] text-sm font-medium">الإجمالي: ({cartItems.length})</div>
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="text-[var(--dash-text-muted)] text-xs line-through">
                                    {formatPrice(cartTotal, "system")}
                                  </span>
                                  <span className="text-dash-accent-orange text-xs">
                                    خصم {cartDiscount > 0 ? (cartDiscountType === "percentage" ? `${cartDiscount}%` : `${cartDiscount} ج.م`) : ""}
                                  </span>
                                </div>
                                <div className="text-dash-accent-green font-bold text-lg">
                                  {formatPrice(calculateTotalWithDiscounts(), "system")}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-[var(--dash-text-primary)] text-sm font-medium">الإجمالي: ({cartItems.length})</div>
                                <div className="text-dash-accent-green font-bold text-lg">
                                  {formatPrice(cartTotal, "system")}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-dash-accent-green text-sm font-medium">وضع النقل</div>
                            <div className="text-[var(--dash-text-primary)] font-bold text-lg">
                              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Button section */}
                      {!isTransferMode && !isReturnMode && !isPurchaseMode && !activePOSTab?.isEditMode && selections.customer?.id === defaultCustomer?.id ? (
                        /* Split button: [paid input | confirm arrow] for default customer only */
                        <div className={`flex-1 flex rounded-lg overflow-hidden ${
                          (cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice)
                            ? 'opacity-50' : ''
                        }`}>
                          <input
                            type="number"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            placeholder="المدفوع"
                            disabled={cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice}
                            className="w-24 min-w-0 px-3 py-2 bg-[var(--dash-bg-base)] text-[var(--dash-text-primary)] text-sm placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-dash-accent-blue text-left border-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            style={{ MozAppearance: 'textfield' }}
                            dir="ltr"
                          />
                          <button
                            disabled={cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 dash-btn-primary font-medium text-sm transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed"
                            onClick={handleCreateInvoice}
                          >
                            {isProcessingInvoice ? '...' : (
                              <>
                                {paidAmount && parseFloat(paidAmount) > 0 && (
                                  <span className="text-dash-accent-orange font-bold whitespace-nowrap text-xs">
                                    الباقي: {(parseFloat(paidAmount) - calculateTotalWithDiscounts()).toFixed(0)}
                                  </span>
                                )}
                              </>
                            )}
                            <ChevronLeftIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : !isTransferMode && !isReturnMode && !isPurchaseMode && !activePOSTab?.isEditMode ? (
                        /* Normal confirm button for regular customers */
                        <button
                          disabled={cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice}
                          className="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed dash-btn-primary"
                          onClick={handleCreateInvoice}
                        >
                          {isProcessingInvoice
                            ? "جاري المعالجة..."
                            : cartItems.length === 0
                              ? "السلة فارغة"
                              : !hasAllRequiredSelections()
                                ? "يجب إكمال التحديدات"
                                : `تأكيد الطلب (${cartItems.length}) [Y]`}
                        </button>
                      ) : (
                        <button
                          disabled={
                            (cartItems.length === 0 && !activePOSTab?.isEditMode) ||
                            !hasAllRequiredSelections() ||
                            isProcessingInvoice
                          }
                          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed text-[var(--dash-text-primary)] ${
                            activePOSTab?.isEditMode
                              ? "bg-amber-600 hover:bg-amber-700"
                              : isTransferMode
                                ? "dash-btn-green"
                                : isReturnMode
                                  ? "dash-btn-red"
                                  : "dash-btn-purple"
                          }`}
                          onClick={handleCreateInvoice}
                        >
                          {isProcessingInvoice
                            ? "جاري المعالجة..."
                            : cartItems.length === 0 && !activePOSTab?.isEditMode
                              ? "السلة فارغة"
                              : !hasAllRequiredSelections()
                                ? "يجب إكمال التحديدات"
                                : activePOSTab?.isEditMode
                                  ? `تعديل الفاتورة (${cartItems.length}) [Y]`
                                  : isTransferMode
                                    ? `تأكيد النقل (${cartItems.length}) [Y]`
                                    : isReturnMode
                                      ? isPurchaseMode
                                        ? `مرتجع شراء (${cartItems.length}) [Y]`
                                        : `مرتجع بيع (${cartItems.length}) [Y]`
                                      : `تأكيد الشراء (${cartItems.length}) [Y]`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Display Container - Responsive: absolute for mobile, normal for desktop */}
            <div className={`${isCartOpen ? "hidden md:block" : "block"} md:h-full md:flex md:flex-col absolute inset-0 md:relative md:inset-auto flex flex-col`}>
              {/* Loading State - Skeleton UI for faster perceived loading */}
              {isLoading && (
                <ProductGridSkeleton count={12} />
              )}

              {/* Error State */}
              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-dash-accent-red">خطأ: {error}</div>
                </div>
              )}

              {/* Products Content */}
              {!isLoading && !error && (
                <>
                  {viewMode === "table" ? (
                    /* Table View */
                    <div className="flex-1 min-h-0">
                      <ResizableTable
                        className="h-full w-full"
                        columns={visibleTableColumns}
                        data={filteredProducts}
                        reportType="POS_PRODUCTS_REPORT"
                        onRowClick={(product, index) => {
                          handleProductClick(product);
                        }}
                      />
                    </div>
                  ) : (
                    /* Grid View - Responsive scroll solution */
                    <div className="flex-1 overflow-hidden">
                      <div className="h-full overflow-y-auto scrollbar-hide p-4">
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
                          {/* ✨ PERFORMANCE FIX: Use visibleProducts instead of productsWithComputedInventory */}
                          {/* This renders only filtered products (~12-50) instead of all 1000+ products */}
                          {/* The filtering is done in useMemo, not via CSS hidden class */}
                          {visibleProducts.map((product, index) => (
                            <div
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="bg-[var(--dash-bg-raised)] rounded-lg p-3 cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-gray-500 hover:bg-[#434E61] relative group"
                            >
                              {/* Product Image */}
                              <div className="mb-3 relative">
                                <ProductGridImage
                                  src={product.main_image_url}
                                  alt={product.name}
                                  priority={index < 6}
                                />

                                {/* View Details Button */}
                                <div className="absolute top-2 right-2 z-50">
                                  <button
                                    onClick={(e) => {
                                      if (isSidebarOpen) return; // لا تعمل إذا القائمة مفتوحة
                                      e.stopPropagation();
                                      setModalProduct(product);
                                      const firstImage =
                                        product.allImages?.[0] ||
                                        product.main_image_url ||
                                        null;
                                      setSelectedImage(firstImage);
                                      setShowPurchasePrice(false); // Reset purchase price visibility
                                      setShowProductModal(true);
                                    }}
                                    className={`bg-black/50 hover:bg-black/90 text-[var(--dash-text-primary)] p-2 rounded-full opacity-0 ${!isSidebarOpen ? 'group-hover:opacity-100' : 'pointer-events-none'} transition-all duration-200 shadow-lg`}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Product Name */}
                              <h3 className="text-[var(--dash-text-primary)] font-medium text-sm text-center mb-2 line-clamp-2">
                                {product.name}
                              </h3>

                              {/* Product Code */}
                              {product.product_code && (
                                <p className="text-[var(--dash-text-muted)] text-xs text-center mb-1">
                                  {product.product_code}
                                </p>
                              )}

                              {/* Product Details */}
                              <div className="space-y-1 text-xs">
                                {/* Price */}
                                <div className="flex justify-center mb-2">
                                  <span className="text-dash-accent-blue font-medium text-sm">
                                    {getProductPriceByType(product).toFixed(2)}
                                  </span>
                                </div>

                                {/* Total Quantity - Using pre-computed value */}
                                <div className="flex justify-between items-center">
                                  <span className="text-dash-accent-blue font-medium">
                                    {product._computed.totalQuantity}
                                  </span>
                                  <span className="text-[var(--dash-text-muted)]">
                                    الكمية الإجمالية
                                  </span>
                                </div>

                                {/* Branch Quantities - Using pre-computed values for O(1) access */}
                                {product._computed.branchQuantities.map(
                                  ({ locationId, quantity, name }) => (
                                    <div
                                      key={locationId}
                                      className="flex justify-between items-center"
                                    >
                                      <span className="text-[var(--dash-text-primary)]">
                                        {quantity}
                                      </span>
                                      <span className="text-[var(--dash-text-muted)] truncate">
                                        {name}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Load More Button - shown when there are more products to display */}
                          {hasMoreProducts && (
                            <div className="col-span-full flex justify-center py-4">
                              <button
                                onClick={() => setShowAllProducts(true)}
                                className="dash-btn-primary px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                              >
                                <span>تحميل كل المنتجات ({productsWithComputedInventory.length - VISIBLE_PRODUCTS_LIMIT} منتج إضافي)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Shopping Cart Panel - Desktop: Sidebar, Mobile: Shows below search toolbar */}
        <div className="hidden md:flex">
          <div className="w-80 bg-[var(--dash-bg-raised)] border-r border-[var(--dash-border-default)] flex flex-col h-screen flex-shrink-0"
          >
            {/* Cart Items Area - Full Height */}
            <div className="flex-1 overflow-hidden">
              {cartItems.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full p-8">
                  <ShoppingCartIcon className="h-24 w-24 text-[var(--dash-text-disabled)] mb-8" />
                  <p className="text-[var(--dash-text-muted)] text-sm text-center mb-4">
                    اضغط على المنتجات لإضافتها للسلة
                  </p>
                  <div className="text-center">
                    <span className="bg-[var(--dash-bg-overlay)] px-3 py-1 rounded text-sm text-[var(--dash-text-secondary)]">
                      0 منتج
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Cart Header */}
                  <div className="px-3 py-2.5 border-b border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)] flex-shrink-0 mt-12">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1.5 flex-1 cursor-text"
                        onClick={() => { setShowCartSearch(true); setTimeout(() => cartSearchInputRef.current?.focus(), 100); }}
                      >
                        <MagnifyingGlassIcon className="h-3.5 w-3.5 text-[var(--dash-text-disabled)] flex-shrink-0" />
                        {showCartSearch ? (
                          <>
                            <input
                              ref={cartSearchInputRef}
                              type="text"
                              value={cartSearchQuery}
                              onChange={(e) => handleCartSearch(e.target.value)}
                              placeholder="بحث في السلة..."
                              className="bg-transparent text-sm text-[var(--dash-text-primary)] placeholder:text-[var(--dash-text-disabled)] outline-none flex-1"
                              autoFocus
                              onBlur={() => { if (!cartSearchQuery) { setShowCartSearch(false); setCartSearchMatchIds([]); setCartSearchMatchIndex(0); } }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setShowCartSearch(false);
                                  setCartSearchQuery('');
                                  setHighlightedCartItemId(null);
                                  setCartSearchMatchIds([]);
                                  setCartSearchMatchIndex(0);
                                  (e.target as HTMLInputElement).blur();
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  navigateCartSearchMatch(e.shiftKey ? 'prev' : 'next');
                                }
                              }}
                            />
                            {cartSearchQuery && cartSearchMatchIds.length > 0 && (
                              <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={(e) => e.preventDefault()}>
                                <span className="text-[var(--dash-text-muted)] text-xs whitespace-nowrap">{cartSearchMatchIndex + 1}/{cartSearchMatchIds.length}</span>
                                <button
                                  onClick={() => navigateCartSearchMatch('prev')}
                                  className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] p-0.5"
                                >
                                  <ChevronUpIcon className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => navigateCartSearchMatch('next')}
                                  className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] p-0.5"
                                >
                                  <ChevronDownIcon className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            {cartSearchQuery && (
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setCartSearchQuery(''); setHighlightedCartItemId(null); setCartSearchMatchIds([]); setCartSearchMatchIndex(0); cartSearchInputRef.current?.focus(); }}
                                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                              >
                                <XMarkIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[var(--dash-text-disabled)] text-xs">بحث</span>
                        )}
                      </div>
                      <span className="text-[var(--dash-text-primary)] font-medium text-sm whitespace-nowrap">منتجات السلة: {cartItems.length}</span>
                    </div>
                  </div>

                  {/* Transfer Direction Header */}
                  {isTransferMode && transferFromLocation && transferToLocation && (
                    <div className="px-4 py-2 bg-dash-accent-green-subtle border-b border-dash-accent-green flex-shrink-0">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-dash-accent-green font-medium">{transferFromLocation.name}</span>
                        <span className="text-dash-accent-green">→</span>
                        <span className="text-dash-accent-green font-medium">{transferToLocation.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div
                    ref={cartContainerRef}
                    className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 min-h-0"
                  >
                    {(() => {
                      // Group cart items by product.id for multi-price display (desktop)
                      const groups: { productId: string; items: typeof cartItems }[] = [];
                      const groupMap = new Map<string, typeof cartItems>();
                      cartItems.forEach((item) => {
                        const pid = item.product.id;
                        if (!groupMap.has(pid)) {
                          const items: typeof cartItems = [];
                          groupMap.set(pid, items);
                          groups.push({ productId: pid, items });
                        }
                        groupMap.get(pid)!.push(item);
                      });

                      // Helper: render quantity/price/colors/shapes for a single entry (desktop)
                      const renderDesktopEntry = (item: any, isMulti: boolean) => (
                        <div key={item.id} className={isMulti ? 'py-2 border-b border-[var(--dash-border-default)] last:border-b-0' : ''}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--dash-text-muted)] text-xs">الكمية:</span>
                              <EditableField
                                value={item.quantity}
                                type="number"
                                onUpdate={(newQuantity) => {
                                  setCartItems((prev) => {
                                    const newCart = prev.map((cartItem) => {
                                      if (cartItem.id === item.id) {
                                        const ratio = newQuantity / cartItem.quantity;
                                        let updatedColors: { [key: string]: number } | null = null;
                                        if (cartItem.selectedColors) {
                                          updatedColors = {};
                                          Object.entries(cartItem.selectedColors).forEach(([color, quantity]: [string, any]) => {
                                            updatedColors![color] = Math.max(1, Math.round(quantity * ratio));
                                          });
                                        }
                                        let updatedShapes: { [key: string]: number } | null = null;
                                        if (cartItem.selectedShapes) {
                                          updatedShapes = {};
                                          Object.entries(cartItem.selectedShapes).forEach(([shape, quantity]: [string, any]) => {
                                            updatedShapes![shape] = Math.max(1, Math.round(quantity * ratio));
                                          });
                                        }
                                        const newTotal = isTransferMode ? 0 : cartItem.price * newQuantity;
                                        return { ...cartItem, quantity: newQuantity, selectedColors: updatedColors, selectedShapes: updatedShapes, total: newTotal, totalPrice: newTotal };
                                      }
                                      return cartItem;
                                    });
                                    updateActiveTabCart(newCart);
                                    return newCart;
                                  });
                                }}
                                className="text-[var(--dash-text-primary)] font-medium text-right bg-transparent border-none outline-none w-16 hover:bg-[var(--dash-bg-overlay)]/20 rounded px-1"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {!isTransferMode && (
                                <>
                                  <span className="text-[var(--dash-text-muted)] text-xs">السعر:</span>
                                  <EditableField
                                    value={item.price}
                                    type="number"
                                    step="0.01"
                                    onUpdate={(newPrice) => {
                                      setCartItems((prev) => {
                                        const newCart = prev.map((cartItem) => {
                                          if (cartItem.id === item.id) {
                                            const newTotal = cartItem.quantity * newPrice;
                                            return { ...cartItem, price: newPrice, total: newTotal, totalPrice: newTotal };
                                          }
                                          return cartItem;
                                        });
                                        updateActiveTabCart(newCart);
                                        return newCart;
                                      });
                                    }}
                                    className="text-dash-accent-blue font-medium text-right bg-transparent border-none outline-none w-16 hover:bg-[var(--dash-bg-overlay)]/20 rounded px-1"
                                  />
                                  <span className="text-dash-accent-blue text-xs">{systemCurrency}</span>
                                </>
                              )}
                              {isMulti && (
                                <button onClick={() => removeFromCart(item.id)} className="text-dash-accent-red hover:bg-dash-accent-red-subtle rounded-full p-0.5 transition-colors text-sm leading-none" title="إزالة">×</button>
                              )}
                            </div>
                          </div>
                          {/* Colors */}
                          {item.selectedColors && Object.keys(item.selectedColors).length > 0 && (
                            <div className="mt-1">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(item.selectedColors).map(([color, quantity]: [string, any]) => (
                                  <span key={color} className="bg-[var(--dash-bg-overlay)] px-2 py-1 rounded text-xs text-[var(--dash-text-primary)]">{color}: {quantity}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Shapes */}
                          {item.selectedShapes && Object.keys(item.selectedShapes).length > 0 && (
                            <div className="mt-1">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(item.selectedShapes).map(([shape, quantity]: [string, any]) => (
                                  <span key={shape} className="bg-dash-accent-purple-subtle px-2 py-1 rounded text-xs text-[var(--dash-text-primary)]">🔷 {shape}: {quantity}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Per-entry total for multi-price */}
                          {isMulti && !isTransferMode && (
                            <div className="text-left mt-1">
                              <span className="text-dash-accent-green text-xs">
                                {(item.totalPrice || (item.price * item.quantity) || 0).toFixed(2)} {systemCurrency}
                              </span>
                            </div>
                          )}
                        </div>
                      );

                      return groups.map((group) => {
                        const isMultiPrice = group.items.length > 1;
                        const firstItem = group.items[0];

                        if (!isMultiPrice) {
                          // Single item - render normally
                          const item = firstItem;
                          return (
                            <div key={item.id} id={`cart-item-${item.id}`} className={`bg-[var(--dash-bg-surface)] rounded-lg p-3 border transition-all duration-300 ${highlightedCartItemId === item.id ? 'border-yellow-400 ring-2 ring-yellow-400 bg-yellow-400/10' : 'border-[var(--dash-border-default)]'}`}>
                              <div className="flex gap-3 mb-2">
                                <div className="w-12 h-12 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden flex-shrink-0">
                                  <ProductThumbnail src={item.product.main_image_url} alt={item.product.name} />
                                </div>
                                <div className="flex-1 flex justify-between items-start">
                                  <h4 className="text-[var(--dash-text-primary)] text-sm font-medium leading-tight flex-1">{item.product.name}</h4>
                                  <div className="flex items-center gap-1 ml-2">
                                    {isPurchaseMode && item.product?.isNewProduct && (
                                      <button onClick={() => { setEditingCartItem(item); setShowQuickAddProductModal(true); }} className="text-dash-accent-blue hover:text-dash-accent-blue hover:bg-dash-accent-blue-subtle rounded-full p-1 transition-colors" title="تعديل المنتج">
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button onClick={() => removeFromCart(item.id)} className="text-dash-accent-red hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded-full p-1 transition-colors text-lg leading-none" title="إزالة من السلة">×</button>
                                  </div>
                                </div>
                              </div>
                              {renderDesktopEntry(item, false)}
                              {!isTransferMode && (
                                <div className="mt-2 text-left">
                                  <span className="text-dash-accent-green font-bold text-sm">
                                    {(item.totalPrice || (item.price * item.quantity) || 0).toFixed(2)} {systemCurrency}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Multi-price group
                        const groupTotal = group.items.reduce((sum, item) => sum + (item.totalPrice || (item.price * item.quantity) || 0), 0);
                        const totalQty = group.items.reduce((sum, item) => sum + item.quantity, 0);
                        const isDesktopGroupHighlighted = group.items.some(i => highlightedCartItemId === i.id);
                        return (
                          <div key={group.productId} id={`cart-item-${group.items[0].id}`} className={`bg-[var(--dash-bg-surface)] rounded-lg p-3 border-2 transition-all duration-300 ${isDesktopGroupHighlighted ? 'border-yellow-400 ring-2 ring-yellow-400 bg-yellow-400/10' : 'border-dash-accent-orange'}`}>
                            <div className="flex gap-3 mb-2">
                              <div className="w-12 h-12 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden flex-shrink-0">
                                <ProductThumbnail src={firstItem.product.main_image_url} alt={firstItem.product.name} />
                              </div>
                              <div className="flex-1 flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[var(--dash-text-primary)] text-sm font-medium leading-tight">{firstItem.product.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-dash-accent-orange bg-dash-accent-orange-subtle px-2 py-0.5 rounded-full border border-dash-accent-orange">{group.items.length} أسعار</span>
                                    <span className="text-[var(--dash-text-muted)] text-xs">الكمية: {totalQty}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-[var(--dash-bg-raised)] rounded-md px-2">
                              {group.items.map((item) => renderDesktopEntry(item, true))}
                            </div>
                            {!isTransferMode && (
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-dash-accent-orange/30">
                                <span className="text-[var(--dash-text-muted)] text-xs">الإجمالي</span>
                                <span className="text-dash-accent-green font-bold text-sm">{groupTotal.toFixed(2)} {systemCurrency}</span>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)] flex-shrink-0">
              {/* Payment Split Component - Show in sales, return, and purchase mode (not transfer or edit mode) */}
              {!isTransferMode && !activePOSTab?.isEditMode && (
                <PaymentSplit
                  key={invoiceCounter}
                  totalAmount={calculateTotalWithDiscounts()}
                  onPaymentsChange={(payments, credit) => {
                    setPaymentSplitData(payments);
                    setCreditAmount(credit);
                  }}
                  isDefaultCustomer={isPurchaseMode ? false : selections.customer?.id === '00000000-0000-0000-0000-000000000001'}
                  isReturnMode={isReturnMode}
                  isPurchaseMode={isPurchaseMode}
                />
              )}

              {/* Single row layout for total and button */}
              <div className="flex items-center justify-between gap-3">
                {/* Total/Transfer info section */}
                <div className="flex-shrink-0">
                  {!isTransferMode ? (
                    <div className="text-right">
                      {(cartDiscount > 0 || cartItems.some(item => item.discount && item.discount > 0)) ? (
                        <>
                          <div className="text-[var(--dash-text-primary)] text-sm font-medium">الإجمالي: ({cartItems.length})</div>
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[var(--dash-text-muted)] text-xs line-through">
                              {formatPrice(cartTotal, "system")}
                            </span>
                            <span className="text-dash-accent-orange text-xs">
                              خصم {cartDiscount > 0 ? (cartDiscountType === "percentage" ? `${cartDiscount}%` : `${cartDiscount} ج.م`) : ""}
                            </span>
                          </div>
                          <div className="text-dash-accent-green font-bold text-lg">
                            {formatPrice(calculateTotalWithDiscounts(), "system")}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[var(--dash-text-primary)] text-sm font-medium">الإجمالي: ({cartItems.length})</div>
                          <div className="text-dash-accent-green font-bold text-lg">
                            {formatPrice(cartTotal, "system")}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-dash-accent-green text-sm font-medium">وضع النقل</div>
                      <div className="text-[var(--dash-text-primary)] font-bold text-lg">
                        {cartItems.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                      </div>
                    </div>
                  )}
                </div>

                {/* Button section */}
                {!isTransferMode && !isReturnMode && !isPurchaseMode && !activePOSTab?.isEditMode && selections.customer?.id === defaultCustomer?.id ? (
                  /* Split button: [paid input | confirm arrow] for default customer only */
                  <div className={`flex-1 flex rounded-lg overflow-hidden ${
                    (cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice)
                      ? 'opacity-50' : ''
                  }`}>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="المدفوع"
                      disabled={cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice}
                      className="w-24 min-w-0 px-3 py-2 bg-[var(--dash-bg-base)] text-[var(--dash-text-primary)] text-sm placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-dash-accent-blue text-left border-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      style={{ MozAppearance: 'textfield' }}
                      dir="ltr"
                    />
                    <button
                      disabled={cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 dash-btn-primary font-medium text-sm transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed"
                      onClick={handleCreateInvoice}
                    >
                      {isProcessingInvoice ? '...' : (
                        <>
                          {paidAmount && parseFloat(paidAmount) > 0 && (
                            <span className="text-dash-accent-orange font-bold whitespace-nowrap text-xs">
                              الباقي: {(parseFloat(paidAmount) - calculateTotalWithDiscounts()).toFixed(0)}
                            </span>
                          )}
                        </>
                      )}
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : !isTransferMode && !isReturnMode && !isPurchaseMode && !activePOSTab?.isEditMode ? (
                  /* Normal confirm button for regular customers */
                  <button
                    disabled={cartItems.length === 0 || !hasAllRequiredSelections() || isProcessingInvoice}
                    className="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed dash-btn-primary"
                    onClick={handleCreateInvoice}
                  >
                    {isProcessingInvoice
                      ? "جاري المعالجة..."
                      : cartItems.length === 0
                        ? "السلة فارغة"
                        : !hasAllRequiredSelections()
                          ? "يجب إكمال التحديدات"
                          : `تأكيد الطلب (${cartItems.length}) [Y]`}
                  </button>
                ) : (
                  <button
                    disabled={
                      (cartItems.length === 0 && !activePOSTab?.isEditMode) ||
                      !hasAllRequiredSelections() ||
                      isProcessingInvoice
                    }
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed text-[var(--dash-text-primary)] ${
                      activePOSTab?.isEditMode
                        ? "bg-amber-600 hover:bg-amber-700"
                        : isTransferMode
                          ? "dash-btn-green"
                          : isReturnMode
                            ? "dash-btn-red"
                            : "dash-btn-purple"
                    }`}
                    onClick={handleCreateInvoice}
                  >
                    {isProcessingInvoice
                      ? "جاري المعالجة..."
                      : cartItems.length === 0 && !activePOSTab?.isEditMode
                        ? "السلة فارغة"
                        : !hasAllRequiredSelections()
                          ? "يجب إكمال التحديدات"
                          : activePOSTab?.isEditMode
                            ? `تعديل الفاتورة (${cartItems.length}) [Y]`
                            : isTransferMode
                              ? `تأكيد النقل (${cartItems.length}) [Y]`
                              : isReturnMode
                                ? isPurchaseMode
                                  ? `مرتجع شراء (${cartItems.length}) [Y]`
                                  : `مرتجع بيع (${cartItems.length}) [Y]`
                                : `تأكيد الشراء (${cartItems.length}) [Y]`}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Records Selection Modal */}
      <RecordsSelectionModal
        isOpen={isRecordsModalOpen}
        onClose={() => setIsRecordsModalOpen(false)}
        onSelectRecord={handleRecordSelect}
      />

      {/* Customer Selection Modal */}
      <CustomerSelectionModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleCustomerSelect}
      />

      {/* Party Selection Modal (Unified Customer/Supplier) */}
      <PartySelectionModal
        isOpen={isPartyModalOpen}
        onClose={() => {
          setIsPartyModalOpen(false);
          setIsPartyModalForNewTab(false);
          setIsPartyModalForPurchase(false);
        }}
        onSelect={
          isPartyModalForPurchase
            ? handlePartySelectForPurchase
            : isPartyModalForNewTab
              ? handleNewTabPartySelect
              : handlePartySelect
        }
        defaultTab={isPartyModalForPurchase || isPurchaseMode ? 'supplier' : 'customer'}
        currentSelection={
          isPartyModalForNewTab || isPartyModalForPurchase
            ? null // لا يوجد اختيار مسبق عند إنشاء تبويب جديد أو الشراء
            : selectedSupplierForSale
              ? { id: selectedSupplierForSale.id, type: 'supplier' as PartyType }
              : globalSelections.customer
                ? { id: globalSelections.customer.id, type: 'customer' as PartyType }
                : null
        }
      />

      {/* Customer Selection Modal for New Tab (from + button) */}
      <CustomerSelectionModal
        isOpen={showNewTabCustomerModal}
        onClose={() => setShowNewTabCustomerModal(false)}
        onSelectCustomer={handleNewTabCustomerSelect}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Add to Cart Modal */}
      <AddToCartModal
        isOpen={showAddToCartModal}
        onClose={() => {
          setShowAddToCartModal(false);
          setModalProduct(null);
        }}
        product={modalProduct}
        isTransferMode={isTransferMode}
        onAddToCart={(product, quantity, selectedColor) => {
          // Use the main handleAddToCart function to ensure consistent grouping
          const productWithCorrectPrice = {
            ...product,
            price: isTransferMode ? 0 : product.price || 0,
          };
          handleAddToCart(productWithCorrectPrice, quantity, selectedColor);

          // مسح البحث وإعادة التركيز على حقل البحث
          searchInputRef.current?.clearSearch();
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        }}
      />

      {/* Color Selection Modal */}
      <ColorSelectionModal
        isOpen={showColorSelectionModal}
        onClose={() => {
          setShowColorSelectionModal(false);
          setModalProduct(null);
        }}
        product={modalProduct}
        onAddToCart={handleColorSelection}
        hasRequiredForCart={hasRequiredForCart()}
        selectedBranchId={selections.branch?.id || contextBranch?.id}
        isPurchaseMode={isPurchaseMode}
        isTransferMode={isTransferMode}
        transferFromLocation={transferFromLocation}
        selectedPriceType={selectedPriceType}
      />

      {/* Supplier Selection Modal */}
      <SupplierSelectionModal
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setIsSupplierModalForNewPurchase(false);
        }}
        onSelect={isSupplierModalForNewPurchase ? handleSupplierSelectForPurchase : handleSupplierChange}
        selectedSupplier={selectedSupplier}
        isPurchaseMode={isSupplierModalForNewPurchase}
      />

      {/* Transfer Location Selection Modal */}
      <TransferLocationModal
        isOpen={isTransferLocationModalOpen}
        onClose={() => setIsTransferLocationModalOpen(false)}
        onConfirm={handleTransferLocationConfirm}
      />

      {/* Price Type Selection Modal */}
      <PriceTypeSelectionModal
        isOpen={isPriceTypeModalOpen}
        onClose={() => setIsPriceTypeModalOpen(false)}
        selectedPriceType={selectedPriceType}
        onSelectPriceType={setSelectedPriceType}
      />

      {/* Discount Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        cartItems={cartItems}
        cartDiscount={cartDiscount}
        cartDiscountType={cartDiscountType}
        onApplyItemDiscount={handleApplyItemDiscount}
        onApplyCartDiscount={handleApplyCartDiscount}
        onRemoveItemDiscount={handleRemoveItemDiscount}
        onRemoveCartDiscount={handleRemoveCartDiscount}
      />

      {/* Postponed Invoices Modal */}
      <PostponedInvoicesModal
        isOpen={isPostponedModalOpen}
        onClose={() => setIsPostponedModalOpen(false)}
        postponedTabs={postponedTabs}
        onRestoreTab={restoreTab}
        onDeleteTab={closeTab}
        onRefresh={refreshPostponedTabs}
      />

      {/* Cash Drawer Modal */}
      <CashDrawerModal
        isOpen={isCashDrawerModalOpen}
        onClose={() => setIsCashDrawerModalOpen(false)}
        record={selections.record}
      />

      {/* Expense/Addition Modal */}
      <ExpenseAdditionModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        record={selections.record}
      />

      {/* Quick Add Product Modal */}
      <QuickAddProductModal
        isOpen={showQuickAddProductModal}
        onClose={() => {
          setShowQuickAddProductModal(false);
          setEditingCartItem(null);
        }}
        onAddToCart={handleQuickAddToCart}
        editingItem={editingCartItem}
        onUpdateCartItem={handleUpdateCartItem}
      />

      {/* Product Details Modal */}
      {showProductModal && modalProduct && (
        <>
          {/* Mobile Modal */}
          <div className="block md:hidden">
            <MobileProductDetailsModal
              product={modalProduct}
              onClose={() => setShowProductModal(false)}
              branches={branches}
              lastPurchaseInfo={lastPurchaseInfo}
              showPurchasePrice={showPurchasePrice}
              onTogglePurchasePrice={() => setShowPurchasePrice(!showPurchasePrice)}
              selectedImage={selectedImage}
              onSelectImage={setSelectedImage}
              onShowPurchaseHistory={() => setShowPurchaseHistoryModal(true)}
            />
          </div>

          {/* Desktop Backdrop */}
          <div
            className="hidden md:block fixed inset-0 bg-black/70 z-50"
            onClick={() => setShowProductModal(false)}
          />

          {/* Desktop Modal */}
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4">
            <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] max-w-6xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
              {/* Header */}
              <div className="sticky top-0 bg-[var(--dash-bg-surface)] px-8 py-6 border-b border-[var(--dash-border-default)] flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    {modalProduct.main_image_url ? (
                      <img src={modalProduct.main_image_url} alt={modalProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-dash-accent-blue flex items-center justify-center">
                        <span className="text-[var(--dash-text-primary)] font-bold text-lg">📦</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">
                      تفاصيل المنتج
                    </h2>
                    <p className="text-dash-accent-blue font-medium">
                      {modalProduct.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="grid grid-cols-3 gap-8">
                  {/* Left Column - Product Info */}
                  <div className="space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-dash-accent-blue-subtle rounded-lg flex items-center justify-center">
                          <span className="text-dash-accent-blue text-sm">ℹ️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
                          معلومات المنتج
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-[var(--dash-border-default)]/50">
                          <span className="text-[var(--dash-text-muted)]">المجموعة</span>
                          <span className="text-[var(--dash-text-primary)] font-medium">
                            {modalProduct.category?.name || "غير محدد"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[var(--dash-border-default)]/50">
                          <span className="text-[var(--dash-text-muted)]">الوحدة</span>
                          <span className="text-[var(--dash-text-primary)] font-medium">
                            {modalProduct.unit || "قطعة"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[var(--dash-border-default)]/50">
                          <span className="text-[var(--dash-text-muted)]">الحد الأدنى</span>
                          <span className="text-[var(--dash-text-primary)] font-medium">
                            {modalProduct.min_stock || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-[var(--dash-text-muted)]">الباركود</span>
                          <span className="text-[var(--dash-text-primary)] font-mono text-sm">
                            {modalProduct.barcode || "غير متوفر"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Card */}
                    <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-dash-accent-green-subtle rounded-lg flex items-center justify-center">
                          <span className="text-dash-accent-green text-sm">💰</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
                          الأسعار
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 text-center">
                          <p className="text-[var(--dash-text-muted)] text-sm mb-1">
                            سعر البيع
                          </p>
                          <p className="text-dash-accent-green font-bold text-xl">
                            {(modalProduct.price || 0).toFixed(2)}
                          </p>
                        </div>
                        <div
                          onClick={() => setShowPurchasePrice(!showPurchasePrice)}
                          className="bg-[var(--dash-bg-surface)] rounded-lg p-4 text-center cursor-pointer hover:bg-[var(--dash-bg-overlay)] transition-colors relative"
                        >
                          {showPurchasePrice ? (
                            <>
                              <p className="text-[var(--dash-text-muted)] text-sm mb-1">
                                سعر الشراء
                              </p>
                              <p className="text-dash-accent-orange font-bold text-xl">
                                {(modalProduct.cost_price || 0).toFixed(2)}
                              </p>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full min-h-[52px]">
                              <EyeSlashIcon className="h-6 w-6 text-[var(--dash-text-disabled)]" />
                            </div>
                          )}
                        </div>
                        <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 text-center">
                          <p className="text-[var(--dash-text-muted)] text-sm mb-1">
                            سعر الجملة
                          </p>
                          <p className="text-dash-accent-blue font-bold text-lg">
                            {(modalProduct.wholesale_price || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 text-center">
                          <p className="text-[var(--dash-text-muted)] text-sm mb-1">سعر 1</p>
                          <p className="text-dash-accent-purple font-bold text-lg">
                            {(modalProduct.price1 || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Profit & Purchase Info Card */}
                    <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-dash-accent-orange-subtle rounded-lg flex items-center justify-center">
                          <span className="text-dash-accent-orange text-sm">📈</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">الربح ومعلومات الشراء</h3>
                      </div>

                      {/* ربح المنتج - بنفس شكل PD */}
                      <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--dash-text-muted)] text-sm">ربح المنتج</span>
                          <span className="text-xs text-[var(--dash-text-disabled)] font-mono">
                            PD: {((modalProduct.price || 0) - (modalProduct.cost_price || 0)).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* آخر سعر شراء واسم المورد */}
                      {lastPurchaseInfo ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-[var(--dash-border-default)]/50">
                            <span className="text-[var(--dash-text-muted)]">آخر سعر شراء</span>
                            <span className="text-dash-accent-orange font-bold">
                              {lastPurchaseInfo.unitPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-[var(--dash-border-default)]/50">
                            <span className="text-[var(--dash-text-muted)]">المورد</span>
                            <span className="text-[var(--dash-text-primary)] font-medium">
                              {lastPurchaseInfo.supplierName}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowPurchaseHistoryModal(true)}
                            className="w-full px-4 py-2 dash-btn-primary text-sm rounded-lg transition-colors"
                          >
                            عرض تاريخ الشراء
                          </button>
                        </div>
                      ) : (
                        <p className="text-[var(--dash-text-disabled)] text-sm text-center py-4">
                          لا يوجد سجل شراء لهذا المنتج
                        </p>
                      )}
                    </div>

                    {/* Description Card */}
                    {modalProduct.description && (
                      <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-dash-accent-purple-subtle rounded-lg flex items-center justify-center">
                            <span className="text-dash-accent-purple text-sm">📝</span>
                          </div>
                          <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
                            وصف المنتج
                          </h3>
                        </div>
                        <p className="text-[var(--dash-text-secondary)] leading-relaxed">
                          {modalProduct.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Middle Column - Inventory */}
                  <div className="space-y-6">
                    {/* Total Inventory Card */}
                    <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-dash-accent-blue-subtle rounded-lg flex items-center justify-center">
                          <span className="text-dash-accent-blue text-sm">📊</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
                          المخازن والفروع
                        </h3>
                      </div>

                      {/* Total Quantity Display */}
                      <div className="bg-dash-accent-blue-subtle rounded-lg p-4 mb-4 text-center border border-dash-accent-blue">
                        <p className="text-dash-accent-blue text-sm mb-1">
                          الكمية الإجمالية
                        </p>
                        <p className="text-dash-accent-blue font-bold text-3xl">
                          {(modalProduct.inventoryData &&
                            Object.values(modalProduct.inventoryData).reduce(
                              (sum: number, inv: any) =>
                                sum + (inv?.quantity || 0),
                              0,
                            )) ||
                            0}
                        </p>
                      </div>

                      {/* Branch/Warehouse Details */}
                      <div className="space-y-3">
                        {modalProduct.inventoryData &&
                          Object.entries(modalProduct.inventoryData).map(
                            ([locationId, inventory]: [string, any]) => {
                              const branch = branches.find(
                                (b) => b.id === locationId,
                              );
                              const locationName =
                                branch?.name ||
                                `موقع ${locationId.slice(0, 8)}`;

                              return (
                                <div
                                  key={locationId}
                                  className="bg-[var(--dash-bg-surface)] rounded-lg p-4 border border-[var(--dash-border-default)]/30"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[var(--dash-text-primary)] font-medium">
                                      {locationName}
                                    </span>
                                    <span className="text-dash-accent-blue font-bold text-lg">
                                      {inventory?.quantity || 0}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-[var(--dash-text-muted)]">
                                      الحد الأدنى
                                    </span>
                                    <span className="text-dash-accent-orange">
                                      {inventory?.min_stock || 0}
                                    </span>
                                  </div>
                                </div>
                              );
                            },
                          )}
                      </div>
                    </div>

                    {/* Variants Card */}
                    {modalProduct.variantsData &&
                      Object.keys(modalProduct.variantsData).length > 0 && (
                        <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-dash-accent-purple-subtle rounded-lg flex items-center justify-center">
                              <span className="text-dash-accent-purple text-sm">
                                🎨
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
                              الألوان والأشكال
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {Object.entries(modalProduct.variantsData).map(
                              ([locationId, variants]: [string, any]) => {
                                const branch = branches.find(
                                  (b) => b.id === locationId,
                                );
                                const locationName =
                                  branch?.name ||
                                  `موقع ${locationId.slice(0, 8)}`;

                                // Helper functions
                                const getVariantColor = (variant: any) => {
                                  if (variant.variant_type === 'color') {
                                    const productColor = modalProduct.productColors?.find((c: any) => c.name === variant.name)
                                    if (productColor?.color) return productColor.color
                                    if (variant.value) return variant.value
                                    if (variant.color_hex) return variant.color_hex
                                  }
                                  return '#6B7280'
                                }

                                const getTextColor = (bgColor: string) => {
                                  const hex = bgColor.replace('#', '')
                                  const r = parseInt(hex.substr(0, 2), 16)
                                  const g = parseInt(hex.substr(2, 2), 16)
                                  const b = parseInt(hex.substr(4, 2), 16)
                                  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                                  return luminance > 0.5 ? '#000000' : '#FFFFFF'
                                }

                                // Calculate unassigned quantity
                                const totalInventoryQuantity = modalProduct.inventoryData?.[locationId]?.quantity || 0
                                const assignedQuantity = variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0)
                                const unassignedQuantity = totalInventoryQuantity - assignedQuantity

                                return (
                                  <div
                                    key={locationId}
                                    className="bg-[var(--dash-bg-surface)] rounded-lg p-4"
                                  >
                                    <p className="text-[var(--dash-text-primary)] font-medium mb-3">
                                      {locationName}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {/* Show specified variants (colors, shapes with names) */}
                                      {variants
                                        .filter((v: any) => v.name !== 'غير محدد')
                                        .map((variant: any, index: number) => {
                                          const bgColor = getVariantColor(variant)
                                          const textColor = getTextColor(bgColor)

                                          return (
                                            <span
                                              key={index}
                                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                                              style={{
                                                backgroundColor: bgColor,
                                                color: textColor,
                                                borderColor: bgColor === '#6B7280' ? '#6B7280' : bgColor
                                              }}
                                            >
                                              {variant.name} ({variant.quantity})
                                            </span>
                                          )
                                        })}

                                      {/* Show unassigned quantity if any */}
                                      {unassignedQuantity > 0 && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-[var(--dash-text-primary)] bg-[var(--dash-bg-overlay)] border border-[var(--dash-border-default)]">
                                          غير محدد ({unassignedQuantity})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Right Column - Images */}
                  <div className="space-y-6">
                    {/* Main Image Preview */}
                    <div className="bg-[var(--dash-bg-raised)] rounded-xl p-6 border border-[var(--dash-border-default)]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                          <span className="text-indigo-400 text-sm">🖼️</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--dash-text-primary)]">
                          صور المنتج
                        </h3>
                      </div>

                      {/* Large Image Preview - OPTIMIZED */}
                      <div className="mb-4">
                        <ProductModalImage
                          src={selectedImage}
                          alt={modalProduct.name}
                          priority={true}
                        />
                      </div>

                      {/* Thumbnail Gallery */}
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
                        {modalProduct.allImages &&
                        modalProduct.allImages.length > 0 ? (
                          modalProduct.allImages.map(
                            (imageUrl: string, index: number) => (
                              <ProductThumbnail
                                key={index}
                                src={imageUrl}
                                alt={`صورة ${index + 1}`}
                                isSelected={selectedImage === imageUrl}
                                onClick={() => setSelectedImage(imageUrl)}
                              />
                            ),
                          )
                        ) : (
                          /* Fallback when no images available */
                          <div className="w-full h-16 bg-[var(--dash-bg-surface)] rounded-md border border-[var(--dash-border-default)]/30 flex items-center justify-center col-span-4">
                            <span className="text-[var(--dash-text-disabled)] text-xs">
                              لا توجد صور متاحة
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Categories Display Modal - Tree View */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--dash-bg-surface)] rounded-lg w-96 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-[var(--dash-border-default)]">
              <h3 className="text-xl font-bold text-[var(--dash-text-primary)]">المجموعات</h3>
              <button
                onClick={toggleCategoriesModal}
                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Tree View Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
              {isLoadingCategories ? (
                <div className="text-center py-4 text-[var(--dash-text-muted)]">
                  جارٍ التحميل...
                </div>
              ) : !categoryTree ? (
                <div className="text-center py-4 text-[var(--dash-text-muted)]">
                  لا توجد مجموعات
                </div>
              ) : (
                // Recursive Tree Node Component
                (() => {
                  const renderTreeNode = (node: typeof categoryTree, level: number = 0): React.ReactNode => {
                    if (!node) return null;
                    const hasChildren = node.children && node.children.length > 0;
                    const isSelected = selectedCategoryId === node.id;
                    const isExpanded = expandedCategoryNodes.has(node.id) || node.name === 'منتجات';

                    return (
                      <div key={node.id}>
                        <div
                          className={`flex items-center cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-dash-accent-blue text-[var(--dash-text-primary)]'
                              : 'hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
                          }`}
                          style={{ paddingRight: `${16 + level * 24}px`, paddingLeft: '12px', paddingTop: '10px', paddingBottom: '10px' }}
                          onClick={() => {
                            // Toggle selection - if already selected, deselect (show all products)
                            if (isSelected) {
                              setSelectedCategoryId(null);
                            } else {
                              setSelectedCategoryId(node.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {/* Expand/Collapse Button */}
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                              {hasChildren ? (
                                <button
                                  className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--dash-bg-overlay)]/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryNode(node.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <MinusIcon className="h-4 w-4" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4" />
                                  )}
                                </button>
                              ) : null}
                            </div>

                            {/* Folder Icon */}
                            <FolderIcon className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}`} />

                            {/* Category Name */}
                            <span className="text-base truncate">
                              {node.name}
                            </span>
                          </div>
                        </div>

                        {/* Children */}
                        {hasChildren && isExpanded && (
                          <div>
                            {node.children.map((child) => renderTreeNode(child, level + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return renderTreeNode(categoryTree);
                })()
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[var(--dash-border-default)] space-y-2">
              {/* Clear Selection Button */}
              {selectedCategoryId && (
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className="w-full py-2 dash-btn-primary rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  إظهار جميع المنتجات
                </button>
              )}
              {/* Close Button */}
              <button
                onClick={toggleCategoriesModal}
                className="w-full py-2 bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-lg hover:bg-[var(--dash-bg-overlay)] transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Mode Confirmation Modal */}
      {showPurchaseModeConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={() => setShowPurchaseModeConfirm(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-dash-accent-orange to-dash-accent-red rounded-full flex items-center justify-center">
                    <ShoppingBagIcon className="h-5 w-5 text-[var(--dash-text-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">
                      تفعيل وضع الشراء
                    </h2>
                    <p className="text-[var(--dash-text-muted)] text-sm">تأكيد تبديل الوضع</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-dash-accent-orange-subtle border border-dash-accent-orange rounded-lg p-4 mb-4">
                  <p className="text-dash-accent-orange text-sm flex items-center gap-2">
                    <span className="text-dash-accent-orange">⚠️</span>
                    سيتم تغيير واجهة نقطة البيع لوضع الشراء
                  </p>
                </div>

                <div className="space-y-3 text-[var(--dash-text-secondary)] text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-dash-accent-blue">•</span>
                    <span>سيتم استبدال اختيار العميل باختيار المورد</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-dash-accent-blue">•</span>
                    <span>سيتم إضافة خيار اختيار المخزن أو الفرع</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-dash-accent-blue">•</span>
                    <span>سيتم تعطيل اختيار الألوان والأشكال</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-dash-accent-blue">•</span>
                    <span>سيتم إضافة إمكانية إنشاء منتجات جديدة</span>
                  </div>
                </div>

                <p className="text-[var(--dash-text-primary)] font-medium mt-4 text-center">
                  هل تريد تفعيل وضع الشراء؟
                </p>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--dash-border-default)]">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPurchaseModeConfirm(false)}
                    className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-3 rounded-lg font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={confirmPurchaseMode}
                    className="flex-1 bg-dash-accent-orange text-[var(--dash-text-primary)] hover:brightness-90 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBagIcon className="h-5 w-5" />
                    تفعيل وضع الشراء
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Close Tab Confirmation Modal */}
      {showCloseTabConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={cancelCloseTab}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-dash-accent-red to-dash-accent-orange rounded-full flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-[var(--dash-text-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">
                      إغلاق الفاتورة
                    </h2>
                    <p className="text-[var(--dash-text-muted)] text-sm">تأكيد الإغلاق</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-dash-accent-red-subtle border border-dash-accent-red rounded-lg p-4 mb-4">
                  <p className="text-dash-accent-red text-sm flex items-center gap-2">
                    <span className="text-dash-accent-red">⚠️</span>
                    متأكد؟ الفاتورة هتتحذف
                  </p>
                </div>

                <p className="text-[var(--dash-text-secondary)] text-sm">
                  يوجد منتجات في السلة. هل تريد إغلاق الفاتورة وحذف جميع المنتجات؟
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-[var(--dash-border-default)]">
                <button
                  onClick={cancelCloseTab}
                  className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-3 rounded-lg font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmCloseTab}
                  className="flex-1 dash-btn-red py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                  إغلاق الفاتورة
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearCartConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={() => setShowClearCartConfirm(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-sm">
              {/* Header */}
              <div className="flex items-center justify-center p-6 border-b border-[var(--dash-border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-dash-accent-red to-dash-accent-red rounded-full flex items-center justify-center">
                    <TrashIcon className="h-6 w-6 text-[var(--dash-text-primary)]" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-[var(--dash-text-primary)] mb-2">مسح السلة</h3>
                <p className="text-[var(--dash-text-secondary)] text-sm">
                  هل أنت متأكد أنك تريد حذف جميع المنتجات من السلة؟
                </p>
                <p className="text-[var(--dash-text-muted)] text-xs mt-2">
                  ({cartItems.length} منتج)
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-[var(--dash-border-default)]">
                <button
                  onClick={() => setShowClearCartConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-lg font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    setShowClearCartConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 dash-btn-red rounded-lg font-medium transition-colors"
                >
                  مسح الكل
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Duplicate Product (Different Price) Confirmation Modal */}
      {showDuplicateConfirm && pendingCartProduct && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={cancelDuplicateAdd}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-sm">
              <div className="flex items-center justify-center p-6 border-b border-[var(--dash-border-default)]">
                <div className="w-12 h-12 bg-gradient-to-r from-dash-accent-orange to-dash-accent-orange rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-[var(--dash-text-primary)]" />
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-[var(--dash-text-primary)] mb-3">منتج موجود بسعر مختلف</h3>
                <p className="text-[var(--dash-text-secondary)] text-sm mb-4">
                  المنتج <span className="font-bold text-[var(--dash-text-primary)]">{pendingCartProduct.product.name}</span> موجود بالفعل في السلة بسعر مختلف
                </p>
                <div className="flex justify-center gap-6 mb-2">
                  <div className="text-center">
                    <span className="text-[var(--dash-text-muted)] text-xs block mb-1">السعر الحالي</span>
                    <span className="text-dash-accent-blue font-bold">{pendingCartProduct.existingPrice.toFixed(2)}</span>
                  </div>
                  <div className="text-[var(--dash-text-disabled)] flex items-end pb-1">←</div>
                  <div className="text-center">
                    <span className="text-[var(--dash-text-muted)] text-xs block mb-1">السعر الجديد</span>
                    <span className="text-dash-accent-orange font-bold">{pendingCartProduct.newPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t border-[var(--dash-border-default)]">
                <button
                  onClick={cancelDuplicateAdd}
                  className="flex-1 px-4 py-2.5 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-lg font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDuplicateAdd}
                  className="flex-1 px-4 py-2.5 bg-dash-accent-orange text-white rounded-lg font-medium transition-colors hover:opacity-90"
                >
                  إضافة كسطر منفصل
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Print Receipt Confirmation Modal */}
      {showPrintReceiptModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={() => setShowPrintReceiptModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--dash-bg-surface)] rounded-2xl shadow-2xl border border-[var(--dash-border-default)] w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-dash-accent-green to-dash-accent-blue rounded-full flex items-center justify-center">
                    <PrinterIcon className="h-5 w-5 text-[var(--dash-text-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--dash-text-primary)]">
                      طباعة الفاتورة
                    </h2>
                    <p className="text-[var(--dash-text-muted)] text-sm">
                      تم إنشاء الفاتورة بنجاح
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-dash-accent-green-subtle border border-dash-accent-green rounded-lg p-4 mb-4">
                  <p className="text-dash-accent-green text-sm flex items-center gap-2 mb-2">
                    <span className="text-dash-accent-green">✅</span>
                    تم إنشاء{" "}
                    {lastInvoiceData?.isReturn ? "المرتجع" : "الفاتورة"} بنجاح
                  </p>
                  <div className="text-[var(--dash-text-primary)] text-sm space-y-1">
                    <p>
                      رقم الفاتورة:{" "}
                      <span className="font-bold">
                        {lastInvoiceData?.invoiceNumber}
                      </span>
                    </p>
                    <p>
                      الإجمالي:{" "}
                      <span className="font-bold text-dash-accent-green">
                        {formatPrice(
                          lastInvoiceData?.totalAmount || 0,
                          "system",
                        )}
                      </span>
                    </p>
                    <p>
                      عدد الأصناف:{" "}
                      <span className="font-bold">
                        {lastInvoiceData?.cartItems?.length}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-[var(--dash-text-primary)] font-medium text-center mb-4">
                  هل تريد طباعة الفاتورة؟
                </p>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--dash-border-default)]">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPrintReceiptModal(false)}
                    className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-3 rounded-lg font-medium transition-colors"
                  >
                    لا، شكراً
                  </button>
                  <button
                    onClick={() => {
                      printReceipt(lastInvoiceData);
                      setShowPrintReceiptModal(false);
                    }}
                    className="flex-1 dash-btn-primary py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <PrinterIcon className="h-5 w-5" />
                    نعم، اطبع الفاتورة
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        /* Enhanced scrollbar styles for table container */
        .custom-scrollbar {
          /* For Firefox */
          scrollbar-width: thin;
          scrollbar-color: #6b7280 var(--dash-bg-raised);
        }

        .custom-scrollbar::-webkit-scrollbar {
          height: 12px; /* Horizontal scrollbar height */
          width: 12px; /* Vertical scrollbar width */
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--dash-bg-raised);
          border-radius: 7px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 7px;
          border: 2px solid var(--dash-bg-raised);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Enhanced scrollbar visibility */
        .custom-scrollbar::-webkit-scrollbar:horizontal {
          height: 12px;
          display: block;
        }

        .custom-scrollbar::-webkit-scrollbar:vertical {
          width: 12px;
          display: block;
        }

        /* Ensure proper scrolling behavior */
        .table-container {
          position: relative;
        }

        /* Utility classes for grid view */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Columns Control Modal */}
      <ColumnsControlModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={getAllColumns()}
        onColumnsChange={handleColumnsChange}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
      />

      {/* Add Tab Modal */}
      {showAddTabModal && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center" onClick={() => setShowAddTabModal(false)}>
          <div className="bg-[var(--dash-bg-surface)] rounded-lg p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[var(--dash-text-primary)] text-lg font-medium mb-4">إضافة نافذة بيع جديدة</h3>
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="اسم النافذة..."
              className="w-full px-4 py-2 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-dash-accent-blue mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTabName.trim()) {
                  // Inherit selections from current tab, but ALWAYS use default customer
                  addTab(newTabName.trim(), {
                    customer: defaultCustomer || globalSelections.customer,
                    branch: globalSelections.branch,
                    record: selections.record,
                    subSafe: selections.subSafe,
                    priceType: selectedPriceType,
                  });
                  setNewTabName("");
                  setShowAddTabModal(false);
                }
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setNewTabName("");
                  setShowAddTabModal(false);
                }}
                className="px-4 py-2 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (newTabName.trim()) {
                    // Inherit selections from current tab, but ALWAYS use default customer
                    addTab(newTabName.trim(), {
                      customer: defaultCustomer || globalSelections.customer,
                      branch: globalSelections.branch,
                      record: selections.record,
                      subSafe: selections.subSafe,
                      priceType: selectedPriceType,
                    });
                    setNewTabName("");
                    setShowAddTabModal(false);
                  }
                }}
                className="px-4 py-2 dash-btn-primary rounded transition-colors"
                disabled={!newTabName.trim()}
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Details Modal */}
      {showMobileDetailsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 md:hidden">
          <div className="bg-[var(--dash-bg-surface)] rounded-lg w-full max-w-sm border border-[var(--dash-border-default)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--dash-border-default)]">
              <h3 className="text-[var(--dash-text-primary)] font-medium">تفاصيل الفاتورة</h3>
              <button
                onClick={() => setShowMobileDetailsModal(false)}
                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* العميل/المورد */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--dash-text-muted)] text-sm">
                  {isPurchaseMode ? 'المورد' : 'العميل'}:
                </span>
                <span className="text-[var(--dash-text-primary)] text-sm font-medium">
                  {isPurchaseMode
                    ? selectedSupplier?.name || 'غير محدد'
                    : selections.customer?.name || 'غير محدد'
                  }
                </span>
              </div>
              {/* الفرع */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--dash-text-muted)] text-sm">الفرع:</span>
                <span className="text-[var(--dash-text-primary)] text-sm font-medium">
                  {selections.branch?.name || 'غير محدد'}
                </span>
              </div>
              {/* الخزنة */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--dash-text-muted)] text-sm">الخزنة:</span>
                <span className="text-[var(--dash-text-primary)] text-sm font-medium">
                  {selections.record?.name || 'غير محدد'}
                </span>
              </div>
              {/* السعر */}
              {!isPurchaseMode && !isTransferMode && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--dash-text-muted)] text-sm">نوع السعر:</span>
                  <span className={`text-sm font-medium ${
                    selectedPriceType !== "price" ? "text-dash-accent-blue" : "text-[var(--dash-text-primary)]"
                  }`}>
                    {getPriceTypeName(selectedPriceType)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {modalProduct && (
        <PurchaseHistoryModal
          isOpen={showPurchaseHistoryModal}
          onClose={() => setShowPurchaseHistoryModal(false)}
          productId={modalProduct.id}
          productName={modalProduct.name}
        />
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <CartProvider>
      <ToastProvider>
        <POSPageContent />
      </ToastProvider>
    </CartProvider>
  );
}
