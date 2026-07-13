"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Input,
  FormField,
  FormLabel,
  FormControl,
  StatCard,
  Pagination,
  Select,
  SimpleTooltip,
} from "@ims/shared-ui";
import { confirmOrderAction } from "../../actions";
import { toast } from "sonner";
import {
  Plus,
  Receipt,
  Search,
  X,
  Eye,
  TrendingUp,
  Clock,
} from "lucide-react";

interface OrdersClientProps {
  approvedQuotes: any[];
  confirmedOrders: any[];
  total: number;
  currentPage: number;
  actorId: string;
  defaultQuotationId?: string;
  branches: Array<{ id: string; name: string }>;
  kpis: {
    totalOrders: number;
    totalRevenue: number;
    pendingHandoff: number;
  };
}

export function OrdersClient({
  approvedQuotes,
  confirmedOrders,
  total,
  currentPage,
  actorId,
  defaultQuotationId,
  branches,
  kpis,
}: OrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  // Won-Order confirmation modal state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [lpoText, setLpoText] = useState("");
  const [loading, setLoading] = useState(false);

  // Search, filter, and sorting states
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get("branchId") || "");
  const currentSortBy = searchParams.get("sortBy") || "createdAt";
  const currentSortOrder = searchParams.get("sortOrder") || "desc";
  const [sortValue, setSortValue] = useState(`${currentSortBy}-${currentSortOrder}`);

  // Sync state if URL changes
  useEffect(() => {
    setSortValue(`${searchParams.get("sortBy") || "createdAt"}-${searchParams.get("sortOrder") || "desc"}`);
    setSelectedBranch(searchParams.get("branchId") || "");
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  // Debounced search query update
  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchValue !== currentQ) {
        updateParams({ q: searchValue || null, page: "1" });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchValue, searchParams]);

  // If a defaultQuotationId is provided via URL parameter, set it and open the modal
  useEffect(() => {
    if (defaultQuotationId && approvedQuotes.some((q) => q.id === defaultQuotationId)) {
      setSelectedQuoteId(defaultQuotationId);
      setIsOpen(true);
    }
  }, [defaultQuotationId, approvedQuotes]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBranch(val);
    updateParams({ branchId: val || null, page: "1" });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSortValue(val);
    const [by, order] = val.split("-");
    updateParams({ sortBy: by, sortOrder: order, page: "1" });
  };

  const handleHeaderSort = (field: string) => {
    const nextOrder = currentSortBy === field && currentSortOrder === "asc" ? "desc" : "asc";
    updateParams({ sortBy: field, sortOrder: nextOrder, page: "1" });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    const isDateOnly =
      /^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
      /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(dateString);

    const day = String(isDateOnly ? date.getUTCDate() : date.getDate()).padStart(2, "0");
    const month = String(isDateOnly ? date.getUTCMonth() + 1 : date.getMonth() + 1).padStart(2, "0");
    const year = isDateOnly ? date.getUTCFullYear() : date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (status: string) => {
    let colorClass = "bg-slate-100 text-slate-800 border-slate-200";
    if (status === "Confirmed") colorClass = "bg-green-50 text-green-700 border-green-200";
    if (status === "ContractInitiated") colorClass = "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "TrainingHandoffCompleted") colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (status === "Cancelled") colorClass = "bg-rose-50 text-rose-700 border-rose-200";

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
        {status}
      </span>
    );
  };

  const selectedQuote = approvedQuotes.find((q) => q.id === selectedQuoteId);

  async function handleConfirmOrder() {
    if (!selectedQuoteId || !lpoText) return;
    setLoading(true);
    try {
      await confirmOrderAction(
        {
          quotationId: selectedQuoteId,
          corporateAccountId: selectedQuote.corporateAccountId,
          orderDate: new Date(orderDate),
          totalAmount: Number(selectedQuote.totalAmount),
          LpoDocumentId: "11111111-2222-3333-4444-555555555555", // Simulated LPO Doc UUID
          branchId: selectedQuote.branchId,
        },
        actorId
      );
      toast.success("Sales Order confirmed successfully! CTM workflow triggered.");
      setIsOpen(false);
      setSelectedQuoteId("");
      setLpoText("");
      // Clear query params by navigating to the base path
      router.push("/corporate-sales/orders");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm sales order");
    } finally {
      setLoading(false);
    }
  }

  const renderSortableHeader = (label: string, field: string) => {
    const isActive = currentSortBy === field;
    return (
      <th
        onClick={() => handleHeaderSort(field)}
        className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-medium text-slate-500"
      >
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <span>{label}</span>
          <span className={`inline-flex text-[10px] text-slate-400 group-hover:text-slate-600 leading-none ${isActive ? 'text-indigo-600 font-bold' : ''}`}>
            {isActive ? (currentSortOrder === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)] text-3xl">
            <Receipt className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            B2B Sales Orders
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Confirm deal wins, attach Local Purchase Orders (LPOs), and hand off confirmed schedules to CTM.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <SimpleTooltip content="Confirm Won Order">
            <Button variant="primary" className="sm:px-4 px-3" onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Confirm Won Order</span>
            </Button>
          </SimpleTooltip>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
        <StatCard
          title="Total Orders"
          value={kpis.totalOrders}
          description="Total active B2B orders"
          icon={<Receipt className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Booked Revenue"
          value={`${Number(kpis.totalRevenue).toFixed(3)} OMR`}
          description="Cumulative value of confirmed orders"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Pending Handoff"
          value={kpis.pendingHandoff}
          description="Confirmed orders awaiting CTM handoff"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Search Orders
          </label>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by order number or account name..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-10 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  updateParams({ q: null, page: "1" });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Filter by Branch
          </label>
          <Select
            value={selectedBranch}
            onChange={handleBranchChange}
            options={[
              { value: "", label: "All Branches" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            className="h-10 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Sort By
          </label>
          <Select
            value={sortValue}
            onChange={handleSortChange}
            options={[
              { value: "createdAt-desc", label: "Date Created (Newest)" },
              { value: "createdAt-asc", label: "Date Created (Oldest)" },
              { value: "orderDate-desc", label: "Order Date (Newest)" },
              { value: "orderDate-asc", label: "Order Date (Oldest)" },
              { value: "totalAmount-desc", label: "Total Amount (High to Low)" },
              { value: "totalAmount-asc", label: "Total Amount (Low to High)" },
              { value: "accountName-asc", label: "Account Name (A-Z)" },
              { value: "accountName-desc", label: "Account Name (Z-A)" },
              { value: "salesOrderNumber-asc", label: "Order Number (A-Z)" },
              { value: "salesOrderNumber-desc", label: "Order Number (Z-A)" },
            ]}
            className="h-10 bg-white"
          />
        </div>
      </div>

      {/* Confirmed Orders List (Full Width) */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600" />
            Active B2B Sales Orders
          </CardTitle>
          <Badge variant="default">{total} Orders</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/50 border-b">
                  {renderSortableHeader("Order Number", "salesOrderNumber")}
                  {renderSortableHeader("Account Name", "accountName")}
                  {renderSortableHeader("Order Date", "orderDate")}
                  {renderSortableHeader("Total Amount", "totalAmount")}
                  {renderSortableHeader("Status", "status")}
                  <th className="p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {confirmedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No active B2B sales orders registered yet.
                    </td>
                  </tr>
                ) : (
                  confirmedOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                        {order.salesOrderNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {order.corporateAccount.accountName}
                      </td>
                      <td className="p-4 text-slate-500">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {Number(order.totalAmount).toFixed(3)} OMR
                      </td>
                      <td className="p-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="p-4">
                        <SimpleTooltip content="View Details">
                          <Link href={`/corporate-sales/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={total}
            limit={10}
          />
        </div>
      )}

      {/* Confirm Sales Order Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Confirm B2B Sales Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <FormField>
              <FormLabel required>Select Approved Proposal</FormLabel>
              <FormControl>
                <select
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-white"
                >
                  <option value="">-- Choose Quotation --</option>
                  {approvedQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotationNumber} ({q.corporateAccount.accountName})
                    </option>
                  ))}
                </select>
              </FormControl>
            </FormField>

            {selectedQuote && (
              <div className="p-3.5 bg-slate-50 rounded-xl border text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Base Net:</span>
                  <span className="font-semibold text-slate-700">
                    {Number(selectedQuote.subtotal).toFixed(3)} OMR
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-slate-500 font-medium">Order Value (Inc. VAT):</span>
                  <span className="font-bold text-slate-900">
                    {Number(selectedQuote.totalAmount).toFixed(3)} OMR
                  </span>
                </div>
              </div>
            )}

            <FormField>
              <FormLabel required>Order Confirmation Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel required>Client LPO Reference Code</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="e.g. LPO-2026-9908"
                  value={lpoText}
                  onChange={(e) => setLpoText(e.target.value)}
                />
              </FormControl>
            </FormField>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirmOrder}
              disabled={loading || !selectedQuoteId || !lpoText}
            >
              {loading ? "Confirming Win..." : "Confirm Won Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
