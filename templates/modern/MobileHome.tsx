'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, Product as DatabaseProduct } from '@/app/lib/hooks/useProducts';
import { UserInfo, Product } from '@/components/website/shared/types';
import AuthButtons from '@/app/components/auth/AuthButtons';
import { useAuth } from '@/lib/useAuth';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useStoreCategoriesWithProducts } from '@/lib/hooks/useStoreCategories';
import { useCustomSections } from '@/lib/hooks/useCustomSections';
import InteractiveProductCard from '@/components/website/InteractiveProductCard';
import ProductDetailsModal from '@/app/components/ProductDetailsModal';
import CartModal from '@/app/components/CartModal';
import { useCart } from '@/lib/contexts/CartContext';
import { useFavorites } from '@/lib/contexts/FavoritesContext';
import { useCartBadge } from '@/lib/hooks/useCartBadge';
import { useCompanySettings } from '@/lib/hooks/useCompanySettings';
import { useProductDisplaySettings } from '@/lib/hooks/useProductDisplaySettings';
import { useStoreTheme } from '@/lib/hooks/useStoreTheme';
import { useStoreBackHandler } from '@/lib/hooks/useBackButton';
import { useSocialMediaPublic } from '@/lib/hooks/useSocialMedia';
import WhatsAppFloatingButton from '@/app/components/WhatsAppFloatingButton';
import { preloadImagesInBackground } from '@/lib/utils/imagePreloader';
import { getTransformedUrls } from '@/lib/utils/supabaseImageTransform';
import { useWebsiteCurrency } from '@/lib/hooks/useCurrency';

interface MobileHomeProps {
  userInfo: UserInfo;
  onCartUpdate: (cart: any[]) => void;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}

export default function MobileHome({
  userInfo,
  onCartUpdate,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart
}: MobileHomeProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isClient, setIsClient] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Bottom navigation active tab
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'search' | 'cart' | 'account'>('home');

  // Category panel state
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);

  // Search overlay state
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  // Account panel state
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

  // Performance: Limit visible products for better rendering
  const VISIBLE_PRODUCTS_LIMIT = 20;
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Get auth status
  const { isAuthenticated } = useAuth();

  // Get user profile to check admin status
  const { profile, isAdmin, loading: profileLoading } = useUserProfile();

  // Determine if user is admin or staff
  const isAdminOrStaff = profile?.role === 'أدمن رئيسي' || profile?.role === 'موظف';

  // Get social media links to find WhatsApp number
  const { links: socialLinks } = useSocialMediaPublic();
  const whatsappLink = socialLinks?.find((link: any) =>
    link.platform?.toLowerCase() === 'whatsapp' && link.is_active
  );
  const whatsappNumber = whatsappLink?.whatsapp_number ||
    whatsappLink?.link_url?.replace('https://wa.me/', '');

  // Get company settings
  const { companyName, logoUrl, logoShape, socialMedia, isLoading: isCompanyLoading } = useCompanySettings();

  // Get product display settings
  const { settings: displaySettings } = useProductDisplaySettings();

  // Get store theme colors
  const { primaryColor, primaryHoverColor, interactiveColor, isLoading: isThemeLoading } = useStoreTheme();

  // Get logo rounding class based on shape
  const logoRoundingClass = logoShape === 'circle' ? 'rounded-full' : 'rounded-lg';

  // Get cart badge count and cart functions
  const { cartBadgeCount } = useCartBadge();
  const { addToCart } = useCart();

  // Get favorites
  const { favorites } = useFavorites();

  // Get store categories with their products
  const { categoriesWithProducts, isLoading: isCategoriesLoading } = useStoreCategoriesWithProducts();

  // Get custom sections with products
  const { sections: customSections, isLoading: isSectionsLoading, fetchSectionsWithProducts } = useCustomSections();
  const [sectionsWithProducts, setSectionsWithProducts] = useState<any[]>([]);
  const [isSectionsReady, setIsSectionsReady] = useState(false);
  const [rawSectionsData, setRawSectionsData] = useState<any[]>([]);
  const [expandedCloneProductId, setExpandedCloneProductId] = useState<string | null>(null);
  const cloneAccordionRef = useRef<HTMLDivElement>(null);
  const websiteCurrency = useWebsiteCurrency();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scroll to clone accordion when expanded
  useEffect(() => {
    if (expandedCloneProductId && cloneAccordionRef.current) {
      setTimeout(() => {
        cloneAccordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expandedCloneProductId]);

  // Handle adding products to cart - opens quantity modal
  const handleAddToCart = async (product: Product) => {
    setSelectedProduct(product);
    setQuantityValue(1);
    setIsQuantityModalOpen(true);
  };

  // Handle quantity confirmation
  const handleQuantityConfirm = async (quantity: number) => {
    if (!selectedProduct) return;

    try {
      console.log('🛒 Mobile Modern: Adding product to cart:', selectedProduct.name, 'Quantity:', quantity, 'Note:', selectedProduct.note);
      const selectedColorName = selectedProduct.selectedColor?.name || undefined;
      const selectedShapeName = selectedProduct.selectedShape?.name || undefined;
      const productNote = selectedProduct.note || undefined;
      const customImageUrl = selectedProduct.customImage || undefined;
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price, selectedColorName, selectedShapeName, undefined, productNote, customImageUrl);
      console.log('✅ Mobile Modern: Product added successfully');
    } catch (error) {
      console.error('❌ Mobile Modern: Error adding product to cart:', error);
    }
  };

  // Get real products from database
  const { products: databaseProducts, isLoading } = useProducts();

  // Convert database products to website format with colors
  useEffect(() => {
    const fetchProductsWithColors = async () => {
      try {
        if (databaseProducts && databaseProducts.length > 0) {
          // First, fetch all product color & shape definitions
          const { supabase } = await import('@/app/lib/supabase/client');
          const { data: variants, error: variantsError } = await supabase
            .from('product_color_shape_definitions')
            .select('*')
            .in('variant_type', ['color', 'shape'])
            .order('sort_order', { ascending: true });

          if (variantsError) {
            console.error('Error fetching product color/shape definitions:', variantsError);
          }

          // Fetch size groups with their items
          const { data: sizeGroups, error: sizeGroupsError } = await supabase
            .from('product_size_groups')
            .select(`
              *,
              product_size_group_items (
                *,
                products (
                  id,
                  name,
                  main_image_url,
                  price,
                  description
                )
              )
            `)
            .eq('is_active', true);

          if (sizeGroupsError) {
            console.error('Error fetching size groups:', sizeGroupsError);
          }

          // Create a map of products that are part of size groups
          const productsInSizeGroups = new Map();
          sizeGroups?.forEach(group => {
            if (group.product_size_group_items && group.product_size_group_items.length > 0) {
              const representative = group.product_size_group_items[0];
              if (representative.products) {
                productsInSizeGroups.set(representative.products.id, {
                  sizeGroup: group,
                  sizes: group.product_size_group_items.map((item: any) => ({
                    id: item.product_id,
                    name: item.size_name,
                    product: item.products
                  }))
                });
              }
            }
          });

          // Create a set of product IDs that should be hidden (all except representatives)
          const hiddenProductIds = new Set();
          sizeGroups?.forEach(group => {
            if (group.product_size_group_items && group.product_size_group_items.length > 1) {
              group.product_size_group_items.slice(1).forEach((item: any) => {
                hiddenProductIds.add(item.product_id);
              });
            }
          });

          const convertedProducts: Product[] = databaseProducts
            .filter((dbProduct: DatabaseProduct) => {
              if (dbProduct.is_hidden || hiddenProductIds.has(dbProduct.id)) {
                return false;
              }

              if (displaySettings.display_mode === 'show_with_stock') {
                const totalStock = (dbProduct as any).totalQuantity ?? dbProduct.stock ?? 0;
                return totalStock > 0;
              } else if (displaySettings.display_mode === 'show_with_stock_and_vote') {
                return true;
              }

              return true;
            })
            .map((dbProduct: DatabaseProduct) => {
              const hasDiscount = dbProduct.discount_percentage && dbProduct.discount_percentage > 0;
              const finalPrice = hasDiscount
                ? Number(dbProduct.price) * (1 - Number(dbProduct.discount_percentage) / 100)
                : Number(dbProduct.price);

              const productColors = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'color') || [];
              const colors = productColors.map((variant: any) => ({
                id: variant.id,
                name: variant.color_name || variant.name || 'لون غير محدد',
                hex: variant.color_hex || '#000000',
                image_url: variant.image_url || null
              }));

              const productShapes = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'shape') || [];
              const shapes = productShapes.map((variant: any) => ({
                id: variant.id,
                name: variant.name || 'شكل غير محدد',
                image_url: variant.image_url || null
              }));

              const sizeGroupInfo = productsInSizeGroups.get(dbProduct.id);
              const sizes = sizeGroupInfo ? sizeGroupInfo.sizes : [];

              return {
                id: dbProduct.id,
                name: dbProduct.name || 'منتج بدون اسم',
                description: dbProduct.description || '',
                price: finalPrice,
                wholesale_price: Number(dbProduct.wholesale_price) || undefined,
                originalPrice: hasDiscount ? Number(dbProduct.price) : undefined,
                image: dbProduct.main_image_url || undefined,
                images: dbProduct.allImages || [],
                colors: colors,
                shapes: shapes,
                sizes: sizes,
                category: dbProduct.category?.name || 'عام',
                brand: companyName,
                stock: dbProduct.stock || 0,
                totalQuantity: (dbProduct as any).totalQuantity ?? dbProduct.stock ?? 0,
                rating: Number(dbProduct.rating) || 0,
                reviews: dbProduct.rating_count || 0,
                isOnSale: hasDiscount || false,
                discount: hasDiscount && dbProduct.discount_percentage ? Math.round(Number(dbProduct.discount_percentage)) : undefined,
                tags: [],
                isFeatured: dbProduct.is_featured || false
              };
            });
          setWebsiteProducts(convertedProducts);
        }
      } catch (error) {
        console.error('Error converting database products:', error);
        setWebsiteProducts([]);
      }
    };

    fetchProductsWithColors();
  }, [databaseProducts, displaySettings]);

  // Load raw sections data immediately on mount
  useEffect(() => {
    let isMounted = true;

    const loadRawSections = async () => {
      try {
        const sections = await fetchSectionsWithProducts();
        if (isMounted) {
          setRawSectionsData(sections);
        }
      } catch (error) {
        console.error('Error loading custom sections:', error);
      }
    };

    loadRawSections();

    return () => {
      isMounted = false;
    };
  }, [fetchSectionsWithProducts]);

  // Convert sections when website products are ready
  useEffect(() => {
    if (!rawSectionsData || rawSectionsData.length === 0) {
      setSectionsWithProducts([]);
      setIsSectionsReady(true);
      return;
    }

    if (!websiteProducts || websiteProducts.length === 0) {
      const quickSections = rawSectionsData
        .filter((section: any) => section.is_active && section.productDetails && section.productDetails.length > 0)
        .map((section: any) => ({
          ...section,
          products: section.productDetails.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.finalPrice || product.price,
            originalPrice: product.hasDiscount ? product.price : undefined,
            image: product.customImage || product.main_image_url,
            images: [product.main_image_url, product.sub_image_url].filter(Boolean),
            category: 'عام',
            colors: [],
            shapes: [],
            sizes: [],
            brand: companyName,
            stock: 0,
            rating: product.rating || 0,
            reviews: product.rating_count || 0,
            isOnSale: product.hasDiscount || false,
            discount: product.discount_percentage ? Math.round(product.discount_percentage) : undefined,
            tags: [],
            isFeatured: false,
            customImage: product.customImage || null,
            clones: product.clones || []
          }))
        }));

      requestAnimationFrame(() => {
        setSectionsWithProducts(quickSections);
        setIsSectionsReady(true);
      });
      return;
    }

    const activeSections = rawSectionsData
      .filter((section: any) => section.is_active && section.productDetails && section.productDetails.length > 0);

    const sectionsWithConvertedProducts = activeSections.map((section: any) => {
      const convertedProducts = section.productDetails.map((product: any) => {
        const dbProduct = websiteProducts.find(wp => wp.id === product.id);
        const base = dbProduct || {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.finalPrice || product.price,
          originalPrice: product.hasDiscount ? product.price : undefined,
          image: product.main_image_url,
          images: [product.main_image_url, product.sub_image_url].filter(Boolean),
          category: 'عام',
          colors: [],
          shapes: [],
          sizes: [],
          brand: companyName,
          stock: 0,
          rating: product.rating || 0,
          reviews: product.rating_count || 0,
          isOnSale: product.hasDiscount || false,
          discount: product.discount_percentage ? Math.round(product.discount_percentage) : undefined,
          tags: [],
          isFeatured: false
        };
        return {
          ...base,
          image: product.customImage || base.image,
          customImage: product.customImage || null,
          clones: product.clones || [],
        };
      });

      return {
        ...section,
        products: convertedProducts
      };
    });

    requestAnimationFrame(() => {
      setSectionsWithProducts(sectionsWithConvertedProducts);
      setIsSectionsReady(true);
    });
  }, [rawSectionsData, websiteProducts]);

  // Convert store categories to website format
  useEffect(() => {
    const convertedCategories: any[] = [];

    if (favorites.length > 0) {
      const firstFavoriteProduct = websiteProducts.find(p => favorites.includes(String(p.id)));
      const favoriteCategoryImage = firstFavoriteProduct?.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop';

      convertedCategories.push({
        id: 'favorites',
        name: 'المفضلة',
        description: 'المنتجات المفضلة لديك',
        icon: '❤️',
        image: favoriteCategoryImage,
        productCount: favorites.length
      });
    }

    if (categoriesWithProducts && categoriesWithProducts.length > 0) {
      const storeCategories = categoriesWithProducts.map((storeCategory: any) => ({
        id: storeCategory.id,
        name: storeCategory.name,
        description: storeCategory.description || storeCategory.name,
        icon: '📦',
        image: storeCategory.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
        productCount: storeCategory.products?.length || 0
      }));

      convertedCategories.push(...storeCategories);
    }

    setCategories(convertedCategories);
  }, [categoriesWithProducts, favorites, websiteProducts]);

  // Set client-side flag after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Background preload all product images
  useEffect(() => {
    if (websiteProducts.length === 0) return;
    const allImageSrcs = websiteProducts.map(p => p.image);
    const cardUrls = getTransformedUrls(allImageSrcs, 'card_mobile');
    const thumbUrls = getTransformedUrls(allImageSrcs, 'search_thumb');
    preloadImagesInBackground([...cardUrls, ...thumbUrls]);
  }, [websiteProducts]);

  // Set CSS variables for colors
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--primary-hover-color', primaryHoverColor);
      document.documentElement.style.setProperty('--interactive-color', interactiveColor);
    }
  }, [primaryColor, primaryHoverColor, interactiveColor]);

  // Handle bottom tab changes
  const handleTabChange = (tab: 'home' | 'categories' | 'search' | 'cart' | 'account') => {
    setActiveTab(tab);

    if (tab === 'categories') {
      setIsCategoryPanelOpen(true);
      setIsSearchOverlayOpen(false);
      setIsAccountPanelOpen(false);
    } else if (tab === 'search') {
      setIsSearchOverlayOpen(true);
      setIsCategoryPanelOpen(false);
      setIsAccountPanelOpen(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (tab === 'cart') {
      setIsCartModalOpen(true);
      setIsCategoryPanelOpen(false);
      setIsSearchOverlayOpen(false);
      setIsAccountPanelOpen(false);
    } else if (tab === 'account') {
      setIsAccountPanelOpen(true);
      setIsCategoryPanelOpen(false);
      setIsSearchOverlayOpen(false);
    } else {
      setIsCategoryPanelOpen(false);
      setIsSearchOverlayOpen(false);
      setIsAccountPanelOpen(false);
    }
  };

  // Close overlays
  const closeCategoryPanel = () => {
    setIsCategoryPanelOpen(false);
    setActiveTab('home');
  };

  const closeSearchOverlay = () => {
    setIsSearchOverlayOpen(false);
    setSearchQuery('');
    setActiveTab('home');
  };

  const closeAccountPanel = () => {
    setIsAccountPanelOpen(false);
    setActiveTab('home');
  };

  // Back button handler - manages browser back button behavior
  const modalsConfig = useMemo(() => [
    {
      id: 'product-details',
      isOpen: isProductModalOpen,
      onClose: () => {
        setIsProductModalOpen(false);
        setSelectedProductId('');
      }
    },
    {
      id: 'cart',
      isOpen: isCartModalOpen,
      onClose: () => setIsCartModalOpen(false)
    },
    {
      id: 'quantity',
      isOpen: isQuantityModalOpen,
      onClose: () => {
        setIsQuantityModalOpen(false);
        setSelectedProduct(null);
        setQuantityValue(1);
      }
    },
    {
      id: 'category-panel',
      isOpen: isCategoryPanelOpen,
      onClose: closeCategoryPanel
    },
    {
      id: 'search-overlay',
      isOpen: isSearchOverlayOpen,
      onClose: closeSearchOverlay
    },
    {
      id: 'account-panel',
      isOpen: isAccountPanelOpen,
      onClose: closeAccountPanel
    }
  ], [isProductModalOpen, isCartModalOpen, isQuantityModalOpen, isCategoryPanelOpen, isSearchOverlayOpen, isAccountPanelOpen]);

  useStoreBackHandler(modalsConfig);

  const filteredProducts = React.useMemo(() => {
    let productsToFilter = websiteProducts;

    if (selectedCategory === 'المفضلة') {
      productsToFilter = websiteProducts.filter(product =>
        favorites.includes(String(product.id))
      );
    } else if (selectedCategory !== 'الكل' && categoriesWithProducts.length > 0) {
      const selectedStoreCategory = categoriesWithProducts.find((cat: any) => cat.name === selectedCategory);
      if (selectedStoreCategory && selectedStoreCategory.products) {
        productsToFilter = selectedStoreCategory.products.map((product: any) => {
          const dbProduct = websiteProducts.find(wp => wp.id === product.id);
          return dbProduct || {
            id: product.id,
            name: product.name,
            description: '',
            price: product.price,
            image: product.main_image_url,
            category: selectedCategory,
            colors: [],
            brand: companyName,
            stock: 0,
            rating: 0,
            reviews: 0,
            isOnSale: false,
            tags: [],
            isFeatured: false
          };
        });
      } else {
        productsToFilter = [];
      }
    }

    return productsToFilter.filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [websiteProducts, selectedCategory, searchQuery, categoriesWithProducts, favorites]);

  const featuredProducts = websiteProducts.filter(product => product.isFeatured || product.isOnSale);

  const visibleProducts = useMemo(() => {
    if (searchQuery || showAllProducts) {
      return filteredProducts;
    }
    return filteredProducts.slice(0, VISIBLE_PRODUCTS_LIMIT);
  }, [filteredProducts, searchQuery, showAllProducts]);

  const hasMoreProducts = !showAllProducts &&
    !searchQuery &&
    filteredProducts.length > VISIBLE_PRODUCTS_LIMIT;

  useEffect(() => {
    setShowAllProducts(false);
  }, [searchQuery, selectedCategory]);

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProductId('');
  };

  // Handle category selection from panel
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    closeCategoryPanel();
  };

  // Show loading state
  if (!isClient || isLoading || isThemeLoading || isCompanyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary-color)', borderTopColor: 'transparent' }}></div>
          </div>
          <p className="text-gray-500 text-sm font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900" dir="rtl">
      {/* ===== MODERN COMPACT HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Right: Logo + Name */}
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 ${logoRoundingClass} overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0`}>
              <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
            </div>
            <span className="text-base font-bold text-gray-900 truncate max-w-[140px]">{companyName}</span>
          </div>

          {/* Left: Search (expand) + Cart */}
          <div className="flex items-center gap-1">
            {/* Search Icon */}
            <button
              onClick={() => handleTabChange('search')}
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Cart Icon */}
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartBadgeCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1" style={{ backgroundColor: 'var(--primary-color)' }}>
                  {cartBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="pt-14 pb-20 bg-[#fafafa]">

        {/* Category pills - horizontal scroll (when on home) */}
        {!searchQuery && categories && categories.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-3 py-2.5">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('الكل')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === 'الكل'
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedCategory === 'الكل' ? { backgroundColor: 'var(--primary-color)' } : {}}
              >
                الكل
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory === category.name ? 'الكل' : category.name)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    selectedCategory === category.name
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={selectedCategory === category.name ? { backgroundColor: 'var(--primary-color)' } : {}}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Sections - before products */}
        {isSectionsReady && selectedCategory === 'الكل' && !searchQuery && sectionsWithProducts.length > 0 && (
          <div className="px-3 pt-4">
            {sectionsWithProducts.map((section: any, sectionIndex: number) => {
              const expandedProduct = expandedCloneProductId
                ? section.products?.find((p: any) => String(p.id) === expandedCloneProductId)
                : null;
              return (
                section.products && section.products.length > 0 && (
                  <section key={section.id} className={`mb-5 ${sectionIndex % 2 === 1 ? 'bg-white -mx-3 px-3 py-4 border-y border-gray-100' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{section.name}</h3>
                      <div className="h-px flex-1 mr-3 bg-gray-200"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {section.products.map((product: any) => {
                        const hasClones = product.clones && product.clones.length > 0;
                        return (
                          <InteractiveProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={hasClones ? async (p: Product) => {
                              setExpandedCloneProductId(prev =>
                                prev === String(p.id) ? null : String(p.id)
                              );
                            } : handleAddToCart}
                            deviceType="mobile"
                            onProductClick={hasClones ? () => {
                              setExpandedCloneProductId(prev =>
                                prev === String(product.id) ? null : String(product.id)
                              );
                            } : handleProductClick}
                            displaySettings={displaySettings}
                            {...(hasClones ? {
                              addToCartLabel: 'اختر الشكل',
                              imageBadge: `${product.clones.length} شكل`
                            } : {})}
                          />
                        );
                      })}
                    </div>

                    {/* Clone Accordion Panel */}
                    {expandedProduct && expandedProduct.clones && expandedProduct.clones.length > 0 && (
                      <div
                        ref={cloneAccordionRef}
                        className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
                        style={{ animation: 'slideDown 0.3s ease-out' }}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ backgroundColor: 'var(--primary-color)' }}>
                          <h4 className="text-sm font-bold text-white">
                            اختار الشكل - {expandedProduct.name}
                          </h4>
                          <button
                            onClick={() => setExpandedCloneProductId(null)}
                            className="text-white/80 hover:text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="p-3">
                          <div className="grid grid-cols-2 gap-2.5">
                            {expandedProduct.clones.map((clone: any) => (
                              <div
                                key={clone.id}
                                className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                              >
                                <img
                                  src={clone.image || '/placeholder-product.svg'}
                                  alt={clone.label || expandedProduct.name}
                                  className="w-full h-40 object-cover"
                                  onError={(e: any) => {
                                    if (e.target.src !== '/placeholder-product.svg') {
                                      e.target.src = '/placeholder-product.svg';
                                    }
                                  }}
                                />
                                <div className="p-2">
                                  {clone.label && (
                                    <p className="text-xs font-medium text-gray-700 truncate mb-2 text-center">{clone.label}</p>
                                  )}
                                  <button
                                    onClick={() => {
                                      const productToAdd = {
                                        ...expandedProduct,
                                        price: profile?.role === 'جملة' && expandedProduct.wholesale_price ? expandedProduct.wholesale_price : expandedProduct.price,
                                        customImage: clone.image,
                                      };
                                      handleAddToCart(productToAdd);
                                    }}
                                    className="w-full px-2 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                  >
                                    أضف للسلة
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )
              );
            })}
          </div>
        )}

        {/* Products Section */}
        <section className="px-3 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedCategory === 'الكل' ? 'جميع المنتجات' : selectedCategory}
            </h3>
            <span className="text-xs text-gray-400 font-medium">
              {filteredProducts.length} منتج
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {visibleProducts.map((product) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                deviceType="mobile"
                onProductClick={handleProductClick}
                displaySettings={displaySettings}
              />
            ))}

            {hasMoreProducts && (
              <div className="col-span-full flex justify-center py-5">
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="px-8 py-3 rounded-full text-white font-medium text-sm shadow-lg transition-all active:scale-95 hover:shadow-xl"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  عرض المزيد ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} منتج)
                </button>
              </div>
            )}
          </div>

          {visibleProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">لا توجد منتجات</p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white px-4 py-8 mt-4">
          <div className="space-y-6">
            {/* Company Info */}
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 ${logoRoundingClass} overflow-hidden flex-shrink-0`}>
                <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
              </div>
              <div>
                <h5 className="font-bold text-sm">{companyName}</h5>
                <p className="text-gray-400 text-xs">متجرك المتكامل لأفضل المنتجات</p>
              </div>
            </div>

            <div className="h-px bg-gray-800"></div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Social */}
              <div>
                <h6 className="font-semibold text-xs text-gray-300 mb-2">تابعنا</h6>
                <ul className="space-y-1.5">
                  {socialMedia && socialMedia.length > 0 && socialMedia.some(sm => sm.platform && sm.link) ? (
                    socialMedia
                      .filter(sm => sm.platform && sm.link)
                      .map((sm, index) => (
                        <li key={index}>
                          <a href={sm.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 text-xs hover:text-white transition-colors">
                            {sm.platform}
                          </a>
                        </li>
                      ))
                  ) : (
                    <li className="text-gray-500 text-xs">لا توجد روابط</li>
                  )}
                </ul>
              </div>

              {/* Customer Service */}
              <div>
                <h6 className="font-semibold text-xs text-gray-300 mb-2">خدمة العملاء</h6>
                <ul className="space-y-1.5">
                  <li><a href="#" className="text-gray-400 text-xs hover:text-white transition-colors">المساعدة</a></li>
                  <li><a href="#" className="text-gray-400 text-xs hover:text-white transition-colors">سياسة الإرجاع</a></li>
                  <li><a href="#" className="text-gray-400 text-xs hover:text-white transition-colors">الشحن والتوصيل</a></li>
                </ul>
              </div>
            </div>

            <div className="h-px bg-gray-800"></div>

            <p className="text-center text-gray-500 text-[10px]">
              {companyName} &copy; {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </main>

      {/* ===== BOTTOM NAVIGATION BAR ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {/* Home Tab */}
          <button
            onClick={() => handleTabChange('home')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          >
            <svg className="w-5 h-5" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'home' ? 'var(--primary-color)' : '#9CA3AF' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'home' ? 'var(--primary-color)' : '#9CA3AF' }}>
              الرئيسية
            </span>
          </button>

          {/* Categories Tab */}
          <button
            onClick={() => handleTabChange('categories')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          >
            <svg className="w-5 h-5" fill={activeTab === 'categories' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'categories' ? 'var(--primary-color)' : '#9CA3AF' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'categories' ? 0 : 1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'categories' ? 'var(--primary-color)' : '#9CA3AF' }}>
              الفئات
            </span>
          </button>

          {/* Search Tab */}
          <button
            onClick={() => handleTabChange('search')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'search' ? 'var(--primary-color)' : '#9CA3AF' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'search' ? 2.5 : 1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'search' ? 'var(--primary-color)' : '#9CA3AF' }}>
              البحث
            </span>
          </button>

          {/* Cart Tab */}
          <button
            onClick={() => handleTabChange('cart')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill={activeTab === 'cart' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: activeTab === 'cart' ? 'var(--primary-color)' : '#9CA3AF' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'cart' ? 0 : 1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartBadgeCount > 0 && (
                <span className="absolute -top-1.5 -left-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-0.5" style={{ backgroundColor: 'var(--primary-color)' }}>
                  {cartBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'cart' ? 'var(--primary-color)' : '#9CA3AF' }}>
              السلة
            </span>
          </button>

          {/* Account Tab */}
          <button
            onClick={() => handleTabChange('account')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          >
            <svg className="w-5 h-5" fill={activeTab === 'account' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'account' ? 'var(--primary-color)' : '#9CA3AF' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'account' ? 0 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'account' ? 'var(--primary-color)' : '#9CA3AF' }}>
              حسابي
            </span>
          </button>
        </div>
      </nav>

      {/* ===== CATEGORY PANEL (slide-up) ===== */}
      {isCategoryPanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55] transition-opacity" onClick={closeCategoryPanel} />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-white rounded-t-2xl shadow-2xl max-h-[75vh] overflow-hidden" style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">الفئات</h3>
              <button onClick={closeCategoryPanel} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Panel drag indicator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300"></div>

            {/* Category Grid */}
            <div className="p-4 overflow-y-auto max-h-[calc(75vh-56px)] scrollbar-hide">
              {isCategoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-transparent animate-spin" style={{ borderTopColor: 'var(--primary-color)' }}></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* All Products Card */}
                  <button
                    onClick={() => handleCategorySelect('الكل')}
                    className={`relative rounded-xl overflow-hidden text-right transition-all h-28 ${
                      selectedCategory === 'الكل' ? 'ring-2 shadow-lg' : 'border border-gray-100'
                    }`}
                    style={selectedCategory === 'الكل' ? { ringColor: 'var(--primary-color)' } : {}}
                  >
                    <div className="absolute inset-0 bg-gradient-to-bl from-gray-800 to-gray-600"></div>
                    <div className="relative h-full flex flex-col justify-end p-3">
                      <h4 className="text-white font-bold text-sm">جميع المنتجات</h4>
                      <p className="text-white/70 text-[10px]">{websiteProducts.length} منتج</p>
                    </div>
                  </button>

                  {/* Category Cards */}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.name)}
                      className={`relative rounded-xl overflow-hidden text-right transition-all h-28 ${
                        selectedCategory === category.name ? 'ring-2 shadow-lg' : 'border border-gray-100'
                      }`}
                      style={selectedCategory === category.name ? { ringColor: 'var(--primary-color)' } : {}}
                    >
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0" style={{ backgroundColor: 'var(--primary-color)', opacity: 0.8 }}></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col justify-end p-3">
                        <h4 className="text-white font-bold text-sm">{category.name}</h4>
                        {category.productCount > 0 && (
                          <p className="text-white/70 text-[10px]">{category.productCount} منتج</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== SEARCH OVERLAY (full-screen) ===== */}
      {isSearchOverlayOpen && (
        <div className="fixed inset-0 z-[55] bg-white" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          {/* Search Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <button onClick={closeSearchOverlay} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 rounded-full px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                style={{ fontFamily: 'Cairo, sans-serif', focusRingColor: 'var(--primary-color)' } as any}
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search Results */}
          <div className="overflow-y-auto h-[calc(100vh-60px)] p-3 scrollbar-hide">
            {searchQuery === '' ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">ابحث عن المنتجات</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">لا توجد نتائج لـ &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">{filteredProducts.length} نتيجة</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredProducts.map((product) => (
                    <InteractiveProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      deviceType="mobile"
                      onProductClick={(productId) => {
                        closeSearchOverlay();
                        handleProductClick(productId);
                      }}
                      displaySettings={displaySettings}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== ACCOUNT PANEL (slide-up) ===== */}
      {isAccountPanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55] transition-opacity" onClick={closeAccountPanel} />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden" style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {/* Panel drag indicator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 mt-1">
              <h3 className="text-base font-bold text-gray-900">حسابي</h3>
              <button onClick={closeAccountPanel} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Account Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-56px)] scrollbar-hide">
              {/* Auth Section */}
              {(!isAuthenticated && !profile) ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">سجل دخولك للوصول لحسابك</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.href = '/auth/login'}
                      className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition-all active:scale-95"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      onClick={() => window.location.href = '/auth/signup'}
                      className="flex-1 py-2.5 rounded-xl font-medium text-sm border-2 transition-all active:scale-95"
                      style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                    >
                      حساب جديد
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
                      {profile?.name?.charAt(0) || userInfo.name?.charAt(0) || '؟'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{profile?.name || userInfo.name || 'مستخدم'}</h4>
                      <p className="text-gray-400 text-xs">{profile?.email || userInfo.email || ''}</p>
                    </div>
                  </div>

                  {/* Admin Menu Items */}
                  {isAdminOrStaff && (
                    <div className="space-y-1 mb-4">
                      <button onClick={() => { window.location.href = '/customer-orders'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-50">
                          <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">طلبات العملاء</span>
                      </button>
                      <button onClick={() => { window.location.href = '/admin/products'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-50">
                          <svg className="w-4.5 h-4.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">إدارة المتجر</span>
                      </button>
                      <button onClick={() => { window.location.href = '/pos'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-green-50">
                          <svg className="w-4.5 h-4.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">نظام نقاط البيع</span>
                      </button>
                      <button onClick={() => { window.location.href = '/shipping'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-orange-50">
                          <svg className="w-4.5 h-4.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">تفاصيل الشحن</span>
                      </button>
                    </div>
                  )}

                  {/* Regular User Menu Items */}
                  {!isAdminOrStaff && (
                    <div className="space-y-1 mb-4">
                      <button onClick={() => { window.location.href = '/profile'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-50">
                          <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">الملف الشخصي</span>
                      </button>
                      <button onClick={() => { window.location.href = '/favorites'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50">
                          <svg className="w-4.5 h-4.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">المفضلة</span>
                      </button>
                      <button onClick={() => { window.location.href = '/my-orders'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-yellow-50">
                          <svg className="w-4.5 h-4.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">طلباتي</span>
                      </button>
                      <button onClick={() => { window.location.href = '/my-invoices'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-teal-50">
                          <svg className="w-4.5 h-4.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">فواتيري</span>
                      </button>
                    </div>
                  )}

                  {/* Common Menu Items */}
                  <div className="space-y-1 pt-3 border-t border-gray-100">
                    <button onClick={() => { window.location.href = '/social-media'; closeAccountPanel(); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-pink-50">
                        <svg className="w-4.5 h-4.5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">تابعنا</span>
                    </button>
                    <button onClick={() => { window.location.href = '/catalog'; closeAccountPanel(); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-right">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50">
                        <svg className="w-4.5 h-4.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">كتالوج</span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <AuthButtons compact mobileIconOnly={false} />
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== QUANTITY MODAL (inline bottom sheet) ===== */}
      {isQuantityModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center" onClick={() => { setIsQuantityModalOpen(false); setSelectedProduct(null); setQuantityValue(1); }}>
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
            {/* Drag indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300"></div>

            <h3 className="text-lg font-bold text-center text-gray-900 mb-1 mt-2">{selectedProduct.name}</h3>
            <p className="text-center text-gray-400 text-xs mb-5">تحديد الكمية</p>

            <div className="flex items-center justify-center gap-5 mb-6">
              <button
                onClick={() => setQuantityValue(Math.max(1, quantityValue - 1))}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${
                  quantityValue <= 1 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-700 active:scale-95'
                }`}
              >
                -
              </button>
              <span className="text-3xl font-bold w-14 text-center text-gray-900">{quantityValue}</span>
              <button
                onClick={() => setQuantityValue(quantityValue + 1)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white active:scale-95 transition-all"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                +
              </button>
            </div>

            <button
              onClick={() => {
                handleQuantityConfirm(quantityValue);
                setIsQuantityModalOpen(false);
                setSelectedProduct(null);
                setQuantityValue(1);
              }}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all active:scale-[0.98]"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              أضف للسلة
            </button>
          </div>
        </div>
      )}

      {/* ===== PRODUCT DETAILS MODAL ===== */}
      <ProductDetailsModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        productId={selectedProductId}
      />

      {/* ===== CART MODAL ===== */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
      />

      {/* ===== WHATSAPP FLOATING BUTTON ===== */}
      {!profileLoading && !isAdminOrStaff && whatsappNumber && (
        <div className="[&>div]:bottom-24 [&>div]:left-4">
          <WhatsAppFloatingButton whatsappNumber={whatsappNumber} />
        </div>
      )}

      {/* ===== ANIMATIONS ===== */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: 1000px;
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
