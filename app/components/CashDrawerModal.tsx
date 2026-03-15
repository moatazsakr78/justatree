"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabase/client";
import { isOutgoingType } from "../lib/utils/transactionTypes";

interface CashDrawerTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  notes: string | null;
  created_at: string | null;
}

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: { id: string; name: string } | null;
}

export default function CashDrawerModal({
  isOpen,
  onClose,
  record,
}: CashDrawerModalProps) {
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawNotes, setWithdrawNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Fetch drawer data when modal opens
  useEffect(() => {
    if (isOpen && record?.id) {
      fetchDrawerData();
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

      // Fetch recent transactions
      const { data: txns, error: txnError } = await supabase
        .from("cash_drawer_transactions")
        .select("*")
        .eq("drawer_id", drawer.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (txnError) throw txnError;
      setTransactions((txns || []) as CashDrawerTransaction[]);
    } catch (error) {
      console.error("Error fetching drawer data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (amount > currentBalance) {
      alert("المبلغ المطلوب أكبر من الرصيد المتاح في الدرج");
      return;
    }

    if (!drawerId || !record?.id) {
      alert("خطأ: لم يتم العثور على الدرج");
      return;
    }

    setIsProcessing(true);
    try {
      const newBalance = currentBalance - amount;

      // Update drawer balance
      const { error: updateError } = await supabase
        .from("cash_drawers")
        .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", drawerId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txnError } = await supabase
        .from("cash_drawer_transactions")
        .insert({
          drawer_id: drawerId,
          record_id: record.id,
          transaction_type: "withdrawal",
          amount: amount,
          balance_after: newBalance,
          notes: withdrawNotes || "سحب نقدي",
          performed_by: "user", // Can be enhanced to include actual user
        });

      if (txnError) throw txnError;

      // Refresh data
      setCurrentBalance(newBalance);
      await fetchDrawerData();

      // Reset form
      setWithdrawAmount("");
      setWithdrawNotes("");
      setShowWithdrawForm(false);

      alert(`تم سحب ${amount.toFixed(2)} بنجاح`);
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      alert(`خطأ في السحب: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawAll = async () => {
    if (currentBalance <= 0) {
      alert("الدرج فارغ");
      return;
    }

    if (!confirm(`هل أنت متأكد من سحب كامل المبلغ (${currentBalance.toFixed(2)})؟`)) {
      return;
    }

    setWithdrawAmount(currentBalance.toString());
    setWithdrawNotes("سحب كامل الرصيد");

    // Trigger withdrawal
    const amount = currentBalance;
    if (!drawerId || !record?.id) {
      alert("خطأ: لم يتم العثور على الدرج");
      return;
    }

    setIsProcessing(true);
    try {
      // Update drawer balance to 0
      const { error: updateError } = await supabase
        .from("cash_drawers")
        .update({ current_balance: 0, updated_at: new Date().toISOString() })
        .eq("id", drawerId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txnError } = await supabase
        .from("cash_drawer_transactions")
        .insert({
          drawer_id: drawerId,
          record_id: record.id,
          transaction_type: "withdrawal",
          amount: amount,
          balance_after: 0,
          notes: "سحب كامل الرصيد",
          performed_by: "user",
        });

      if (txnError) throw txnError;

      // Refresh data
      setCurrentBalance(0);
      await fetchDrawerData();

      // Reset form
      setWithdrawAmount("");
      setWithdrawNotes("");
      setShowWithdrawForm(false);

      alert(`تم سحب ${amount.toFixed(2)} بنجاح - الدرج فارغ الآن`);
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      alert(`خطأ في السحب: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      sale: { text: "بيع", color: "text-green-400" },
      return: { text: "مرتجع", color: "text-red-400" },
      withdrawal: { text: "سحب", color: "text-orange-400" },
      deposit: { text: "إضافه", color: "text-green-400" },
      expense: { text: "مصروفات", color: "text-red-400" },
      adjustment: { text: "تعديل", color: "text-gray-400" },
    };
    return labels[type] || { text: type, color: "text-gray-400" };
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-[#1F2937] shadow-xl transition-all border border-gray-600">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-600">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6 text-green-400" />
                    الدرج - {record?.name || "غير محدد"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400 mx-auto"></div>
                      <p className="mt-4 text-gray-400">جاري التحميل...</p>
                    </div>
                  ) : (
                    <>
                      {/* Current Balance Card */}
                      <div className="bg-gradient-to-r from-green-900/40 to-green-800/20 rounded-xl p-6 mb-6 border border-green-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm mb-1">الرصيد الحالي</p>
                            <p className="text-3xl font-bold text-green-400">
                              {currentBalance.toFixed(2)}
                            </p>
                          </div>
                          <BanknotesIcon className="h-16 w-16 text-green-500/30" />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mb-6">
                        <button
                          onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                        >
                          <ArrowUpTrayIcon className="h-5 w-5" />
                          سحب جزئي
                        </button>
                        <button
                          onClick={handleWithdrawAll}
                          disabled={currentBalance <= 0 || isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                          سحب الكل
                        </button>
                      </div>

                      {/* Withdraw Form */}
                      {showWithdrawForm && (
                        <div className="bg-[#2B3544] rounded-xl p-4 mb-6 border border-gray-600">
                          <h4 className="text-white font-medium mb-3">سحب نقدي</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="text-gray-400 text-sm block mb-1">المبلغ</label>
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="أدخل المبلغ"
                                className="w-full bg-[#1F2937] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                                max={currentBalance}
                                min={0}
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm block mb-1">ملاحظات (اختياري)</label>
                              <input
                                type="text"
                                value={withdrawNotes}
                                onChange={(e) => setWithdrawNotes(e.target.value)}
                                placeholder="سبب السحب"
                                className="w-full bg-[#1F2937] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleWithdraw}
                                disabled={isProcessing || !withdrawAmount}
                                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                              >
                                {isProcessing ? "جاري المعالجة..." : "تأكيد السحب"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowWithdrawForm(false);
                                  setWithdrawAmount("");
                                  setWithdrawNotes("");
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent Transactions */}
                      <div>
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                          <ClockIcon className="h-5 w-5 text-gray-400" />
                          آخر الحركات
                        </h4>
                        {transactions.length === 0 ? (
                          <div className="text-center py-6 text-gray-400">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>لا توجد حركات بعد</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                            {transactions.map((txn) => {
                              const typeInfo = getTransactionTypeLabel(txn.transaction_type);
                              return (
                                <div
                                  key={txn.id}
                                  className="flex items-center justify-between bg-[#2B3544] rounded-lg px-4 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${typeInfo.color}`}>
                                      {typeInfo.text}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      {txn.created_at ? formatDate(txn.created_at) : "-"}
                                    </span>
                                  </div>
                                  <div className="text-left">
                                    <span
                                      className={`font-bold ${
                                        isOutgoingType(txn.transaction_type) ? "text-red-400" : "text-green-400"
                                      }`}
                                    >
                                      {isOutgoingType(txn.transaction_type) ? "-" : "+"}
                                      {txn.amount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-600 bg-[#1a1f2e]">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
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
