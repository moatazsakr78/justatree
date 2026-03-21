"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CurrencyDollarIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export type PriceType =
  | "price"
  | "wholesale_price"
  | "price1"
  | "price2"
  | "price3"
  | "price4";

interface PriceTypeOption {
  id: PriceType;
  name: string;
  description: string;
}

const PRICE_TYPE_OPTIONS: PriceTypeOption[] = [
  { id: "price", name: "سعر البيع", description: "السعر الافتراضي للبيع للعملاء" },
  { id: "wholesale_price", name: "سعر الجملة", description: "سعر البيع بالجملة للتجار" },
  { id: "price1", name: "سعر 1", description: "سعر مخصص رقم 1" },
  { id: "price2", name: "سعر 2", description: "سعر مخصص رقم 2" },
  { id: "price3", name: "سعر 3", description: "سعر مخصص رقم 3" },
  { id: "price4", name: "سعر 4", description: "سعر مخصص رقم 4" },
];

interface PriceTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPriceType: PriceType;
  onSelectPriceType: (priceType: PriceType) => void;
}

export function getPriceTypeName(priceType: PriceType): string {
  const option = PRICE_TYPE_OPTIONS.find(opt => opt.id === priceType);
  return option?.name || "سعر البيع";
}

export default function PriceTypeSelectionModal({
  isOpen,
  onClose,
  selectedPriceType,
  onSelectPriceType,
}: PriceTypeSelectionModalProps) {
  const handleSelect = (priceType: PriceType) => {
    onSelectPriceType(priceType);
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--dash-bg-base)] p-6 shadow-[var(--dash-shadow-lg)] transition-all border border-[var(--dash-border-default)] animate-dash-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-[var(--dash-text-primary)] flex items-center gap-2">
                    <CurrencyDollarIcon className="h-6 w-6 text-dash-accent-blue" />
                    اختيار نوع السعر
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-overlay)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Price Type Options */}
                <div className="space-y-2">
                  {PRICE_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                        selectedPriceType === option.id
                          ? "bg-dash-accent-blue text-[var(--dash-text-primary)] border-2 border-dash-accent-blue"
                          : "bg-[var(--dash-bg-surface)] text-gray-200 border-2 border-transparent hover:bg-[var(--dash-bg-overlay)] hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            selectedPriceType === option.id
                              ? "bg-dash-accent-blue"
                              : "bg-[var(--dash-bg-raised)]"
                          }`}
                        >
                          <CurrencyDollarIcon className="h-5 w-5" />
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{option.name}</div>
                          <div
                            className={`text-sm ${
                              selectedPriceType === option.id
                                ? "text-dash-accent-blue"
                                : "text-[var(--dash-text-muted)]"
                            }`}
                          >
                            {option.description}
                          </div>
                        </div>
                      </div>
                      {selectedPriceType === option.id && (
                        <CheckIcon className="h-6 w-6 text-[var(--dash-text-primary)]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Footer Note */}
                <div className="mt-6 p-3 bg-[var(--dash-bg-surface)] rounded-lg">
                  <p className="text-sm text-[var(--dash-text-muted)] text-center">
                    سيتم عرض السعر المحدد في واجهة نقطة البيع وسيُعاد تعيينه لـ "سعر البيع" بعد إتمام كل فاتورة
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
