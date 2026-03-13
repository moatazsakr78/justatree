import { supabase } from '@/app/lib/supabase/client';
import { POSTab } from '@/lib/hooks/usePOSTabs';

export interface POSTabsState {
  tabs: POSTab[];
  active_tab_id: string;
  updated_at?: string;
}

/**
 * Service for managing POSTPONED POS tabs in Supabase (account-wide, cross-device)
 * Active/cart tabs are stored in localStorage only (device-specific)
 */
class POSTabsService {
  /**
   * Load ONLY postponed tabs from database
   */
  async loadPostponedTabs(userId: string): Promise<POSTab[]> {
    if (!userId) {
      console.warn('POS Tabs: No user ID provided');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('pos_tabs_state')
        .select('tabs, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          console.log('POS Tabs: No postponed tabs found for user');
          return [];
        }
        console.error('POS Tabs: Error loading postponed tabs:', error);
        return [];
      }

      const allTabs = (data.tabs as unknown as POSTab[]) || [];
      const postponedTabs = allTabs.filter(tab => tab.isPostponed === true);
      console.log('POS Tabs: Loaded', postponedTabs.length, 'postponed tabs from DB');
      return postponedTabs;
    } catch (error) {
      console.error('POS Tabs: Exception loading postponed tabs:', error);
      return [];
    }
  }

  /**
   * Save ONLY postponed tabs to database
   * If no postponed tabs exist, delete the DB record
   */
  async savePostponedTabs(userId: string, allTabs: POSTab[]): Promise<boolean> {
    if (!userId) {
      console.warn('POS Tabs: Cannot save - no user ID provided');
      return false;
    }

    const postponedTabs = allTabs.filter(tab => tab.isPostponed === true);

    try {
      if (postponedTabs.length === 0) {
        // No postponed tabs - delete DB record
        const { error } = await supabase
          .from('pos_tabs_state')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('POS Tabs: Error deleting empty state:', error);
          return false;
        }
        console.log('POS Tabs: No postponed tabs, cleared DB record');
        return true;
      }

      // Save only postponed tabs
      const { error } = await supabase
        .from('pos_tabs_state')
        .upsert({
          user_id: userId,
          tabs: postponedTabs as unknown as any,
          active_tab_id: 'main', // Not relevant for postponed-only storage
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('POS Tabs: Error saving postponed tabs:', error);
        return false;
      }

      console.log('POS Tabs: Saved', postponedTabs.length, 'postponed tabs to DB');
      return true;
    } catch (error) {
      console.error('POS Tabs: Exception saving postponed tabs:', error);
      return false;
    }
  }

  /**
   * Clear POS tabs state from database
   */
  async clearTabsState(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('pos_tabs_state')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('POS Tabs: Error clearing state:', error);
        return false;
      }

      console.log('POS Tabs: State cleared successfully');
      return true;
    } catch (error) {
      console.error('POS Tabs: Exception clearing state:', error);
      return false;
    }
  }
}

// Export singleton instance
export const posTabsService = new POSTabsService();
