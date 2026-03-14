import { useState, useCallback, useEffect, useRef } from 'react';
import { posTabsService } from '@/lib/services/posTabsService';
import { saveToLocalStorage, loadFromLocalStorage } from '@/lib/services/posTabsLocalStorage';
import { useAuth } from '@/lib/useAuth';

export interface POSTab {
  id: string;
  title: string;
  active: boolean;
  cartItems: any[];
  selections: {
    customer: any;
    branch: any;
    record: any;
    subSafe?: any;
    priceType?: 'price' | 'wholesale_price' | 'price1' | 'price2' | 'price3' | 'price4';
  };
  isPurchaseMode?: boolean;
  isTransferMode?: boolean;
  isReturnMode?: boolean;
  selectedSupplier?: any;
  selectedCustomerForPurchase?: any;
  transferFromLocation?: any;
  transferToLocation?: any;
  isPostponed?: boolean;
  postponedAt?: string;
  // Edit Invoice Mode
  isEditMode?: boolean;
  editInvoiceData?: any;
}

interface InheritedSelections {
  customer?: any;
  branch?: any;
  record?: any;
  subSafe?: any;
  priceType?: string;
  isPurchaseMode?: boolean;
  selectedSupplier?: any;
  selectedCustomerForPurchase?: any;
}

interface EditModeOptions {
  isEditMode?: boolean;
  editInvoiceData?: any;
}

interface UsePOSTabsReturn {
  tabs: POSTab[];
  activeTab: POSTab | undefined;
  activeTabId: string;
  addTab: (title: string, inheritedSelections?: InheritedSelections) => void;
  addTabWithCustomer: (customer: any, inheritedSelections?: InheritedSelections) => void;
  addTabWithCustomerAndCart: (customer: any, cartItems: any[], title: string, inheritedSelections?: InheritedSelections, editModeOptions?: EditModeOptions) => string;
  createTabFromMainWithCart: (customer: any, cartItems: any[], inheritedSelections?: InheritedSelections, defaultCustomer?: any) => string;
  updateTabCustomerAndTitle: (tabId: string, customer: any, title: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateActiveTabCart: (cartItems: any[]) => void;
  updateActiveTabSelections: (selections: any) => void;
  updateActiveTabMode: (updates: Partial<POSTab>) => void;
  clearActiveTabCart: () => void;
  postponeTab: (tabId: string) => void;
  restoreTab: (tabId: string) => void;
  postponedTabs: POSTab[];
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

const DEFAULT_TAB: POSTab = {
  id: 'main',
  title: 'نقطة البيع',
  active: true,
  cartItems: [],
  selections: {
    customer: null,
    branch: null,
    record: null,
    priceType: 'price',
  },
};

export function usePOSTabs(): UsePOSTabsReturn {
  // Get user from NextAuth
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [tabs, setTabs] = useState<POSTab[]>([DEFAULT_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const dbSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const lastDbSavedDataRef = useRef<string>('');
  const userIdRef = useRef<string | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // ============================================
  // INSTANT LOCAL STORAGE SAVE (synchronous) — ALL tabs
  // ============================================
  const saveToLocal = useCallback((tabsToSave: POSTab[], activeId: string) => {
    if (!userIdRef.current) return;
    saveToLocalStorage(userIdRef.current, tabsToSave, activeId);
  }, []);

  // ============================================
  // DATABASE SAVE (async) — ONLY postponed tabs
  // ============================================
  const savePostponedToDatabase = useCallback(async (tabsToSave: POSTab[]) => {
    const userId = userIdRef.current;
    if (!userId) {
      console.warn('POS Tabs: Cannot save to DB - no user ID');
      return false;
    }

    const postponedOnly = tabsToSave.filter(t => t.isPostponed === true);
    const dataToSave = JSON.stringify(postponedOnly);

    // Skip if postponed data hasn't changed
    if (dataToSave === lastDbSavedDataRef.current) {
      return true;
    }

    const previousData = lastDbSavedDataRef.current;
    lastDbSavedDataRef.current = dataToSave;
    try {
      setIsSaving(true);
      const success = await posTabsService.savePostponedTabs(userId, tabsToSave);
      if (success) {
        setLastSaved(new Date());
      } else {
        lastDbSavedDataRef.current = previousData;
      }
      return success;
    } catch (error) {
      console.error('POS Tabs: Failed to save postponed to database:', error);
      lastDbSavedDataRef.current = previousData;
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ============================================
  // IMMEDIATE DB SAVE for postpone/restore/close-postponed operations
  // ============================================
  const savePostponedImmediately = useCallback((tabsToSave: POSTab[]) => {
    // Cancel any pending debounced save
    if (dbSaveTimeoutRef.current) {
      clearTimeout(dbSaveTimeoutRef.current);
      dbSaveTimeoutRef.current = null;
    }
    savePostponedToDatabase(tabsToSave);
  }, [savePostponedToDatabase]);

  // ============================================
  // COMBINED SAVE: localStorage (instant, ALL) + DB (debounced, POSTPONED only)
  // ============================================
  const saveState = useCallback((newTabs: POSTab[], newActiveTabId: string) => {
    // 1. INSTANT: Save ALL tabs to localStorage (device-specific)
    saveToLocal(newTabs, newActiveTabId);

    // 2. DEBOUNCED: Save only POSTPONED tabs to database (cross-device)
    const hasPostponed = newTabs.some(t => t.isPostponed === true);
    if (hasPostponed) {
      // Pre-set ref so realtime ignores stale events during debounce
      const postponedOnly = newTabs.filter(t => t.isPostponed === true);
      lastDbSavedDataRef.current = JSON.stringify(postponedOnly);

      if (dbSaveTimeoutRef.current) {
        clearTimeout(dbSaveTimeoutRef.current);
      }
      dbSaveTimeoutRef.current = setTimeout(() => {
        savePostponedToDatabase(newTabs);
      }, 2000);
    }
  }, [saveToLocal, savePostponedToDatabase]);

  // ============================================
  // TAB MANAGEMENT FUNCTIONS
  // ============================================
  const addTab = useCallback((title: string, inheritedSelections?: InheritedSelections) => {
    const newTabId = `pos-${Date.now()}`;
    setTabs(prev => {
      const newTabs = [
        ...prev.map(tab => ({ ...tab, active: false })),
        {
          id: newTabId,
          title,
          active: true,
          cartItems: [],
          selections: {
            customer: inheritedSelections?.customer || null,
            branch: inheritedSelections?.branch || null,
            record: inheritedSelections?.record || null,
            subSafe: inheritedSelections?.subSafe || null,
            priceType: inheritedSelections?.priceType as any || 'price',
          },
          isPurchaseMode: inheritedSelections?.isPurchaseMode || false,
          selectedSupplier: inheritedSelections?.selectedSupplier || null,
          selectedCustomerForPurchase: inheritedSelections?.selectedCustomerForPurchase || null,
        },
      ];
      // Instant save
      saveState(newTabs, newTabId);
      return newTabs;
    });
    setActiveTabId(newTabId);
  }, [saveState]);

  // Add tab with customer already selected
  // Uses customer's default record and price type if available
  // Falls back to inherited selections (from main tab)
  const addTabWithCustomer = useCallback((customer: any, inheritedSelections?: InheritedSelections) => {
    const newTabId = `pos-${Date.now()}`;
    // Default customer gets "نقطة البيع" as title, others get customer name
    const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
    const isDefaultCustomer = customer?.id === DEFAULT_CUSTOMER_ID || customer?.name === 'عميل';
    const title = isDefaultCustomer ? 'نقطة البيع' : (customer?.name || 'فاتورة جديدة');

    // Get customer's default record if set
    let customerRecord = null;
    if (customer?.default_record_id) {
      customerRecord = { id: customer.default_record_id };
    } else if (inheritedSelections?.record) {
      customerRecord = inheritedSelections.record;
    }

    // If customer overrides record, clear subSafe (drawer belongs to original record)
    const customerSubSafe = (customer?.default_record_id && customer.default_record_id !== inheritedSelections?.record?.id)
      ? null
      : (inheritedSelections?.subSafe || null);

    // Get customer's default price type if set
    const customerPriceType = customer?.default_price_type || inheritedSelections?.priceType || 'price';

    setTabs(prev => {
      const newTabs = [
        ...prev.map(tab => ({ ...tab, active: false })),
        {
          id: newTabId,
          title,
          active: true,
          cartItems: [],
          selections: {
            customer: customer,
            branch: inheritedSelections?.branch || null,
            record: customerRecord,
            subSafe: customerSubSafe,
            priceType: customerPriceType as any,
          },
        },
      ];
      // Instant save
      saveState(newTabs, newTabId);
      return newTabs;
    });
    setActiveTabId(newTabId);
  }, [saveState]);

  // Add tab with customer, cart items, and custom title (for edit invoice mode)
  // Returns the new tab ID
  // editModeOptions: Pass isEditMode and editInvoiceData directly to avoid race conditions
  const addTabWithCustomerAndCart = useCallback((customer: any, cartItems: any[], title: string, inheritedSelections?: InheritedSelections, editModeOptions?: EditModeOptions): string => {
    const newTabId = `pos-${Date.now()}`;
    const tabTitle = title || customer?.name || 'فاتورة جديدة';

    // Get customer's default record if set
    let customerRecord = null;
    if (customer?.default_record_id) {
      customerRecord = { id: customer.default_record_id };
    } else if (inheritedSelections?.record) {
      customerRecord = inheritedSelections.record;
    }

    // If customer overrides record, clear subSafe (drawer belongs to original record)
    const customerSubSafe = (customer?.default_record_id && customer.default_record_id !== inheritedSelections?.record?.id)
      ? null
      : (inheritedSelections?.subSafe || null);

    // Get customer's default price type if set
    const customerPriceType = customer?.default_price_type || inheritedSelections?.priceType || 'price';

    setTabs(prev => {
      const newTabs = [
        ...prev.map(tab => ({ ...tab, active: false })),
        {
          id: newTabId,
          title: tabTitle,
          active: true,
          cartItems: cartItems,
          selections: {
            customer: customer,
            branch: inheritedSelections?.branch || null,
            record: customerRecord,
            subSafe: customerSubSafe,
            priceType: customerPriceType as any,
          },
          // Set edit mode directly when creating the tab (no setTimeout needed)
          isEditMode: editModeOptions?.isEditMode || false,
          editInvoiceData: editModeOptions?.editInvoiceData || null,
        },
      ];
      // Instant save
      saveState(newTabs, newTabId);
      return newTabs;
    });
    setActiveTabId(newTabId);
    return newTabId;
  }, [saveState]);

  // Create tab from main tab with cart transfer
  // This function transfers the cart from main tab to a new customer tab
  // and resets the main tab (clears cart and resets customer to default)
  const createTabFromMainWithCart = useCallback((
    customer: any,
    cartItems: any[],
    inheritedSelections?: InheritedSelections,
    defaultCustomer?: any
  ): string => {
    const newTabId = `pos-${Date.now()}`;
    // Default customer gets "نقطة البيع" as title, others get customer name
    const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
    const isDefaultCustomer = customer?.id === DEFAULT_CUSTOMER_ID || customer?.name === 'عميل';
    const tabTitle = isDefaultCustomer ? 'نقطة البيع' : (customer?.name || 'فاتورة جديدة');

    // Get customer's default record if set
    let customerRecord = null;
    if (customer?.default_record_id) {
      customerRecord = { id: customer.default_record_id };
    } else if (inheritedSelections?.record) {
      customerRecord = inheritedSelections.record;
    }

    // If customer overrides record, clear subSafe (drawer belongs to original record)
    const customerSubSafe = (customer?.default_record_id && customer.default_record_id !== inheritedSelections?.record?.id)
      ? null
      : (inheritedSelections?.subSafe || null);

    // Get customer's default price type if set
    const customerPriceType = customer?.default_price_type || inheritedSelections?.priceType || 'price';

    setTabs(prev => {
      const newTabs: POSTab[] = [];

      // Process existing tabs
      for (const tab of prev) {
        if (tab.id === 'main') {
          // Reset main tab: clear cart and reset customer to default
          newTabs.push({
            ...tab,
            active: false,
            cartItems: [],
            selections: {
              ...tab.selections,
              customer: defaultCustomer || null,
            },
          });
        } else {
          newTabs.push({ ...tab, active: false });
        }
      }

      // Add the new customer tab with the cart items
      newTabs.push({
        id: newTabId,
        title: tabTitle,
        active: true,
        cartItems: cartItems,
        selections: {
          customer: customer,
          branch: inheritedSelections?.branch || null,
          record: customerRecord,
          subSafe: customerSubSafe,
          priceType: customerPriceType as any,
        },
      });

      // Instant save
      saveState(newTabs, newTabId);
      return newTabs;
    });

    setActiveTabId(newTabId);
    return newTabId;
  }, [saveState]);

  // Update tab's customer and title (for changing customer from context menu)
  // Also applies customer's default price type if set
  const updateTabCustomerAndTitle = useCallback((tabId: string, customer: any, title: string) => {
    setTabs(prev => {
      const newTabs = prev.map(tab => {
        if (tab.id === tabId) {
          // Keep existing record (safe should only change via explicit record select)
          let customerRecord = tab.selections.record;

          // Get customer's default price type if set, otherwise keep existing
          const customerPriceType = customer?.default_price_type || tab.selections.priceType || 'price';

          return {
            ...tab,
            title: title,
            selections: {
              ...tab.selections,
              customer: customer,
              record: customerRecord,
              priceType: customerPriceType as any,
            },
          };
        }
        return tab;
      });
      saveState(newTabs, activeTabId);
      return newTabs;
    });
  }, [activeTabId, saveState]);

  const closeTab = useCallback((tabId: string) => {
    if (tabId === 'main') return;

    setTabs(prev => {
      const closingTab = prev.find(tab => tab.id === tabId);
      const wasPostponed = closingTab?.isPostponed === true;

      const newTabs = prev.filter(tab => tab.id !== tabId);
      let newActiveId = activeTabId;

      if (activeTabId === tabId) {
        // Always switch to main tab after closing current tab
        // This prevents auto-opening postponed tabs after completing a sale
        newActiveId = 'main';
        setActiveTabId(newActiveId);
      }

      const finalTabs = newTabs.map(tab => ({
        ...tab,
        active: tab.id === newActiveId,
      }));

      // Save to localStorage
      saveToLocal(finalTabs, newActiveId);

      // If the closed tab was postponed, immediately sync DB
      if (wasPostponed) {
        savePostponedImmediately(finalTabs);
      }

      return finalTabs;
    });
  }, [activeTabId, saveToLocal, savePostponedImmediately]);

  const switchTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.map(tab => ({
        ...tab,
        active: tab.id === tabId,
      }));
      // Instant save
      saveState(newTabs, tabId);
      return newTabs;
    });
    setActiveTabId(tabId);
  }, [saveState]);

  const updateActiveTabCart = useCallback((cartItems: any[]) => {
    setTabs(prev => {
      const newTabs = prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, cartItems }
          : tab
      );
      // Instant save
      saveState(newTabs, activeTabId);
      return newTabs;
    });
  }, [activeTabId, saveState]);

  const updateActiveTabSelections = useCallback((newSelections: Partial<POSTab['selections']>) => {
    setTabs(prev => {
      const newTabs = prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, selections: { ...tab.selections, ...newSelections } }
          : tab
      );
      // Instant save
      saveState(newTabs, activeTabId);
      return newTabs;
    });
  }, [activeTabId, saveState]);

  const updateActiveTabMode = useCallback((updates: Partial<POSTab>) => {
    setTabs(prev => {
      const newTabs = prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, ...updates }
          : tab
      );
      // Instant save
      saveState(newTabs, activeTabId);
      return newTabs;
    });
  }, [activeTabId, saveState]);

  const clearActiveTabCart = useCallback(() => {
    setTabs(prev => {
      const newTabs = prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, cartItems: [] }
          : tab
      );
      // Instant save
      saveState(newTabs, activeTabId);
      return newTabs;
    });
  }, [activeTabId, saveState]);

  // ============================================
  // POSTPONE TAB: Mark tab as postponed and switch to another tab
  // Immediately saves to DB for cross-device visibility
  // ============================================
  const postponeTab = useCallback((tabId: string) => {
    // Cannot postpone the main tab
    if (tabId === 'main') return;

    setTabs(prev => {
      const tabToPostpone = prev.find(tab => tab.id === tabId);
      if (!tabToPostpone || tabToPostpone.cartItems.length === 0) return prev;

      // Mark tab as postponed
      const newTabs = prev.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            isPostponed: true,
            postponedAt: new Date().toISOString(),
            active: false,
          };
        }
        return tab;
      });

      // If the postponed tab was active, switch to main tab
      let newActiveId = activeTabId;
      if (activeTabId === tabId) {
        newActiveId = 'main';
        // Mark main as active
        const finalTabs = newTabs.map(tab => ({
          ...tab,
          active: tab.id === 'main',
        }));
        saveToLocal(finalTabs, newActiveId);
        savePostponedImmediately(finalTabs);
        setActiveTabId(newActiveId);
        return finalTabs;
      }

      saveToLocal(newTabs, activeTabId);
      savePostponedImmediately(newTabs);
      return newTabs;
    });
  }, [activeTabId, saveToLocal, savePostponedImmediately]);

  // ============================================
  // RESTORE TAB: Restore a postponed tab and switch to it
  // Immediately saves to DB to remove from postponed
  // ============================================
  const restoreTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            isPostponed: false,
            postponedAt: undefined,
            active: true,
          };
        }
        return { ...tab, active: false };
      });

      saveToLocal(newTabs, tabId);
      savePostponedImmediately(newTabs);
      setActiveTabId(tabId);
      return newTabs;
    });
  }, [saveToLocal, savePostponedImmediately]);

  // Get postponed tabs
  const postponedTabs = tabs.filter(tab => tab.isPostponed === true);

  // ============================================
  // LOAD STATE: Active tabs from localStorage, postponed from DB, merge
  // ============================================
  useEffect(() => {
    const loadTabsState = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // Check if user is authenticated
      if (!isAuthenticated || !user?.id) {
        console.log('POS Tabs: No user logged in, using default tabs');
        setIsLoading(false);
        isInitialMount.current = false;
        userIdRef.current = null;
        return;
      }

      // Skip if already loaded for this user
      if (userIdRef.current === user.id && !isInitialMount.current) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        userIdRef.current = user.id;

        console.log('POS Tabs: Loading state for user:', user.id);

        // STEP 1: Load active tabs from localStorage (instant, device-specific)
        const localState = loadFromLocalStorage(user.id);
        let activeTabs: POSTab[] = [];
        let localActiveTabId = 'main';

        if (localState && localState.tabs && localState.tabs.length > 0) {
          console.log('POS Tabs: Loaded from localStorage:', localState.tabs.length, 'tabs');
          // Get only non-postponed tabs from localStorage
          activeTabs = localState.tabs
            .filter(tab => !tab.isPostponed)
            .map(tab => {
              // Clean up: ensure main tab never has edit mode
              if (tab.id === 'main') {
                return { ...tab, isEditMode: false, editInvoiceData: null };
              }
              return tab;
            });
          localActiveTabId = localState.activeTabId || 'main';
        }

        // Ensure main tab exists
        if (!activeTabs.find(t => t.id === 'main')) {
          activeTabs = [DEFAULT_TAB, ...activeTabs];
        }

        // Show active tabs immediately
        setTabs(activeTabs);
        setActiveTabId(localActiveTabId);

        // STEP 2: Load postponed tabs from DB (cross-device)
        const dbPostponedTabs = await posTabsService.loadPostponedTabs(user.id);

        if (dbPostponedTabs.length > 0) {
          console.log('POS Tabs: Loaded', dbPostponedTabs.length, 'postponed tabs from DB');
          // Merge: active tabs from localStorage + postponed tabs from DB
          // Remove any duplicates (by tab ID)
          const activeTabIds = new Set(activeTabs.map(t => t.id));
          const uniquePostponed = dbPostponedTabs.filter(t => !activeTabIds.has(t.id));

          const mergedTabs = [...activeTabs, ...uniquePostponed];
          setTabs(mergedTabs);

          // Update localStorage with merged state
          saveToLocalStorage(user.id, mergedTabs, localActiveTabId);
          lastDbSavedDataRef.current = JSON.stringify(dbPostponedTabs);
        } else {
          // Also check localStorage for any postponed tabs (fallback)
          const localPostponed = localState?.tabs?.filter(t => t.isPostponed) || [];
          if (localPostponed.length > 0) {
            console.log('POS Tabs: Using', localPostponed.length, 'postponed tabs from localStorage (DB had none)');
            const mergedTabs = [...activeTabs, ...localPostponed];
            setTabs(mergedTabs);
          }
        }

      } catch (error) {
        console.error('POS Tabs: Failed to load state:', error);
      } finally {
        setIsLoading(false);
        isInitialMount.current = false;
      }
    };

    loadTabsState();
  }, [user?.id, isAuthenticated, authLoading]);

  // ============================================
  // CLEANUP: Save postponed tabs to DB on unmount
  // ============================================
  useEffect(() => {
    return () => {
      if (dbSaveTimeoutRef.current) {
        clearTimeout(dbSaveTimeoutRef.current);
      }
      // Force-save only postponed tabs on unmount
      if (userIdRef.current && !isInitialMount.current) {
        const hasPostponed = tabs.some(t => t.isPostponed === true);
        if (hasPostponed) {
          posTabsService.savePostponedTabs(userIdRef.current, tabs);
        }
      }
    };
  }, [tabs, activeTabId]);

  // Filter out postponed tabs from active tabs display
  const activeTabs = tabs.filter(tab => !tab.isPostponed);

  return {
    tabs: activeTabs,
    activeTab,
    activeTabId,
    addTab,
    addTabWithCustomer,
    addTabWithCustomerAndCart,
    createTabFromMainWithCart,
    updateTabCustomerAndTitle,
    closeTab,
    switchTab,
    updateActiveTabCart,
    updateActiveTabSelections,
    updateActiveTabMode,
    clearActiveTabCart,
    postponeTab,
    restoreTab,
    postponedTabs,
    isLoading,
    isSaving,
    lastSaved,
  };
}
