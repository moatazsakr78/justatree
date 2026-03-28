"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabase/client";

interface Record {
  id: string;
  name: string;
  branch_id?: string | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  parent_id: string | null;
  safe_type: string | null;
  supports_drawers: boolean | null;
  show_transfers?: boolean | null;
  branch?: {
    name: string;
  } | null;
}

interface RecordsSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord?: (record: any, subSafe?: any) => void;
  paymentIsPhysical?: boolean; // true = show drawers only, false = show main safes only, undefined = show all
}

export default function RecordsSelectionModal({
  isOpen,
  onClose,
  onSelectRecord,
  paymentIsPhysical,
}: RecordsSelectionModalProps) {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("records")
        .select(
          `
          id,
          name,
          branch_id,
          is_primary,
          is_active,
          parent_id,
          safe_type,
          supports_drawers,
          show_transfers,
          branch:branches(name)
        `
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching records:", error);
        setError("فشل في تحميل الخزن");
        return;
      }

      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      setError("حدث خطأ أثناء تحميل الخزن");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecords();
    }
  }, [isOpen]);

  // Group records: main safes with their children
  const mainRecords = records.filter((s) => s.safe_type !== "sub");
  const getChildren = (parentId: string) =>
    records.filter((s) => s.parent_id === parentId && s.safe_type === "sub");

  const recordsWithDrawers = mainRecords.filter(
    (s) => s.supports_drawers && getChildren(s.id).length > 0
  );
  const recordsWithoutDrawers = mainRecords.filter(
    (s) => !s.supports_drawers || getChildren(s.id).length === 0
  );

  const handleSelectSubSafe = (mainRecord: Record, subSafe: Record) => {
    if (onSelectRecord) {
      onSelectRecord(mainRecord, subSafe);
    }
    onClose();
  };

  const handleSelectMainRecord = (record: Record) => {
    if (onSelectRecord) {
      onSelectRecord(record);
    }
    onClose();
  };

  const handleNoSafeSelect = () => {
    if (onSelectRecord) {
      onSelectRecord({
        id: null as any,
        name: "لا يوجد",
        branch_id: null,
        is_primary: false,
        is_active: true,
        parent_id: null,
        safe_type: null,
        branch: null,
      });
    }
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--dash-bg-base)] p-6 shadow-[var(--dash-shadow-lg)] transition-all border border-[var(--dash-border-default)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-[var(--dash-text-primary)] flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6 text-dash-accent-blue" />
                    اختيار الدرج / الخزنة
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-overlay)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Selection List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {/* "No Safe" Option */}
                  <button
                    onClick={handleNoSafeSelect}
                    className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-[var(--dash-bg-raised)] text-[var(--dash-text-secondary)] border-2 border-dashed border-[var(--dash-border-default)] hover:bg-[var(--dash-bg-overlay)] hover:border-[var(--dash-border-subtle)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--dash-bg-surface)] flex items-center justify-center">
                        <XMarkIcon className="h-5 w-5 text-[var(--dash-text-muted)]" />
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[var(--dash-text-secondary)]">
                          لا يوجد
                        </div>
                        <div className="text-sm text-[var(--dash-text-disabled)]">
                          بدون تأثير على أي خزنة
                        </div>
                      </div>
                    </div>
                    <span className="text-xs bg-[var(--dash-bg-overlay)]/50 text-[var(--dash-text-muted)] px-2 py-1 rounded-lg">
                      اختياري
                    </span>
                  </button>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dash-accent-blue mb-4"></div>
                      <p className="text-[var(--dash-text-muted)]">جاري تحميل الخزن...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BanknotesIcon className="h-12 w-12 text-dash-accent-red mb-4" />
                      <p className="text-dash-accent-red mb-2">{error}</p>
                      <button
                        onClick={fetchRecords}
                        className="px-4 py-2 dash-btn-primary rounded-lg text-sm transition-colors"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : records.length > 0 ? (
                    <>
                      {/* === Transfer mode: show only main safe names === */}
                      {paymentIsPhysical === false ? (
                        <>
                          {mainRecords.map((record) => (
                            <button
                              key={record.id}
                              onClick={() => handleSelectMainRecord(record)}
                              className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border-2 border-transparent hover:bg-[var(--dash-bg-raised)] hover:border-dash-accent-blue/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-dash-accent-blue-subtle flex items-center justify-center">
                                  <ArrowsRightLeftIcon className="h-5 w-5 text-dash-accent-blue" />
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold flex items-center gap-2">
                                    {record.name}
                                  </div>
                                  {record.branch?.name && (
                                    <div className="text-sm text-[var(--dash-text-muted)] flex items-center gap-1">
                                      <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                      {record.branch.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {/* === Physical mode OR default (POS): show drawers === */}
                          {/* Records WITH drawers */}
                          {recordsWithDrawers.map((mainRecord) => {
                            const children = getChildren(mainRecord.id);
                            return (
                              <div key={mainRecord.id}>
                                <div className="flex items-center gap-2 px-3 py-2 mt-2">
                                  <div className="h-px flex-1 bg-[var(--dash-border-default)]"></div>
                                  <span className="text-xs text-[var(--dash-text-muted)] font-medium flex items-center gap-1">
                                    <BanknotesIcon className="h-3.5 w-3.5" />
                                    {mainRecord.name}
                                  </span>
                                  <div className="h-px flex-1 bg-[var(--dash-border-default)]"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 px-1">
                                  {children.map((child) => (
                                    <button
                                      key={child.id}
                                      onClick={() =>
                                        handleSelectSubSafe(mainRecord, child)
                                      }
                                      className="flex items-center gap-2 p-3 rounded-xl transition-all bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border-2 border-transparent hover:bg-[var(--dash-bg-raised)] hover:border-dash-accent-cyan/50"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-dash-accent-cyan-subtle flex items-center justify-center flex-shrink-0">
                                        <span className="text-dash-accent-cyan text-xs font-bold">
                                          #
                                        </span>
                                      </div>
                                      <div className="text-right min-w-0">
                                        <div className="font-medium text-sm truncate">
                                          {child.name}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                  {/* تحويلات - only show when paymentIsPhysical is undefined and safe has separate transfers */}
                                  {paymentIsPhysical === undefined && mainRecord.show_transfers !== false && (
                                    <button
                                      onClick={() =>
                                        handleSelectSubSafe(mainRecord, { ...mainRecord, name: 'تحويلات' })
                                      }
                                      className="flex items-center gap-2 p-3 rounded-xl transition-all bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border-2 border-transparent hover:bg-[var(--dash-bg-raised)] hover:border-dash-accent-blue/50"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-dash-accent-blue-subtle flex items-center justify-center flex-shrink-0">
                                        <ArrowsRightLeftIcon className="h-4 w-4 text-dash-accent-blue" />
                                      </div>
                                      <div className="text-right min-w-0">
                                        <div className="font-medium text-sm truncate text-dash-accent-blue">
                                          تحويلات
                                        </div>
                                      </div>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Records WITHOUT drawers */}
                          {recordsWithoutDrawers.length > 0 && (
                            <>
                              {recordsWithDrawers.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-2 mt-2">
                                  <div className="h-px flex-1 bg-[var(--dash-border-default)]"></div>
                                  <span className="text-xs text-[var(--dash-text-muted)] font-medium">
                                    خزن بدون أدراج
                                  </span>
                                  <div className="h-px flex-1 bg-[var(--dash-border-default)]"></div>
                                </div>
                              )}
                              {recordsWithoutDrawers.map((record) => (
                                <button
                                  key={record.id}
                                  onClick={() => handleSelectMainRecord(record)}
                                  className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] border-2 border-transparent hover:bg-[var(--dash-bg-raised)] hover:border-[var(--dash-border-default)]"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--dash-bg-raised)] flex items-center justify-center">
                                      <BanknotesIcon className="h-5 w-5" />
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold flex items-center gap-2">
                                        {record.name}
                                      </div>
                                      {record.branch?.name && (
                                        <div className="text-sm text-[var(--dash-text-muted)] flex items-center gap-1">
                                          <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                          {record.branch.name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BanknotesIcon className="h-12 w-12 text-[var(--dash-text-disabled)] mb-4" />
                      <p className="text-[var(--dash-text-muted)] mb-2">لا توجد خزن نشطة</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 p-3 bg-[var(--dash-bg-surface)] rounded-lg">
                  <p className="text-sm text-[var(--dash-text-muted)] text-center">
                    اضغط على الدرج أو الخزنة لاختيارها
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
