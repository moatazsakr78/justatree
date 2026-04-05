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
import { usePreFetchedData } from '@/lib/contexts/PreFetchedDataContext';
import BannerEditorFull from '@/components/banner-editor/BannerEditor';

// ============================================
// Theme Color Constants
// ============================================
const THEME = {
  warmLinen: '#F7F5F0',
  deepForest: '#1B3A2D',
  emerald: '#2D6A4F',
  darkEmerald: '#1B4332',
  antiqueGold: '#D4A574',
  deepGold: '#C4956A',
  parchment: '#EDE8DB',
  mintGlow: '#95D5B2',
  charcoalInk: '#1A1A2E',
  mossGray: '#5C6B5E',
  nightForest: '#1A2F23',
  softEmerald: 'rgba(45,106,79,0.15)',
  cardWhite: '#FFFFFF',
};

const BOTANICAL_CARD_MOBILE = {
  className: 'rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300',
  style: {
    backgroundColor: THEME.parchment,
    border: `1px solid ${THEME.softEmerald}`,
    boxShadow: '0 2px 8px rgba(27,58,45,0.05)',
  } as React.CSSProperties,
};

// ============================================
// Botanical Decorative Components
// ============================================

const LeafIcon = ({ size = 14, color = THEME.emerald }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
  </svg>
);

const BotanicalDivider = ({ color = THEME.emerald }: { color?: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}40, transparent)` }}></div>
    <div className="flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill={color} opacity="0.5" style={{ transform: 'scaleX(-1)' }}>
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${color}60` }}></div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill={color} opacity="0.5">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
    </div>
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }}></div>
  </div>
);

const LeafPattern = ({ className = '', opacity = 0.05 }: { className?: string; opacity?: number }) => (
  <svg className={className} viewBox="0 0 200 200" fill="white" opacity={opacity} xmlns="http://www.w3.org/2000/svg">
    <path d="M40,20 C60,10 80,30 70,50 C60,70 30,60 40,20Z"/>
    <path d="M150,40 C170,30 190,50 180,70 C170,90 140,80 150,40Z"/>
    <path d="M80,120 C100,110 120,130 110,150 C100,170 70,160 80,120Z"/>
    <path d="M160,150 C180,140 200,160 190,180 C180,200 150,190 160,150Z"/>
    <path d="M20,100 C40,90 60,110 50,130 C40,150 10,140 20,100Z"/>
  </svg>
);

const TreeSilhouette = ({ className = '', color = 'white', opacity = 0.03 }: { className?: string; color?: string; opacity?: number }) => (
  <svg className={className} viewBox="0 0 100 120" fill={color} opacity={opacity}>
    <path d="M50,5 L30,40 L38,40 L20,70 L35,70 L15,100 L85,100 L65,70 L80,70 L62,40 L70,40 Z"/>
    <rect x="45" y="100" width="10" height="20" fill={color}/>
  </svg>
);

// Hero slide data
const HERO_SLIDES = [
  {
    badge: 'عروض حصرية',
    title: 'اجعل مساحتك تنبض بالحياة',
    subtitle: 'اكتشف مجموعتنا المميزة من الأشجار والنباتات الزينة بأعلى جودة وأفضل الأسعار',
    cta: 'تسوق الآن',
    gradient: `linear-gradient(135deg, ${THEME.deepForest} 0%, ${THEME.emerald} 50%, ${THEME.darkEmerald} 100%)`,
  },
  {
    badge: 'وصل حديثاً',
    title: 'نباتات داخلية أنيقة',
    subtitle: 'أضف لمسة طبيعية لمنزلك مع تشكيلتنا الجديدة من النباتات الداخلية الفاخرة',
    cta: 'اكتشف المزيد',
    gradient: `linear-gradient(135deg, ${THEME.emerald} 0%, #40916C 50%, ${THEME.deepForest} 100%)`,
  },
  {
    badge: 'الأكثر مبيعاً',
    title: 'أشجار زينة فاخرة',
    subtitle: 'جودة عالية وأسعار مناسبة لتزيين مساحاتك المنزلية والمكتبية',
    cta: 'تصفح الآن',
    gradient: `linear-gradient(135deg, ${THEME.nightForest} 0%, ${THEME.deepForest} 50%, ${THEME.emerald} 100%)`,
  }
];

// Promotional banners data
const PROMO_BANNERS = [
  {
    title: 'أشجار زينة فاخرة',
    subtitle: 'خصم يصل إلى 30%',
    cta: 'اكتشف العروض',
    gradient: `linear-gradient(135deg, ${THEME.deepForest}, ${THEME.emerald})`,
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  {
    title: 'نباتات داخلية',
    subtitle: 'مجموعة جديدة',
    cta: 'تسوق الآن',
    gradient: `linear-gradient(135deg, ${THEME.antiqueGold}, ${THEME.deepGold})`,
    iconPath: 'M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z',
  },
  {
    title: 'تنسيق حدائق',
    subtitle: 'خدمات احترافية',
    cta: 'تعرف أكثر',
    gradient: `linear-gradient(135deg, ${THEME.nightForest}, ${THEME.darkEmerald})`,
    iconPath: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  },
];

// Trust badges data
const TRUST_BADGES = [
  {
    title: 'شحن سريع',
    subtitle: 'توصيل لباب البيت',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: 'جودة مضمونة',
    subtitle: 'منتجات أصلية 100%',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'دعم متواصل',
    subtitle: 'خدمة عملاء 24/7',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    title: 'استرجاع سهل',
    subtitle: 'إرجاع خلال 14 يوم',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
      </svg>
    ),
  },
];

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
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

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

  // Get pre-fetched banner data
  const { banners: preFetchedBanners } = usePreFetchedData();

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
  const featuredScrollRef = useRef<HTMLDivElement>(null);

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
      console.log('🛒 Mobile Tree: Adding product to cart:', selectedProduct.name, 'Quantity:', quantity, 'Note:', selectedProduct.note);
      const selectedColorName = selectedProduct.selectedColor?.name || undefined;
      const selectedShapeName = selectedProduct.selectedShape?.name || undefined;
      const productNote = selectedProduct.note || undefined;
      const customImageUrl = selectedProduct.customImage || undefined;
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price, selectedColorName, selectedShapeName, undefined, productNote, customImageUrl);
      console.log('✅ Mobile Tree: Product added successfully');
    } catch (error) {
      console.error('❌ Mobile Tree: Error adding product to cart:', error);
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

  // Hero slide auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeroSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
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

  // Is this the home view? (no search, "الكل" category, home tab)
  const isHomeView = selectedCategory === 'الكل' && !searchQuery && activeTab === 'home';

  // Show loading state
  if (!isClient || isLoading || isThemeLoading || isCompanyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.warmLinen }}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: THEME.emerald, animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: THEME.antiqueGold, animationDelay: '150ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: THEME.emerald, animationDelay: '300ms' }}></div>
          </div>
          <p className="text-sm font-medium" style={{ color: THEME.mossGray }}>جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.warmLinen, color: THEME.charcoalInk }} dir="rtl">
      {/* ===== ANIMATIONS ===== */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { max-height: 0; opacity: 0; }
          to { max-height: 1000px; opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(212,165,116,0.3); }
          50% { box-shadow: 0 0 24px rgba(212,165,116,0.6); }
        }
      `}</style>

      {/* ===== BOTANICAL HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: THEME.warmLinen, borderBottom: `1px solid ${THEME.softEmerald}`, boxShadow: '0 2px 12px rgba(27,58,45,0.06)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          {/* Right: Logo + Name */}
          <div className="flex items-center gap-2.5" onClick={() => { setSelectedCategory('الكل'); setSearchQuery(''); setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <div className={`h-9 w-9 ${logoRoundingClass} overflow-hidden flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: THEME.parchment, boxShadow: `0 0 0 1px ${THEME.antiqueGold}60` }}>
              <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="text-base font-bold truncate max-w-[140px] block" style={{ color: THEME.charcoalInk }}>{companyName}</span>
              <span className="text-[9px] block -mt-0.5" style={{ color: THEME.mossGray }}>متجر النباتات والأشجار</span>
            </div>
          </div>

          {/* Left: Search + Cart */}
          <div className="flex items-center gap-1">
            {/* Search Icon */}
            <button
              onClick={() => handleTabChange('search')}
              className="p-2.5 rounded-full transition-colors"
              style={{ color: THEME.mossGray }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Cart Icon */}
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="relative p-2.5 rounded-full transition-colors"
              style={{ color: THEME.mossGray }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartBadgeCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1" style={{ backgroundColor: THEME.antiqueGold }}>
                  {cartBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Botanical vine decoration */}
        <div className="h-0.5" style={{ background: `linear-gradient(to left, ${THEME.emerald}00, ${THEME.emerald}30, ${THEME.antiqueGold}40, ${THEME.emerald}30, ${THEME.emerald}00)` }}></div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="pt-14 pb-20" style={{ backgroundColor: THEME.warmLinen }}>

        {/* ============================================ */}
        {/* HERO BANNER - Dynamic Banner Editor         */}
        {/* ============================================ */}
        {isHomeView && (
          <BannerEditorFull
            initialBanners={preFetchedBanners || []}
            height={300}
            isAdmin={isAdminOrStaff}
            theme={THEME}
            fallbackSlides={HERO_SLIDES}
            themeId="just-a-tree"
            deviceType="mobile"
          />
        )}

        {/* ============================================ */}
        {/* TRUST / FEATURES BAR (2x2 grid)            */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="py-5 px-4" style={{ backgroundColor: THEME.parchment, borderTop: `1px solid ${THEME.antiqueGold}20`, borderBottom: `1px solid ${THEME.antiqueGold}20` }}>
            <div className="grid grid-cols-2 gap-3">
              {TRUST_BADGES.map((badge, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: THEME.emerald, boxShadow: `0 3px 8px ${THEME.emerald}30` }}
                  >
                    {badge.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs" style={{ color: THEME.charcoalInk }}>{badge.title}</h4>
                    <p className="text-[10px]" style={{ color: THEME.mossGray }}>{badge.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* CATEGORY SHOWCASE (horizontal scroll)      */}
        {/* ============================================ */}
        {!searchQuery && categories && categories.length > 0 && (
          <section className="py-4" style={{ backgroundColor: THEME.warmLinen }}>
            <div className="px-4">
              {isHomeView && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                  <h3 className="text-base font-bold" style={{ color: THEME.charcoalInk }}>تصفح الأقسام</h3>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1" style={{ scrollSnapType: 'x mandatory' }}>
              {/* All category button */}
              <button
                onClick={() => setSelectedCategory('الكل')}
                className="flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div
                  className="w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300"
                  style={{
                    backgroundColor: selectedCategory === 'الكل' ? THEME.emerald : THEME.cardWhite,
                    color: selectedCategory === 'الكل' ? '#fff' : THEME.charcoalInk,
                    border: selectedCategory === 'الكل' ? 'none' : `1px solid ${THEME.softEmerald}`,
                    boxShadow: selectedCategory === 'الكل' ? `0 6px 16px ${THEME.emerald}40` : '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <span className="text-[10px] font-bold">الكل</span>
                </div>
              </button>

              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="flex-shrink-0"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 overflow-hidden relative"
                    style={{
                      backgroundColor: selectedCategory === cat.name ? THEME.emerald : THEME.cardWhite,
                      color: selectedCategory === cat.name ? '#fff' : THEME.charcoalInk,
                      border: selectedCategory === cat.name ? 'none' : `1px solid ${THEME.softEmerald}`,
                      boxShadow: selectedCategory === cat.name ? `0 6px 16px ${THEME.emerald}40` : '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    {cat.image ? (
                      <>
                        <div className="absolute inset-0">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{
                            background: selectedCategory === cat.name
                              ? `linear-gradient(to top, ${THEME.emerald}ee, ${THEME.emerald}88)`
                              : 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.1))'
                          }}></div>
                        </div>
                        <div className="relative z-10 mt-auto pb-1.5">
                          <span className="text-[10px] font-bold text-white block leading-tight">{cat.name}</span>
                          <span className="text-[8px] text-white/70">{cat.productCount} منتج</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <LeafIcon size={22} color={selectedCategory === cat.name ? '#fff' : THEME.emerald} />
                        <span className="text-[10px] font-bold leading-tight text-center px-1">{cat.name}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* PROMOTIONAL BANNERS (vertical stack)       */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="px-4 py-4">
            <div className="flex flex-col gap-3">
              {PROMO_BANNERS.map((banner, index) => (
                <div
                  key={index}
                  className="relative rounded-2xl overflow-hidden cursor-pointer"
                  style={{ height: '160px', background: banner.gradient }}
                >
                  {/* Decorative elements */}
                  <LeafPattern className="absolute top-0 left-0 w-full h-full" opacity={0.08} />
                  <div className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <LeafIcon size={16} color="rgba(255,255,255,0.6)" />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <h4 className="text-lg font-black text-white mb-0.5">{banner.title}</h4>
                    <p className="text-xs text-white/70 mb-3">{banner.subtitle}</p>
                    <button
                      className="self-start px-4 py-1.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: THEME.darkEmerald }}
                    >
                      {banner.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* CUSTOM SECTIONS                             */}
        {/* ============================================ */}
        {isSectionsReady && isHomeView && sectionsWithProducts.length > 0 && (
          <div className="px-3 pt-2">
            {sectionsWithProducts.map((section: any, sectionIndex: number) => {
              const expandedProduct = expandedCloneProductId
                ? section.products?.find((p: any) => String(p.id) === expandedCloneProductId)
                : null;
              return (
                section.products && section.products.length > 0 && (
                  <section
                    key={section.id}
                    className={`mb-5 ${sectionIndex % 2 === 1 ? '-mx-3 px-3 py-4' : ''}`}
                    style={sectionIndex % 2 === 1 ? { backgroundColor: THEME.parchment, borderTop: `1px solid ${THEME.antiqueGold}20`, borderBottom: `1px solid ${THEME.antiqueGold}20` } : {}}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                        <h3 className="text-lg font-bold" style={{ color: THEME.charcoalInk }}>{section.name}</h3>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${THEME.emerald}10`, color: THEME.emerald }}>
                        {section.products.length} منتج
                      </span>
                    </div>
                    <BotanicalDivider color={THEME.emerald} />
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
                            containerClassName={BOTANICAL_CARD_MOBILE.className}
                            containerStyle={BOTANICAL_CARD_MOBILE.style}
                                imageFill
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
                        className="mt-3 rounded-2xl overflow-hidden"
                        style={{
                          animation: 'slideDown 0.3s ease-out',
                          backgroundColor: THEME.cardWhite,
                          border: `1px solid ${THEME.softEmerald}`,
                          boxShadow: '0 4px 16px rgba(27,58,45,0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: THEME.emerald, borderBottom: `1px solid ${THEME.darkEmerald}` }}>
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
                                className="rounded-xl overflow-hidden transition-all"
                                style={{ backgroundColor: THEME.warmLinen, border: `1px solid ${THEME.softEmerald}` }}
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
                                    <p className="text-xs font-medium truncate mb-2 text-center" style={{ color: `${THEME.charcoalInk}b3` }}>{clone.label}</p>
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
                                    style={{ backgroundColor: THEME.emerald }}
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

        {/* ============================================ */}
        {/* FEATURED PRODUCTS CAROUSEL                 */}
        {/* ============================================ */}
        {isHomeView && featuredProducts.length > 0 && (
          <section className="py-6 px-4 relative overflow-hidden" style={{ backgroundColor: THEME.deepForest }}>
            {/* Background decorations */}
            <TreeSilhouette className="absolute bottom-0 left-2 h-40 w-40" opacity={0.04} />
            <LeafPattern className="absolute top-0 right-0 w-40 h-40" opacity={0.04} />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                <h3 className="text-lg font-black text-white">منتجات مميزة</h3>
                <LeafIcon size={16} color={THEME.antiqueGold} />
              </div>

              <div
                ref={featuredScrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {featuredProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-44" style={{ scrollSnapAlign: 'start' }}>
                    <InteractiveProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      deviceType="mobile"
                      onProductClick={handleProductClick}
                      displaySettings={displaySettings}
                      containerClassName={BOTANICAL_CARD_MOBILE.className}
                      containerStyle={BOTANICAL_CARD_MOBILE.style}
                                imageFill
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* MID-PAGE PROMOTIONAL BANNER                */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="relative overflow-hidden" style={{ height: '160px', background: `linear-gradient(to left, ${THEME.emerald}, ${THEME.darkEmerald})` }}>
            <LeafPattern className="absolute top-0 right-0 w-full h-full" opacity={0.06} />
            <TreeSilhouette className="absolute bottom-0 right-4 h-36 w-36" color="white" opacity={0.05} />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-6">
              <span className="text-[10px] font-medium mb-1 block" style={{ color: THEME.mintGlow }}>عروض لفترة محدودة</span>
              <h3 className="text-xl font-black text-white mb-1">عروض نهاية الموسم</h3>
              <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>خصومات تصل إلى 50% على مجموعة مختارة</p>
              <button
                className="px-6 py-2 rounded-full font-bold text-xs transition-all"
                style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
              >
                تسوق العروض
                <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* ALL PRODUCTS SECTION                       */}
        {/* ============================================ */}
        <section className="px-3 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
              <h3 className="text-lg font-bold" style={{ color: THEME.charcoalInk }}>
                {selectedCategory === 'الكل' ? 'جميع المنتجات' : selectedCategory}
              </h3>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${THEME.emerald}10`, color: THEME.emerald }}>
              {filteredProducts.length} منتج
            </span>
          </div>
          <BotanicalDivider />

          <div className="grid grid-cols-2 gap-2.5">
            {visibleProducts.map((product) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                deviceType="mobile"
                onProductClick={handleProductClick}
                displaySettings={displaySettings}
                containerClassName={BOTANICAL_CARD_MOBILE.className}
                containerStyle={BOTANICAL_CARD_MOBILE.style}
                                imageFill
              />
            ))}

            {hasMoreProducts && (
              <div className="col-span-full flex justify-center py-5">
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="px-6 py-2.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                  style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
                >
                  <LeafIcon size={12} color={THEME.nightForest} />
                  عرض المزيد ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} منتج)
                </button>
              </div>
            )}
          </div>

          {visibleProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${THEME.emerald}10` }}>
                <TreeSilhouette className="w-8 h-8" color={THEME.emerald} opacity={0.4} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: THEME.charcoalInk }}>لا توجد منتجات</p>
              <p className="text-xs" style={{ color: THEME.mossGray }}>جرّب البحث بكلمات مختلفة</p>
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* NEWSLETTER STRIP (stacked vertically)      */}
        {/* ============================================ */}
        <section className="py-6 px-4 relative" style={{ backgroundColor: THEME.emerald }}>
          <LeafPattern className="absolute top-0 right-0 w-full h-full" opacity={0.06} />
          <div className="relative z-10 text-center">
            <h4 className="text-base font-bold text-white mb-1">اشترك في نشرتنا البريدية</h4>
            <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>احصل على أحدث العروض والمنتجات الجديدة</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="px-4 py-2.5 rounded-full text-sm w-full focus:outline-none text-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <button
                className="px-4 py-2.5 rounded-full font-bold text-sm transition-all"
                style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
              >
                اشترك الآن
              </button>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* FOOTER (single column, compact)            */}
        {/* ============================================ */}
        <footer className="relative overflow-hidden" style={{ backgroundColor: THEME.nightForest }}>
          <TreeSilhouette className="absolute bottom-0 left-0 h-40 w-40" opacity={0.03} />

          <div className="px-4 py-8 relative z-10">
            {/* Company Info */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`h-10 w-10 ${logoRoundingClass} overflow-hidden flex-shrink-0`} style={{ backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: `0 0 0 1px ${THEME.antiqueGold}40` }}>
                <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-full w-full object-cover" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-white">{companyName}</h5>
                <p className="text-[10px]" style={{ color: THEME.mintGlow }}>متجر النباتات والأشجار</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              متجرك المتكامل للحصول على أفضل الأشجار والنباتات الزينة بأعلى جودة وأسعار مميزة.
            </p>

            {/* Social Media Links */}
            {socialMedia && socialMedia.length > 0 && socialMedia.some((sm: any) => sm.platform && sm.link) && (
              <div className="flex items-center gap-2.5 mb-5">
                {socialMedia
                  .filter((sm: any) => sm.platform && sm.link)
                  .map((sm: any, index: number) => (
                    <a
                      key={index}
                      href={sm.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium transition-all"
                      title={sm.platform}
                      style={{ border: `1px solid ${THEME.antiqueGold}40`, color: THEME.antiqueGold }}
                    >
                      {sm.platform?.charAt(0)?.toUpperCase()}
                    </a>
                  ))}
              </div>
            )}

            <div className="h-px mb-5" style={{ backgroundColor: `${THEME.antiqueGold}20` }}></div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 gap-6 mb-5">
              {/* Quick Links */}
              <div>
                <h6 className="font-bold text-white mb-3 text-xs flex items-center gap-1.5">
                  <div className="w-0.5 h-3.5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                  روابط سريعة
                </h6>
                <ul className="space-y-2">
                  {['المساعدة', 'سياسة الإرجاع', 'الشحن والتوصيل'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        <LeafIcon size={8} color={THEME.mintGlow} />
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Customer Service */}
              <div>
                <h6 className="font-bold text-white mb-3 text-xs flex items-center gap-1.5">
                  <div className="w-0.5 h-3.5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                  خدمة العملاء
                </h6>
                <ul className="space-y-2">
                  {['طرق الدفع', 'الأسئلة الشائعة', 'تواصل معنا'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-[10px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        <LeafIcon size={8} color={THEME.mintGlow} />
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="h-px mb-4" style={{ backgroundColor: `${THEME.antiqueGold}20` }}></div>

            {/* Copyright */}
            <div className="flex items-center justify-between">
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                &copy; {new Date().getFullYear()} {companyName}
              </p>
              <p className="text-[9px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                صنع بعناية
                <LeafIcon size={10} color={THEME.mintGlow} />
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* ===== BOTTOM NAVIGATION BAR ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: THEME.nightForest, borderTop: `1px solid ${THEME.antiqueGold}30`, boxShadow: '0 -2px 16px rgba(26,47,35,0.3)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {/* Home Tab */}
          <button
            onClick={() => handleTabChange('home')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: activeTab === 'home' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {activeTab === 'home' && (
                <span className="absolute -top-1 -right-2">
                  <LeafIcon size={8} color={THEME.mintGlow} />
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'home' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}>
              الرئيسية
            </span>
            {activeTab === 'home' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></span>
            )}
          </button>

          {/* Categories Tab */}
          <button
            onClick={() => handleTabChange('categories')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative"
          >
            <svg className="w-5 h-5" fill={activeTab === 'categories' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'categories' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'categories' ? 0 : 1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'categories' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}>
              الفئات
            </span>
            {activeTab === 'categories' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></span>
            )}
          </button>

          {/* Search Tab */}
          <button
            onClick={() => handleTabChange('search')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'search' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'search' ? 2.5 : 1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'search' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}>
              البحث
            </span>
            {activeTab === 'search' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></span>
            )}
          </button>

          {/* Cart Tab */}
          <button
            onClick={() => handleTabChange('cart')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill={activeTab === 'cart' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: activeTab === 'cart' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'cart' ? 0 : 1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartBadgeCount > 0 && (
                <span className="absolute -top-1.5 -left-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-0.5" style={{ backgroundColor: THEME.antiqueGold }}>
                  {cartBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'cart' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}>
              السلة
            </span>
            {activeTab === 'cart' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></span>
            )}
          </button>

          {/* Account Tab */}
          <button
            onClick={() => handleTabChange('account')}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative"
          >
            <svg className="w-5 h-5" fill={activeTab === 'account' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: activeTab === 'account' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'account' ? 0 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: activeTab === 'account' ? THEME.antiqueGold : 'rgba(255,255,255,0.5)' }}>
              حسابي
            </span>
            {activeTab === 'account' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></span>
            )}
          </button>
        </div>
      </nav>

      {/* ===== CATEGORY PANEL (slide-up) ===== */}
      {isCategoryPanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55] transition-opacity" onClick={closeCategoryPanel} />
          <div className="fixed bottom-0 left-0 right-0 z-[56] rounded-t-2xl shadow-2xl max-h-[75vh] overflow-hidden" style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'env(safe-area-inset-bottom, 0px)', backgroundColor: THEME.warmLinen }}>
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${THEME.softEmerald}` }}>
              <div className="flex items-center gap-1.5">
                <LeafIcon size={16} color={THEME.emerald} />
                <h3 className="text-base font-bold" style={{ color: THEME.charcoalInk }}>الفئات</h3>
              </div>
              <button onClick={closeCategoryPanel} className="p-1.5 rounded-full transition-colors" style={{ color: THEME.mossGray }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Panel drag indicator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ backgroundColor: `${THEME.antiqueGold}40` }}></div>

            {/* Category Grid */}
            <div className="p-4 overflow-y-auto max-h-[calc(75vh-56px)] scrollbar-hide">
              {isCategoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.emerald, animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.antiqueGold, animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: THEME.emerald, animationDelay: '300ms' }}></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* All Products Card */}
                  <button
                    onClick={() => handleCategorySelect('الكل')}
                    className={`relative rounded-2xl overflow-hidden text-right transition-all h-28 ${
                      selectedCategory === 'الكل' ? 'ring-2 shadow-lg' : ''
                    }`}
                    style={selectedCategory === 'الكل'
                      ? { '--tw-ring-color': THEME.antiqueGold } as React.CSSProperties
                      : { border: `1px solid ${THEME.softEmerald}` }}
                  >
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${THEME.nightForest}, ${THEME.deepForest})` }}></div>
                    <div className="relative h-full flex flex-col justify-end p-3">
                      <h4 className="text-white font-bold text-sm">جميع المنتجات</h4>
                      <p className="text-[10px]" style={{ color: `${THEME.mintGlow}b3` }}>{websiteProducts.length} منتج</p>
                    </div>
                  </button>

                  {/* Category Cards */}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.name)}
                      className={`relative rounded-2xl overflow-hidden text-right transition-all h-28 ${
                        selectedCategory === category.name ? 'ring-2 shadow-lg' : ''
                      }`}
                      style={selectedCategory === category.name
                        ? { '--tw-ring-color': THEME.antiqueGold } as React.CSSProperties
                        : { border: `1px solid ${THEME.softEmerald}` }}
                    >
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0" style={{ backgroundColor: THEME.emerald, opacity: 0.8 }}></div>
                      )}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${THEME.nightForest}cc, ${THEME.nightForest}33, transparent)` }}></div>
                      <div className="relative h-full flex flex-col justify-end p-3">
                        <h4 className="text-white font-bold text-sm">{category.name}</h4>
                        {category.productCount > 0 && (
                          <p className="text-[10px]" style={{ color: `${THEME.mintGlow}b3` }}>{category.productCount} منتج</p>
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
        <div className="fixed inset-0 z-[55]" style={{ backgroundColor: THEME.warmLinen, animation: 'fadeIn 0.2s ease-out' }}>
          {/* Search Header */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${THEME.softEmerald}` }}>
            <button onClick={closeSearchOverlay} className="p-2 rounded-full transition-colors" style={{ color: THEME.mossGray }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث عن أشجار، نباتات، ديكور..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl px-4 py-2.5 pr-10 text-sm placeholder-gray-400 focus:outline-none transition-all"
                style={{
                  fontFamily: 'Cairo, sans-serif',
                  backgroundColor: THEME.cardWhite,
                  border: `1.5px solid ${THEME.softEmerald}`,
                  color: THEME.charcoalInk,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = THEME.antiqueGold; e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.antiqueGold}20`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = THEME.softEmerald; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke={THEME.mossGray} viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: THEME.mossGray }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${THEME.emerald}10` }}>
                  <LeafIcon size={28} color={THEME.emerald} />
                </div>
                <p className="text-sm" style={{ color: THEME.mossGray }}>ابحث عن المنتجات</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${THEME.emerald}10` }}>
                  <LeafIcon size={28} color={THEME.emerald} />
                </div>
                <p className="text-sm" style={{ color: THEME.mossGray }}>لا توجد نتائج لـ &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: THEME.mossGray }}>{filteredProducts.length} نتيجة</p>
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
                      containerClassName={BOTANICAL_CARD_MOBILE.className}
                      containerStyle={BOTANICAL_CARD_MOBILE.style}
                                imageFill
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
          <div className="fixed bottom-0 left-0 right-0 z-[56] rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden" style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'env(safe-area-inset-bottom, 0px)', backgroundColor: THEME.warmLinen }}>
            {/* Panel drag indicator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ backgroundColor: `${THEME.antiqueGold}40` }}></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 mt-1" style={{ borderBottom: `1px solid ${THEME.softEmerald}` }}>
              <div className="flex items-center gap-1.5">
                <LeafIcon size={16} color={THEME.emerald} />
                <h3 className="text-base font-bold" style={{ color: THEME.charcoalInk }}>حسابي</h3>
              </div>
              <button onClick={closeAccountPanel} className="p-1.5 rounded-full transition-colors" style={{ color: THEME.mossGray }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Account Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-56px)] scrollbar-hide">
              {/* Auth Section */}
              {(!isAuthenticated && !profile) ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${THEME.emerald}10` }}>
                    <svg className="w-8 h-8" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm mb-4" style={{ color: THEME.mossGray }}>سجل دخولك للوصول لحسابك</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.href = '/auth/login'}
                      className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition-all active:scale-95"
                      style={{ backgroundColor: THEME.emerald }}
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      onClick={() => window.location.href = '/auth/signup'}
                      className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                      style={{ border: `2px solid ${THEME.emerald}`, color: THEME.emerald }}
                    >
                      حساب جديد
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: `1px solid ${THEME.softEmerald}` }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: THEME.emerald }}>
                      {profile?.full_name?.charAt(0) || userInfo.name?.charAt(0) || '؟'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: THEME.charcoalInk }}>{profile?.full_name || userInfo.name || 'مستخدم'}</h4>
                      <p className="text-xs" style={{ color: THEME.mossGray }}>{profile?.email || userInfo.email || ''}</p>
                    </div>
                  </div>

                  {/* Admin Menu Items */}
                  {isAdminOrStaff && (
                    <div className="space-y-1 mb-4">
                      <button onClick={() => { window.location.href = '/customer-orders'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right"
                        style={{ backgroundColor: 'transparent' }}
                        onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = THEME.parchment; }}
                        onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>طلبات العملاء</span>
                      </button>
                      <button onClick={() => { window.location.href = '/admin/products'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>إدارة المتجر</span>
                      </button>
                      <button onClick={() => { window.location.href = '/pos'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>نظام نقاط البيع</span>
                      </button>
                      <button onClick={() => { window.location.href = '/shipping'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.antiqueGold}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.antiqueGold} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>تفاصيل الشحن</span>
                      </button>
                    </div>
                  )}

                  {/* Regular User Menu Items */}
                  {!isAdminOrStaff && (
                    <div className="space-y-1 mb-4">
                      <button onClick={() => { window.location.href = '/profile'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>الملف الشخصي</span>
                      </button>
                      <button onClick={() => { window.location.href = '/favorites'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.antiqueGold}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.antiqueGold} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>المفضلة</span>
                      </button>
                      <button onClick={() => { window.location.href = '/my-orders'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>طلباتي</span>
                      </button>
                      <button onClick={() => { window.location.href = '/my-invoices'; closeAccountPanel(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                          <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>فواتيري</span>
                      </button>
                    </div>
                  )}

                  {/* Common Menu Items */}
                  <div className="space-y-1 pt-3" style={{ borderTop: `1px solid ${THEME.softEmerald}` }}>
                    <button onClick={() => { window.location.href = '/social-media'; closeAccountPanel(); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.antiqueGold}15` }}>
                        <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.antiqueGold} viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>تابعنا</span>
                    </button>
                    <button onClick={() => { window.location.href = '/catalog'; closeAccountPanel(); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-right">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}15` }}>
                        <svg className="w-4.5 h-4.5" fill="none" stroke={THEME.emerald} viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium" style={{ color: `${THEME.charcoalInk}cc` }}>كتالوج</span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${THEME.softEmerald}` }}>
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
          <div
            className="rounded-t-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', backgroundColor: THEME.cardWhite }}
          >
            {/* Drag indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ backgroundColor: `${THEME.antiqueGold}40` }}></div>

            <div className="flex items-center justify-center mb-1 mt-2">
              <LeafIcon size={18} color={THEME.emerald} />
            </div>
            <h3 className="text-lg font-bold text-center mb-1" style={{ color: THEME.charcoalInk }}>{selectedProduct.name}</h3>
            <p className="text-center text-xs mb-5" style={{ color: THEME.mossGray }}>تحديد الكمية</p>

            <div className="flex items-center justify-center gap-5 mb-6">
              <button
                onClick={() => setQuantityValue(Math.max(1, quantityValue - 1))}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${
                  quantityValue <= 1 ? 'opacity-40' : 'active:scale-95'
                }`}
                style={{ backgroundColor: THEME.parchment, color: THEME.charcoalInk }}
              >
                -
              </button>
              <span className="text-3xl font-bold w-14 text-center" style={{ color: THEME.charcoalInk }}>{quantityValue}</span>
              <button
                onClick={() => setQuantityValue(quantityValue + 1)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white active:scale-95 transition-all"
                style={{ backgroundColor: THEME.emerald }}
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
              style={{ backgroundColor: THEME.emerald }}
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
        theme={{
          headerBg: THEME.deepForest,
          accentColor: THEME.emerald,
          buttonBg: THEME.emerald,
          buttonHoverBg: THEME.darkEmerald,
        }}
      />

      {/* ===== WHATSAPP FLOATING BUTTON ===== */}
      {!profileLoading && !isAdminOrStaff && whatsappNumber && (
        <div className="[&>div]:bottom-24 [&>div]:left-4">
          <WhatsAppFloatingButton whatsappNumber={whatsappNumber} />
        </div>
      )}
    </div>
  );
}
