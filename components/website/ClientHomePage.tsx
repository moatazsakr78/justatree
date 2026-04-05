'use client';

import { useState, useEffect, ComponentType } from 'react';
import { detectDeviceClient, DeviceInfo } from '@/lib/device-detection';
import { getThemeLoader } from '@/templates/_shared/ThemeRegistry';
import type { ThemeHomeProps } from '@/templates/_shared/ThemeContract';
import { useRealCart } from '@/lib/useRealCart';
import { useAuth } from '@/lib/useAuth';
import { UserInfo } from '@/components/website/shared/types';
import { CartProvider } from '@/lib/contexts/CartContext';
import { PreFetchedDataProvider } from '@/lib/contexts/PreFetchedDataContext';

/**
 * Client-side wrapper for the home page
 * Handles device detection, cart management, and dynamic theme loading
 * Receives pre-fetched data from Server Component for better performance
 */
interface ClientHomePageProps {
  initialProducts?: any[];
  initialCategories?: any[];
  initialSections?: any[];
  initialSettings?: any;
  websiteThemeId?: string;
  initialBanners?: any[];
}

// Cache loaded theme components to avoid re-importing on re-renders
const themeCache: Record<string, {
  DesktopHome: ComponentType<ThemeHomeProps>;
  TabletHome: ComponentType<ThemeHomeProps>;
  MobileHome: ComponentType<ThemeHomeProps>;
}> = {};

export default function ClientHomePage({
  initialProducts = [],
  initialCategories = [],
  initialSections = [],
  initialSettings = null,
  websiteThemeId = 'default',
  initialBanners = []
}: ClientHomePageProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    userAgent: '',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });
  const [isClient, setIsClient] = useState(false);
  const [themeComponents, setThemeComponents] = useState<{
    DesktopHome: ComponentType<ThemeHomeProps>;
    TabletHome: ComponentType<ThemeHomeProps>;
    MobileHome: ComponentType<ThemeHomeProps>;
  } | null>(themeCache[websiteThemeId] || null);
  const [themeError, setThemeError] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    id: '1',
    name: 'عميل تجريبي',
    email: 'customer@example.com',
    cart: []
  });

  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartItemsCount, refreshCart, setUserId } = useRealCart({
    userId: user?.id || null
  });

  // Load theme components dynamically
  useEffect(() => {
    // Already cached
    if (themeCache[websiteThemeId]) {
      setThemeComponents(themeCache[websiteThemeId]);
      return;
    }

    const loadTheme = async () => {
      const loader = getThemeLoader(websiteThemeId);
      if (!loader) {
        console.error(`Theme "${websiteThemeId}" not found in registry, falling back to default`);
        // Fallback to default
        const defaultLoader = getThemeLoader('default');
        if (defaultLoader) {
          try {
            const mod = await defaultLoader();
            themeCache['default'] = mod;
            setThemeComponents(mod);
          } catch (err) {
            console.error('Failed to load default theme:', err);
            setThemeError(true);
          }
        }
        return;
      }

      try {
        const mod = await loader();
        themeCache[websiteThemeId] = mod;
        setThemeComponents(mod);
      } catch (err) {
        console.error(`Failed to load theme "${websiteThemeId}":`, err);
        // Fallback to default on error
        const defaultLoader = getThemeLoader('default');
        if (defaultLoader && websiteThemeId !== 'default') {
          try {
            const defaultMod = await defaultLoader();
            themeCache['default'] = defaultMod;
            setThemeComponents(defaultMod);
          } catch {
            setThemeError(true);
          }
        } else {
          setThemeError(true);
        }
      }
    };

    loadTheme();
  }, [websiteThemeId]);

  useEffect(() => {
    setIsClient(true);
    const detected = detectDeviceClient();
    setDeviceInfo(detected);
  }, []);

  // Update cart session when user authentication changes
  useEffect(() => {
    if (isClient) {
      const newUserId = isAuthenticated && user?.id ? user.id : null;
      setUserId(newUserId);
    }
  }, [isClient, isAuthenticated, user?.id, setUserId]);

  // Separate effect for cart refresh
  useEffect(() => {
    if (isClient) {
      refreshCart();
    }
  }, [isClient, refreshCart]);

  // Refresh cart on focus/visibility
  useEffect(() => {
    const handleFocus = () => {
      refreshCart();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshCart();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCart]);

  const handleCartUpdate = (newCart: any[]) => {
    // Real cart is managed by useRealCart hook with Supabase
  };

  // Convert Supabase cart data to compatible format
  const compatibleCart = cart.map(item => ({
    id: item.id,
    name: item.products?.name || 'منتج غير معروف',
    price: item.price,
    quantity: item.quantity,
    image: item.products?.main_image_url || '',
    description: '',
    category: ''
  }));

  const realCartCount = getCartItemsCount();

  const updatedUserInfo = {
    ...userInfo,
    id: isAuthenticated ? user?.id || '1' : '1',
    name: isAuthenticated ? user?.name || 'عميل مسجل' : 'عميل تجريبي',
    email: isAuthenticated ? user?.email || 'user@example.com' : 'customer@example.com',
    cart: compatibleCart,
    cartCount: realCartCount
  };

  const cartCallbacks = {
    onCartUpdate: handleCartUpdate,
    onRemoveFromCart: (productId: string | number) => {
      const item = cart.find(item => item.product_id === String(productId));
      if (item) removeFromCart(item.id);
    },
    onUpdateQuantity: (productId: string | number, quantity: number) => {
      const item = cart.find(item => item.product_id === String(productId));
      if (item) updateQuantity(item.id, quantity);
    },
    onClearCart: clearCart
  };

  // Show loading screen during hydration or theme loading
  if (!isClient || !themeComponents) {
    return (
      <CartProvider>
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: 'var(--primary-color, #DC2626)'}}></div>
            <p className="text-gray-600">جاري تحميل التطبيق...</p>
          </div>
        </div>
      </CartProvider>
    );
  }

  if (themeError) {
    return (
      <CartProvider>
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
          <div className="text-center">
            <p className="text-red-600 text-lg mb-2">حدث خطأ في تحميل القالب</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </CartProvider>
    );
  }

  const { DesktopHome, TabletHome, MobileHome } = themeComponents;

  // Render appropriate component based on device type
  return (
    <CartProvider>
      <PreFetchedDataProvider
        value={{
          products: initialProducts,
          categories: initialCategories,
          sections: initialSections,
          settings: initialSettings,
          banners: initialBanners
        }}
      >
        {(() => {
          switch (deviceInfo.type) {
      case 'mobile':
        return (
          <MobileHome
            userInfo={updatedUserInfo}
            {...cartCallbacks}
          />
        );

      case 'tablet':
        return (
          <TabletHome
            userInfo={updatedUserInfo}
            {...cartCallbacks}
          />
        );

      case 'desktop':
      default:
        return (
          <DesktopHome
            userInfo={updatedUserInfo}
            {...cartCallbacks}
          />
        );
          }
        })()}
      </PreFetchedDataProvider>
    </CartProvider>
  );
}
