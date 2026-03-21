"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabase/client";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean | null;
  manager_id?: string | null;
}

interface BranchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBranch?: (branch: Branch) => void;
}

export default function BranchSelectionModal({
  isOpen,
  onClose,
  onSelectBranch,
}: BranchSelectionModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch branches from database
  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching branches:", error);
        setError("فشل في تحميل الفروع");
        return;
      }

      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      setError("حدث خطأ أثناء تحميل الفروع");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch branches when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  const handleSelect = (branch: Branch) => {
    if (onSelectBranch) {
      onSelectBranch(branch);
    }
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
                    <BuildingOfficeIcon className="h-6 w-6 text-dash-accent-blue" />
                    اختيار فرع البيع
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-overlay)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Branches List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dash-accent-blue mb-4"></div>
                      <p className="text-[var(--dash-text-muted)]">جاري تحميل الفروع...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BuildingOfficeIcon className="h-12 w-12 text-dash-accent-red mb-4" />
                      <p className="text-dash-accent-red mb-2">{error}</p>
                      <button
                        onClick={fetchBranches}
                        className="px-4 py-2 dash-btn-primary text-[var(--dash-text-primary)] rounded-lg text-sm transition-colors"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => handleSelect(branch)}
                        className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-[var(--dash-bg-surface)] text-gray-200 border-2 border-transparent hover:bg-[var(--dash-bg-overlay)] hover:border-[var(--dash-border-default)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--dash-bg-raised)] flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5" />
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{branch.name}</div>
                            {branch.address && (
                              <div className="text-sm text-[var(--dash-text-muted)] flex items-center gap-1">
                                <MapPinIcon className="h-3.5 w-3.5" />
                                {branch.address}
                              </div>
                            )}
                          </div>
                        </div>
                        {branch.phone && (
                          <div className="text-sm text-[var(--dash-text-muted)] flex items-center gap-1">
                            <PhoneIcon className="h-4 w-4" />
                            {branch.phone}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BuildingOfficeIcon className="h-12 w-12 text-[var(--dash-text-disabled)] mb-4" />
                      <p className="text-[var(--dash-text-muted)] mb-2">لا توجد فروع نشطة</p>
                      <p className="text-[var(--dash-text-disabled)] text-sm">
                        لا توجد فروع متاحة في قاعدة البيانات
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="mt-6 p-3 bg-[var(--dash-bg-surface)] rounded-lg">
                  <p className="text-sm text-[var(--dash-text-muted)] text-center">
                    اضغط على الفرع لاختياره للبيع منه
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
