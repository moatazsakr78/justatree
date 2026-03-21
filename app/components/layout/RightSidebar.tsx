'use client';

import { useRef, useEffect, useState } from 'react';
import {
  ClipboardDocumentListIcon,
  UserIcon,
  XMarkIcon,
  UsersIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  MapIcon,
  ReceiptPercentIcon,
  ShareIcon,
  Squares2X2Icon,
  ArrowRightIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useCompanySettings } from '@/lib/hooks/useCompanySettings';
import { useStoreCategoriesWithProducts } from '@/lib/hooks/useStoreCategories';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelect?: (categoryName: string) => void;
}

export default function RightSidebar({ isOpen, onClose, onCategorySelect }: RightSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { profile, isAdmin, loading } = useUserProfile();
  const { companyName } = useCompanySettings();
  const { categoriesWithProducts, isLoading: isCategoriesLoading } = useStoreCategoriesWithProducts();

  // State لعرض الفئات
  const [showCategories, setShowCategories] = useState(false);

  // تحديد ما إذا كان المستخدم أدمن رئيسي أو موظف (يظهر لهم قائمة الإدارة)
  const isAdminOrStaff = profile?.role === 'أدمن رئيسي' || profile?.role === 'موظف';

  // إعادة تعيين عرض الفئات عند إغلاق القائمة
  useEffect(() => {
    if (!isOpen) {
      setShowCategories(false);
    }
  }, [isOpen]);

  // معالجة اختيار فئة
  const handleCategorySelect = (categoryName: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryName);
    }
    onClose();
    setShowCategories(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is on menu button (has title="القائمة")
      const menuButton = (target as Element)?.closest('button[title="القائمة"]');
      
      if (sidebarRef.current && !sidebarRef.current.contains(target) && !menuButton) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-20 right-0 h-[calc(100vh-80px)] w-96 bg-[#eaeaea] border-l border-gray-400 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dash-accent-red bg-[var(--primary-color)]">
          {showCategories ? (
            <>
              <button
                onClick={() => setShowCategories(false)}
                className="p-2 text-gray-200 hover:text-white hover:bg-gray-600 rounded-full transition-colors"
              >
                <ArrowRightIcon className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold text-white">الفئات</h2>
            </>
          ) : (
            <h2 className="text-lg font-bold text-white">القائمة الرئيسية</h2>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-200 hover:text-white hover:bg-gray-600 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Categories View */}
        {showCategories ? (
          <div className="p-3 overflow-y-auto h-[calc(100%-120px)]">
            {isCategoriesLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                <span className="mr-2 text-gray-600">جاري التحميل...</span>
              </div>
            ) : categoriesWithProducts && categoriesWithProducts.length > 0 ? (
              <div className="space-y-2">
                {categoriesWithProducts.map((category: any) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.is_all_category ? 'الكل' : category.name)}
                    className={`flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group ${
                      category.is_all_category ? 'bg-gray-200' : ''
                    }`}
                  >
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-[var(--primary-color)]">
                          <Squares2X2Icon className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="font-semibold text-base text-black">{category.name}</h3>
                      {category.is_all_category ? (
                        <p className="text-xs text-gray-600">{category.description || 'عرض جميع المنتجات'}</p>
                      ) : category.products && (
                        <p className="text-xs text-gray-600">{category.products.length} منتج</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-4">
                لا توجد فئات متاحة
              </div>
            )}
          </div>
        ) : (
          /* Menu Items */
          <div className="p-3">
            <div className="space-y-1">
            
            {/* Show loading state */}
            {loading && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                <span className="mr-2 text-gray-600">جاري التحميل...</span>
              </div>
            )}

            {/* Admin-specific buttons */}
            {!loading && isAdminOrStaff && (
              <>
                {/* Customer Orders (Admin Only) */}
                <button
                  onClick={() => {
                    // Navigate to customer orders page for admin
                    window.location.href = '/customer-orders';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <UsersIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">طلبات العملاء</h3>
                    <p className="text-xs text-gray-600">إدارة ومراجعة طلبات جميع العملاء</p>
                  </div>
                </button>

                {/* Store Management */}
                <button
                  onClick={() => {
                    // Navigate to admin products page for store management
                    window.location.href = '/admin/products';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <BuildingStorefrontIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">إدارة المتجر</h3>
                    <p className="text-xs text-gray-600">إدارة المنتجات والفئات وإعدادات المتجر</p>
                  </div>
                </button>

                {/* Go to POS System */}
                <button
                  onClick={() => {
                    window.location.href = '/pos';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <CubeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">الانتقال للنظام</h3>
                    <p className="text-xs text-gray-600">الانتقال إلى نظام نقاط البيع</p>
                  </div>
                </button>

                {/* Shipping Details */}
                <button
                  onClick={() => {
                    window.location.href = '/shipping';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <MapIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">تفاصيل الشحن</h3>
                    <p className="text-xs text-gray-600">إدارة شركات الشحن وأسعار المحافظات</p>
                  </div>
                </button>

                {/* Social Media - سوشيال ميديا */}
                <button
                  onClick={() => {
                    window.location.href = '/social-media';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <ShareIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">تابعنا</h3>
                    <p className="text-xs text-gray-600">حساباتنا على السوشيال ميديا</p>
                  </div>
                </button>

                {/* Catalog - كتالوج */}
                <button
                  onClick={() => {
                    window.location.href = '/catalog';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <BookOpenIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">كتالوج</h3>
                    <p className="text-xs text-gray-600">عرض كتالوج المنتجات بالأسعار</p>
                  </div>
                </button>

                {/* Categories - الفئات */}
                <button
                  onClick={() => setShowCategories(true)}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <Squares2X2Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">الفئات</h3>
                    <p className="text-xs text-gray-600">تصفح جميع فئات المنتجات</p>
                  </div>
                </button>

              </>
            )}

            {/* Regular user buttons (hidden for admins) */}
            {!loading && !isAdminOrStaff && (
              <>
                {/* Profile */}
                <button
                  onClick={() => {
                    // Navigate to profile page
                    window.location.href = '/profile';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">الملف الشخصي</h3>
                    <p className="text-xs text-gray-600">إعدادات الحساب والمعلومات الشخصية</p>
                  </div>
                </button>

                {/* Orders List */}
                <button
                  onClick={() => {
                    // Navigate to my-orders page
                    window.location.href = '/my-orders';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">قائمة الطلبات</h3>
                    <p className="text-xs text-gray-600">عرض وإدارة جميع الطلبات</p>
                  </div>
                </button>

                {/* My Invoices - فواتيري */}
                <button
                  onClick={() => {
                    window.location.href = '/my-invoices';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <ReceiptPercentIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">فواتيري</h3>
                    <p className="text-xs text-gray-600">الفواتير والدفعات وكشف الحساب</p>
                  </div>
                </button>

                {/* Social Media - سوشيال ميديا */}
                <button
                  onClick={() => {
                    window.location.href = '/social-media';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <ShareIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">تابعنا</h3>
                    <p className="text-xs text-gray-600">حساباتنا على السوشيال ميديا</p>
                  </div>
                </button>

                {/* Catalog - كتالوج */}
                <button
                  onClick={() => {
                    window.location.href = '/catalog';
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <BookOpenIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">كتالوج</h3>
                    <p className="text-xs text-gray-600">عرض كتالوج المنتجات بالأسعار</p>
                  </div>
                </button>

                {/* Categories - الفئات */}
                <button
                  onClick={() => setShowCategories(true)}
                  className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                >
                  <div className="p-2 bg-[var(--primary-color)] rounded-full group-hover:bg-[var(--interactive-color)] transition-colors">
                    <Squares2X2Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-base text-black">الفئات</h3>
                    <p className="text-xs text-gray-600">تصفح جميع فئات المنتجات</p>
                  </div>
                </button>
              </>
            )}

          </div>
        </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-400 bg-[#eaeaea]">
          <p className="text-center text-black text-xs">
            {companyName}
          </p>
        </div>
      </div>
    </>
  );
}