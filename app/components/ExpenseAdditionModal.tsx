"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  BanknotesIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { roundMoney } from "../lib/utils/money";

interface ExpenseAdditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: { id: string; name: string } | null;
}

type OperationType = "expense" | "deposit";

export default function ExpenseAdditionModal({
  isOpen,
  onClose,
  record,
}: ExpenseAdditionModalProps) {
  const { user } = useAuth();
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<OperationType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [notesError, setNotesError] = useState(false);

  // Fetch drawer data when modal opens
  useEffect(() => {
    if (isOpen && record?.id) {
      fetchDrawerData();
      // Reset form
      setAmount("");
      setNotes("");
      setNotesError(false);
      setOperationType("expense");
    }
  }, [isOpen, record?.id]);

  const fetchDrawerData = async () => {
    if (!record?.id) return;

    setIsLoading(true);
    try {
      // Get or create drawer for this record
      let { data: drawer, error: drawerError } = await supabase
        .from("cash_drawers")
        .select("*")
        .eq("record_id", record.id)
        .single();

      if (drawerError && drawerError.code === "PGRST116") {
        // Drawer doesn't exist, create it
        const { data: newDrawer, error: createError } = await supabase
          .from("cash_drawers")
          .insert({ record_id: record.id, current_balance: 0 })
          .select()
          .single();

        if (createError) throw createError;
        drawer = newDrawer;
      } else if (drawerError) {
        throw drawerError;
      }

      if (!drawer) {
        throw new Error("Failed to get or create drawer");
      }

      setDrawerId(drawer.id);
      setCurrentBalance(drawer.current_balance || 0);
    } catch (error) {
      console.error("Error fetching drawer data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      alert("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (!notes.trim()) {
      setNotesError(true);
      alert("يجب إدخال سبب/ملاحظات");
      return;
    }

    if (operationType === "expense" && parsedAmount > currentBalance) {
      alert("المبلغ المطلوب أكبر من الرصيد المتاح في الدرج");
      return;
    }

    if (!drawerId || !record?.id) {
      alert("خطأ: لم يتم العثور على الدرج");
      return;
    }

    setIsProcessing(true);
    try {
      const isExpense = operationType === "expense";
      const balanceDelta = isExpense ? -parsedAmount : parsedAmount;

      // Atomic balance update (prevents race conditions)
      const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        'atomic_adjust_drawer_balance' as any,
        { p_drawer_id: drawerId, p_change: balanceDelta }
      );

      if (rpcErr) throw rpcErr;
      const newBalance = rpcResult?.[0]?.new_balance ?? roundMoney(currentBalance + balanceDelta);

      // Create transaction record
      const { error: txnError } = await supabase
        .from("cash_drawer_transactions")
        .insert({
          drawer_id: drawerId,
          record_id: record.id,
          transaction_type: isExpense ? "expense" : "deposit",
          amount: parsedAmount,
          balance_after: roundMoney(newBalance),
          notes: notes.trim(),
          performed_by: user?.name || user?.email || "user",
        });

      if (txnError) {
        // Reverse balance change if transaction record fails
        await supabase.rpc('atomic_adjust_drawer_balance' as any, {
          p_drawer_id: drawerId, p_change: -balanceDelta
        });
        throw txnError;
      }

      const label = isExpense ? "مصروفات" : "إضافه";
      alert(`تم تسجيل ${label} بمبلغ ${parsedAmount.toFixed(2)} بنجاح`);

      // Reset form and close
      setAmount("");
      setNotes("");
      setNotesError(false);
      setCurrentBalance(newBalance);
      onClose();
    } catch (error: any) {
      console.error("Transaction error:", error);
      alert(`خطأ: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--dash-bg-base)] shadow-[var(--dash-shadow-lg)] transition-all border border-[var(--dash-border-default)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                  <Dialog.Title className="text-xl font-bold text-[var(--dash-text-primary)] flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6 text-yellow-400" />
                    مصروفات / إضافة - {record?.name || "غير محدد"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-overlay)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto"></div>
                      <p className="mt-4 text-[var(--dash-text-muted)]">جاري التحميل...</p>
                    </div>
                  ) : (
                    <>
                      {/* Current Balance */}
                      <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/20 rounded-xl p-4 mb-6 border border-blue-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[var(--dash-text-muted)] text-sm mb-1">الرصيد الحالي</p>
                            <p className="text-2xl font-bold text-blue-400">
                              {currentBalance.toFixed(2)}
                            </p>
                          </div>
                          <BanknotesIcon className="h-12 w-12 text-blue-500/30" />
                        </div>
                      </div>

                      {/* Operation Type Tabs */}
                      <div className="flex gap-2 mb-6">
                        <button
                          onClick={() => setOperationType("expense")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                            operationType === "expense"
                              ? "bg-red-600 text-white"
                              : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                          }`}
                        >
                          <MinusCircleIcon className="h-5 w-5" />
                          المصروفات
                        </button>
                        <button
                          onClick={() => setOperationType("deposit")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                            operationType === "deposit"
                              ? "bg-green-600 text-white"
                              : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                          }`}
                        >
                          <PlusCircleIcon className="h-5 w-5" />
                          الإضافة
                        </button>
                      </div>

                      {/* Amount Field */}
                      <div className="mb-4">
                        <label className="text-[var(--dash-text-muted)] text-sm block mb-1">المبلغ *</label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="أدخل المبلغ"
                          className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-[var(--dash-text-primary)] text-lg focus:outline-none focus:border-yellow-500"
                          min={0}
                          step="0.01"
                        />
                        {operationType === "expense" && parseFloat(amount) > currentBalance && (
                          <p className="text-red-400 text-xs mt-1">المبلغ أكبر من الرصيد المتاح</p>
                        )}
                      </div>

                      {/* Notes Field (Required) */}
                      <div className="mb-6">
                        <label className="text-[var(--dash-text-muted)] text-sm block mb-1">السبب / ملاحظات *</label>
                        <textarea
                          value={notes}
                          onChange={(e) => {
                            setNotes(e.target.value);
                            if (e.target.value.trim()) setNotesError(false);
                          }}
                          placeholder={operationType === "expense" ? "سبب المصروف..." : "سبب الإضافة..."}
                          rows={3}
                          className={`w-full bg-[var(--dash-bg-surface)] border rounded-lg px-4 py-3 text-[var(--dash-text-primary)] focus:outline-none resize-none ${
                            notesError ? "border-red-500" : "border-[var(--dash-border-default)] focus:border-yellow-500"
                          }`}
                        />
                        {notesError && (
                          <p className="text-red-400 text-xs mt-1">يجب إدخال السبب</p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !amount || !notes.trim()}
                        className={`w-full px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed ${
                          operationType === "expense"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {isProcessing
                          ? "جاري المعالجة..."
                          : operationType === "expense"
                          ? "تسجيل مصروف"
                          : "تسجيل إضافة"}
                      </button>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--dash-border-subtle)] bg-[var(--dash-bg-base)]">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded-lg transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
