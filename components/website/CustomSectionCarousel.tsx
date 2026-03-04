'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from './shared/types';
import { useUserProfile } from '../../lib/hooks/useUserProfile';
import { useWebsiteCurrency } from '@/lib/hooks/useCurrency';
import { useRatingsDisplay } from '../../lib/hooks/useRatingSettings';
import { getTransformedImageUrl } from '@/lib/utils/supabaseImageTransform';

interface CustomSectionCarouselProps {
  sectionName: string;
  products: Product[];
  onAddToCart: (product: Product) => Promise<void>;
  itemsPerView?: number;
  className?: string;
  onProductClick?: (productId: string) => void;
}

export default function CustomSectionCarousel({
  sectionName,
  products,
  onAddToCart,
  itemsPerView = 4,
  className = "",
  onProductClick
}: CustomSectionCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const accordionRef = useRef<HTMLDivElement>(null);
  const websiteCurrency = useWebsiteCurrency();

  // Get user profile to check role
  const { profile } = useUserProfile();

  // Get rating settings
  const { showRatings } = useRatingsDisplay();

  // Scroll to accordion when expanded
  useEffect(() => {
    if (expandedProductId && accordionRef.current) {
      setTimeout(() => {
        accordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expandedProductId]);

  // Determine which price to display based on user role
  const getDisplayPrice = (product: Product) => {
    if (profile?.role === 'جملة' && product.wholesale_price) {
      return product.wholesale_price;
    }
    return product.price;
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < products.length - itemsPerView;

  const goToPrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      setCurrentIndex(Math.min(products.length - itemsPerView, currentIndex + 1));
    }
  };

  // Get current visible products
  const visibleProducts = products.slice(currentIndex, currentIndex + itemsPerView);

  // Find the expanded product
  const expandedProduct = expandedProductId
    ? products.find(p => String(p.id) === expandedProductId)
    : null;

  const hasClones = (product: Product) => product.clones && product.clones.length > 0;

  const handleProductClick = (product: Product) => {
    if (hasClones(product)) {
      // Toggle accordion
      setExpandedProductId(prev =>
        prev === String(product.id) ? null : String(product.id)
      );
    } else {
      // Navigate to product page
      if (onProductClick) {
        onProductClick(String(product.id));
      } else {
        router.push(`/product/${product.id}`);
      }
    }
  };

  const handleCloneAddToCart = async (product: Product, clone: { id: string; image: string; label: string }) => {
    const productToAdd: Product = {
      ...product,
      price: getDisplayPrice(product),
      customImage: clone.image,
    };
    await onAddToCart(productToAdd);
  };

  // If no products, don't render anything
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Previous Arrow (Right in RTL) */}
      {canGoPrevious && (
        <button
          onClick={goToPrevious}
          className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer transition-all duration-300"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Products Grid */}
      <div className="mx-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              className={`bg-custom-gray rounded-lg p-4 hover:bg-gray-300 transition-all duration-300 border shadow-md cursor-pointer group transform hover:scale-105 hover:shadow-xl ${
                expandedProductId === String(product.id)
                  ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/30'
                  : 'border-gray-300'
              }`}
              style={{
                animationName: 'fadeInUp',
                animationDuration: '0.6s',
                animationTimingFunction: 'ease-out',
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <div className="relative mb-4" onClick={() => handleProductClick(product)}>
                <img
                  src={getTransformedImageUrl(product.image, 'card_desktop') || '/placeholder-product.svg'}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-72 object-cover rounded-lg group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/placeholder-product.svg') {
                      target.src = '/placeholder-product.svg';
                    }
                  }}
                />
                {product.isOnSale && (
                  <span className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    -{product.discount}%
                  </span>
                )}
                {/* Clones badge */}
                {hasClones(product) && (
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    {product.clones!.length} تصميم
                  </span>
                )}
              </div>
              <div onClick={() => hasClones(product) ? handleProductClick(product) : router.push(`/product/${product.id}`)}>
                <h4 className="font-semibold mb-2 text-gray-800 truncate transition-colors group-hover:text-[var(--primary-color)]">{product.name}</h4>
                <div className="h-10 mb-3">
                  <p className="text-gray-600 text-sm overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.25rem',
                    maxHeight: '2.5rem'
                  }}>
                    {product.description || ''}
                  </p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">{product.originalPrice} {websiteCurrency}</span>
                      )}
                      <span className="text-lg font-bold" style={{color: 'var(--primary-color)'}}>{getDisplayPrice(product)} {websiteCurrency}</span>
                    </div>
                    {profile?.role === 'جملة' && product.wholesale_price && (
                      <span className="text-xs text-blue-600 font-medium">سعر الجملة</span>
                    )}
                  </div>
                </div>
                {/* Ratings Section - Only show if enabled in settings */}
                {showRatings && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-sm text-gray-400">{product.rating} ({product.reviews})</span>
                    </div>
                  </div>
                )}
              </div>
              {hasClones(product) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductClick(product);
                  }}
                  className={`w-full mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-white transform hover:scale-105 active:scale-95 ${
                    expandedProductId === String(product.id) ? 'ring-2 ring-white/50' : ''
                  }`}
                  style={{backgroundColor: 'var(--primary-color)'}}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(93, 31, 31, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                    (e.target as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  {expandedProductId === String(product.id) ? 'إخفاء التصاميم' : 'اختر التصميم'}
                </button>
              ) : (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const productToAdd = {
                      ...product,
                      price: getDisplayPrice(product)
                    };
                    await onAddToCart(productToAdd);
                  }}
                  className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-white transform hover:scale-105 active:scale-95"
                  style={{backgroundColor: 'var(--primary-color)'}}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(93, 31, 31, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                    (e.target as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  أضف للسلة
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next Arrow (Left in RTL) */}
      {canGoNext && (
        <button
          onClick={goToNext}
          className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer transition-all duration-300"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Accordion Panel - Clone Designs */}
      {expandedProduct && expandedProduct.clones && expandedProduct.clones.length > 0 && (
        <div
          ref={accordionRef}
          className="mx-8 mt-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          {/* Accordion Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{backgroundColor: 'var(--primary-color)'}}>
            <h4 className="text-lg font-bold text-white">
              تصاميم {expandedProduct.name}
            </h4>
            <button
              onClick={() => setExpandedProductId(null)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Clone Grid */}
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {expandedProduct.clones.map((clone) => (
                <div
                  key={clone.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all hover:border-[var(--primary-color)]/50 group/clone"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={clone.image || '/placeholder-product.svg'}
                      alt={clone.label || expandedProduct.name}
                      className="w-full h-full object-cover group-hover/clone:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/placeholder-product.svg') {
                          target.src = '/placeholder-product.svg';
                        }
                      }}
                    />
                  </div>
                  <div className="p-3">
                    {clone.label && (
                      <p className="text-sm font-medium text-gray-700 truncate mb-2 text-center">{clone.label}</p>
                    )}
                    <button
                      onClick={() => handleCloneAddToCart(expandedProduct, clone)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:scale-105 active:scale-95"
                      style={{backgroundColor: 'var(--primary-color)'}}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                      }}
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

      {/* Dots Indicator */}
      {products.length > itemsPerView && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: Math.ceil((products.length - itemsPerView + 1)) }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'scale-110'
                  : 'hover:bg-gray-400'
              }`}
              style={{
                backgroundColor: index === currentIndex ? 'var(--primary-color)' : '#D1D5DB'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
