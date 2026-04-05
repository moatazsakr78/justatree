'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  product_code: string | null;
  main_image_url: string | null;
  price: number | null;
  quantity_per_carton: number | null;
  category_id: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

interface CatalogViewProps {
  initialProducts: Product[];
  categories: Category[];
}

// Format number with commas
const formatPrice = (price: number | null): string => {
  if (price === null || price === undefined) return '-';
  return price.toLocaleString('ar-EG');
};

export default function CatalogView({ initialProducts, categories }: CatalogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Performance: Limit visible products for better rendering
  const VISIBLE_PRODUCTS_LIMIT = 20;
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_code?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategoryId === null ||
        product.category_id === selectedCategoryId;

      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategoryId]);

  // Performance: Limit visible products for better rendering on client devices
  const visibleProducts = useMemo(() => {
    if (searchTerm || showAllProducts) {
      return filteredProducts;
    }
    return filteredProducts.slice(0, VISIBLE_PRODUCTS_LIMIT);
  }, [filteredProducts, searchTerm, showAllProducts]);

  const hasMoreProducts = !showAllProducts &&
    !searchTerm &&
    filteredProducts.length > VISIBLE_PRODUCTS_LIMIT;

  // Reset showAllProducts when search or category changes
  useEffect(() => {
    setShowAllProducts(false);
  }, [searchTerm, selectedCategoryId]);

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-[#2B3544] text-white py-4 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo/Title */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg className="w-8 h-8 text-[#DC2626]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
              </svg>
              <h1 className="text-xl font-bold">كتالوج المنتجات</h1>
            </Link>

            {/* Search Bar */}
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full px-4 py-2 pr-10 text-right text-gray-800 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Back to Store Link */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 text-sm hover:text-[#10B981] transition-colors"
            >
              <span>العودة للمتجر</span>
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 sticky top-[72px] z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-600 text-sm font-medium ml-2">الفئات:</span>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategoryId === null
                  ? 'bg-[#10B981] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-[#10B981] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          <span className="font-medium">{filteredProducts.length}</span> منتج
          {searchTerm && <span className="mr-2">لـ "{searchTerm}"</span>}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد منتجات</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategoryId
                ? 'جرب البحث بكلمات أخرى أو اختر فئة مختلفة'
                : 'لم يتم إضافة منتجات للكتالوج بعد'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.map((product, index) => (
              <ProductCatalogCard
                key={product.id}
                product={product}
                priority={index < 6}
              />
            ))}

            {hasMoreProducts && (
              <div className="col-span-full flex justify-center py-6">
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg"
                >
                  عرض المزيد ({filteredProducts.length - VISIBLE_PRODUCTS_LIMIT} منتج)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#2B3544] text-white py-4 px-4 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Just A Tree - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}

// Product Card Component
function ProductCatalogCard({ product, priority }: { product: Product; priority: boolean }) {
  const unitPrice = product.price || 0;
  const quantityPerCarton = product.quantity_per_carton || 0;
  const dozenPrice = unitPrice * 12;
  const cartonPrice = unitPrice * quantityPerCarton;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {product.main_image_url ? (
          <Image
            src={product.main_image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={priority}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-product.svg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Name Bar */}
      <div className="bg-[#10B981] px-4 py-3">
        <h3 className="text-white font-bold text-lg text-center truncate" title={product.name}>
          {product.name}
        </h3>
      </div>

      {/* Product Details Table */}
      <div className="divide-y divide-gray-200">
        <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
          <span className="text-gray-600 font-medium">كود المنتج</span>
          <span className="text-gray-800 font-semibold">{product.product_code || '-'}</span>
        </div>

        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-gray-600 font-medium">الكمية داخل الكرتونة</span>
          <span className="text-gray-800 font-semibold">{quantityPerCarton} قطعة</span>
        </div>

        <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
          <span className="text-gray-600 font-medium">سعر القطعة</span>
          <span className="text-[#DC2626] font-bold">{formatPrice(unitPrice)} جنيه</span>
        </div>

        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-gray-600 font-medium">سعر الدستة (×12)</span>
          <span className="text-[#3B82F6] font-bold">{formatPrice(dozenPrice)} جنيه</span>
        </div>

        <div className="flex justify-between items-center px-4 py-3 bg-[#10B981]/10">
          <span className="text-gray-600 font-medium">سعر الكرتونة</span>
          <span className="text-[#10B981] font-bold text-lg">{formatPrice(cartonPrice)} جنيه</span>
        </div>
      </div>
    </div>
  );
}
