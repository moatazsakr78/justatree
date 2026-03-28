'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Bars3Icon, GlobeAltIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { SignalIcon, SignalSlashIcon } from '@heroicons/react/24/solid';
import { useOfflineStatus } from '@/app/lib/hooks/useOfflineStatus';
import { triggerManualSync, isSyncInProgress } from '@/app/lib/offline/syncManager';
import BranchSwitcher from '../BranchSwitcher';
import { useBackgroundProduct } from '@/lib/contexts/BackgroundProductContext';

const PendingSalesModal = dynamic(() => import('../PendingSalesModal'), { ssr: false });
const BackgroundProductsModal = dynamic(() => import('../BackgroundProductsModal'), { ssr: false });

interface TopHeaderProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  pageTitle?: string;
}

export default function TopHeader({ onMenuClick, isMenuOpen = false, pageTitle }: TopHeaderProps) {
  const pathname = usePathname();
  const { isOnline, pendingSalesCount, connectionQuality, isOfflineReady } = useOfflineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPendingSalesModal, setShowPendingSalesModal] = useState(false);
  const [showBackgroundProductsModal, setShowBackgroundProductsModal] = useState(false);
  const { activeTaskCount, hasFailedTasks, tasks } = useBackgroundProduct();

  // Function to get page title based on pathname
  const getPageTitle = (): string => {
    // If pageTitle prop is provided, use it
    if (pageTitle) {
      return pageTitle;
    }

    // Otherwise, determine title from pathname
    const pathMap: { [key: string]: string } = {
      '/pos': 'نقطة البيع',
      '/products': 'المنتجات',
      '/inventory': 'المخزون',
      '/customers': 'العملاء',
      '/suppliers': 'الموردين',
      '/safes': 'الخزن',
      '/reports': 'التقارير',
      '/permissions': 'الصلاحيات',
      '/settings': 'الإعدادات',
      '/dashboard': 'لوحة التحكم',
    };

    return pathMap[pathname || ''] || 'نظام نقاط البيع';
  };

  // Handle manual sync
  const handleSync = async () => {
    if (!isOnline || isSyncInProgress()) return;

    setIsSyncing(true);
    try {
      await triggerManualSync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Hide header on website pages
  if (pathname === '/' ||
      pathname?.startsWith('/store/') ||
      (pathname?.startsWith('/product') && pathname !== '/products') ||
      pathname === '/cart' ||
      pathname?.startsWith('/auth/') ||
      pathname?.startsWith('/admin/products') ||
      pathname?.startsWith('/shipping') ||
      pathname === '/my-orders' ||
      pathname === '/profile' ||
      pathname === '/customer-orders' ||
      pathname === '/my-invoices' ||
      pathname === '/social-media' ||
      pathname?.startsWith('/track')) {
    return null;
  }

  // Get connection status indicator
  const getConnectionIndicator = () => {
    if (!isOnline) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-dash-accent-red-subtle rounded-full" title="غير متصل بالإنترنت">
          <SignalSlashIcon className="h-4 w-4 text-dash-accent-red" />
          <span className="text-xs text-dash-accent-red hidden sm:inline">غير متصل</span>
        </div>
      );
    }

    if (connectionQuality === 'slow') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-dash-accent-orange-subtle rounded-full" title="الاتصال بطيء">
          <SignalIcon className="h-4 w-4 text-dash-accent-orange" />
          <span className="text-xs text-dash-accent-orange hidden sm:inline">بطيء</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-dash-accent-green-subtle rounded-full" title="متصل">
        <SignalIcon className="h-4 w-4 text-dash-accent-green" />
        <span className="text-xs text-dash-accent-green hidden sm:inline">متصل</span>
      </div>
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-[var(--dash-header-bg)] border-b border-[var(--dash-border-default)] px-4 shadow-dash-sm">
      <div className="flex items-center justify-between h-full">
        {/* Left side (يظهر يمين الشاشة في RTL) - Menu + Branch Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="p-2 text-[var(--dash-text-primary)]"
            aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Branch Switcher - نُقل هنا */}
          <BranchSwitcher />

          {/* Pending sales indicator */}
          {pendingSalesCount > 0 && (
            <button
              onClick={() => setShowPendingSalesModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full transition-colors bg-dash-accent-orange-subtle hover:bg-dash-accent-orange-subtle cursor-pointer"
              title={`${pendingSalesCount} فواتير في الانتظار - اضغط للعرض`}
            >
              <CloudArrowUpIcon className={`h-4 w-4 text-dash-accent-orange ${isSyncing ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-dash-accent-orange font-medium">{pendingSalesCount}</span>
            </button>
          )}

          {/* Background product creation indicator */}
          {tasks.length > 0 && (
            <button
              onClick={() => setShowBackgroundProductsModal(true)}
              className="relative flex items-center gap-1 px-2 py-1 rounded-full transition-colors bg-dash-accent-blue-subtle hover:bg-dash-accent-blue-subtle cursor-pointer"
              title={`${activeTaskCount} عمليات المنتجات في الخلفية - اضغط للعرض`}
            >
              <CloudArrowUpIcon className={`h-4 w-4 text-dash-accent-blue ${activeTaskCount > 0 ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-dash-accent-blue font-medium">{tasks.length}</span>
              {hasFailedTasks && (
                <span className="absolute -top-0.5 -left-0.5 h-2 w-2 bg-dash-accent-red rounded-full" />
              )}
            </button>
          )}
        </div>

        {/* Center - App title */}
        <div className="flex items-center">
          <h1 className="text-[var(--dash-text-primary)] text-lg font-semibold">{getPageTitle()}</h1>
        </div>

        {/* Right side (يظهر يسار الشاشة في RTL) - Website + Connection */}
        <div className="flex items-center gap-2">
          {/* Website button */}
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-3 py-1.5 text-dash-accent-blue hover:text-dash-accent-blue hover:bg-[var(--dash-bg-overlay)] rounded-lg transition-colors"
            title="انتقل إلى الموقع الإلكتروني"
          >
            <GlobeAltIcon className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">الموقع</span>
          </button>

          {/* Connection status - نُقل هنا */}
          {getConnectionIndicator()}
        </div>
      </div>

      {/* Pending Sales Modal */}
      <PendingSalesModal
        isOpen={showPendingSalesModal}
        onClose={() => setShowPendingSalesModal(false)}
      />

      {/* Background Products Modal */}
      <BackgroundProductsModal
        isOpen={showBackgroundProductsModal}
        onClose={() => setShowBackgroundProductsModal(false)}
      />
    </div>
  );
}
