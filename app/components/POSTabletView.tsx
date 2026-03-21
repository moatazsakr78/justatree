'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ProductGridImage } from './ui/OptimizedImage'
import Sidebar from './layout/Sidebar'
import TopHeader from './layout/TopHeader'
import PaymentSplit from './PaymentSplit'
import ResizableTable from './tables/ResizableTable'
import ColorSelectionModal from './ColorSelectionModal'
import POSSearchInput, { POSSearchInputRef } from './pos/POSSearchInput'
import {
  Squares2X2Icon,
  ListBulletIcon,
  PlusIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  XMarkIcon,
  HomeIcon,
  BuildingOfficeIcon,
  ArrowsRightLeftIcon,
  UserIcon,
  BanknotesIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useFormatPrice } from '@/lib/hooks/useCurrency'

type SearchMode = 'all' | 'name' | 'code' | 'barcode';

interface POSTabletViewProps {
  // Products
  products: any[]
  filteredProducts: any[]
  isLoading: boolean
  error: string | null

  // Search
  onSearchChange: (query: string) => void
  searchMode: SearchMode
  onSearchModeChange: (mode: SearchMode) => void

  // View Mode
  viewMode: 'table' | 'grid'
  setViewMode: (mode: 'table' | 'grid') => void

  // Cart
  cartItems: any[]
  setCartItems: React.Dispatch<React.SetStateAction<any[]>>
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  cartTotal: number
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  updateActiveTabCart: (cart: any[]) => void

  // Selections
  selections: any
  isPurchaseMode: boolean
  isTransferMode: boolean
  isReturnMode: boolean
  selectedSupplier: any

  // Modals
  setIsRecordsModalOpen: (open: boolean) => void
  setIsCustomerModalOpen: (open: boolean) => void
  setIsHistoryModalOpen: (open: boolean) => void
  setIsSupplierModalOpen: (open: boolean) => void
  setShowQuickAddProductModal: (open: boolean) => void
  setShowColumnsModal: (open: boolean) => void

  // Product Actions
  handleProductClick: (product: any) => void
  selectedProduct: any

  // Color Selection Modal
  showColorSelectionModal: boolean
  setShowColorSelectionModal: (show: boolean) => void
  modalProduct: any
  setModalProduct: (product: any) => void
  handleColorSelection: (selections: { [key: string]: number }, totalQuantity: number, purchasePricingData?: { purchasePrice: number; salePrice: number; wholesalePrice: number; price1: number; price2: number; price3: number; price4: number; productCode: string; }) => void
  hasRequiredForCart: () => boolean
  transferFromLocation: any

  // Invoice
  handleCreateInvoice: () => void
  hasAllRequiredSelections: () => boolean
  isProcessingInvoice: boolean

  // Payment Split
  setPaymentSplitData: React.Dispatch<React.SetStateAction<any[]>>
  setCreditAmount: React.Dispatch<React.SetStateAction<number>>

  // Sidebar
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void

  // POS Tabs
  posTabs: any[]
  activeTab: any
  switchTab: (tabId: string) => void
  closeTab: (tabId: string) => void
  setShowAddTabModal: (show: boolean) => void
  setShowNewTabCustomerModal: (show: boolean) => void

  // Mode Toggles
  setShowPurchaseModeConfirm: (show: boolean) => void
  setIsTransferMode: (mode: boolean) => void
  setTransferFromLocation: (location: any) => void
  setTransferToLocation: (location: any) => void
  setIsTransferLocationModalOpen: (open: boolean) => void
  setIsReturnMode: (mode: boolean) => void
  clearSelections: () => void
}

export default function POSTabletView({
  products,
  filteredProducts,
  isLoading,
  error,
  onSearchChange,
  searchMode,
  onSearchModeChange,
  viewMode,
  setViewMode,
  cartItems,
  setCartItems,
  isCartOpen,
  setIsCartOpen,
  cartTotal,
  removeFromCart,
  clearCart,
  updateActiveTabCart,
  selections,
  isPurchaseMode,
  isTransferMode,
  isReturnMode,
  selectedSupplier,
  setIsRecordsModalOpen,
  setIsCustomerModalOpen,
  setIsHistoryModalOpen,
  setIsSupplierModalOpen,
  setShowQuickAddProductModal,
  setShowColumnsModal,
  handleProductClick,
  selectedProduct,
  showColorSelectionModal,
  setShowColorSelectionModal,
  modalProduct,
  setModalProduct,
  handleColorSelection,
  hasRequiredForCart,
  transferFromLocation,
  handleCreateInvoice,
  hasAllRequiredSelections,
  isProcessingInvoice,
  setPaymentSplitData,
  setCreditAmount,
  isSidebarOpen,
  setIsSidebarOpen,
  posTabs,
  activeTab,
  switchTab,
  closeTab,
  setShowAddTabModal,
  setShowNewTabCustomerModal,
  setShowPurchaseModeConfirm,
  setIsTransferMode,
  setTransferFromLocation,
  setTransferToLocation,
  setIsTransferLocationModalOpen,
  setIsReturnMode,
  clearSelections,
}: POSTabletViewProps) {
  const formatPrice = useFormatPrice()
  const toolbarRef = useRef<HTMLDivElement>(null)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Determine grid columns based on cart state
  // Cart open: 2 products per row, Cart closed: 4 products per row
  const gridCols = isCartOpen ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'

  // Table columns for products
  const tableColumns = useMemo(() => [
    {
      id: 'index',
      header: '#',
      accessor: '#',
      width: 60,
      render: (value: any, item: any, index: number) => (
        <span className="text-[var(--dash-text-muted)] font-medium">{index + 1}</span>
      ),
    },
    {
      id: 'name',
      header: 'اسم المنتج',
      accessor: 'name',
      width: 200,
      render: (value: string) => <span className="text-[var(--dash-text-primary)] font-medium">{value}</span>,
    },
    {
      id: 'category',
      header: 'المجموعة',
      accessor: 'category',
      width: 120,
      render: (value: any) => (
        <span className="text-[var(--dash-text-secondary)]">
          {value?.name || 'غير محدد'}
        </span>
      ),
    },
    {
      id: 'price',
      header: 'سعر البيع',
      accessor: 'price',
      width: 120,
      render: (value: number) => (
        <span className="text-[var(--dash-text-primary)]">{formatPrice(value || 0, 'system')}</span>
      ),
    },
    {
      id: 'barcode',
      header: 'الباركود',
      accessor: 'barcode',
      width: 150,
      render: (value: string) => (
        <span className="text-[var(--dash-text-secondary)] font-mono text-sm">{value || '-'}</span>
      ),
    },
    {
      id: 'is_active',
      header: 'نشيط',
      accessor: 'is_active',
      width: 80,
      render: (value: boolean) => (
        <div className="flex justify-center">
          <div className={`w-3 h-3 rounded-full ${value ? 'bg-dash-accent-green' : 'bg-dash-accent-red'}`}></div>
        </div>
      ),
    },
  ], [formatPrice])

  return (
    <div className="h-screen bg-[var(--dash-bg-surface)] overflow-hidden flex flex-col">
      {/* Top Header */}
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content Container */}
      <div className="flex-1 pt-12 overflow-hidden flex flex-col">

        {/* POS Tabs Bar - Compact Design */}
        <div className="bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)] flex items-center justify-between flex-shrink-0">
          {/* Right Side: Selection Display */}
          <div className="flex items-center gap-2 text-xs px-2 py-0.5 overflow-x-auto scrollbar-hide">
            {/* Customer/Supplier */}
            <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
              {isPurchaseMode ? 'المورد' : 'العميل'}:{' '}
              <span className="text-[var(--dash-text-primary)] font-medium">
                {isPurchaseMode
                  ? selectedSupplier
                    ? selectedSupplier.name
                    : 'غير محدد'
                  : selections.customer
                    ? selections.customer.name
                    : 'غير محدد'}
              </span>
            </span>

            {/* Branch */}
            <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
              الفرع:{' '}
              <span className="text-[var(--dash-text-primary)] font-medium">
                {selections.branch
                  ? selections.branch.name
                  : 'غير محدد'}
              </span>
            </span>

            {/* Record */}
            <span className="text-[var(--dash-text-secondary)] whitespace-nowrap">
              الخزنة:{' '}
              <span className="text-[var(--dash-text-primary)] font-medium">
                {selections.record ? selections.record.name : 'غير محدد'}
              </span>
            </span>

            {/* Clear all button */}
            {(selections.customer ||
              selections.branch ||
              selections.record ||
              selectedSupplier) && (
              <button
                onClick={() => {
                  clearSelections()
                }}
                className="text-xs text-[var(--dash-text-muted)] hover:text-dash-accent-red transition-colors px-1.5 py-0.5 rounded whitespace-nowrap"
              >
                مسح الكل
              </button>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="h-5 w-px bg-[var(--dash-border-default)]"></div>

          {/* Left Side: POS Tabs */}
          <div className="flex items-center overflow-x-auto scrollbar-hide flex-1">
            {posTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center border-l border-[var(--dash-border-default)] ${
                  tab.active
                    ? 'bg-[#F97316] text-white'
                    : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[#4B5563]'
                }`}
              >
                <button
                  onClick={() => switchTab(tab.id)}
                  className="px-2 py-0.5 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <span>{tab.title}</span>
                </button>

                {tab.id !== 'main' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className="ml-0.5 p-0.5 hover:text-dash-accent-red hover:bg-dash-accent-red-subtle rounded transition-colors"
                    title="إغلاق"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Add New Tab Button - Opens customer selection to create new tab */}
            <button
              onClick={() => setShowNewTabCustomerModal(true)}
              className="px-1.5 py-0.5 text-dash-accent-green hover:text-dash-accent-green hover:bg-dash-accent-green-subtle transition-colors flex items-center gap-0.5 border-l border-[var(--dash-border-default)]"
              title="إضافة نافذة بيع جديدة"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Action Buttons Bar - Horizontal Design */}
        <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-2 w-full flex-shrink-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {/* First 3 Selection Buttons with Red Dot Indicator */}
            <button
              onClick={() => setIsRecordsModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all relative ${
                selections.record ? 'text-dash-accent-green hover:text-dash-accent-green hover:bg-dash-accent-green-subtle' : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30'
              }`}
            >
              <BanknotesIcon className="h-4 w-4" />
              <span>
                {selections.record?.name ? (
                  selections.subSafe?.name ? (
                    <>
                      <span>{selections.record.name}</span>
                      {' '}
                      <span className="text-dash-accent-orange">{selections.subSafe.name}</span>
                    </>
                  ) : selections.record.name
                ) : 'الخزنة'}
              </span>
              {!selections.record && (
                <div className="w-1.5 h-1.5 bg-dash-accent-red rounded-full absolute top-1 right-1"></div>
              )}
            </button>

            <button
              onClick={() => isPurchaseMode ? setIsSupplierModalOpen(true) : setIsCustomerModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-all relative"
            >
              <UserIcon className="h-4 w-4" />
              <span>{isPurchaseMode ? 'المورد' : 'العميل'}</span>
              {isPurchaseMode ? (
                !selectedSupplier && <div className="w-1.5 h-1.5 bg-dash-accent-red rounded-full absolute top-1 right-1"></div>
              ) : (
                !selections.customer && <div className="w-1.5 h-1.5 bg-dash-accent-red rounded-full absolute top-1 right-1"></div>
              )}
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-[var(--dash-border-default)]"></div>

            {/* Other Action Buttons */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-all"
            >
              <ClockIcon className="h-4 w-4" />
              <span>التاريخ</span>
            </button>

            <button
              onClick={() => setShowQuickAddProductModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-all"
            >
              <PlusIcon className="h-4 w-4" />
              <span>إضافة منتج</span>
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-[var(--dash-border-default)]"></div>

            {/* Mode Buttons */}
            <button
              onClick={() => {
                setIsTransferMode(false)
                setIsReturnMode(false)
                setShowPurchaseModeConfirm(false)
                setTransferFromLocation(null)
                setTransferToLocation(null)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${
                !isPurchaseMode && !isTransferMode && !isReturnMode
                  ? 'bg-dash-accent-blue text-white'
                  : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30'
              }`}
            >
              <HomeIcon className="h-4 w-4" />
              <span>بيع</span>
            </button>

            <button
              onClick={() => setShowPurchaseModeConfirm(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${
                isPurchaseMode && !isTransferMode && !isReturnMode
                  ? 'bg-dash-accent-purple text-white'
                  : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30'
              }`}
            >
              <BuildingOfficeIcon className="h-4 w-4" />
              <span>شراء</span>
            </button>

            <button
              onClick={() => {
                setIsTransferMode(true)
                setIsReturnMode(false)
                setShowPurchaseModeConfirm(false)
                setIsTransferLocationModalOpen(true)
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${
                isTransferMode && !isReturnMode
                  ? 'bg-dash-accent-green text-white'
                  : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30'
              }`}
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>نقل</span>
            </button>

            <button
              onClick={() => setIsReturnMode(!isReturnMode)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all ${
                isReturnMode
                  ? 'bg-dash-accent-red text-white'
                  : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30'
              }`}
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>مرتجع</span>
            </button>
          </div>
        </div>

        {/* Search and Controls Section */}
        <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <POSSearchInput
              onSearch={onSearchChange}
              searchMode={searchMode}
              onSearchModeChange={onSearchModeChange}
              className="flex-1"
              isMobile={true}
            />

            {/* Product Count */}
            <span className="text-xs text-[var(--dash-text-muted)] whitespace-nowrap">
              {filteredProducts.length} منتج
            </span>

            {/* View Mode Toggle */}
            <div className="flex bg-[var(--dash-bg-surface)] rounded-md overflow-hidden flex-shrink-0 border border-[var(--dash-border-default)]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-dash-accent-blue text-white'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
                title="عرض الصور"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-dash-accent-blue text-white'
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                }`}
                title="عرض الجداول"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Cart Toggle Button */}
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="p-2 text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]/30 rounded-md transition-colors bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] flex-shrink-0"
              title={isCartOpen ? 'إخفاء السلة' : 'إظهار السلة'}
            >
              <ShoppingBagIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Products Area */}
          <div className={`${isCartOpen ? 'w-1/2' : 'w-full'} transition-all duration-300 overflow-hidden flex flex-col`}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-[var(--dash-text-primary)]">جاري التحميل...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-dash-accent-red">خطأ: {error}</div>
              </div>
            ) : (
              <>
                {viewMode === 'table' ? (
                  /* Table View */
                  <div className="flex-1 min-h-0">
                    <ResizableTable
                      className="h-full w-full"
                      columns={tableColumns}
                      data={filteredProducts}
                      selectedRowId={selectedProduct?.id || null}
                      onRowClick={(product, index) => {
                        if (selectedProduct?.id === product.id) {
                          handleProductClick(null)
                        } else {
                          handleProductClick(product)
                        }
                      }}
                    />
                  </div>
                ) : (
                  /* Grid View */
                  <div className="h-full overflow-y-auto scrollbar-hide p-4">
                    <div className={`grid ${gridCols} gap-4`}>
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className={`bg-[var(--dash-bg-raised)] rounded-lg p-3 cursor-pointer transition-all duration-200 border-2 ${
                            selectedProduct?.id === product.id
                              ? 'border-dash-accent-blue bg-[#434E61]'
                              : 'border-transparent hover:border-[var(--dash-text-disabled)] hover:bg-[#434E61]'
                          }`}
                        >
                          {/* Product Image */}
                          <div className="w-full h-32 bg-[var(--dash-bg-surface)] rounded-md mb-3 flex items-center justify-center overflow-hidden">
                            {product.main_image_url ? (
                              <img
                                src={product.main_image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  target.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <div className={`w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center ${product.main_image_url ? 'hidden' : ''}`}>
                              <span className="text-2xl">📦</span>
                            </div>
                          </div>

                          {/* Product Name */}
                          <h3 className="text-[var(--dash-text-primary)] font-medium text-xs text-center mb-2 line-clamp-2">
                            {product.name}
                          </h3>

                          {/* Product Price */}
                          <div className="text-center">
                            <span className="text-dash-accent-blue font-medium text-sm">
                              {formatPrice(product.price || 0, 'system')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Cart Panel - Tablet Split View */}
          {isCartOpen && (
            <div className="w-1/2 bg-[var(--dash-bg-raised)] border-l-2 border-[var(--dash-bg-highlight)] flex flex-col">
              {/* Cart Items Area - Fixed scrolling for mobile */}
              <div className="flex-1 border-t-2 border-[var(--dash-bg-highlight)] overflow-y-auto min-h-0">
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
                    <div className="p-4 border-b border-[var(--dash-border-default)] flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--dash-text-primary)] font-medium text-sm">السلة</span>
                          <span className="bg-dash-accent-blue px-2 py-1 rounded text-xs text-[var(--dash-text-primary)]">
                            {cartItems.length}
                          </span>
                        </div>
                        {cartItems.length > 0 && (
                          <button
                            onClick={() => clearCart()}
                            className="text-dash-accent-red hover:text-dash-accent-red text-xs"
                            title="مسح السلة"
                          >
                            مسح الكل
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 min-h-0">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-[var(--dash-bg-surface)] rounded-lg p-3 border border-[var(--dash-border-default)]"
                        >
                          <div className="flex gap-3 mb-2">
                            {/* Product Image */}
                            <div className="w-12 h-12 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden flex-shrink-0">
                              {item.product.main_image_url ? (
                                <img
                                  src={item.product.main_image_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  📦
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-[var(--dash-text-primary)] text-xs truncate">
                                  {item.product.name}
                                </h4>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-dash-accent-red hover:text-dash-accent-red p-1 ml-2 flex-shrink-0"
                                  title="إزالة من السلة"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Quantity and Price Controls */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--dash-text-muted)] text-xs">الكمية:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 1
                                      setCartItems((prev) => {
                                        const newCart = prev.map((cartItem) => {
                                          if (cartItem.id === item.id) {
                                            return {
                                              ...cartItem,
                                              quantity: newQuantity,
                                              totalPrice: cartItem.isCustomPrice
                                                ? cartItem.totalPrice
                                                : cartItem.price * newQuantity,
                                            }
                                          }
                                          return cartItem
                                        })
                                        updateActiveTabCart(newCart)
                                        return newCart
                                      })
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
                                      const newPrice = parseFloat(e.target.value) || 0
                                      setCartItems((prev) => {
                                        const newCart = prev.map((cartItem) =>
                                          cartItem.id === item.id
                                            ? {
                                                ...cartItem,
                                                isCustomPrice: true,
                                                totalPrice: cartItem.quantity * newPrice,
                                              }
                                            : cartItem,
                                        )
                                        updateActiveTabCart(newCart)
                                        return newCart
                                      })
                                    }}
                                    className="w-20 px-2 py-1 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] text-xs text-center"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Total Price */}
                          <div className="text-right">
                            <span className="text-dash-accent-green font-bold text-sm">
                              {formatPrice(item.totalPrice || (item.price * item.quantity) || 0, 'system')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)] flex-shrink-0">
                {/* Payment Split Component - show in sales and return mode */}
                {!isTransferMode && !isPurchaseMode && (
                  <PaymentSplit
                    totalAmount={cartTotal}
                    onPaymentsChange={(payments, credit) => {
                      setPaymentSplitData(payments)
                      setCreditAmount(credit)
                    }}
                    isDefaultCustomer={selections.customer?.id === '00000000-0000-0000-0000-000000000001'}
                    isReturnMode={isReturnMode}
                  />
                )}

                {/* Total and Button */}
                <div className="flex items-center justify-between gap-3 mt-3">
                  {/* Total */}
                  <div className="flex-shrink-0">
                    {!isTransferMode ? (
                      <div className="text-right">
                        <div className="text-[var(--dash-text-primary)] text-xs font-medium">الإجمالي:</div>
                        <div className="text-dash-accent-green font-bold text-lg">
                          {formatPrice(cartTotal, 'system')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-dash-accent-green text-xs font-medium">وضع النقل</div>
                        <div className="text-[var(--dash-text-primary)] font-bold text-lg">
                          {cartItems.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Button */}
                  <button
                    disabled={
                      cartItems.length === 0 ||
                      !hasAllRequiredSelections() ||
                      isProcessingInvoice
                    }
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-xs transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed text-[var(--dash-text-primary)] ${
                      isTransferMode
                        ? 'dash-btn-green'
                        : isReturnMode
                          ? 'dash-btn-red'
                          : isPurchaseMode
                            ? 'dash-btn-purple'
                            : 'dash-btn-primary'
                    }`}
                    onClick={handleCreateInvoice}
                  >
                    {isProcessingInvoice
                      ? 'جاري المعالجة...'
                      : cartItems.length === 0
                        ? 'السلة فارغة'
                        : !hasAllRequiredSelections()
                          ? 'يجب إكمال التحديدات'
                          : isTransferMode
                            ? `تأكيد النقل (${cartItems.length})`
                            : isReturnMode
                              ? isPurchaseMode
                                ? `مرتجع شراء (${cartItems.length})`
                                : `مرتجع بيع (${cartItems.length})`
                              : isPurchaseMode
                                ? `تأكيد الشراء (${cartItems.length})`
                                : `تأكيد الطلب (${cartItems.length})`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Selection Modal */}
      <ColorSelectionModal
        isOpen={showColorSelectionModal}
        onClose={() => {
          setShowColorSelectionModal(false)
          setModalProduct(null)
        }}
        product={modalProduct}
        onAddToCart={handleColorSelection}
        hasRequiredForCart={hasRequiredForCart()}
        selectedBranchId={selections.branch?.id}
        isPurchaseMode={isPurchaseMode}
        isTransferMode={isTransferMode}
        transferFromLocation={transferFromLocation}
      />

      {/* Tablet-optimized styles */}
      <style jsx global>{`
        /* Hide scrollbars but keep functionality */
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Touch-friendly interactions */
        @media (max-width: 1024px) {
          button, .cursor-pointer {
            min-height: 44px;
          }
        }

        /* Line clamp utility */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
