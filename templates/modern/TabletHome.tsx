'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, Product as DatabaseProduct } from '@/app/lib/hooks/useProducts';
import { UserInfo, Product } from '@/components/website/shared/types';
import AuthButtons from '@/app/components/auth/AuthButtons';
import RightSidebar from '@/app/components/layout/RightSidebar';
import { useRightSidebar } from '@/app/lib/hooks/useRightSidebar';
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

interface TabletHomeProps {
  userInfo: UserInfo;
  onCartUpdate: (cart: any[]) => void;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}

export default function TabletHome({
  userInfo,
  onCartUpdate,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart
}: TabletHomeProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('\u0627\u0644\u0643\u0644');
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Performance: Limit visible products for better rendering
  const VISIBLE_PRODUCTS_LIMIT = 20;
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Use right sidebar hook for the website menu
  const { isRightSidebarOpen, toggleRightSidebar, closeRightSidebar } = useRightSidebar();

  // Get user profile to check admin status
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();

  // Check if user is admin or staff
  const isAdminOrStaff = profile?.role === '\u0623\u062f\u0645\u0646 \u0631\u0626\u064a\u0633\u064a' || profile?.role === '\u0645\u0648\u0638\u0641';

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

  // Scroll to clone accordion when expanded
  useEffect(() => {
    if (expandedCloneProductId && cloneAccordionRef.current) {
      setTimeout(() => {
        cloneAccordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expandedCloneProductId]);

  // Add state for success message
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successProductName, setSuccessProductName] = useState('');

  // Handle adding products to cart - now opens quantity modal
  const handleAddToCart = async (product: Product) => {
    setSelectedProduct(product);
    setIsQuantityModalOpen(true);
  };

  // Handle quantity confirmation
  const handleQuantityConfirm = async (quantity: number) => {
    if (!selectedProduct) return;

    try {
      const selectedColorName = selectedProduct.selectedColor?.name || undefined;
      const selectedShapeName = selectedProduct.selectedShape?.name || undefined;
      const productNote = selectedProduct.note || undefined;
      const customImageUrl = selectedProduct.customImage || undefined;
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price, selectedColorName, selectedShapeName, undefined, productNote, customImageUrl);

      // Show success message
      setSuccessProductName(selectedProduct.name);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error adding product to cart:', error);
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
          const { supabase } = await import('../../app/lib/supabase/client');
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
              // Use the first item as the representative for the group
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
              // Hide all products except the first one (representative)
              group.product_size_group_items.slice(1).forEach((item: any) => {
                hiddenProductIds.add(item.product_id);
              });
            }
          });

          const convertedProducts: Product[] = databaseProducts
            .filter((dbProduct: DatabaseProduct) => {
              // Always hide hidden products and duplicate products in size groups
              if (dbProduct.is_hidden || hiddenProductIds.has(dbProduct.id)) {
                return false;
              }

              // Apply display mode filter
              if (displaySettings.display_mode === 'show_with_stock') {
                // Only show products with stock > 0
                const totalStock = (dbProduct as any).totalQuantity ?? dbProduct.stock ?? 0;
                return totalStock > 0;
              } else if (displaySettings.display_mode === 'show_with_stock_and_vote') {
                // Show all products (voting feature to be implemented later)
                return true;
              }

              // Default: show all products
              return true;
            })
            .map((dbProduct: DatabaseProduct) => {
              // Calculate if product has discount
              const hasDiscount = dbProduct.discount_percentage && dbProduct.discount_percentage > 0;
              const finalPrice = hasDiscount
                ? Number(dbProduct.price) * (1 - Number(dbProduct.discount_percentage) / 100)
                : Number(dbProduct.price);

              // Get colors for this product
              const productColors = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'color') || [];
              const colors = productColors.map((variant: any) => ({
                id: variant.id,
                name: variant.color_name || variant.name || '\u0644\u0648\u0646 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
                hex: variant.color_hex || '#000000',
                image_url: variant.image_url || null
              }));

              // Get shapes for this product
              const productShapes = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'shape') || [];
              const shapes = productShapes.map((variant: any) => ({
                id: variant.id,
                name: variant.name || '\u0634\u0643\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
                image_url: variant.image_url || null
              }));

              // Get sizes for this product (if it's part of a size group)
              const sizeGroupInfo = productsInSizeGroups.get(dbProduct.id);
              const sizes = sizeGroupInfo ? sizeGroupInfo.sizes : [];

              // Use allImages from useProducts hook which includes variant images
              const productImages = dbProduct.allImages || [];

              return {
                id: dbProduct.id,
                name: dbProduct.name || '\u0645\u0646\u062a\u062c \u0628\u062f\u0648\u0646 \u0627\u0633\u0645',
                description: dbProduct.description || '',
                price: finalPrice,
                wholesale_price: Number(dbProduct.wholesale_price) || undefined,
                originalPrice: hasDiscount ? Number(dbProduct.price) : undefined,
                image: dbProduct.main_image_url || undefined,
                images: productImages,
                colors: colors,
                shapes: shapes,
                sizes: sizes,
                category: dbProduct.category?.name || '\u0639\u0627\u0645',
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
        } else {
          setWebsiteProducts([]);
        }
      } catch (error) {
        console.error('Error converting database products:', error);
        setWebsiteProducts([]);
      }
    };

    fetchProductsWithColors();
  }, [databaseProducts, displaySettings]);

  // Convert store categories to website format
  useEffect(() => {
    const convertedCategories: any[] = [];

    // Add favorites category as first category (only if there are favorites)
    if (favorites.length > 0) {
      const firstFavoriteProduct = websiteProducts.find(p => favorites.includes(String(p.id)));
      const favoriteCategoryImage = firstFavoriteProduct?.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop';

      convertedCategories.push({
        id: 'favorites',
        name: '\u0627\u0644\u0645\u0641\u0636\u0644\u0629',
        description: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0644\u062f\u064a\u0643',
        icon: '\u2764\ufe0f',
        image: favoriteCategoryImage,
        productCount: favorites.length
      });
    }

    // Add store categories
    if (categoriesWithProducts && categoriesWithProducts.length > 0) {
      const storeCategories = categoriesWithProducts.map((storeCategory: any) => ({
        id: storeCategory.id,
        name: storeCategory.name,
        description: storeCategory.description || storeCategory.name,
        icon: '\ud83d\udce6',
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

  // Background preload all product images (card + search thumbnails)
  useEffect(() => {
    if (websiteProducts.length === 0) return;
    const allImageSrcs = websiteProducts.map(p => p.image);
    const cardUrls = getTransformedUrls(allImageSrcs, 'card_tablet');
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
      // Show sections with raw product data if website products aren't ready yet
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
            category: '\u0639\u0627\u0645',
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

    // Full conversion with website products
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
          category: '\u0639\u0627\u0645',
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

  // Handle scroll for compact header
  useEffect(() => {
    if (!isClient) return;

    const handleScroll = () => {
      setIsCompactHeaderVisible(window.scrollY > 110);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  const filteredProducts = useMemo(() => {
    let productsToFilter = websiteProducts;

    // Handle favorites category
    if (selectedCategory === '\u0627\u0644\u0645\u0641\u0636\u0644\u0629') {
      productsToFilter = websiteProducts.filter(product =>
        favorites.includes(String(product.id))
      );
    }
    // If a specific store category is selected, get products from that category
    else if (selectedCategory !== '\u0627\u0644\u0643\u0644' && categoriesWithProducts.length > 0) {
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

    // Apply search filter
    return productsToFilter.filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [websiteProducts, selectedCategory, searchQuery, categoriesWithProducts, favorites]);

  const featuredProducts = websiteProducts.filter(product => product.isFeatured || product.isOnSale);

  // Performance: Limit visible products for better rendering on client devices
  const visibleProducts = useMemo(() => {
    if (searchQuery || showAllProducts) {
      return filteredProducts;
    }
    return filteredProducts.slice(0, VISIBLE_PRODUCTS_LIMIT);
  }, [filteredProducts, searchQuery, showAllProducts]);

  const hasMoreProducts = !showAllProducts &&
    !searchQuery &&
    filteredProducts.length > VISIBLE_PRODUCTS_LIMIT;

  // Reset showAllProducts when search or category changes
  useEffect(() => {
    setShowAllProducts(false);
  }, [searchQuery, selectedCategory]);

  // Handle product click to show modal instead of navigation
  const handleProductClick = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  }, []);

  const handleCloseProductModal = useCallback(() => {
    setIsProductModalOpen(false);
    setSelectedProductId('');
  }, []);

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
      }
    },
    {
      id: 'sidebar',
      isOpen: isRightSidebarOpen,
      onClose: closeRightSidebar
    }
  ], [isProductModalOpen, isCartModalOpen, isQuantityModalOpen, isRightSidebarOpen, closeRightSidebar]);

  // Initialize back button handler for store
  useStoreBackHandler(modalsConfig);

  // Show loading state during hydration or while loading data
  if (!isClient || isLoading || isThemeLoading || isCompanyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary-color, #3B82F6)' }}></div>
          <p className="text-gray-500 text-sm font-medium">{'\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062a\u062c\u0631...'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Right Sidebar for Website Menu */}
      <RightSidebar
        isOpen={isRightSidebarOpen}
        onClose={closeRightSidebar}
        onCategorySelect={(categoryName) => setSelectedCategory(categoryName)}
      />

      <div dir="rtl" className="min-h-screen bg-[#fafafa] text-gray-800">
        {/* Global Styles */}
        <style jsx global>{`
          body {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          html {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .system-header:not([class*="auth"]):not([id*="auth"]):not([data-auth]),
          [class*="system"]:not([class*="auth"]):not([id*="auth"]):not([data-auth]),
          [class*="navigation"]:not([class*="auth"]):not([id*="auth"]):not([data-auth]),
          [style*="background: #374151"]:not([class*="auth"]):not([id*="auth"]):not([data-auth]),
          [style*="background-color: #374151"]:not([class*="auth"]):not([id*="auth"]):not([data-auth]) {
            display: none !important;
          }
          iframe[src*="google"],
          iframe[src*="auth"],
          iframe[id*="auth"],
          [class*="auth"],
          [id*="auth"],
          [data-auth] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          @keyframes slideDown {
            from { opacity: 0; max-height: 0; }
            to { opacity: 1; max-height: 1000px; }
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* ============================================ */}
        {/* Compact Sticky Header (appears on scroll)   */}
        {/* ============================================ */}
        {isCompactHeaderVisible && (
          <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300">
            <div className="flex items-center justify-between px-4 h-[56px]">
              {/* Logo + Name */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`h-9 w-9 ${logoRoundingClass} overflow-hidden flex items-center justify-center`}>
                  <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-bold text-gray-800 hidden sm:inline">{companyName}</span>
              </div>

              {/* Compact Search */}
              <div className="flex-1 max-w-md mx-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={'\u0627\u0628\u062d\u062b...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 pr-9 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': 'var(--primary-color)' } as React.CSSProperties}
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Right: Cart + Auth + Menu */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsCartModalOpen(true)}
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {cartBadgeCount > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--primary-color)' }}>
                      {cartBadgeCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center">
                  <AuthButtons imageOnly compact />
                </div>
                <button
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  onClick={toggleRightSidebar}
                  title={'\u0627\u0644\u0642\u0627\u0626\u0645\u0629'}
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* ============================================ */}
        {/* Main Header (2-row, white, modern)          */}
        {/* ============================================ */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          {/* Top utility bar */}
          <div className="border-b border-gray-100">
            <div className="max-w-[96%] mx-auto px-3 flex items-center justify-between h-[44px]">
              {/* Left: welcome text */}
              <span className="text-xs text-gray-500">
                {'\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643 \u0641\u064a'} {companyName}
              </span>

              {/* Right: Auth + Cart */}
              <div className="flex items-center gap-3">
                <AuthButtons compact />
                <button
                  onClick={() => setIsCartModalOpen(true)}
                  className="relative p-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {cartBadgeCount > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--primary-color)' }}>
                      {cartBadgeCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Main header row: Logo + Search + Menu */}
          <div className="max-w-[96%] mx-auto px-3 flex items-center justify-between h-[60px]">
            {/* Logo + Brand */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={`h-11 w-11 ${logoRoundingClass} overflow-hidden flex items-center justify-center bg-gray-50`}>
                <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
              </div>
              <h1 className="text-lg font-bold text-gray-800">{companyName}</h1>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={'\u0627\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 pr-11 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white focus:border-transparent transition-all duration-200"
                  style={{ '--tw-ring-color': 'var(--primary-color)' } as React.CSSProperties}
                />
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Menu Button */}
            <button
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              onClick={toggleRightSidebar}
              title={'\u0627\u0644\u0642\u0627\u0626\u0645\u0629'}
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* ============================================ */}
        {/* Category Pills (horizontal scroll)          */}
        {/* ============================================ */}
        {!searchQuery && categories && categories.length > 0 && (
          <div className="bg-white border-b border-gray-100 sticky top-[104px] z-30">
            <div className="max-w-[96%] mx-auto px-3 py-2.5">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {/* "All" pill */}
                <button
                  onClick={() => setSelectedCategory('\u0627\u0644\u0643\u0644')}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                    selectedCategory === '\u0627\u0644\u0643\u0644'
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  style={selectedCategory === '\u0627\u0644\u0643\u0644' ? { backgroundColor: 'var(--primary-color)' } : {}}
                >
                  {'\u0627\u0644\u0643\u0644'}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(selectedCategory === category.name ? '\u0627\u0644\u0643\u0644' : category.name)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                      selectedCategory === category.name
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    style={selectedCategory === category.name ? { backgroundColor: 'var(--primary-color)' } : {}}
                  >
                    {category.name}
                    {category.productCount > 0 && (
                      <span className={`mr-1.5 text-xs ${selectedCategory === category.name ? 'text-white/70' : 'text-gray-400'}`}>
                        ({category.productCount})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* Main Content                                */}
        {/* ============================================ */}
        <main className="max-w-[96%] mx-auto px-3 py-6">

          {/* Custom Sections - Only show when ready, no specific category is selected and no search query */}
          {isSectionsReady && selectedCategory === '\u0627\u0644\u0643\u0644' && !searchQuery && sectionsWithProducts.length > 0 && (
            <>
              {sectionsWithProducts.map((section: any, sectionIdx: number) => {
                const expandedProduct = expandedCloneProductId
                  ? section.products?.find((p: any) => String(p.id) === expandedCloneProductId)
                  : null;
                return (
                  section.products && section.products.length > 0 && (
                    <section key={section.id} className={`mb-8 ${sectionIdx % 2 === 1 ? 'bg-white -mx-3 px-3 py-6 rounded-none' : ''}`}>
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xl font-bold text-gray-800">{section.name}</h3>
                        <div className="h-px flex-1 bg-gray-200 mr-4"></div>
                      </div>

                      {/* Section Products - 3 column grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {section.products.map((product: any) => {
                          const hasClones = product.clones && product.clones.length > 0;
                          return (
                            <div key={product.id}>
                              <InteractiveProductCard
                                product={product}
                                onAddToCart={hasClones ? async (p: Product) => {
                                  setExpandedCloneProductId(prev =>
                                    prev === String(p.id) ? null : String(p.id)
                                  );
                                } : handleAddToCart}
                                deviceType="tablet"
                                onProductClick={hasClones ? () => {
                                  setExpandedCloneProductId(prev =>
                                    prev === String(product.id) ? null : String(product.id)
                                  );
                                } : handleProductClick}
                                displaySettings={displaySettings}
                                {...(hasClones ? {
                                  addToCartLabel: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0634\u0643\u0644',
                                  imageBadge: `${product.clones.length} \u0634\u0643\u0644`
                                } : {})}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Clone Accordion Panel */}
                      {expandedProduct && expandedProduct.clones && expandedProduct.clones.length > 0 && (
                        <div
                          ref={cloneAccordionRef}
                          className="mt-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
                          style={{ animation: 'slideDown 0.3s ease-out' }}
                        >
                          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100" style={{ backgroundColor: 'var(--primary-color)' }}>
                            <h4 className="text-sm font-bold text-white">
                              {'\u0627\u062e\u062a\u0627\u0631 \u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u0630\u064a \u062a\u0631\u064a\u062f\u0647'} - {expandedProduct.name}
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
                          <div className="p-4">
                            <div className="grid grid-cols-3 gap-3">
                              {expandedProduct.clones.map((clone: any) => (
                                <div
                                  key={clone.id}
                                  className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                                >
                                  <img
                                    src={clone.image || '/placeholder-product.svg'}
                                    alt={clone.label || expandedProduct.name}
                                    className="w-full h-44 object-cover"
                                    onError={(e: any) => {
                                      if (e.target.src !== '/placeholder-product.svg') {
                                        e.target.src = '/placeholder-product.svg';
                                      }
                                    }}
                                  />
                                  <div className="p-2.5">
                                    {clone.label && (
                                      <p className="text-xs font-medium text-gray-600 truncate mb-2 text-center">{clone.label}</p>
                                    )}
                                    <button
                                      onClick={() => {
                                        const productToAdd = {
                                          ...expandedProduct,
                                          price: profile?.role === '\u062c\u0645\u0644\u0629' && expandedProduct.wholesale_price ? expandedProduct.wholesale_price : expandedProduct.price,
                                          customImage: clone.image,
                                        };
                                        handleAddToCart(productToAdd);
                                      }}
                                      className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
                                      style={{ backgroundColor: 'var(--primary-color)' }}
                                    >
                                      {'\u0623\u0636\u0641 \u0644\u0644\u0633\u0644\u0629'}
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
            </>
          )}

          {/* ============================================ */}
          {/* Featured Products Banner                    */}
          {/* ============================================ */}
          {!searchQuery && selectedCategory === '\u0627\u0644\u0643\u0644' && featuredProducts.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-800">{'\u0639\u0631\u0648\u0636 \u0645\u0645\u064a\u0632\u0629'}</h3>
                <div className="h-px flex-1 bg-gray-200 mr-4"></div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {featuredProducts.slice(0, 8).map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-56">
                    <InteractiveProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      deviceType="tablet"
                      onProductClick={handleProductClick}
                      displaySettings={displaySettings}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* All Products Grid (3 columns)               */}
          {/* ============================================ */}
          <section id="products" className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">
                {selectedCategory === '\u0627\u0644\u0643\u0644' ? '\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a' : selectedCategory}
              </h3>
              <div className="h-px flex-1 bg-gray-200 mr-4"></div>
              {filteredProducts.length > 0 && (
                <span className="text-sm text-gray-400 flex-shrink-0 mr-3">
                  {filteredProducts.length} {'\u0645\u0646\u062a\u062c'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {visibleProducts.map((product) => (
                <InteractiveProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  deviceType="tablet"
                  onProductClick={handleProductClick}
                  displaySettings={displaySettings}
                />
              ))}
            </div>

            {/* Empty state */}
            {visibleProducts.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-400 text-base">{'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a'}</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-sm underline transition-colors"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    {'\u0645\u0633\u062d \u0627\u0644\u0628\u062d\u062b'}
                  </button>
                )}
              </div>
            )}

            {/* Load more */}
            {hasMoreProducts && (
              <div className="flex justify-center py-8">
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="px-8 py-2.5 rounded-full text-white font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover-color)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-color)')}
                >
                  {'\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064a\u062f'} ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} {'\u0645\u0646\u062a\u062c'})
                </button>
              </div>
            )}
          </section>
        </main>

        {/* ============================================ */}
        {/* Footer (dark, 2-column for tablet)          */}
        {/* ============================================ */}
        <footer className="bg-gray-900 text-gray-300">
          <div className="max-w-[96%] mx-auto px-4 py-10">
            <div className="grid grid-cols-2 gap-8">
              {/* Column 1: Company Info + Contact */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 ${logoRoundingClass} overflow-hidden flex items-center justify-center bg-white/10`}>
                    <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
                  </div>
                  <h5 className="font-bold text-base text-white">{companyName}</h5>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  {'\u0645\u062a\u062c\u0631\u0643 \u0627\u0644\u0645\u062a\u0643\u0627\u0645\u0644 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0628\u0623\u0633\u0639\u0627\u0631 \u0645\u0645\u064a\u0632\u0629 \u0648\u062c\u0648\u062f\u0629 \u0639\u0627\u0644\u064a\u0629'}
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    966+123456789
                  </p>
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    info@store.com
                  </p>
                </div>
              </div>

              {/* Column 2: Links + Social */}
              <div>
                <div className="mb-6">
                  <h6 className="font-semibold text-white text-sm mb-3">{'\u062a\u0627\u0628\u0639\u0646\u0627 \u0639\u0644\u064a'}</h6>
                  <ul className="space-y-2 text-sm">
                    {socialMedia && socialMedia.length > 0 && socialMedia.some(sm => sm.platform && sm.link) ? (
                      socialMedia
                        .filter(sm => sm.platform && sm.link)
                        .map((sm, index) => (
                          <li key={index}>
                            <a
                              href={sm.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                              {sm.platform}
                            </a>
                          </li>
                        ))
                    ) : (
                      <li className="text-gray-500">{'\u0644\u0627 \u062a\u0648\u062c\u062f \u0631\u0648\u0627\u0628\u0637 \u0645\u062a\u0627\u062d\u0629'}</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h6 className="font-semibold text-white text-sm mb-3">{'\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621'}</h6>
                  <ul className="space-y-2 text-sm">
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{'\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0629'}</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{'\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0625\u0631\u062c\u0627\u0639'}</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{'\u0627\u0644\u0634\u062d\u0646 \u0648\u0627\u0644\u062a\u0648\u0635\u064a\u0644'}</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">{'\u0627\u0644\u062f\u0641\u0639'}</a></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gray-800 mt-8 pt-6 text-center">
              <p className="text-gray-500 text-xs">
                &copy; {new Date().getFullYear()} {companyName}. {'\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629'}
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================ */}
      {/* Modals                                      */}
      {/* ============================================ */}

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        productId={selectedProductId}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
      />

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-white border border-green-200 text-green-700 px-5 py-3 rounded-xl shadow-xl transform transition-all duration-300 ease-out">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium">
              {'\u062a\u0645 \u0625\u0636\u0627\u0641\u0629'} &quot;{successProductName}&quot; {'\u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629'}
            </span>
          </div>
        </div>
      )}

      {/* Quantity Modal - inline style matching modern theme */}
      {isQuantityModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setIsQuantityModalOpen(false);
              setSelectedProduct(null);
            }}
          />
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-[380px] max-w-[90vw] overflow-hidden" style={{ animation: 'slideDown 0.25s ease-out' }}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">{'\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629'}</h3>
                <button
                  onClick={() => {
                    setIsQuantityModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1 truncate">{selectedProduct.name}</p>
            </div>
            {/* Body */}
            <div className="px-5 py-5">
              <QuantitySelector
                onConfirm={(qty) => {
                  handleQuantityConfirm(qty);
                  setIsQuantityModalOpen(false);
                  setSelectedProduct(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      {!profileLoading && !isAdminOrStaff && whatsappNumber && (
        <WhatsAppFloatingButton whatsappNumber={whatsappNumber} />
      )}
    </>
  );
}

// ============================================
// Inline Quantity Selector Component
// ============================================
function QuantitySelector({ onConfirm }: { onConfirm: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-2xl font-bold text-gray-800 w-12 text-center tabular-nums">{quantity}</span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <button
        onClick={() => onConfirm(quantity)}
        className="w-full py-2.5 rounded-xl text-white font-medium text-sm transition-all active:scale-[0.98] shadow-sm"
        style={{ backgroundColor: 'var(--primary-color)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover-color)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-color)')}
      >
        {'\u0625\u0636\u0627\u0641\u0629 \u0644\u0644\u0633\u0644\u0629'}
      </button>
    </div>
  );
}
