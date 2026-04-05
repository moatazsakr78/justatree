'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

interface DesktopHomeProps {
  userInfo: UserInfo;
  onCartUpdate: (cart: any[]) => void;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}

export default function DesktopHome({
  userInfo,
  onCartUpdate,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart
}: DesktopHomeProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);

  // Use right sidebar hook for the website menu
  const { isRightSidebarOpen, toggleRightSidebar, closeRightSidebar } = useRightSidebar();
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Performance: Limit visible products for better rendering
  const VISIBLE_PRODUCTS_LIMIT = 20;
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Get user profile to check admin status
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();

  // Check if user is admin or staff
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

  // Get cart badge count and cart functions
  const { cartBadgeCount } = useCartBadge();
  const { addToCart } = useCart();

  // Get favorites
  const { favorites } = useFavorites();

  // Get product display settings
  const { settings: displaySettings } = useProductDisplaySettings();

  // Get store theme colors
  const { primaryColor, primaryHoverColor, interactiveColor, isLoading: isThemeLoading } = useStoreTheme();

  // Get logo rounding class based on shape
  const logoRoundingClass = logoShape === 'circle' ? 'rounded-full' : 'rounded-lg';

  // Get store categories with their products
  const { categoriesWithProducts, isLoading: isCategoriesLoading } = useStoreCategoriesWithProducts();

  // Get custom sections with products
  const { sections: customSections, isLoading: isSectionsLoading, fetchSectionsWithProducts } = useCustomSections();
  const [sectionsWithProducts, setSectionsWithProducts] = useState<any[]>([]);
  const [isSectionsReady, setIsSectionsReady] = useState(false);
  const [rawSectionsData, setRawSectionsData] = useState<any[]>([]);

  // Handle adding products to cart - now opens quantity modal
  const handleAddToCart = async (product: Product) => {
    setSelectedProduct(product);
    setQuantityValue(1);
    setIsQuantityModalOpen(true);
  };

  // Handle quantity confirmation
  const handleQuantityConfirm = async (quantity: number) => {
    if (!selectedProduct) return;

    try {
      console.log('🛒 Desktop Modern: Adding product to cart:', selectedProduct.name, 'Quantity:', quantity, 'Note:', selectedProduct.note);
      const selectedColorName = selectedProduct.selectedColor?.name || undefined;
      const selectedShapeName = selectedProduct.selectedShape?.name || undefined;
      const productNote = selectedProduct.note || undefined;
      const customImageUrl = selectedProduct.customImage || undefined;
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price, selectedColorName, selectedShapeName, undefined, productNote, customImageUrl);
      console.log('✅ Desktop Modern: Product added successfully');
    } catch (error) {
      console.error('❌ Desktop Modern: Error adding product to cart:', error);
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
                name: variant.color_name || variant.name || 'لون غير محدد',
                hex: variant.color_hex || '#000000',
                image_url: variant.image_url || null
              }));

              // Get shapes for this product
              const productShapes = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'shape') || [];
              const shapes = productShapes.map((variant: any) => ({
                id: variant.id,
                name: variant.name || 'شكل غير محدد',
                image_url: variant.image_url || null
              }));

              // Get sizes for this product (if it's part of a size group)
              const sizeGroupInfo = productsInSizeGroups.get(dbProduct.id);
              const sizes = sizeGroupInfo ? sizeGroupInfo.sizes : [];

              // Use allImages from useProducts hook which includes variant images
              const productImages = dbProduct.allImages || [];

              return {
                id: dbProduct.id,
                name: dbProduct.name || 'منتج بدون اسم',
                description: dbProduct.description || '',
                price: finalPrice,
                wholesale_price: Number(dbProduct.wholesale_price) || undefined,
                originalPrice: hasDiscount ? Number(dbProduct.price) : undefined,
                image: dbProduct.main_image_url || undefined,
                images: productImages,
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
      // Get first favorite product image as category image
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

    // Add store categories
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

  // Background preload all product images (card + search thumbnails)
  useEffect(() => {
    if (websiteProducts.length === 0) return;
    const allImageSrcs = websiteProducts.map(p => p.image);
    // Preload card-sized images for desktop
    const cardUrls = getTransformedUrls(allImageSrcs, 'card_desktop');
    // Preload search thumbnails
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

  // Handle scroll for compact header
  useEffect(() => {
    if (!isClient) return;

    const handleScroll = () => {
      setIsCompactHeaderVisible(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  const filteredProducts = useMemo(() => {
    let productsToFilter = websiteProducts;

    // Handle favorites category
    if (selectedCategory === 'المفضلة') {
      productsToFilter = websiteProducts.filter(product =>
        favorites.includes(String(product.id))
      );
    }
    // If a specific store category is selected, get products from that category
    else if (selectedCategory !== 'الكل' && categoriesWithProducts.length > 0) {
      const selectedStoreCategory = categoriesWithProducts.find((cat: any) => cat.name === selectedCategory);
      if (selectedStoreCategory && selectedStoreCategory.products) {
        // Convert store category products to website product format
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
        // No products in this store category
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
  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProductId('');
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
      }
    },
    {
      id: 'search',
      isOpen: isSearchOverlayOpen,
      onClose: () => setIsSearchOverlayOpen(false)
    },
    {
      id: 'sidebar',
      isOpen: isRightSidebarOpen,
      onClose: closeRightSidebar
    }
  ], [isProductModalOpen, isCartModalOpen, isQuantityModalOpen, isSearchOverlayOpen, isRightSidebarOpen, closeRightSidebar]);

  // Initialize back button handler for store
  useStoreBackHandler(modalsConfig);

  // Show loading state during hydration or while loading data
  if (!isClient || isLoading || isThemeLoading || isCompanyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-6">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary-color, #3B82F6)', animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary-color, #3B82F6)', animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary-color, #3B82F6)', animationDelay: '300ms' }}></div>
          </div>
          <p className="text-gray-500 text-sm font-medium">جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  // All category names for pills
  const allCategoryNames = ['الكل', ...categories.map((c: any) => c.name)];

  return (
    <>
      {/* Right Sidebar for Website Menu */}
      <RightSidebar
        isOpen={isRightSidebarOpen}
        onClose={closeRightSidebar}
        onCategorySelect={(categoryName) => setSelectedCategory(categoryName)}
      />

      <div className="min-h-screen text-gray-800" style={{ backgroundColor: '#fafafa' }} dir="rtl">
        {/* Hide system blue header */}
        <style jsx global>{`
          body {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          html {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          iframe,
          .system-header,
          [class*="system"],
          [class*="navigation"],
          [style*="background: #374151"],
          [style*="background-color: #374151"] {
            display: none !important;
          }
        `}</style>

        {/* ============================================ */}
        {/* TOP UTILITY BAR                             */}
        {/* ============================================ */}
        <div className="w-full py-2" style={{ backgroundColor: primaryHoverColor || '#1e3a5f' }}>
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AuthButtons compact />
            </div>
            <div className="flex items-center gap-4">
              {/* Menu button */}
              <button
                className="text-white/80 hover:text-white transition-colors"
                onClick={toggleRightSidebar}
                title="القائمة"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Cart button */}
              <button
                onClick={() => setIsCartModalOpen(true)}
                className="relative text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartBadgeCount > 0 && (
                  <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#EF4444' }}>
                    {cartBadgeCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* MAIN HEADER - White, centered logo          */}
        {/* ============================================ */}
        <header className={`bg-white z-40 transition-shadow duration-300 ${isCompactHeaderVisible ? 'fixed top-0 left-0 right-0 shadow-md' : 'relative shadow-sm'}`}>
          {/* When sticky, show the utility bar integrated */}
          {isCompactHeaderVisible && (
            <div className="w-full py-1.5" style={{ backgroundColor: primaryHoverColor || '#1e3a5f' }}>
              <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AuthButtons compact />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    className="text-white/80 hover:text-white transition-colors"
                    onClick={toggleRightSidebar}
                    title="القائمة"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsCartModalOpen(true)}
                    className="relative text-white/80 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {cartBadgeCount > 0 && (
                      <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#EF4444' }}>
                        {cartBadgeCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col items-center gap-3">
            {/* Centered Logo and Name */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedCategory('الكل'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className={`h-12 w-12 ${logoRoundingClass} overflow-hidden bg-gray-100 flex items-center justify-center`}>
                <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-lg">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن ما تريد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-200 rounded-full px-5 py-2.5 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-transparent focus:ring-2 transition-all duration-200 text-sm"
                  style={{ '--tw-ring-color': 'var(--primary-color)' } as React.CSSProperties}
                />
                <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Spacer for when header is fixed */}
        {isCompactHeaderVisible && <div style={{ height: '140px' }}></div>}

        {/* ============================================ */}
        {/* CATEGORY PILLS                              */}
        {/* ============================================ */}
        {!searchQuery && categories && categories.length > 0 && (
          <div className="bg-white border-b border-gray-100 sticky z-30" style={{ top: isCompactHeaderVisible ? '140px' : '0' }}>
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {allCategoryNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(name)}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                      selectedCategory === name
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={selectedCategory === name ? { backgroundColor: 'var(--primary-color)' } : undefined}
                  >
                    {name === 'المفضلة' && <span className="ml-1">&#10084;</span>}
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MAIN CONTENT                                */}
        {/* ============================================ */}
        <main className="max-w-7xl mx-auto px-6 py-8">

          {/* Custom Sections - grid style, alternating backgrounds */}
          {isSectionsReady && selectedCategory === 'الكل' && !searchQuery && sectionsWithProducts.length > 0 && (
            <>
              {sectionsWithProducts.map((section: any, sectionIndex: number) => (
                section.products && section.products.length > 0 && (
                  <section
                    key={section.id}
                    className="mb-12 -mx-6 px-6 py-8"
                    style={{ backgroundColor: sectionIndex % 2 === 1 ? '#f8f9fa' : 'transparent' }}
                  >
                    {/* Section title with underline decoration */}
                    <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">{section.name}</h3>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {section.products.map((product: Product) => (
                        <InteractiveProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={handleAddToCart}
                          deviceType="desktop"
                          onProductClick={handleProductClick}
                          displaySettings={displaySettings}
                        />
                      ))}
                    </div>
                  </section>
                )
              ))}
            </>
          )}

          {/* All Products Section */}
          <section id="products" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedCategory === 'الكل' ? 'جميع المنتجات' : selectedCategory}
              </h3>
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400 font-medium">
                {filteredProducts.length} منتج
              </span>
            </div>

            {visibleProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {visibleProducts.map((product) => (
                  <InteractiveProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    deviceType="desktop"
                    onProductClick={handleProductClick}
                    displaySettings={displaySettings}
                  />
                ))}

                {hasMoreProducts && (
                  <div className="col-span-full flex justify-center py-8">
                    <button
                      onClick={() => setShowAllProducts(true)}
                      className="px-8 py-3 rounded-full text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)'; }}
                    >
                      عرض المزيد ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} منتج)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-400 text-lg">لا توجد منتجات في هذه الفئة</p>
              </div>
            )}
          </section>
        </main>

        {/* ============================================ */}
        {/* FOOTER - Dark Navy, 4 columns               */}
        {/* ============================================ */}
        <footer className="w-full" style={{ backgroundColor: '#1a1a2e' }}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {/* Column 1: Company Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 ${logoRoundingClass} overflow-hidden bg-white/10 flex items-center justify-center`}>
                    <img src={logoUrl || '/assets/logo/justatree.png'} alt={companyName} className="h-full w-full object-cover" />
                  </div>
                  <h5 className="font-bold text-lg text-white">{companyName}</h5>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  متجرك المتكامل للحصول على أفضل المنتجات بأسعار مميزة وجودة عالية. نسعى لتقديم تجربة تسوق فريدة ومميزة.
                </p>
              </div>

              {/* Column 2: Quick Links */}
              <div>
                <h6 className="font-semibold text-white mb-4 text-base">روابط سريعة</h6>
                <ul className="space-y-3">
                  <li>
                    <button
                      onClick={() => { setSelectedCategory('الكل'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      الرئيسية
                    </button>
                  </li>
                  <li>
                    <a href="#products" className="text-gray-400 hover:text-white transition-colors text-sm">المنتجات</a>
                  </li>
                  {categories.slice(0, 4).map((cat: any) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => { setSelectedCategory(cat.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Customer Service */}
              <div>
                <h6 className="font-semibold text-white mb-4 text-base">خدمة العملاء</h6>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">المساعدة والدعم</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">سياسة الإرجاع</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">الشحن والتوصيل</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">طرق الدفع</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">الأسئلة الشائعة</a></li>
                </ul>
              </div>

              {/* Column 4: Contact & Social */}
              <div>
                <h6 className="font-semibold text-white mb-4 text-base">تواصل معنا</h6>
                <div className="space-y-3 mb-6">
                  <p className="text-gray-400 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    966+123456789
                  </p>
                  <p className="text-gray-400 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    info@store.com
                  </p>
                  <p className="text-gray-400 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    المملكة العربية السعودية
                  </p>
                </div>

                {/* Social Media Links */}
                {socialMedia && socialMedia.length > 0 && socialMedia.some((sm: any) => sm.platform && sm.link) && (
                  <div>
                    <h6 className="font-semibold text-white mb-3 text-sm">تابعنا على</h6>
                    <div className="flex items-center gap-3">
                      {socialMedia
                        .filter((sm: any) => sm.platform && sm.link)
                        .map((sm: any, index: number) => (
                          <a
                            key={index}
                            href={sm.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 text-xs font-medium"
                            title={sm.platform}
                          >
                            {sm.platform?.charAt(0)?.toUpperCase()}
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Copyright line */}
          <div className="border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <p className="text-gray-500 text-xs">
                &copy; {new Date().getFullYear()} {companyName}. جميع الحقوق محفوظة.
              </p>
              <p className="text-gray-600 text-xs">
                صنع بعناية
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================ */}
      {/* MODALS                                       */}
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

      {/* Quantity Modal - Inline */}
      {isQuantityModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => { setIsQuantityModalOpen(false); setSelectedProduct(null); }}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-4 text-gray-900">{selectedProduct.name}</h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setQuantityValue(Math.max(1, quantityValue - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                value={quantityValue}
                onChange={e => setQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center text-xl font-bold border-b-2 focus:outline-none text-gray-900"
                style={{ borderColor: 'var(--primary-color)' }}
              />
              <button
                onClick={() => setQuantityValue(quantityValue + 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-white transition-colors"
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
              className="w-full py-3 rounded-xl text-white font-bold text-lg transition-all hover:shadow-lg"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              اضف للسلة
            </button>
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
