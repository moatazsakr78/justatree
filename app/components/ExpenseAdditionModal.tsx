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
  record: {
    id: string;
    name: string;
    supports_drawers?: boolean | null;
    show_transfers?: boolean | null;
    safe_type?: string | null;
  } | null;
}

type OperationType = "expense" | "deposit";

type BalanceSource = {
  id: string;           // drawer ID to deduct from
  recordId: string;     // record ID for the transaction
  label: string;        // display name
  balance: number;      // available balance
  txTypeExpense: string; // transaction_type for expense
  txTypeDeposit: string; // transaction_type for deposit
};

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

  const [balanceSources, setBalanceSources] = useState<BalanceSource[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number>(0);

  // Fetch drawer data when modal opens
  useEffect(() => {
    if (isOpen && record?.id) {
      fetchDrawerData();
      // Reset form
      setAmount("");
      setNotes("");
      setNotesError(false);
      setOperationType("expense");
      setSelectedSourceIndex(0);
      setBalanceSources([]);
    }
  }, [isOpen, record?.id]);

  const fetchDrawerData = async () => {
    if (!record?.id) return;

    setIsLoading(true);
    try {
      // Determine safe configuration — fetch from DB if props are missing
      let supportsDrawers = record.supports_drawers;
      let showTransfers = record.show_transfers;
      let safeType = record.safe_type;

      if (supportsDrawers === undefined || showTransfers === undefined) {
        const { data: details } = await supabase
          .from("records")
          .select("supports_drawers, show_transfers, safe_type")
          .eq("id", record.id)
          .single();
        if (details) {
          supportsDrawers = details.supports_drawers;
          showTransfers = details.show_transfers;
          safeType = details.safe_type;
        }
      }

      const sources: BalanceSource[] = [];

      if (supportsDrawers && safeType !== "sub") {
        // ── Drawers mode: fetch child safes + main safe transfers ──
        const { data: children } = await supabase
          .from("records")
          .select("id, name")
          .eq("parent_id", record.id)
          .eq("safe_type", "sub" as any);

        const childIds = (children || []).map((c: any) => c.id);
        const allIds = [record.id, ...childIds];

        const { data: drawers } = await supabase
          .from("cash_drawers")
          .select("id, record_id, current_balance")
          .in("record_id", allIds);

        const drawerMap = new Map<string, { id: string; balance: number }>();
        for (const d of drawers || []) {
          drawerMap.set(d.record_id, { id: d.id, balance: d.current_balance || 0 });
        }

        // Child drawers first
        for (const child of children || []) {
          const info = drawerMap.get(child.id);
          if (info) {
            sources.push({
              id: info.id,
              recordId: child.id,
              label: child.name,
              balance: info.balance,
              txTypeExpense: "expense",
              txTypeDeposit: "deposit",
            });
          }
        }

        // Main safe = transfers
        const mainInfo = drawerMap.get(record.id);
        if (mainInfo) {
          sources.push({
            id: mainInfo.id,
            recordId: record.id,
            label: "التحويلات",
            balance: mainInfo.balance,
            txTypeExpense: "transfer_out",
            txTypeDeposit: "transfer_in",
          });
        }
      } else if (showTransfers !== false && safeType !== "sub") {
        // ── Transfers mode: single drawer, split by transaction type ──
        let { data: drawer, error: drawerError } = await supabase
          .from("cash_drawers")
          .select("*")
          .eq("record_id", record.id)
          .single();

        if (drawerError && drawerError.code === "PGRST116") {
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

        if (!drawer) throw new Error("Failed to get or create drawer");

        const totalBalance = drawer.current_balance || 0;

        // Compute transfer balance (running balance that never goes below 0)
        const { data: txns } = await supabase
          .from("cash_drawer_transactions")
          .select("amount, transaction_type")
          .eq("record_id", record.id)
          .in("transaction_type", ["transfer_in", "transfer_out"])
          .order("created_at", { ascending: true });

        let transferBalance = 0;
        for (const t of txns || []) {
          const amt = parseFloat(String(t.amount)) || 0;
          if (t.transaction_type === "transfer_in") {
            transferBalance += amt;
          } else {
            transferBalance = Math.max(0, transferBalance - amt);
          }
        }
        transferBalance = roundMoney(transferBalance);

        const cappedTransferBalance = Math.min(transferBalance, Math.max(0, totalBalance));
        const regularBalance = roundMoney(Math.max(0, totalBalance - cappedTransferBalance));

        sources.push({
          id: drawer.id,
          recordId: record.id,
          label: "الخزنة",
          balance: regularBalance,
          txTypeExpense: "expense",
          txTypeDeposit: "deposit",
        });
        sources.push({
          id: drawer.id,
          recordId: record.id,
          label: "التحويلات",
          balance: cappedTransferBalance,
          txTypeExpense: "transfer_out",
          txTypeDeposit: "transfer_in",
        });
      } else {
        // ── Simple mode: single source ──
        let { data: drawer, error: drawerError } = await supabase
          .from("cash_drawers")
          .select("*")
          .eq("record_id", record.id)
          .single();

        if (drawerError && drawerError.code === "PGRST116") {
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

        if (!drawer) throw new Error("Failed to get or create drawer");

        sources.push({
          id: drawer.id,
          recordId: record.id,
          label: record.name,
          balance: drawer.current_balance || 0,
          txTypeExpense: "expense",
          txTypeDeposit: "deposit",
        });
      }

      setBalanceSources(sources);
      setSelectedSourceIndex(0);
      if (sources.length > 0) {
        setDrawerId(sources[0].id);
        setCurrentBalance(sources[0].balance);
      }
    } catch (error) {
      console.error("Error fetching drawer data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceChange = (index: number) => {
    setSelectedSourceIndex(index);
    const source = balanceSources[index];
    if (source) {
      setDrawerId(source.id);
      setCurrentBalance(source.balance);
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

    const selectedSource = balanceSources[selectedSourceIndex];
    if (!selectedSource || !record?.id) {
      alert("خطأ: لم يتم العثور على الدرج");
      return;
    }

    setIsProcessing(true);
    try {
      const isExpense = operationType === "expense";
      const balanceDelta = isExpense ? -parsedAmount : parsedAmount;

      // Atomic balance update
      const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        'atomic_adjust_drawer_balance' as any,
        { p_drawer_id: selectedSource.id, p_change: balanceDelta }
      );

      if (rpcErr) throw rpcErr;
      const newBalance = rpcResult?.[0]?.new_balance ?? roundMoney(currentBalance + balanceDelta);

      // Determine transaction type based on source
      const transactionType = isExpense
        ? selectedSource.txTypeExpense
        : selectedSource.txTypeDeposit;

      // Create transaction record
      const { data: txnData, error: txnError } = await supabase
        .from("cash_drawer_transactions")
        .insert({
          drawer_id: selectedSource.id,
          record_id: selectedSource.recordId,
          transaction_type: transactionType,
          amount: parsedAmount,
          balance_after: roundMoney(newBalance),
          notes: notes.trim(),
          performed_by: user?.name || user?.email || "user",
        })
        .select('id')
        .single();

      if (txnError) {
        // Reverse balance change if transaction record fails
        await supabase.rpc('atomic_adjust_drawer_balance' as any, {
          p_drawer_id: selectedSource.id, p_change: -balanceDelta
        });
        throw txnError;
      }

      // Also create expense record for tracking (only for expense operations)
      if (isExpense && txnData) {
        const DEFAULT_MISC_CATEGORY_ID = 'a0000001-0000-0000-0000-000000000000';
        await supabase
          .from("expenses")
          .insert({
            amount: parsedAmount,
            description: notes.trim(),
            category_id: DEFAULT_MISC_CATEGORY_ID,
            record_id: selectedSource.recordId,
            drawer_id: selectedSource.id,
            transaction_id: (txnData as any).id,
            user_id: (user as any)?.id || null,
            performed_by: user?.name || user?.email || "user",
            status: 'completed',
          } as any)
          .then(({ error: expErr }) => {
            if (expErr) console.error('Failed to create expense record:', expErr);
          });
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

  const selectedSource = balanceSources[selectedSourceIndex];

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
          <div className="fixed inset-0 bg-black/70" />
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
                    <BanknotesIcon className="h-6 w-6 text-dash-accent-orange" />
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
                            <p className="text-[var(--dash-text-muted)] text-sm mb-1">
                              {balanceSources.length > 1 && selectedSource
                                ? `رصيد ${selectedSource.label}`
                                : "الرصيد الحالي"}
                            </p>
                            <p className="text-2xl font-bold text-dash-accent-blue">
                              {currentBalance.toFixed(2)}
                            </p>
                          </div>
                          <BanknotesIcon className="h-12 w-12 text-dash-accent-blue/30" />
                        </div>
                      </div>

                      {/* Source Selector — only when multiple sources */}
                      {balanceSources.length > 1 && (
                        <div className="mb-4">
                          <label className="text-[var(--dash-text-muted)] text-sm block mb-2">مصدر الرصيد</label>
                          <div className="flex flex-col gap-2">
                            {balanceSources.map((source, index) => (
                              <label
                                key={`${source.recordId}-${index}`}
                                onClick={() => handleSourceChange(index)}
                                className={`flex items-center justify-between cursor-pointer rounded-lg px-4 py-2.5 border transition-colors ${
                                  selectedSourceIndex === index
                                    ? "bg-blue-900/30 border-dash-accent-blue"
                                    : "bg-[var(--dash-bg-surface)] border-[var(--dash-border-default)] hover:border-[var(--dash-border-hover)]"
                                }`}
                              >
                                <span className={`text-sm font-bold ${
                                  selectedSourceIndex === index ? "text-dash-accent-blue" : "text-[var(--dash-text-muted)]"
                                }`}>
                                  {source.balance.toFixed(2)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-[var(--dash-text-secondary)]">
                                    {source.label}
                                  </span>
                                  <input
                                    type="radio"
                                    name="balanceSource"
                                    checked={selectedSourceIndex === index}
                                    onChange={() => handleSourceChange(index)}
                                    className="w-4 h-4 text-dash-accent-blue bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)] focus:ring-[var(--dash-accent-blue)] focus:ring-2 cursor-pointer"
                                  />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Operation Type Tabs */}
                      <div className="flex gap-2 mb-6">
                        <button
                          onClick={() => setOperationType("expense")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                            operationType === "expense"
                              ? "bg-dash-accent-red text-white"
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
                              ? "bg-dash-accent-green text-white"
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
                          className="w-full bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-lg px-4 py-3 text-[var(--dash-text-primary)] text-lg focus:outline-none focus:border-dash-accent-orange"
                          min={0}
                          step="0.01"
                        />
                        {operationType === "expense" && parseFloat(amount) > currentBalance && (
                          <p className="text-dash-accent-red text-xs mt-1">المبلغ أكبر من الرصيد المتاح</p>
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
                            notesError ? "border-dash-accent-red" : "border-[var(--dash-border-default)] focus:border-dash-accent-orange"
                          }`}
                        />
                        {notesError && (
                          <p className="text-dash-accent-red text-xs mt-1">يجب إدخال السبب</p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !amount || !notes.trim()}
                        className={`w-full px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed ${
                          operationType === "expense"
                            ? "dash-btn-red"
                            : "dash-btn-green"
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
