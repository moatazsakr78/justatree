'use client';

import { useState, useCallback } from 'react';

export interface TabState {
  id: string;
  title: string;
  active: boolean;
}

export function useReportTabs() {
  const [openTabs, setOpenTabs] = useState<TabState[]>([
    { id: 'main', title: 'التقارير', active: true }
  ]);
  const [activeTab, setActiveTab] = useState<string>('main');

  const switchTab = useCallback((tabId: string) => {
    setOpenTabs(prev => prev.map(tab => ({
      ...tab,
      active: tab.id === tabId
    })));
    setActiveTab(tabId);
  }, []);

  const openReport = useCallback((reportId: string, titleAr: string) => {
    setOpenTabs(prev => {
      const exists = prev.some(tab => tab.id === reportId);
      if (exists) {
        // Switch to existing tab
        return prev.map(tab => ({ ...tab, active: tab.id === reportId }));
      }
      // Add new tab
      return [
        ...prev.map(tab => ({ ...tab, active: false })),
        { id: reportId, title: titleAr, active: true }
      ];
    });
    setActiveTab(reportId);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    if (tabId === 'main') return;

    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      const wasActive = prev.find(t => t.id === tabId)?.active;

      if (wasActive && newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        const updated = newTabs.map(tab => ({
          ...tab,
          active: tab.id === lastTab.id
        }));
        // Update activeTab to the last remaining tab
        setActiveTab(lastTab.id);
        return updated;
      }

      return newTabs;
    });
  }, []);

  return { openTabs, activeTab, switchTab, openReport, closeTab };
}
