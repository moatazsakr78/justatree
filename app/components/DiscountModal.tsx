"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import {
  XMarkIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  CubeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  price: number;
  discount?: number;
  discountType?: "percentage" | "fixed";
}

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  cartDiscount: number;
  cartDiscountType: "percentage" | "fixed";
  onApplyItemDiscount: (itemId: string, discount: number, discountType: "percentage" | "fixed") => void;
  onApplyCartDiscount: (discount: number, discountType: "percentage" | "fixed") => void;
  onRemoveItemDiscount: (itemId: string) => void;
  onRemoveCartDiscount: () => void;
}

export default function DiscountModal({
  isOpen,
  onClose,
  cartItems,
  cartDiscount,
  cartDiscountType,
  onApplyItemDiscount,
  onApplyCartDiscount,
  onRemoveItemDiscount,
  onRemoveCartDiscount,
}: DiscountModalProps) {
  const [selectedTab, setSelectedTab] = useState(1);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setDiscountValue("");
      setSelectedItemId(cartItems.length > 0 ? cartItems[0].id : null);
      // Set initial discount type based on existing cart discount
      if (cartDiscount > 0) {
        setDiscountType(cartDiscountType);
      }
    }
  }, [isOpen, cartItems, cartDiscount, cartDiscountType]);

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) return;

    if (selectedTab === 0 && selectedItemId) {
      // Apply to selected item
      onApplyItemDiscount(selectedItemId, value, discountType);
    } else {
      // Apply to cart
      onApplyCartDiscount(value, discountType);
    }

    setDiscountValue("");
    onClose();
  };

  const handleRemoveDiscount = () => {
    if (selectedTab === 0 && selectedItemId) {
      onRemoveItemDiscount(selectedItemId);
    } else {
      onRemoveCartDiscount();
    }
    setDiscountValue("");
  };

  const selectedItem = cartItems.find(item => item.id === selectedItemId);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--dash-bg-base)] shadow-[var(--dash-shadow-lg)] transition-all border border-[var(--dash-border-default)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    <ReceiptPercentIcon className="h-6 w-6 text-dash-accent-orange" />
                    إضافة خصم
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-raised)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Tabs */}
                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                  <Tab.List className="flex border-b border-[var(--dash-border-default)]">
                    <Tab
                      className={({ selected }) =>
                        `flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          selected
                            ? "text-dash-accent-orange border-b-2 border-orange-400 bg-orange-400/10"
                            : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-raised)]/50"
                        }`
                      }
                    >
                      <CubeIcon className="h-4 w-4" />
                      خصم لصنف
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        `flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          selected
                            ? "text-dash-accent-orange border-b-2 border-orange-400 bg-orange-400/10"
                            : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-raised)]/50"
                        }`
                      }
                    >
                      <ShoppingCartIcon className="h-4 w-4" />
                      خصم للسلة
                    </Tab>
                  </Tab.List>

                  <Tab.Panels className="p-6">
                    {/* Item Discount Panel */}
                    <Tab.Panel className="space-y-4">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8">
                          <CubeIcon className="h-12 w-12 text-[var(--dash-text-disabled)] mx-auto mb-3" />
                          <p className="text-[var(--dash-text-muted)]">السلة فارغة</p>
                          <p className="text-[var(--dash-text-disabled)] text-sm">أضف منتجات للسلة أولاً</p>
                        </div>
                      ) : (
                        <>
                          {/* Select Item */}
                          <div>
                            <label className="block text-sm text-[var(--dash-text-muted)] mb-2">اختر المنتج</label>
                            <select
                              value={selectedItemId || ""}
                              onChange={(e) => setSelectedItemId(e.target.value)}
                              className="w-full p-3 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              {cartItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.product.name} ({item.quantity} قطعة)
                                  {item.discount ? ` - خصم ${item.discount}${item.discountType === "percentage" ? "%" : " ج.م"}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Current Item Info */}
                          {selectedItem && (
                            <div className="p-3 bg-[var(--dash-bg-surface)] rounded-xl">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--dash-text-muted)]">السعر:</span>
                                <span className="text-white">{selectedItem.price.toFixed(2)} ج.م</span>
                              </div>
                              <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-[var(--dash-text-muted)]">الكمية:</span>
                                <span className="text-white">{selectedItem.quantity}</span>
                              </div>
                              {selectedItem.discount && (
                                <div className="flex justify-between items-center text-sm mt-1">
                                  <span className="text-[var(--dash-text-muted)]">الخصم الحالي:</span>
                                  <span className="text-dash-accent-orange">
                                    {selectedItem.discount}{selectedItem.discountType === "percentage" ? "%" : " ج.م"}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </Tab.Panel>

                    {/* Cart Discount Panel */}
                    <Tab.Panel className="space-y-4">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCartIcon className="h-12 w-12 text-[var(--dash-text-disabled)] mx-auto mb-3" />
                          <p className="text-[var(--dash-text-muted)]">السلة فارغة</p>
                          <p className="text-[var(--dash-text-disabled)] text-sm">أضف منتجات للسلة أولاً</p>
                        </div>
                      ) : (
                        <>
                          {/* Cart Summary */}
                          <div className="p-3 bg-[#2B3544] rounded-xl">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-[var(--dash-text-muted)]">عدد الأصناف:</span>
                              <span className="text-white">{cartItems.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                              <span className="text-[var(--dash-text-muted)]">إجمالي السلة:</span>
                              <span className="text-white">
                                {cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} ج.م
                              </span>
                            </div>
                            {cartDiscount > 0 && (
                              <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-[var(--dash-text-muted)]">الخصم الحالي:</span>
                                <span className="text-dash-accent-orange">
                                  {cartDiscount}{cartDiscountType === "percentage" ? "%" : " ج.م"}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                {/* Discount Input Section - Shared */}
                {cartItems.length > 0 && (
                  <div className="px-6 pb-6 space-y-4">
                    {/* Discount Type Toggle */}
                    <div>
                      <label className="block text-sm text-[var(--dash-text-muted)] mb-2">نوع الخصم</label>
                      <div className="flex bg-[var(--dash-bg-surface)] rounded-xl p-1">
                        <button
                          onClick={() => setDiscountType("percentage")}
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                            discountType === "percentage"
                              ? "bg-dash-accent-orange text-white"
                              : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                          }`}
                        >
                          نسبة %
                        </button>
                        <button
                          onClick={() => setDiscountType("fixed")}
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                            discountType === "fixed"
                              ? "bg-dash-accent-orange text-white"
                              : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                          }`}
                        >
                          مبلغ ج.م
                        </button>
                      </div>
                    </div>

                    {/* Discount Value Input */}
                    <div>
                      <label className="block text-sm text-[var(--dash-text-muted)] mb-2">قيمة الخصم</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === "percentage" ? "مثال: 10" : "مثال: 50"}
                          className="w-full p-3 pl-16 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          autoFocus
                          min="0"
                          max={discountType === "percentage" ? "100" : undefined}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-accent-orange font-medium">
                          {discountType === "percentage" ? "%" : "ج.م"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {/* Remove Discount Button */}
                      {((selectedTab === 0 && selectedItem?.discount) || (selectedTab === 1 && cartDiscount > 0)) && (
                        <button
                          onClick={handleRemoveDiscount}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-dash-accent-red-subtle hover:bg-dash-accent-red/30 text-dash-accent-red rounded-xl transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                          إزالة
                        </button>
                      )}

                      {/* Apply Button */}
                      <button
                        onClick={handleApplyDiscount}
                        disabled={!discountValue || parseFloat(discountValue) <= 0}
                        className="flex-1 py-3 bg-dash-accent-orange hover:bg-dash-accent-orange disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                      >
                        تطبيق الخصم
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Note */}
                <div className="px-6 pb-6">
                  <div className="p-3 bg-[var(--dash-bg-surface)] rounded-lg">
                    <p className="text-sm text-[var(--dash-text-muted)] text-center">
                      {selectedTab === 0
                        ? "الخصم سيُطبق على المنتج المحدد فقط"
                        : "الخصم سيُطبق على إجمالي السلة"}
                    </p>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
