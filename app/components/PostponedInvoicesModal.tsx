"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  ClockIcon,
  ShoppingCartIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { POSTab } from "@/lib/hooks/usePOSTabs";

interface PostponedInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  postponedTabs: POSTab[];
  onRestoreTab: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
  onRefresh?: () => Promise<void>;
}

export default function PostponedInvoicesModal({
  isOpen,
  onClose,
  postponedTabs,
  onRestoreTab,
  onDeleteTab,
  onRefresh,
}: PostponedInvoicesModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh postponed tabs from DB when modal opens
  useEffect(() => {
    if (isOpen && onRefresh) {
      setIsRefreshing(true);
      onRefresh().finally(() => setIsRefreshing(false));
    }
  }, [isOpen, onRefresh]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "غير محدد";
    const date = new Date(dateString);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotal = (cartItems: any[]) => {
    return cartItems.reduce((sum, item) => {
      const price = item.price || item.product?.price || 0;
      const quantity = item.quantity || 1;
      return sum + price * quantity;
    }, 0);
  };

  const handleRestore = (tabId: string) => {
    onRestoreTab(tabId);
    onClose();
  };

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#1F2937] shadow-xl transition-all border border-gray-600">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-600">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    <ClockIcon className="h-6 w-6 text-orange-400" />
                    الفواتير المؤجلة
                    {isRefreshing && (
                      <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                    )}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                  {postponedTabs.length === 0 ? (
                    <div className="text-center py-12">
                      <ClockIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">لا توجد فواتير مؤجلة</p>
                      <p className="text-gray-500 text-sm mt-2">
                        اضغط كليك يمين على أي فاتورة مفتوحة لتأجيلها
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {postponedTabs.map((tab) => (
                        <div
                          key={tab.id}
                          className="bg-[#2B3544] rounded-xl border border-gray-600 overflow-hidden hover:border-orange-500/50 transition-colors"
                        >
                          {/* Invoice Header */}
                          <div className="p-4 border-b border-gray-600 bg-[#374151]/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                  <ShoppingCartIcon className="h-5 w-5 text-orange-400" />
                                </div>
                                <div>
                                  <h3 className="text-white font-semibold">
                                    {tab.title}
                                  </h3>
                                  <p className="text-gray-400 text-sm flex items-center gap-1">
                                    <ClockIcon className="h-3 w-3" />
                                    {formatDate(tab.postponedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-orange-400 font-bold text-lg">
                                  {calculateTotal(tab.cartItems).toFixed(2)} ج.م
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {tab.cartItems.length} صنف
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Invoice Details */}
                          <div className="p-4 space-y-3">
                            {/* Customer & Branch Info */}
                            <div className="flex flex-wrap gap-4 text-sm">
                              {tab.selections?.customer && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <UserIcon className="h-4 w-4 text-blue-400" />
                                  <span>{tab.selections.customer.name}</span>
                                </div>
                              )}
                              {tab.selections?.branch && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <BuildingOfficeIcon className="h-4 w-4 text-green-400" />
                                  <span>{tab.selections.branch.name}</span>
                                </div>
                              )}
                            </div>

                            {/* Cart Items Preview */}
                            <div className="bg-[#1F2937] rounded-lg p-3 max-h-32 overflow-y-auto scrollbar-hide">
                              {tab.cartItems.slice(0, 5).map((item, index) => (
                                <div
                                  key={item.id || index}
                                  className="flex items-center justify-between py-1 text-sm"
                                >
                                  <span className="text-gray-300 truncate flex-1">
                                    {item.product?.name || item.name || "منتج"}
                                  </span>
                                  <span className="text-gray-400 mx-2">
                                    x{item.quantity}
                                  </span>
                                  <span className="text-white">
                                    {((item.price || item.product?.price || 0) * item.quantity).toFixed(2)} ج.م
                                  </span>
                                </div>
                              ))}
                              {tab.cartItems.length > 5 && (
                                <p className="text-gray-500 text-xs text-center mt-2">
                                  و {tab.cartItems.length - 5} أصناف أخرى...
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleRestore(tab.id)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                                استعادة الفاتورة
                              </button>
                              <button
                                onClick={() => onDeleteTab(tab.id)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {postponedTabs.length > 0 && (
                  <div className="p-4 border-t border-gray-600 bg-[#374151]/30">
                    <p className="text-center text-gray-400 text-sm">
                      إجمالي الفواتير المؤجلة: {postponedTabs.length} فاتورة
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
