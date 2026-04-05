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
import { usePreFetchedData } from '@/lib/contexts/PreFetchedDataContext';
import BannerEditorFull from '@/components/banner-editor/BannerEditor';
import PromoCardsRenderer from '@/components/banner-editor/PromoCardsRenderer';
import MidBannerRenderer from '@/components/banner-editor/MidBannerRenderer';

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

// Botanical card styling for InteractiveProductCard
const BOTANICAL_CARD = {
  className: 'rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1',
  style: {
    backgroundColor: THEME.parchment,
    border: `1px solid ${THEME.softEmerald}`,
    boxShadow: '0 2px 12px rgba(27,58,45,0.06)',
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
  <div className="flex items-center gap-4 my-8">
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}40, transparent)` }}></div>
    <div className="flex items-center gap-1">
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color} opacity="0.5" style={{ transform: 'scaleX(-1)' }}>
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${color}60` }}></div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={color} opacity="0.5">
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
      <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: 'جودة مضمونة',
    subtitle: 'منتجات أصلية 100%',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'دعم متواصل',
    subtitle: 'خدمة عملاء على مدار الساعة',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    title: 'استرجاع سهل',
    subtitle: 'إرجاع خلال 14 يوم',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
      </svg>
    ),
  },
];

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
  const [selectedCategory, setSelectedCategory] = useState('\u0627\u0644\u0643\u0644');
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  // Use right sidebar hook for the website menu
  const { isRightSidebarOpen, toggleRightSidebar, closeRightSidebar } = useRightSidebar();
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Refs for horizontal scrolling
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  // Performance: Limit visible products for better rendering
  const VISIBLE_PRODUCTS_LIMIT = 20;
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Get user profile to check admin status
  const { isAdmin, profile, loading: profileLoading } = useUserProfile();

  // Check if user is admin or staff
  const isAdminOrStaff = profile?.role === '\u0623\u062f\u0645\u0646 \u0631\u0626\u064a\u0633\u064a' || profile?.role === '\u0645\u0648\u0638\u0641';

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
      const selectedColorName = selectedProduct.selectedColor?.name || undefined;
      const selectedShapeName = selectedProduct.selectedShape?.name || undefined;
      const productNote = selectedProduct.note || undefined;
      const customImageUrl = selectedProduct.customImage || undefined;
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price, selectedColorName, selectedShapeName, undefined, productNote, customImageUrl);
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
          const { supabase } = await import('../../app/lib/supabase/client');
          const { data: variants, error: variantsError } = await supabase
            .from('product_color_shape_definitions')
            .select('*')
            .in('variant_type', ['color', 'shape'])
            .order('sort_order', { ascending: true });

          if (variantsError) {
            console.error('Error fetching product color/shape definitions:', variantsError);
          }

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
                name: variant.color_name || variant.name || '\u0644\u0648\u0646 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
                hex: variant.color_hex || '#000000',
                image_url: variant.image_url || null
              }));

              const productShapes = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'shape') || [];
              const shapes = productShapes.map((variant: any) => ({
                id: variant.id,
                name: variant.name || '\u0634\u0643\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
                image_url: variant.image_url || null
              }));

              const sizeGroupInfo = productsInSizeGroups.get(dbProduct.id);
              const sizes = sizeGroupInfo ? sizeGroupInfo.sizes : [];

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

    if (favorites.length > 0) {
      const firstFavoriteProduct = websiteProducts.find(p => favorites.includes(String(p.id)));
      const favoriteCategoryImage = firstFavoriteProduct?.image || '';

      convertedCategories.push({
        id: 'favorites',
        name: '\u0627\u0644\u0645\u0641\u0636\u0644\u0629',
        description: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0644\u062f\u064a\u0643',
        icon: '\u2764\uFE0F',
        image: favoriteCategoryImage,
        productCount: favorites.length
      });
    }

    if (categoriesWithProducts && categoriesWithProducts.length > 0) {
      const storeCategories = categoriesWithProducts.map((storeCategory: any) => ({
        id: storeCategory.id,
        name: storeCategory.name,
        description: storeCategory.description || storeCategory.name,
        icon: '\uD83D\uDCE6',
        image: storeCategory.image_url || '',
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
    const cardUrls = getTransformedUrls(allImageSrcs, 'card_desktop');
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

  // Load raw sections data
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
    return () => { isMounted = false; };
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
      setIsCompactHeaderVisible(window.scrollY > 140);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  const filteredProducts = useMemo(() => {
    let productsToFilter = websiteProducts;

    if (selectedCategory === '\u0627\u0644\u0645\u0641\u0636\u0644\u0629') {
      productsToFilter = websiteProducts.filter(product =>
        favorites.includes(String(product.id))
      );
    } else if (selectedCategory !== '\u0627\u0644\u0643\u0644' && categoriesWithProducts.length > 0) {
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

  const modalsConfig = useMemo(() => [
    {
      id: 'product-details',
      isOpen: isProductModalOpen,
      onClose: () => { setIsProductModalOpen(false); setSelectedProductId(''); }
    },
    {
      id: 'cart',
      isOpen: isCartModalOpen,
      onClose: () => setIsCartModalOpen(false)
    },
    {
      id: 'quantity',
      isOpen: isQuantityModalOpen,
      onClose: () => { setIsQuantityModalOpen(false); setSelectedProduct(null); }
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

  useStoreBackHandler(modalsConfig);

  // Is this the home view? (no search, "الكل" category)
  const isHomeView = selectedCategory === '\u0627\u0644\u0643\u0644' && !searchQuery;

  // ============================================
  // LOADING STATE
  // ============================================
  if (!isClient || isLoading || isThemeLoading || isCompanyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: THEME.warmLinen }}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: THEME.emerald, animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: THEME.antiqueGold, animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: THEME.emerald, animationDelay: '300ms' }}></div>
          </div>
          <p className="text-sm font-medium" style={{ color: THEME.mossGray }}>جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  const allCategoryNames = ['\u0627\u0644\u0643\u0644', ...categories.map((c: any) => c.name)];

  // Scroll featured carousel
  const scrollFeatured = (direction: 'left' | 'right') => {
    if (featuredScrollRef.current) {
      const scrollAmount = 300;
      featuredScrollRef.current.scrollBy({
        left: direction === 'right' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      {/* Right Sidebar for Website Menu */}
      <RightSidebar
        isOpen={isRightSidebarOpen}
        onClose={closeRightSidebar}
        onCategorySelect={(categoryName) => setSelectedCategory(categoryName)}
        theme={{
          bgColor: THEME.warmLinen,
          headerBg: THEME.deepForest,
          headerText: '#FFFFFF',
          itemHoverBg: THEME.parchment,
          iconBg: THEME.emerald,
          iconHoverBg: THEME.darkEmerald,
          textColor: THEME.charcoalInk,
          subtextColor: THEME.mossGray,
          borderColor: THEME.softEmerald,
          footerBg: THEME.parchment,
          accentColor: THEME.antiqueGold,
        }}
      />

      <div className="min-h-screen" style={{ backgroundColor: THEME.warmLinen, color: THEME.charcoalInk }} dir="rtl">
        {/* Hide system headers */}
        <style jsx global>{`
          body { margin-top: 0 !important; padding-top: 0 !important; }
          html { margin-top: 0 !important; padding-top: 0 !important; }
          iframe, .system-header, [class*="system"], [class*="navigation"],
          [style*="background: #374151"], [style*="background-color: #374151"] {
            display: none !important;
          }
          @keyframes heroFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(212,165,116,0.3); }
            50% { box-shadow: 0 0 40px rgba(212,165,116,0.6); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>

        {/* ============================================ */}
        {/* TOP UTILITY BAR                             */}
        {/* ============================================ */}
        <div className="w-full py-2.5" style={{ backgroundColor: THEME.nightForest, borderBottom: `2px solid ${THEME.antiqueGold}40` }}>
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="text-white/80 hover:text-white transition-colors" onClick={toggleRightSidebar} title="القائمة">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button onClick={() => setIsCartModalOpen(true)} className="relative text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartBadgeCount > 0 && (
                  <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: THEME.antiqueGold }}>
                    {cartBadgeCount}
                  </span>
                )}
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs" style={{ color: `${THEME.antiqueGold}cc` }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span>شحن لجميع المحافظات</span>
            </div>
            <div className="flex items-center gap-3">
              <AuthButtons compact />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* MAIN HEADER                                 */}
        {/* ============================================ */}
        <header
          className={`z-40 transition-all duration-300 ${isCompactHeaderVisible ? 'fixed top-0 left-0 right-0' : 'relative'}`}
          style={{
            backgroundColor: THEME.warmLinen,
            borderBottom: `1px solid ${THEME.softEmerald}`,
            boxShadow: isCompactHeaderVisible ? '0 4px 30px rgba(27,58,45,0.1)' : '0 1px 8px rgba(27,58,45,0.04)'
          }}
        >
          {/* Compact utility bar when sticky */}
          {isCompactHeaderVisible && (
            <div className="w-full py-1.5" style={{ backgroundColor: THEME.nightForest, borderBottom: `2px solid ${THEME.antiqueGold}40` }}>
              <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="text-white/80 hover:text-white transition-colors" onClick={toggleRightSidebar}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button onClick={() => setIsCartModalOpen(true)} className="relative text-white/80 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {cartBadgeCount > 0 && (
                      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: THEME.antiqueGold }}>
                        {cartBadgeCount}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <AuthButtons compact />
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
            {/* Logo + Name - Right side (RTL) */}
            <div
              className="flex items-center gap-3 cursor-pointer flex-shrink-0"
              onClick={() => { setSelectedCategory('\u0627\u0644\u0643\u0644'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <div className={`h-12 w-12 ${logoRoundingClass} overflow-hidden flex items-center justify-center`} style={{ backgroundColor: THEME.parchment, boxShadow: `0 0 0 2px ${THEME.antiqueGold}60` }}>
                <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-full w-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: THEME.charcoalInk }}>{companyName}</h1>
                <p className="text-[10px]" style={{ color: THEME.mossGray }}>متجر النباتات والأشجار</p>
              </div>
            </div>

            {/* Search Bar - Center */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن أشجار، نباتات، ديكور..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full px-6 py-2.5 pr-12 placeholder-gray-400 focus:outline-none transition-all duration-200 text-sm"
                  style={{
                    backgroundColor: THEME.cardWhite,
                    border: `1.5px solid ${THEME.softEmerald}`,
                    color: THEME.charcoalInk,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = THEME.antiqueGold; e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.antiqueGold}20`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = THEME.softEmerald; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4" fill="none" stroke={THEME.mossGray} viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: THEME.mossGray }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Actions - Left side (RTL) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setIsCartModalOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{ backgroundColor: `${THEME.emerald}12`, color: THEME.emerald }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${THEME.emerald}20`; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${THEME.emerald}12`; }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>السلة</span>
                {cartBadgeCount > 0 && (
                  <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: THEME.antiqueGold }}>
                    {cartBadgeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Botanical vine decoration */}
          <div className="h-1" style={{ background: `linear-gradient(to left, ${THEME.emerald}00, ${THEME.emerald}30, ${THEME.antiqueGold}40, ${THEME.emerald}30, ${THEME.emerald}00)` }}></div>
        </header>

        {/* Spacer for when header is fixed */}
        {isCompactHeaderVisible && <div style={{ height: '120px' }}></div>}

        {/* ============================================ */}
        {/* HERO BANNER - Dynamic Banner Editor         */}
        {/* ============================================ */}
        {isHomeView && (
          <BannerEditorFull
            initialBanners={preFetchedBanners || []}
            height={480}
            isAdmin={isAdminOrStaff}
            theme={THEME}
            fallbackSlides={HERO_SLIDES}
            themeId="just-a-tree"
            deviceType="desktop"
          />
        )}

        {/* ============================================ */}
        {/* TRUST / FEATURES BAR                        */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="py-8" style={{ backgroundColor: THEME.parchment, borderTop: `1px solid ${THEME.antiqueGold}20`, borderBottom: `1px solid ${THEME.antiqueGold}20` }}>
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-4 gap-6">
                {TRUST_BADGES.map((badge, index) => (
                  <div key={index} className="flex flex-col items-center text-center group">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1"
                      style={{ backgroundColor: THEME.emerald, boxShadow: `0 4px 12px ${THEME.emerald}30` }}
                    >
                      {badge.icon}
                    </div>
                    <h4 className="font-bold text-sm mb-0.5" style={{ color: THEME.charcoalInk }}>{badge.title}</h4>
                    <p className="text-xs" style={{ color: THEME.mossGray }}>{badge.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* CATEGORY SHOWCASE                           */}
        {/* ============================================ */}
        {!searchQuery && categories && categories.length > 0 && (
          <section className="py-8" style={{ backgroundColor: THEME.warmLinen }}>
            <div className="max-w-7xl mx-auto px-6">
              {isHomeView && (
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                    <h3 className="text-xl font-bold" style={{ color: THEME.charcoalInk }}>تصفح الأقسام</h3>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2" style={{ scrollSnapType: 'x mandatory' }}>
                {/* All category button */}
                <button
                  onClick={() => setSelectedCategory('\u0627\u0644\u0643\u0644')}
                  className="flex-shrink-0 transition-all duration-300"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="w-28 h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1"
                    style={{
                      backgroundColor: selectedCategory === '\u0627\u0644\u0643\u0644' ? THEME.emerald : THEME.cardWhite,
                      color: selectedCategory === '\u0627\u0644\u0643\u0644' ? '#fff' : THEME.charcoalInk,
                      border: selectedCategory === '\u0627\u0644\u0643\u0644' ? 'none' : `1px solid ${THEME.softEmerald}`,
                      boxShadow: selectedCategory === '\u0627\u0644\u0643\u0644' ? `0 8px 24px ${THEME.emerald}40` : '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    <span className="text-xs font-bold">الكل</span>
                  </div>
                </button>

                {categories.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="flex-shrink-0 transition-all duration-300"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div
                      className="w-28 h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
                      style={{
                        backgroundColor: selectedCategory === cat.name ? THEME.emerald : THEME.cardWhite,
                        color: selectedCategory === cat.name ? '#fff' : THEME.charcoalInk,
                        border: selectedCategory === cat.name ? 'none' : `1px solid ${THEME.softEmerald}`,
                        boxShadow: selectedCategory === cat.name ? `0 8px 24px ${THEME.emerald}40` : '0 2px 8px rgba(0,0,0,0.04)',
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
                          <div className="relative z-10 mt-auto pb-2">
                            <span className="text-xs font-bold text-white block">{cat.name}</span>
                            <span className="text-[10px] text-white/70">{cat.productCount} منتج</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <LeafIcon size={28} color={selectedCategory === cat.name ? '#fff' : THEME.emerald} />
                          <span className="text-xs font-bold">{cat.name}</span>
                          <span className="text-[10px]" style={{ color: selectedCategory === cat.name ? 'rgba(255,255,255,0.7)' : THEME.mossGray }}>{cat.productCount} منتج</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* PROMOTIONAL BANNER GRID (Editable)          */}
        {/* ============================================ */}
        {isHomeView && (
          <PromoCardsRenderer
            banners={preFetchedBanners || []}
            isAdmin={isAdminOrStaff}
            theme={THEME}
            themeId="just-a-tree"
            deviceType="desktop"
          />
        )}

        {/* ============================================ */}
        {/* MAIN CONTENT                                */}
        {/* ============================================ */}
        <main className="max-w-7xl mx-auto px-6 py-8">

          {/* Custom Sections - horizontal scrollable */}
          {isSectionsReady && isHomeView && sectionsWithProducts.length > 0 && (
            <>
              {sectionsWithProducts.map((section: any, sectionIndex: number) => (
                section.products && section.products.length > 0 && (
                  <section
                    key={section.id}
                    className="mb-14 -mx-6 px-6 py-10"
                    style={{ backgroundColor: sectionIndex % 2 === 0 ? 'transparent' : THEME.parchment }}
                  >
                    {/* Section header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                        <h3 className="text-2xl font-black" style={{ color: THEME.charcoalInk }}>{section.name}</h3>
                      </div>
                      <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${THEME.emerald}10`, color: THEME.emerald }}>
                        {section.products.length} منتج
                      </span>
                    </div>
                    <BotanicalDivider color={THEME.emerald} />

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {section.products.map((product: Product) => (
                        <InteractiveProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={handleAddToCart}
                          deviceType="desktop"
                          onProductClick={handleProductClick}
                          displaySettings={displaySettings}
                          containerClassName={BOTANICAL_CARD.className}
                          containerStyle={BOTANICAL_CARD.style}
                          imageFill
                        />
                      ))}
                    </div>
                  </section>
                )
              ))}
            </>
          )}

          {/* ============================================ */}
          {/* FEATURED PRODUCTS CAROUSEL                 */}
          {/* ============================================ */}
          {isHomeView && featuredProducts.length > 0 && (
            <section className="mb-14 -mx-6 py-12 px-6 relative overflow-hidden" style={{ backgroundColor: THEME.deepForest }}>
              {/* Background decorations */}
              <TreeSilhouette className="absolute bottom-0 left-10 h-60 w-60" opacity={0.04} />
              <LeafPattern className="absolute top-0 right-0 w-64 h-64" opacity={0.04} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                    <h3 className="text-2xl font-black text-white">منتجات مميزة</h3>
                    <LeafIcon size={20} color={THEME.antiqueGold} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scrollFeatured('right')}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button
                      onClick={() => scrollFeatured('left')}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  </div>
                </div>

                <div
                  ref={featuredScrollRef}
                  className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
                  style={{ scrollSnapType: 'x mandatory' }}
                >
                  {featuredProducts.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-64" style={{ scrollSnapAlign: 'start' }}>
                      <InteractiveProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        deviceType="desktop"
                        onProductClick={handleProductClick}
                        displaySettings={displaySettings}
                        containerClassName={BOTANICAL_CARD.className}
                        containerStyle={BOTANICAL_CARD.style}
                        imageFill
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* MID-PAGE PROMOTIONAL BANNER (Editable)     */}
          {/* ============================================ */}
          {isHomeView && (
            <MidBannerRenderer
              banners={preFetchedBanners || []}
              isAdmin={isAdminOrStaff}
              theme={THEME}
              themeId="just-a-tree"
              deviceType="desktop"
            />
          )}

          {/* ============================================ */}
          {/* ALL PRODUCTS SECTION                       */}
          {/* ============================================ */}
          <section id="products" className="mb-12">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                <h3 className="text-2xl font-black" style={{ color: THEME.charcoalInk }}>
                  {selectedCategory === '\u0627\u0644\u0643\u0644' ? 'جميع المنتجات' : selectedCategory}
                </h3>
              </div>
              <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${THEME.emerald}10`, color: THEME.emerald }}>
                {filteredProducts.length} منتج
              </span>
            </div>
            <BotanicalDivider />

            {visibleProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-7">
                {visibleProducts.map((product) => (
                  <InteractiveProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    deviceType="desktop"
                    onProductClick={handleProductClick}
                    displaySettings={displaySettings}
                    containerClassName={BOTANICAL_CARD.className}
                    containerStyle={BOTANICAL_CARD.style}
                    imageFill
                  />
                ))}

                {hasMoreProducts && (
                  <div className="col-span-full flex justify-center py-8">
                    <button
                      onClick={() => setShowAllProducts(true)}
                      className="px-8 py-3 rounded-full font-bold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                      style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.deepGold; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.antiqueGold; }}
                    >
                      <LeafIcon size={14} color={THEME.nightForest} />
                      عرض المزيد ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} منتج)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}10` }}>
                  <TreeSilhouette className="w-10 h-10" color={THEME.emerald} opacity={0.4} />
                </div>
                <p className="text-lg font-medium mb-2" style={{ color: THEME.charcoalInk }}>لا توجد منتجات في هذه الفئة</p>
                <p className="text-sm" style={{ color: THEME.mossGray }}>جرّب البحث بكلمات مختلفة أو تصفح الأقسام الأخرى</p>
              </div>
            )}
          </section>
        </main>

        {/* ============================================ */}
        {/* FOOTER                                      */}
        {/* ============================================ */}
        <footer className="w-full relative overflow-hidden" style={{ backgroundColor: THEME.nightForest }}>
          {/* Pre-footer newsletter strip */}
          <div className="py-10 relative" style={{ backgroundColor: THEME.emerald }}>
            <LeafPattern className="absolute top-0 right-0 w-full h-full" opacity={0.06} />
            <div className="max-w-7xl mx-auto px-6 relative z-10 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-white mb-1">اشترك في نشرتنا البريدية</h4>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>احصل على أحدث العروض والمنتجات الجديدة</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  placeholder="بريدك الإلكتروني"
                  className="px-5 py-3 rounded-full text-sm w-72 focus:outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <button
                  className="px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 hover:shadow-lg"
                  style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
                >
                  اشترك الآن
                </button>
              </div>
            </div>
          </div>

          {/* Main footer content */}
          <TreeSilhouette className="absolute bottom-0 left-0 h-64 w-64" opacity={0.03} />
          <TreeSilhouette className="absolute bottom-0 right-20 h-48 w-48" opacity={0.02} />

          <div className="max-w-7xl mx-auto px-6 py-14 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {/* Column 1: Company Info */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`h-12 w-12 ${logoRoundingClass} overflow-hidden flex items-center justify-center`} style={{ backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: `0 0 0 2px ${THEME.antiqueGold}40` }}>
                    <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h5 className="font-bold text-lg text-white">{companyName}</h5>
                    <p className="text-xs" style={{ color: THEME.mintGlow }}>متجر النباتات والأشجار</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  متجرك المتكامل للحصول على أفضل الأشجار والنباتات الزينة بأعلى جودة وأسعار مميزة. نسعى لتحويل مساحتك إلى واحة طبيعية.
                </p>

                {/* Social Media Links */}
                {socialMedia && socialMedia.length > 0 && socialMedia.some((sm: any) => sm.platform && sm.link) && (
                  <div className="flex items-center gap-3">
                    {socialMedia
                      .filter((sm: any) => sm.platform && sm.link)
                      .map((sm: any, index: number) => (
                        <a
                          key={index}
                          href={sm.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300"
                          title={sm.platform}
                          style={{ border: `1px solid ${THEME.antiqueGold}40`, color: THEME.antiqueGold }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = `${THEME.antiqueGold}20`;
                            e.currentTarget.style.borderColor = THEME.antiqueGold;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = `${THEME.antiqueGold}40`;
                          }}
                        >
                          {sm.platform?.charAt(0)?.toUpperCase()}
                        </a>
                      ))}
                  </div>
                )}
              </div>

              {/* Column 2: Quick Links */}
              <div>
                <h6 className="font-bold text-white mb-5 text-base flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                  روابط سريعة
                </h6>
                <ul className="space-y-3">
                  <li>
                    <button
                      onClick={() => { setSelectedCategory('\u0627\u0644\u0643\u0644'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="text-sm flex items-center gap-2 transition-all duration-200"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      <LeafIcon size={10} color={THEME.mintGlow} />
                      الرئيسية
                    </button>
                  </li>
                  <li>
                    <a
                      href="#products"
                      className="text-sm flex items-center gap-2 transition-all duration-200"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      <LeafIcon size={10} color={THEME.mintGlow} />
                      المنتجات
                    </a>
                  </li>
                  {categories.slice(0, 4).map((cat: any) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => { setSelectedCategory(cat.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-sm flex items-center gap-2 transition-all duration-200"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                      >
                        <LeafIcon size={10} color={THEME.mintGlow} />
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 3: Customer Service */}
              <div>
                <h6 className="font-bold text-white mb-5 text-base flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                  خدمة العملاء
                </h6>
                <ul className="space-y-3">
                  {['المساعدة والدعم', 'سياسة الإرجاع', 'الشحن والتوصيل', 'طرق الدفع', 'الأسئلة الشائعة'].map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm flex items-center gap-2 transition-all duration-200"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                      >
                        <LeafIcon size={10} color={THEME.mintGlow} />
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Column 4: Contact */}
              <div>
                <h6 className="font-bold text-white mb-5 text-base flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                  تواصل معنا
                </h6>
                <div className="space-y-4">
                  <p className="text-sm flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.emerald}30` }}>
                      <svg className="w-4 h-4" fill="none" stroke={THEME.mintGlow} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    966+123456789
                  </p>
                  <p className="text-sm flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.emerald}30` }}>
                      <svg className="w-4 h-4" fill="none" stroke={THEME.mintGlow} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    info@store.com
                  </p>
                  <p className="text-sm flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.emerald}30` }}>
                      <svg className="w-4 h-4" fill="none" stroke={THEME.mintGlow} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                      </svg>
                    </div>
                    مصر
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div style={{ borderTop: `1px solid ${THEME.antiqueGold}20` }}>
            <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                &copy; {new Date().getFullYear()} {companyName}. جميع الحقوق محفوظة.
              </p>
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                صنع بعناية
                <LeafIcon size={12} color={THEME.mintGlow} />
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================ */}
      {/* MODALS                                       */}
      {/* ============================================ */}

      <ProductDetailsModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        productId={selectedProductId}
      />

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

      {/* Quantity Modal */}
      {isQuantityModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm" onClick={() => { setIsQuantityModalOpen(false); setSelectedProduct(null); }}>
          <div
            className="rounded-3xl p-8 w-80"
            style={{
              backgroundColor: THEME.cardWhite,
              boxShadow: '0 20px 60px rgba(27,58,45,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-2">
              <LeafIcon size={20} color={THEME.emerald} />
            </div>
            <h3 className="text-lg font-bold text-center mb-6" style={{ color: THEME.charcoalInk }}>{selectedProduct.name}</h3>
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setQuantityValue(Math.max(1, quantityValue - 1))}
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: THEME.parchment, color: THEME.charcoalInk }}
              >
                -
              </button>
              <input
                type="number"
                value={quantityValue}
                onChange={e => setQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center text-2xl font-black border-b-2 focus:outline-none"
                style={{ borderColor: THEME.emerald, color: THEME.charcoalInk, backgroundColor: 'transparent' }}
              />
              <button
                onClick={() => setQuantityValue(quantityValue + 1)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold text-white transition-all duration-200 hover:scale-110"
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
              className="w-full py-3.5 rounded-full text-white font-bold text-lg transition-all duration-300 hover:shadow-lg"
              style={{ backgroundColor: THEME.emerald }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.darkEmerald; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.emerald; }}
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
