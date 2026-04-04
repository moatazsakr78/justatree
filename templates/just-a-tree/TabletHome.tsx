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

// ============================================
// Botanical Decorative Components
// ============================================

const LeafIcon = ({ size = 14, color = THEME.emerald }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
  </svg>
);

const BotanicalDivider = ({ color = THEME.emerald }: { color?: string }) => (
  <div className="flex items-center gap-4 my-6">
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${color}40, transparent)` }}></div>
    <div className="flex items-center gap-1">
      <svg width="14" height="14" viewBox="0 0 24 24" fill={color} opacity="0.5" style={{ transform: 'scaleX(-1)' }}>
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${color}60` }}></div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={color} opacity="0.5">
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
    badge: '\u0639\u0631\u0648\u0636 \u062d\u0635\u0631\u064a\u0629',
    title: '\u0627\u062c\u0639\u0644 \u0645\u0633\u0627\u062d\u062a\u0643 \u062a\u0646\u0628\u0636 \u0628\u0627\u0644\u062d\u064a\u0627\u0629',
    subtitle: '\u0627\u0643\u062a\u0634\u0641 \u0645\u062c\u0645\u0648\u0639\u062a\u0646\u0627 \u0627\u0644\u0645\u0645\u064a\u0632\u0629 \u0645\u0646 \u0627\u0644\u0623\u0634\u062c\u0627\u0631 \u0648\u0627\u0644\u0646\u0628\u0627\u062a\u0627\u062a \u0627\u0644\u0632\u064a\u0646\u0629 \u0628\u0623\u0639\u0644\u0649 \u062c\u0648\u062f\u0629 \u0648\u0623\u0641\u0636\u0644 \u0627\u0644\u0623\u0633\u0639\u0627\u0631',
    cta: '\u062a\u0633\u0648\u0642 \u0627\u0644\u0622\u0646',
    gradient: `linear-gradient(135deg, ${THEME.deepForest} 0%, ${THEME.emerald} 50%, ${THEME.darkEmerald} 100%)`,
  },
  {
    badge: '\u0648\u0635\u0644 \u062d\u062f\u064a\u062b\u0627\u064b',
    title: '\u0646\u0628\u0627\u062a\u0627\u062a \u062f\u0627\u062e\u0644\u064a\u0629 \u0623\u0646\u064a\u0642\u0629',
    subtitle: '\u0623\u0636\u0641 \u0644\u0645\u0633\u0629 \u0637\u0628\u064a\u0639\u064a\u0629 \u0644\u0645\u0646\u0632\u0644\u0643 \u0645\u0639 \u062a\u0634\u0643\u064a\u0644\u062a\u0646\u0627 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0645\u0646 \u0627\u0644\u0646\u0628\u0627\u062a\u0627\u062a \u0627\u0644\u062f\u0627\u062e\u0644\u064a\u0629 \u0627\u0644\u0641\u0627\u062e\u0631\u0629',
    cta: '\u0627\u0643\u062a\u0634\u0641 \u0627\u0644\u0645\u0632\u064a\u062f',
    gradient: `linear-gradient(135deg, ${THEME.emerald} 0%, #40916C 50%, ${THEME.deepForest} 100%)`,
  },
  {
    badge: '\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u0627\u064b',
    title: '\u0623\u0634\u062c\u0627\u0631 \u0632\u064a\u0646\u0629 \u0641\u0627\u062e\u0631\u0629',
    subtitle: '\u062c\u0648\u062f\u0629 \u0639\u0627\u0644\u064a\u0629 \u0648\u0623\u0633\u0639\u0627\u0631 \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u062a\u0632\u064a\u064a\u0646 \u0645\u0633\u0627\u062d\u0627\u062a\u0643 \u0627\u0644\u0645\u0646\u0632\u0644\u064a\u0629 \u0648\u0627\u0644\u0645\u0643\u062a\u0628\u064a\u0629',
    cta: '\u062a\u0635\u0641\u062d \u0627\u0644\u0622\u0646',
    gradient: `linear-gradient(135deg, ${THEME.nightForest} 0%, ${THEME.deepForest} 50%, ${THEME.emerald} 100%)`,
  }
];

// Promotional banners data
const PROMO_BANNERS = [
  {
    title: '\u0623\u0634\u062c\u0627\u0631 \u0632\u064a\u0646\u0629 \u0641\u0627\u062e\u0631\u0629',
    subtitle: '\u062e\u0635\u0645 \u064a\u0635\u0644 \u0625\u0644\u0649 30%',
    cta: '\u0627\u0643\u062a\u0634\u0641 \u0627\u0644\u0639\u0631\u0648\u0636',
    gradient: `linear-gradient(135deg, ${THEME.deepForest}, ${THEME.emerald})`,
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
  {
    title: '\u0646\u0628\u0627\u062a\u0627\u062a \u062f\u0627\u062e\u0644\u064a\u0629',
    subtitle: '\u0645\u062c\u0645\u0648\u0639\u0629 \u062c\u062f\u064a\u062f\u0629',
    cta: '\u062a\u0633\u0648\u0642 \u0627\u0644\u0622\u0646',
    gradient: `linear-gradient(135deg, ${THEME.antiqueGold}, ${THEME.deepGold})`,
    iconPath: 'M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z',
  },
  {
    title: '\u062a\u0646\u0633\u064a\u0642 \u062d\u062f\u0627\u0626\u0642',
    subtitle: '\u062e\u062f\u0645\u0627\u062a \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629',
    cta: '\u062a\u0639\u0631\u0641 \u0623\u0643\u062b\u0631',
    gradient: `linear-gradient(135deg, ${THEME.nightForest}, ${THEME.darkEmerald})`,
    iconPath: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  },
];

// Trust badges data
const TRUST_BADGES = [
  {
    title: '\u0634\u062d\u0646 \u0633\u0631\u064a\u0639',
    subtitle: '\u062a\u0648\u0635\u064a\u0644 \u0644\u0628\u0627\u0628 \u0627\u0644\u0628\u064a\u062a',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: '\u062c\u0648\u062f\u0629 \u0645\u0636\u0645\u0648\u0646\u0629',
    subtitle: '\u0645\u0646\u062a\u062c\u0627\u062a \u0623\u0635\u0644\u064a\u0629 100%',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: '\u062f\u0639\u0645 \u0645\u062a\u0648\u0627\u0635\u0644',
    subtitle: '\u062e\u062f\u0645\u0629 \u0639\u0645\u0644\u0627\u0621 \u0639\u0644\u0649 \u0645\u062f\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    title: '\u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0633\u0647\u0644',
    subtitle: '\u0625\u0631\u062c\u0627\u0639 \u062e\u0644\u0627\u0644 14 \u064a\u0648\u0645',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
      </svg>
    ),
  },
];

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
  const [quantityValue, setQuantityValue] = useState(1);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Refs for horizontal scrolling
  const featuredScrollRef = useRef<HTMLDivElement>(null);

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
      const favoriteCategoryImage = firstFavoriteProduct?.image || '';

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
        console.error('Tablet Tree: Error loading custom sections:', error);
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
          <p className="text-sm font-medium" style={{ color: THEME.mossGray }}>{'\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062a\u062c\u0631...'}</p>
        </div>
      </div>
    );
  }

  // Scroll featured carousel
  const scrollFeatured = (direction: 'left' | 'right') => {
    if (featuredScrollRef.current) {
      const scrollAmount = 260;
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
      />

      <div dir="rtl" className="min-h-screen" style={{ backgroundColor: THEME.warmLinen, color: THEME.charcoalInk }}>
        {/* Global Styles */}
        <style jsx global>{`
          body { margin-top: 0 !important; padding-top: 0 !important; }
          html { margin-top: 0 !important; padding-top: 0 !important; }
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
          @keyframes heroFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
            from { opacity: 0; max-height: 0; }
            to { opacity: 1; max-height: 1000px; }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(212,165,116,0.3); }
            50% { box-shadow: 0 0 40px rgba(212,165,116,0.6); }
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* ============================================ */}
        {/* TOP UTILITY BAR                             */}
        {/* ============================================ */}
        <div className="w-full py-2" style={{ backgroundColor: THEME.nightForest, borderBottom: `2px solid ${THEME.antiqueGold}40` }}>
          <div className="max-w-[96%] mx-auto px-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AuthButtons compact />
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: `${THEME.antiqueGold}cc` }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span>{'\u0634\u062d\u0646 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0627\u062a'}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-white/80 hover:text-white transition-colors" onClick={toggleRightSidebar} title={'\u0627\u0644\u0642\u0627\u0626\u0645\u0629'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button onClick={() => setIsCartModalOpen(true)} className="relative text-white/80 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartBadgeCount > 0 && (
                  <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: THEME.antiqueGold }}>
                    {cartBadgeCount}
                  </span>
                )}
              </button>
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
              <div className="max-w-[96%] mx-auto px-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AuthButtons compact />
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-white/80 hover:text-white transition-colors" onClick={toggleRightSidebar}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button onClick={() => setIsCartModalOpen(true)} className="relative text-white/80 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    {cartBadgeCount > 0 && (
                      <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: THEME.antiqueGold }}>
                        {cartBadgeCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-[96%] mx-auto px-3 py-3 flex items-center justify-between gap-4">
            {/* Logo + Name */}
            <div
              className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
              onClick={() => { setSelectedCategory('\u0627\u0644\u0643\u0644'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <div className={`h-10 w-10 ${logoRoundingClass} overflow-hidden flex items-center justify-center`} style={{ backgroundColor: THEME.parchment, boxShadow: `0 0 0 2px ${THEME.antiqueGold}60` }}>
                <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-full w-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: THEME.charcoalInk }}>{companyName}</h1>
                <p className="text-[10px]" style={{ color: THEME.mossGray }}>{'\u0645\u062a\u062c\u0631 \u0627\u0644\u0646\u0628\u0627\u062a\u0627\u062a \u0648\u0627\u0644\u0623\u0634\u062c\u0627\u0631'}</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder={'\u0627\u0628\u062d\u062b \u0639\u0646 \u0623\u0634\u062c\u0627\u0631\u060c \u0646\u0628\u0627\u062a\u0627\u062a...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full px-5 py-2 pr-10 placeholder-gray-400 focus:outline-none transition-all duration-200 text-sm"
                  style={{
                    backgroundColor: THEME.cardWhite,
                    border: `1.5px solid ${THEME.softEmerald}`,
                    color: THEME.charcoalInk,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = THEME.antiqueGold; e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.antiqueGold}20`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = THEME.softEmerald; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4" fill="none" stroke={THEME.mossGray} viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-3.5 top-1/2 transform -translate-y-1/2" style={{ color: THEME.mossGray }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0"
              style={{ backgroundColor: `${THEME.emerald}12`, color: THEME.emerald }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${THEME.emerald}20`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${THEME.emerald}12`; }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>{'\u0627\u0644\u0633\u0644\u0629'}</span>
              {cartBadgeCount > 0 && (
                <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: THEME.antiqueGold }}>
                  {cartBadgeCount}
                </span>
              )}
            </button>
          </div>

          {/* Botanical vine decoration */}
          <div className="h-0.5" style={{ background: `linear-gradient(to left, ${THEME.emerald}00, ${THEME.emerald}30, ${THEME.antiqueGold}40, ${THEME.emerald}30, ${THEME.emerald}00)` }}></div>
        </header>

        {/* Spacer for when header is fixed */}
        {isCompactHeaderVisible && <div style={{ height: '90px' }}></div>}

        {/* ============================================ */}
        {/* HERO BANNER - Auto-rotating slides          */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="relative overflow-hidden" style={{ height: '360px' }}>
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={index}
                className="absolute inset-0 transition-all duration-1000"
                style={{
                  background: slide.gradient,
                  opacity: activeHeroSlide === index ? 1 : 0,
                  transform: activeHeroSlide === index ? 'scale(1)' : 'scale(1.05)',
                }}
              >
                {/* Decorative leaf patterns */}
                <LeafPattern className="absolute top-0 right-0 w-72 h-72" opacity={0.06} />
                <LeafPattern className="absolute bottom-0 left-0 w-56 h-56 rotate-180" opacity={0.04} />
                <TreeSilhouette className="absolute bottom-0 left-10 h-64 w-64" opacity={0.04} />

                {/* Radial glow */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(149,213,178,0.15) 0%, transparent 60%)' }}></div>
              </div>
            ))}

            {/* Content - always visible, text changes with slide */}
            <div className="absolute inset-0 z-10 flex items-center">
              <div className="max-w-[96%] mx-auto px-4 w-full">
                <div className="max-w-lg" style={{ animation: 'heroFadeIn 0.8s ease-out' }}>
                  {/* Badge */}
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-4 tracking-wide"
                    style={{ backgroundColor: `${THEME.antiqueGold}30`, color: THEME.antiqueGold, border: `1px solid ${THEME.antiqueGold}50` }}
                  >
                    <LeafIcon size={10} color={THEME.antiqueGold} />
                    <span>{HERO_SLIDES[activeHeroSlide].badge}</span>
                  </span>

                  {/* Title */}
                  <h2
                    className="text-3xl font-black mb-3 leading-tight"
                    style={{ color: '#FFFFFF', textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}
                    key={activeHeroSlide}
                  >
                    {HERO_SLIDES[activeHeroSlide].title}
                  </h2>

                  {/* Subtitle */}
                  <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {HERO_SLIDES[activeHeroSlide].subtitle}
                  </p>

                  {/* CTA Button */}
                  <button
                    className="px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                    style={{
                      backgroundColor: THEME.antiqueGold,
                      color: THEME.nightForest,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.deepGold; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.antiqueGold; }}
                  >
                    {HERO_SLIDES[activeHeroSlide].cta}
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2.5">
              {HERO_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveHeroSlide(index)}
                  className="transition-all duration-500"
                  style={{
                    width: activeHeroSlide === index ? '28px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: activeHeroSlide === index ? THEME.antiqueGold : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: `linear-gradient(to top, ${THEME.warmLinen}, transparent)` }}></div>
          </section>
        )}

        {/* ============================================ */}
        {/* TRUST / FEATURES BAR (2x2 grid for tablet) */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="py-6" style={{ backgroundColor: THEME.parchment, borderTop: `1px solid ${THEME.antiqueGold}20`, borderBottom: `1px solid ${THEME.antiqueGold}20` }}>
            <div className="max-w-[96%] mx-auto px-3">
              <div className="grid grid-cols-2 gap-4">
                {TRUST_BADGES.map((badge, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:shadow-lg"
                      style={{ backgroundColor: THEME.emerald, boxShadow: `0 4px 12px ${THEME.emerald}30` }}
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
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* CATEGORY SHOWCASE                           */}
        {/* ============================================ */}
        {!searchQuery && categories && categories.length > 0 && (
          <section className="py-6" style={{ backgroundColor: THEME.warmLinen }}>
            <div className="max-w-[96%] mx-auto px-3">
              {isHomeView && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                    <h3 className="text-lg font-bold" style={{ color: THEME.charcoalInk }}>{'\u062a\u0635\u0641\u062d \u0627\u0644\u0623\u0642\u0633\u0627\u0645'}</h3>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide pb-2" style={{ scrollSnapType: 'x mandatory' }}>
                {/* All category button */}
                <button
                  onClick={() => setSelectedCategory('\u0627\u0644\u0643\u0644')}
                  className="flex-shrink-0 transition-all duration-300"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="w-24 h-28 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1"
                    style={{
                      backgroundColor: selectedCategory === '\u0627\u0644\u0643\u0644' ? THEME.emerald : THEME.cardWhite,
                      color: selectedCategory === '\u0627\u0644\u0643\u0644' ? '#fff' : THEME.charcoalInk,
                      border: selectedCategory === '\u0627\u0644\u0643\u0644' ? 'none' : `1px solid ${THEME.softEmerald}`,
                      boxShadow: selectedCategory === '\u0627\u0644\u0643\u0644' ? `0 8px 24px ${THEME.emerald}40` : '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    <span className="text-xs font-bold">{'\u0627\u0644\u0643\u0644'}</span>
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
                      className="w-24 h-28 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
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
                          <div className="relative z-10 mt-auto pb-1.5">
                            <span className="text-[11px] font-bold text-white block">{cat.name}</span>
                            <span className="text-[9px] text-white/70">{cat.productCount} {'\u0645\u0646\u062a\u062c'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <LeafIcon size={24} color={selectedCategory === cat.name ? '#fff' : THEME.emerald} />
                          <span className="text-[11px] font-bold">{cat.name}</span>
                          <span className="text-[9px]" style={{ color: selectedCategory === cat.name ? 'rgba(255,255,255,0.7)' : THEME.mossGray }}>{cat.productCount} {'\u0645\u0646\u062a\u062c'}</span>
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
        {/* PROMOTIONAL BANNER GRID                     */}
        {/* ============================================ */}
        {isHomeView && (
          <section className="py-8">
            <div className="max-w-[96%] mx-auto px-3">
              <div className="grid grid-cols-2 gap-4">
                {PROMO_BANNERS.map((banner, index) => (
                  <div
                    key={index}
                    className={`relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${
                      index === 0 ? 'col-span-2' : ''
                    }`}
                    style={{ height: index === 0 ? '180px' : '160px', background: banner.gradient }}
                  >
                    {/* Decorative elements */}
                    <LeafPattern className="absolute top-0 left-0 w-full h-full" opacity={0.08} />
                    <div className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <LeafIcon size={16} color="rgba(255,255,255,0.6)" />
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-5">
                      <h4 className={`${index === 0 ? 'text-xl' : 'text-lg'} font-black text-white mb-1`}>{banner.title}</h4>
                      <p className="text-xs text-white/70 mb-3">{banner.subtitle}</p>
                      <button
                        className="self-start px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 group-hover:shadow-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: THEME.darkEmerald }}
                      >
                        {banner.cta}
                      </button>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* MAIN CONTENT                                */}
        {/* ============================================ */}
        <main className="max-w-[96%] mx-auto px-3 py-6">

          {/* Custom Sections */}
          {isSectionsReady && isHomeView && sectionsWithProducts.length > 0 && (
            <>
              {sectionsWithProducts.map((section: any, sectionIdx: number) => {
                const expandedProduct = expandedCloneProductId
                  ? section.products?.find((p: any) => String(p.id) === expandedCloneProductId)
                  : null;
                return (
                  section.products && section.products.length > 0 && (
                    <section
                      key={section.id}
                      className={`mb-10 ${sectionIdx % 2 === 1 ? '-mx-3 px-3 py-8 rounded-none' : ''}`}
                      style={sectionIdx % 2 === 1 ? { backgroundColor: THEME.parchment } : {}}
                    >
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                          <h3 className="text-xl font-black" style={{ color: THEME.charcoalInk }}>{section.name}</h3>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: `${THEME.emerald}10`, color: THEME.emerald }}>
                          {section.products.length} {'\u0645\u0646\u062a\u062c'}
                        </span>
                      </div>
                      <BotanicalDivider color={THEME.emerald} />

                      {/* Section Products - 2-3 column grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
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
                          className="mt-4 rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: THEME.cardWhite,
                            border: `1px solid ${THEME.softEmerald}`,
                            boxShadow: '0 2px 16px rgba(27,58,45,0.06)',
                            animation: 'slideDown 0.3s ease-out',
                          }}
                        >
                          <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: THEME.emerald, borderBottom: `1px solid ${THEME.softEmerald}` }}>
                            <div className="flex items-center gap-2">
                              <LeafIcon size={14} color="rgba(255,255,255,0.7)" />
                              <h4 className="text-sm font-bold text-white">
                                {'\u0627\u062e\u062a\u0627\u0631 \u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u0630\u064a \u062a\u0631\u064a\u062f\u0647'} - {expandedProduct.name}
                              </h4>
                            </div>
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
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {expandedProduct.clones.map((clone: any) => (
                                <div
                                  key={clone.id}
                                  className="rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
                                  style={{
                                    backgroundColor: THEME.cardWhite,
                                    border: `1px solid ${THEME.softEmerald}`,
                                    boxShadow: '0 2px 16px rgba(27,58,45,0.06)',
                                  }}
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
                                  <div className="p-2.5">
                                    {clone.label && (
                                      <p className="text-xs font-medium truncate mb-2 text-center" style={{ color: THEME.charcoalInk }}>{clone.label}</p>
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
                                      className="w-full px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all active:scale-95"
                                      style={{ backgroundColor: THEME.emerald }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.darkEmerald)}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = THEME.emerald)}
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
          {/* FEATURED PRODUCTS CAROUSEL                 */}
          {/* ============================================ */}
          {isHomeView && featuredProducts.length > 0 && (
            <section className="mb-10 -mx-3 py-10 px-3 relative overflow-hidden" style={{ backgroundColor: THEME.deepForest }}>
              {/* Background decorations */}
              <TreeSilhouette className="absolute bottom-0 left-10 h-48 w-48" opacity={0.04} />
              <LeafPattern className="absolute top-0 right-0 w-48 h-48" opacity={0.04} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                    <h3 className="text-xl font-black text-white">{'\u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0645\u064a\u0632\u0629'}</h3>
                    <LeafIcon size={16} color={THEME.antiqueGold} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => scrollFeatured('right')}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button
                      onClick={() => scrollFeatured('left')}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  </div>
                </div>

                <div
                  ref={featuredScrollRef}
                  className="flex gap-4 overflow-x-auto scrollbar-hide pb-3"
                  style={{ scrollSnapType: 'x mandatory' }}
                >
                  {featuredProducts.map((product) => (
                    <div key={product.id} className="flex-shrink-0 w-56" style={{ scrollSnapAlign: 'start' }}>
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
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* MID-PAGE PROMOTIONAL BANNER                */}
          {/* ============================================ */}
          {isHomeView && (
            <section className="mb-10 -mx-3 relative overflow-hidden" style={{ height: '180px', background: `linear-gradient(to left, ${THEME.emerald}, ${THEME.darkEmerald})` }}>
              <LeafPattern className="absolute top-0 right-0 w-full h-full" opacity={0.06} />
              <TreeSilhouette className="absolute bottom-0 right-10 h-40 w-40" color="white" opacity={0.05} />

              <div className="absolute inset-0 flex items-center z-10">
                <div className="max-w-[96%] mx-auto px-4 w-full text-center">
                  <span className="text-xs font-medium mb-1 block" style={{ color: THEME.mintGlow }}>{'\u0639\u0631\u0648\u0636 \u0644\u0641\u062a\u0631\u0629 \u0645\u062d\u062f\u0648\u062f\u0629'}</span>
                  <h3 className="text-2xl font-black text-white mb-2">{'\u0639\u0631\u0648\u0636 \u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0645\u0648\u0633\u0645'}</h3>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{'\u062e\u0635\u0648\u0645\u0627\u062a \u062a\u0635\u0644 \u0625\u0644\u0649 50% \u0639\u0644\u0649 \u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u062e\u062a\u0627\u0631\u0629 \u0645\u0646 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a'}</p>
                  <button
                    className="px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.deepGold; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.antiqueGold; }}
                  >
                    {'\u062a\u0633\u0648\u0642 \u0627\u0644\u0639\u0631\u0648\u0636'}
                    <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* ALL PRODUCTS SECTION                       */}
          {/* ============================================ */}
          <section id="products" className="mb-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                <h3 className="text-xl font-black" style={{ color: THEME.charcoalInk }}>
                  {selectedCategory === '\u0627\u0644\u0643\u0644' ? '\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a' : selectedCategory}
                </h3>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: `${THEME.emerald}10`, color: THEME.emerald }}>
                {filteredProducts.length} {'\u0645\u0646\u062a\u062c'}
              </span>
            </div>
            <BotanicalDivider />

            {visibleProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
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

                {hasMoreProducts && (
                  <div className="col-span-full flex justify-center py-6">
                    <button
                      onClick={() => setShowAllProducts(true)}
                      className="px-7 py-2.5 rounded-full font-bold text-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                      style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.deepGold; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.antiqueGold; }}
                    >
                      <LeafIcon size={12} color={THEME.nightForest} />
                      {'\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064a\u062f'} ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} {'\u0645\u0646\u062a\u062c'})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.emerald}10` }}>
                  <TreeSilhouette className="w-8 h-8" color={THEME.emerald} opacity={0.4} />
                </div>
                <p className="text-base font-medium mb-1" style={{ color: THEME.charcoalInk }}>{'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0641\u0626\u0629'}</p>
                <p className="text-sm" style={{ color: THEME.mossGray }}>{'\u062c\u0631\u0651\u0628 \u0627\u0644\u0628\u062d\u062b \u0628\u0643\u0644\u0645\u0627\u062a \u0645\u062e\u062a\u0644\u0641\u0629 \u0623\u0648 \u062a\u0635\u0641\u062d \u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0623\u062e\u0631\u0649'}</p>
              </div>
            )}
          </section>
        </main>

        {/* ============================================ */}
        {/* FOOTER                                      */}
        {/* ============================================ */}
        <footer className="w-full relative overflow-hidden" style={{ backgroundColor: THEME.nightForest }}>
          {/* Pre-footer newsletter strip */}
          <div className="py-8 relative" style={{ backgroundColor: THEME.emerald }}>
            <LeafPattern className="absolute top-0 right-0 w-full h-full" opacity={0.06} />
            <div className="max-w-[96%] mx-auto px-4 relative z-10 flex flex-col items-center text-center gap-4">
              <div>
                <h4 className="text-lg font-bold text-white mb-1">{'\u0627\u0634\u062a\u0631\u0643 \u0641\u064a \u0646\u0634\u0631\u062a\u0646\u0627 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u0629'}</h4>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{'\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u0623\u062d\u062f\u062b \u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629'}</p>
              </div>
              <div className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="email"
                  placeholder={'\u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a'}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <button
                  className="px-5 py-2.5 rounded-full font-bold text-xs transition-all duration-300 hover:shadow-lg flex-shrink-0"
                  style={{ backgroundColor: THEME.antiqueGold, color: THEME.nightForest }}
                >
                  {'\u0627\u0634\u062a\u0631\u0643 \u0627\u0644\u0622\u0646'}
                </button>
              </div>
            </div>
          </div>

          {/* Main footer content */}
          <TreeSilhouette className="absolute bottom-0 left-0 h-48 w-48" opacity={0.03} />
          <TreeSilhouette className="absolute bottom-0 right-10 h-36 w-36" opacity={0.02} />

          <div className="max-w-[96%] mx-auto px-4 py-10 relative z-10">
            <div className="grid grid-cols-2 gap-8">
              {/* Column 1: Company Info + Social */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`h-10 w-10 ${logoRoundingClass} overflow-hidden flex items-center justify-center`} style={{ backgroundColor: 'rgba(255,255,255,0.1)', boxShadow: `0 0 0 2px ${THEME.antiqueGold}40` }}>
                    <img src={logoUrl || '/assets/logo/El Farouk Group2.png'} alt={companyName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h5 className="font-bold text-base text-white">{companyName}</h5>
                    <p className="text-[10px]" style={{ color: THEME.mintGlow }}>{'\u0645\u062a\u062c\u0631 \u0627\u0644\u0646\u0628\u0627\u062a\u0627\u062a \u0648\u0627\u0644\u0623\u0634\u062c\u0627\u0631'}</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {'\u0645\u062a\u062c\u0631\u0643 \u0627\u0644\u0645\u062a\u0643\u0627\u0645\u0644 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0623\u0641\u0636\u0644 \u0627\u0644\u0623\u0634\u062c\u0627\u0631 \u0648\u0627\u0644\u0646\u0628\u0627\u062a\u0627\u062a \u0627\u0644\u0632\u064a\u0646\u0629 \u0628\u0623\u0639\u0644\u0649 \u062c\u0648\u062f\u0629 \u0648\u0623\u0633\u0639\u0627\u0631 \u0645\u0645\u064a\u0632\u0629.'}
                </p>

                {/* Social Media Links */}
                {socialMedia && socialMedia.length > 0 && socialMedia.some((sm: any) => sm.platform && sm.link) && (
                  <div className="flex items-center gap-2">
                    {socialMedia
                      .filter((sm: any) => sm.platform && sm.link)
                      .map((sm: any, index: number) => (
                        <a
                          key={index}
                          href={sm.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300"
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

                {/* Contact Info */}
                <div className="mt-4 space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <p className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.emerald}30` }}>
                      <svg className="w-3 h-3" fill="none" stroke={THEME.mintGlow} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    966+123456789
                  </p>
                  <p className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.emerald}30` }}>
                      <svg className="w-3 h-3" fill="none" stroke={THEME.mintGlow} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    info@store.com
                  </p>
                </div>
              </div>

              {/* Column 2: Links + Customer Service */}
              <div>
                <div className="mb-6">
                  <h6 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                    {'\u0631\u0648\u0627\u0628\u0637 \u0633\u0631\u064a\u0639\u0629'}
                  </h6>
                  <ul className="space-y-2">
                    <li>
                      <button
                        onClick={() => { setSelectedCategory('\u0627\u0644\u0643\u0644'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-xs flex items-center gap-1.5 transition-all duration-200"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                      >
                        <LeafIcon size={8} color={THEME.mintGlow} />
                        {'\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629'}
                      </button>
                    </li>
                    <li>
                      <a
                        href="#products"
                        className="text-xs flex items-center gap-1.5 transition-all duration-200"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                      >
                        <LeafIcon size={8} color={THEME.mintGlow} />
                        {'\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a'}
                      </a>
                    </li>
                    {categories.slice(0, 3).map((cat: any) => (
                      <li key={cat.id}>
                        <button
                          onClick={() => { setSelectedCategory(cat.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="text-xs flex items-center gap-1.5 transition-all duration-200"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                          <LeafIcon size={8} color={THEME.mintGlow} />
                          {cat.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h6 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: THEME.antiqueGold }}></div>
                    {'\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621'}
                  </h6>
                  <ul className="space-y-2">
                    {['\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0629 \u0648\u0627\u0644\u062f\u0639\u0645', '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0625\u0631\u062c\u0627\u0639', '\u0627\u0644\u0634\u062d\u0646 \u0648\u0627\u0644\u062a\u0648\u0635\u064a\u0644', '\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639'].map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          className="text-xs flex items-center gap-1.5 transition-all duration-200"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = THEME.mintGlow; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                          <LeafIcon size={8} color={THEME.mintGlow} />
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div style={{ borderTop: `1px solid ${THEME.antiqueGold}20` }}>
            <div className="max-w-[96%] mx-auto px-4 py-4 flex items-center justify-between relative z-10">
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                &copy; {new Date().getFullYear()} {companyName}. {'\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.'}
              </p>
              <p className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {'\u0635\u0646\u0639 \u0628\u0639\u0646\u0627\u064a\u0629'}
                <LeafIcon size={10} color={THEME.mintGlow} />
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

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl transform transition-all duration-300 ease-out"
          style={{
            backgroundColor: THEME.cardWhite,
            border: `1px solid ${THEME.softEmerald}`,
            boxShadow: '0 4px 24px rgba(27,58,45,0.12)',
            color: THEME.emerald,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${THEME.emerald}15` }}>
              <svg className="w-4 h-4" style={{ color: THEME.emerald }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium" style={{ color: THEME.charcoalInk }}>
              {'\u062a\u0645 \u0625\u0636\u0627\u0641\u0629'} &quot;{successProductName}&quot; {'\u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629'}
            </span>
          </div>
        </div>
      )}

      {/* Quantity Modal */}
      {isQuantityModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-[55] flex items-center justify-center backdrop-blur-sm" onClick={() => { setIsQuantityModalOpen(false); setSelectedProduct(null); }}>
          <div
            className="rounded-3xl p-6 w-[340px] max-w-[90vw]"
            style={{
              backgroundColor: THEME.cardWhite,
              boxShadow: '0 20px 60px rgba(27,58,45,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-2">
              <LeafIcon size={18} color={THEME.emerald} />
            </div>
            <h3 className="text-base font-bold text-center mb-5" style={{ color: THEME.charcoalInk }}>{selectedProduct.name}</h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setQuantityValue(Math.max(1, quantityValue - 1))}
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: THEME.parchment, color: THEME.charcoalInk }}
              >
                -
              </button>
              <input
                type="number"
                value={quantityValue}
                onChange={e => setQuantityValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center text-2xl font-black border-b-2 focus:outline-none"
                style={{ borderColor: THEME.emerald, color: THEME.charcoalInk, backgroundColor: 'transparent' }}
              />
              <button
                onClick={() => setQuantityValue(quantityValue + 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white transition-all duration-200 hover:scale-110"
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
              className="w-full py-3 rounded-full text-white font-bold text-base transition-all duration-300 hover:shadow-lg"
              style={{ backgroundColor: THEME.emerald }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.darkEmerald; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.emerald; }}
            >
              {'\u0627\u0636\u0641 \u0644\u0644\u0633\u0644\u0629'}
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
