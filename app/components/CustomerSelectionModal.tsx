"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { supabase } from "../lib/supabase/client";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  opening_balance: number | null;
  calculated_balance: number; // Calculated: opening_balance + sales - payments + loans
  rank: string | null;
  category: string | null;
  loyalty_points: number | null;
  is_active: boolean | null;
  group_id: string | null;
  default_record_id: string | null;
  default_price_type: string | null;
  default_record?: { id: string; name: string } | null;
}

interface CustomerGroup {
  id: string;
  name: string;
  parent_id: string | null;
  count: number;
  isSelected?: boolean;
  is_active: boolean | null;
  sort_order: number | null;
}

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export default function CustomerSelectionModal({
  isOpen,
  onClose,
  onSelectCustomer,
}: CustomerSelectionModalProps) {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers and customer groups from database
  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch customers with opening_balance and default settings
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, city, opening_balance, rank, category, loyalty_points, is_active, group_id, default_record_id, default_price_type, default_record:records!default_record_id(id, name)")
        .eq("is_active", true)
        .order("name", { ascending: true }) as { data: any[] | null; error: any };

      if (customersError) {
        console.error("Error fetching customers:", customersError);
        setError("فشل في تحميل العملاء");
        return;
      }

      // Fetch customer balances using PostgreSQL function (more efficient and reliable)
      // This calculates: opening_balance + total_sales + loans - regular_payments
      const { data: balancesData, error: balancesError } = await supabase
        .rpc('calculate_customer_balances' as any) as {
          data: Array<{ customer_id: string; calculated_balance: number }> | null;
          error: any
        };

      if (balancesError) {
        console.error("Error fetching customer balances:", balancesError);
      }

      // Merge customers with their calculated balances
      const customersWithBalance = (customersData || []).map((customer: any) => {
        const balanceRecord = (balancesData || []).find(
          (b) => b.customer_id === customer.id
        );
        // Normalize joined default_record (may be array or object depending on Supabase)
        const defaultRecord = Array.isArray(customer.default_record)
          ? customer.default_record[0] || null
          : customer.default_record || null;
        return {
          ...customer,
          calculated_balance: Number(balanceRecord?.calculated_balance) || 0,
          default_record: defaultRecord,
        };
      });

      setCustomers(customersWithBalance as Customer[]);

      // Fetch customer groups with customer counts
      const { data: groupsData, error: groupsError } = await supabase
        .from("customer_groups")
        .select(`id, name, parent_id, is_active, sort_order`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (groupsError) {
        console.error("Error fetching customer groups:", groupsError);
        setError("فشل في تحميل مجموعات العملاء");
        return;
      }

      // Calculate customer counts per group
      const groups = (groupsData || []).map((group) => {
        const customerCount = (customersData || []).filter(
          (c) => c.group_id === group.id
        ).length;
        return {
          ...group,
          count: customerCount,
        };
      });

      // Add "All Customers" group at the beginning
      const allCustomersGroup = {
        id: "all",
        name: "جميع العملاء",
        parent_id: null,
        count: (customersData || []).length,
        isSelected: true,
        is_active: true,
        sort_order: -1,
      };

      setCustomerGroups([allCustomersGroup, ...groups]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch customers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setSearchQuery("");
      setSelectedGroup("all");
    }
  }, [isOpen]);

  const handleSelect = (customer: Customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
    onClose();
  };

  const getRankColor = (rank: string | null) => {
    switch (rank) {
      case "immortal":
        return "text-red-500";
      case "vip":
        return "text-yellow-500";
      case "gold":
        return "text-yellow-600";
      case "silver":
        return "text-gray-400";
      case "bronze":
        return "text-orange-600";
      default:
        return "text-gray-400";
    }
  };

  // Check if customer is the default customer
  const isDefaultCustomer = (customer: Customer) => customer.name === "عميل";

  // Filter and sort customers - default customer first
  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        searchQuery === "" ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchQuery)) ||
        (customer.city && customer.city.includes(searchQuery));

      if (selectedGroup === "all") return matchesSearch;

      // Filter by specific customer group
      return matchesSearch && customer.group_id === selectedGroup;
    })
    .sort((a, b) => {
      // Default customer always first
      if (isDefaultCustomer(a)) return -1;
      if (isDefaultCustomer(b)) return 1;
      return a.name.localeCompare(b.name, "ar");
    });

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[var(--dash-bg-base)] shadow-[var(--dash-shadow-lg)] transition-all border border-[var(--dash-border-default)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--dash-border-default)]">
                  <Dialog.Title className="text-xl font-bold text-[var(--dash-text-primary)] flex items-center gap-2">
                    <UserIcon className="h-6 w-6 text-blue-400" />
                    اختيار عميل
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--dash-bg-overlay)]"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-[var(--dash-border-default)]">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--dash-text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="البحث عن عميل بالاسم أو الهاتف..."
                      className="w-full pl-4 pr-12 py-3 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-xl text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--dash-accent-blue)] focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  {/* Customer Groups */}
                  {customerGroups.length > 1 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {customerGroups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroup(group.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${
                            selectedGroup === group.id
                              ? "bg-blue-600 text-white"
                              : "bg-[var(--dash-bg-surface)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-raised)]"
                          }`}
                        >
                          <UsersIcon className="h-3.5 w-3.5" />
                          {group.name}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              selectedGroup === group.id
                                ? "bg-blue-700"
                                : "bg-[var(--dash-bg-overlay)]"
                            }`}
                          >
                            {group.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customers List */}
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-[var(--dash-text-muted)]">جاري تحميل العملاء...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <UserIcon className="h-12 w-12 text-red-500 mb-4" />
                      <p className="text-red-400 mb-2">{error}</p>
                      <button
                        onClick={fetchCustomers}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelect(customer)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border-2 hover:border-[var(--dash-border-default)] ${
                            isDefaultCustomer(customer)
                              ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                              : "bg-[var(--dash-bg-surface)] border-transparent hover:bg-[var(--dash-bg-raised)]"
                          } text-[var(--dash-text-secondary)]`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isDefaultCustomer(customer) ? "bg-green-500/20" : "bg-[var(--dash-bg-raised)]"
                            }`}>
                              <UserIcon className={`h-5 w-5 ${isDefaultCustomer(customer) ? "text-green-400" : ""}`} />
                            </div>
                            <div className="text-right">
                              <div className="font-semibold flex items-center gap-2">
                                {customer.name}
                                {isDefaultCustomer(customer) && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg">
                                    افتراضي
                                  </span>
                                )}
                                {customer.rank && (
                                  <StarIconSolid
                                    className={`h-4 w-4 ${getRankColor(customer.rank)}`}
                                  />
                                )}
                              </div>
                              <div className="text-sm text-[var(--dash-text-muted)] flex items-center gap-3">
                                {customer.phone && <span>{customer.phone}</span>}
                                {customer.city && (
                                  <span className="text-[var(--dash-text-disabled)]">
                                    {customer.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-left">
                            <div
                              className={`font-medium ${
                                customer.calculated_balance > 0
                                  ? "text-green-400"
                                  : customer.calculated_balance < 0
                                  ? "text-red-400"
                                  : "text-[var(--dash-text-muted)]"
                              }`}
                            >
                              {customer.calculated_balance.toLocaleString()}{" "}
                              ج.م
                            </div>
                            {customer.loyalty_points && customer.loyalty_points > 0 && (
                              <div className="text-xs text-yellow-500">
                                {customer.loyalty_points} نقطة
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <UserIcon className="h-12 w-12 text-[var(--dash-text-disabled)] mb-4" />
                      <p className="text-[var(--dash-text-muted)] mb-2">لا توجد عملاء</p>
                      <p className="text-[var(--dash-text-disabled)] text-sm">
                        جرب تغيير معايير البحث
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="p-4 border-t border-[var(--dash-border-default)] bg-[var(--dash-bg-surface)]">
                  <p className="text-sm text-[var(--dash-text-muted)] text-center">
                    اضغط على العميل لاختياره • إجمالي العملاء:{" "}
                    {filteredCustomers.length}
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
