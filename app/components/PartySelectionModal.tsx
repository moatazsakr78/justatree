"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import {
  XMarkIcon,
  UserIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { supabase } from "../lib/supabase/client";

// Types
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  opening_balance: number | null;
  calculated_balance: number;
  rank: string | null;
  category: string | null;
  loyalty_points: number | null;
  is_active: boolean | null;
  group_id: string | null;
  default_record_id: string | null;
  default_price_type: string | null;
  default_record?: { id: string; name: string } | null;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  opening_balance: number | null;
  calculated_balance: number;
  category: string | null;
  is_active: boolean | null;
  group_id: string | null;
}

interface PartyGroup {
  id: string;
  name: string;
  parent_id: string | null;
  count: number;
  is_active: boolean | null;
  sort_order: number | null;
}

export type PartyType = "customer" | "supplier";

export interface SelectedParty {
  id: string;
  name: string;
  phone: string | null;
  type: PartyType;
  balance: number;
  default_record_id?: string | null;
  default_price_type?: string | null;
  default_record_name?: string | null;
}

interface PartySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (party: SelectedParty) => void;
  defaultTab?: PartyType;
  currentSelection?: { id: string; type: PartyType } | null;
}

export default function PartySelectionModal({
  isOpen,
  onClose,
  onSelect,
  defaultTab = "customer",
  currentSelection,
}: PartySelectionModalProps) {
  const [selectedTab, setSelectedTab] = useState<PartyType>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  // Customer data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerGroups, setCustomerGroups] = useState<PartyGroup[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Supplier data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierGroups, setSupplierGroups] = useState<PartyGroup[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTab(defaultTab);
      setSearchQuery("");
      setSelectedGroup("all");
      fetchCustomers();
      fetchSuppliers();
    }
  }, [isOpen, defaultTab]);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      setError(null);

      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, city, opening_balance, rank, category, loyalty_points, is_active, group_id, default_record_id, default_price_type, default_record:records!default_record_id(id, name)")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (customersError) {
        console.error("Error fetching customers:", customersError);
        setError("فشل في تحميل العملاء");
        return;
      }

      // Fetch customer balances
      const { data: balancesData } = await supabase.rpc('calculate_customer_balances' as any);

      const customersWithBalance = (customersData || []).map((customer: any) => {
        const balanceRecord = (balancesData || []).find(
          (b: any) => b.customer_id === customer.id
        );
        // Supabase !inner join returns object, but foreign key join may return array — normalize
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

      // Fetch customer groups
      const { data: groupsData } = await supabase
        .from("customer_groups")
        .select("id, name, parent_id, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const groups = (groupsData || []).map((group) => {
        const customerCount = (customersData || []).filter(
          (c) => c.group_id === group.id
        ).length;
        return { ...group, count: customerCount };
      });

      const allCustomersGroup = {
        id: "all",
        name: "جميع العملاء",
        parent_id: null,
        count: (customersData || []).length,
        is_active: true,
        sort_order: -1,
      };

      setCustomerGroups([allCustomersGroup, ...groups]);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setError("حدث خطأ أثناء تحميل العملاء");
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      setIsLoadingSuppliers(true);

      const { data: suppliersData, error: suppliersError } = await supabase
        .from("suppliers")
        .select("id, name, phone, city, opening_balance, category, is_active, group_id")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (suppliersError) {
        console.error("Error fetching suppliers:", suppliersError);
        return;
      }

      // Fetch supplier balances using RPC (similar to customers)
      const { data: balancesData } = await supabase.rpc('calculate_supplier_balances' as any);

      const suppliersWithBalance = (suppliersData || []).map((supplier) => {
        const balanceRecord = (balancesData || []).find(
          (b: any) => b.supplier_id === supplier.id
        );
        return {
          ...supplier,
          calculated_balance: Number(balanceRecord?.calculated_balance) || 0,
        };
      });

      setSuppliers(suppliersWithBalance);

      // Fetch supplier groups
      const { data: groupsData } = await supabase
        .from("supplier_groups")
        .select("id, name, parent_id, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const groups = (groupsData || []).map((group) => {
        const supplierCount = (suppliersData || []).filter(
          (s) => s.group_id === group.id
        ).length;
        return { ...group, count: supplierCount };
      });

      const allSuppliersGroup = {
        id: "all",
        name: "جميع الموردين",
        parent_id: null,
        count: (suppliersData || []).length,
        is_active: true,
        sort_order: -1,
      };

      setSupplierGroups([allSuppliersGroup, ...groups]);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  // Handle selection
  const handleSelectCustomer = (customer: Customer) => {
    onSelect({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      type: "customer",
      balance: customer.calculated_balance,
      default_record_id: customer.default_record_id,
      default_price_type: customer.default_price_type,
      default_record_name: (customer.default_record as any)?.name || null,
    });
    onClose();
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    onSelect({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      type: "supplier",
      balance: supplier.calculated_balance,
    });
    onClose();
  };

  // Check if party is default
  const isDefaultCustomer = (customer: Customer) => customer.name === "عميل";
  const isDefaultSupplier = (supplier: Supplier) => supplier.name === "مورد";

  // Filter customers
  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        searchQuery === "" ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchQuery)) ||
        (customer.city && customer.city.includes(searchQuery));

      if (selectedGroup === "all") return matchesSearch;
      return matchesSearch && customer.group_id === selectedGroup;
    })
    .sort((a, b) => {
      if (isDefaultCustomer(a)) return -1;
      if (isDefaultCustomer(b)) return 1;
      return a.name.localeCompare(b.name, "ar");
    });

  // Filter suppliers
  const filteredSuppliers = suppliers
    .filter((supplier) => {
      const matchesSearch =
        searchQuery === "" ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.phone && supplier.phone.includes(searchQuery)) ||
        (supplier.city && supplier.city.includes(searchQuery));

      if (selectedGroup === "all") return matchesSearch;
      return matchesSearch && supplier.group_id === selectedGroup;
    })
    .sort((a, b) => {
      if (isDefaultSupplier(a)) return -1;
      if (isDefaultSupplier(b)) return 1;
      return a.name.localeCompare(b.name, "ar");
    });

  const getRankColor = (rank: string | null) => {
    switch (rank) {
      case "immortal": return "text-red-500";
      case "vip": return "text-yellow-500";
      case "gold": return "text-yellow-600";
      case "silver": return "text-gray-400";
      case "bronze": return "text-orange-600";
      default: return "text-gray-400";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currentGroups = selectedTab === "customer" ? customerGroups : supplierGroups;
  const isLoading = selectedTab === "customer" ? isLoadingCustomers : isLoadingSuppliers;

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
                    {selectedTab === "customer" ? (
                      <UserIcon className="h-6 w-6 text-blue-400" />
                    ) : (
                      <TruckIcon className="h-6 w-6 text-amber-400" />
                    )}
                    اختيار طرف
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4">
                  <div className="flex bg-[#2B3544] rounded-xl p-1">
                    <button
                      onClick={() => {
                        setSelectedTab("customer");
                        setSelectedGroup("all");
                        setSearchQuery("");
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        selectedTab === "customer"
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-gray-400 hover:text-white hover:bg-gray-600/30"
                      }`}
                    >
                      <UserIcon className="h-4 w-4" />
                      عميل
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTab("supplier");
                        setSelectedGroup("all");
                        setSearchQuery("");
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        selectedTab === "supplier"
                          ? "bg-amber-600 text-white shadow-lg"
                          : "text-gray-400 hover:text-white hover:bg-gray-600/30"
                      }`}
                    >
                      <TruckIcon className="h-4 w-4" />
                      مورد
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-600">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={selectedTab === "customer" ? "البحث عن عميل بالاسم أو الهاتف..." : "البحث عن مورد بالاسم أو الهاتف..."}
                      className="w-full pl-4 pr-12 py-3 bg-[#2B3544] border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  {/* Groups */}
                  {currentGroups.length > 1 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {currentGroups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroup(group.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${
                            selectedGroup === group.id
                              ? selectedTab === "customer"
                                ? "bg-blue-600 text-white"
                                : "bg-amber-600 text-white"
                              : "bg-[#2B3544] text-gray-300 hover:bg-[#374151]"
                          }`}
                        >
                          <UsersIcon className="h-3.5 w-3.5" />
                          {group.name}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              selectedGroup === group.id
                                ? selectedTab === "customer"
                                  ? "bg-blue-700"
                                  : "bg-amber-700"
                                : "bg-gray-600"
                            }`}
                          >
                            {group.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${
                        selectedTab === "customer" ? "border-blue-500" : "border-amber-500"
                      } mb-4`}></div>
                      <p className="text-gray-400">
                        {selectedTab === "customer" ? "جاري تحميل العملاء..." : "جاري تحميل الموردين..."}
                      </p>
                    </div>
                  ) : selectedTab === "customer" ? (
                    /* Customers List */
                    filteredCustomers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <UserIcon className="h-12 w-12 text-gray-500 mb-4" />
                        <p className="text-gray-400">لا يوجد عملاء</p>
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className={`w-full p-4 flex items-center gap-4 hover:bg-[#2B3544] transition-colors border-b border-gray-700/50 ${
                            currentSelection?.id === customer.id && currentSelection?.type === "customer"
                              ? "bg-blue-600/20 border-l-4 border-l-blue-500"
                              : ""
                          } ${isDefaultCustomer(customer) ? "bg-green-500/10" : ""}`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            isDefaultCustomer(customer)
                              ? "bg-green-500/30 text-green-300"
                              : "bg-blue-500/30 text-blue-300"
                          }`}>
                            {customer.name.substring(0, 2)}
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{customer.name}</span>
                              {isDefaultCustomer(customer) && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                  افتراضي
                                </span>
                              )}
                              {customer.rank && (
                                <StarIconSolid className={`h-4 w-4 ${getRankColor(customer.rank)}`} />
                              )}
                            </div>
                            {customer.phone && (
                              <p className="text-gray-400 text-sm">{customer.phone}</p>
                            )}
                          </div>
                          <div className="text-left">
                            <div className={`text-lg font-medium ${
                              customer.calculated_balance >= 0 ? "text-green-400" : "text-red-400"
                            }`}>
                              {formatCurrency(Math.abs(customer.calculated_balance))} ج.م
                            </div>
                            {customer.loyalty_points && customer.loyalty_points > 0 && (
                              <p className="text-yellow-500 text-xs">{customer.loyalty_points} نقطة</p>
                            )}
                          </div>
                        </button>
                      ))
                    )
                  ) : (
                    /* Suppliers List */
                    filteredSuppliers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <TruckIcon className="h-12 w-12 text-gray-500 mb-4" />
                        <p className="text-gray-400">لا يوجد موردين</p>
                      </div>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          onClick={() => handleSelectSupplier(supplier)}
                          className={`w-full p-4 flex items-center gap-4 hover:bg-[#2B3544] transition-colors border-b border-gray-700/50 ${
                            currentSelection?.id === supplier.id && currentSelection?.type === "supplier"
                              ? "bg-amber-600/20 border-l-4 border-l-amber-500"
                              : ""
                          } ${isDefaultSupplier(supplier) ? "bg-amber-500/10" : ""}`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            isDefaultSupplier(supplier)
                              ? "bg-amber-500/30 text-amber-300"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {supplier.name.substring(0, 2)}
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{supplier.name}</span>
                              {isDefaultSupplier(supplier) && (
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                  افتراضي
                                </span>
                              )}
                            </div>
                            {supplier.phone && (
                              <p className="text-gray-400 text-sm">{supplier.phone}</p>
                            )}
                          </div>
                          <div className="text-left">
                            <div className={`text-lg font-medium ${
                              supplier.calculated_balance >= 0 ? "text-red-400" : "text-green-400"
                            }`}>
                              {formatCurrency(Math.abs(supplier.calculated_balance))} ج.م
                            </div>
                          </div>
                        </button>
                      ))
                    )
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-600 bg-[#1F2937]">
                  <p className="text-gray-500 text-sm text-center">
                    {selectedTab === "customer"
                      ? `اضغط على العميل لاختياره - إجمالي العملاء: ${filteredCustomers.length}`
                      : `اضغط على المورد لاختياره - إجمالي الموردين: ${filteredSuppliers.length}`}
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
