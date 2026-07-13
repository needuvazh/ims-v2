"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  FileText,
  Clock,
  Send,
  TrendingUp,
  Search,
  X,
  Eye,
  Settings,
} from "lucide-react";
import {
  Badge,
  Button,
  Pagination,
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  SimpleTooltip,
} from "@ims/shared-ui";
import Link from "next/link";

interface QuotationListItem {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  subtotal: any;
  totalAmount: any;
  status: string;
  corporateAccount: {
    accountName: string;
  };
}

interface QuotationsClientListProps {
  quotations: QuotationListItem[];
  branches: Array<{ id: string; name: string }>;
  total: number;
  currentPage: number;
  kpis: {
    total: number;
    pendingApproval: number;
    approvedSent: number;
    wins: number;
  };
}

export function QuotationsClientList({
  quotations,
  branches,
  total,
  currentPage,
  kpis,
}: QuotationsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

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

  // Debounced search query update
  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchValue !== currentQ) {
        updateParams({ q: searchValue || null, page: "1" });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchValue, searchParams, updateParams]);

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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const isDateOnly = 
      /^\d{4}-\d{2}-\d{2}$/.test(dateString) || 
      /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(dateString);

    const day = String(isDateOnly ? date.getUTCDate() : date.getDate()).padStart(2, "0");
    const month = String(isDateOnly ? date.getUTCMonth() + 1 : date.getMonth() + 1).padStart(2, "0");
    const year = isDateOnly ? date.getUTCFullYear() : date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <FileText className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Quotations Pipeline
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Formulate commercial proposals, estimate costs, and track status approvals.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Proposals"
          value={kpis.total}
          description="Total active B2B quotations"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Pending Approval"
          value={kpis.pendingApproval}
          description="Pending reviewer approvals"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Approved / Sent"
          value={kpis.approvedSent}
          description="Proposals approved and sent to client"
          icon={<Send className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Wins (Accepted)"
          value={kpis.wins}
          description="Quotations accepted by client"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="indigo"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Search Quotations
          </label>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by quote number or account name..."
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
              { value: "quotationNumber-asc", label: "Quotation Number (A-Z)" },
              { value: "quotationNumber-desc", label: "Quotation Number (Z-A)" },
              { value: "accountName-asc", label: "Account Name (A-Z)" },
              { value: "accountName-desc", label: "Account Name (Z-A)" },
              { value: "quotationDate-asc", label: "Quotation Date (Earliest)" },
              { value: "quotationDate-desc", label: "Quotation Date (Latest)" },
              { value: "totalAmount-desc", label: "Total Amount (High to Low)" },
              { value: "totalAmount-asc", label: "Total Amount (Low to High)" },
              { value: "status-asc", label: "Status (A-Z)" },
              { value: "status-desc", label: "Status (Z-A)" },
            ]}
            className="h-10 bg-white"
          />
        </div>
      </div>

      {/* Quotations Table */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="text-lg">Quotations List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/50 border-b">
                  {renderSortableHeader("Quotation Number", "quotationNumber")}
                  {renderSortableHeader("Account Name", "accountName")}
                  {renderSortableHeader("Date", "quotationDate")}
                  {renderSortableHeader("Net Value", "subtotal")}
                  {renderSortableHeader("Total (Inc. VAT)", "totalAmount")}
                  {renderSortableHeader("Status", "status")}
                  <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No B2B quotations found matching filters.
                    </td>
                  </tr>
                ) : (
                  quotations.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50/50 transition border-b last:border-0">
                      <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                        {quote.quotationNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {quote.corporateAccount.accountName}
                      </td>
                      <td className="p-4 text-slate-500">
                        {formatDate(quote.quotationDate)}
                      </td>
                      <td className="p-4 text-slate-600">
                        {Number(quote.subtotal).toFixed(3)} OMR
                      </td>
                      <td className="p-4 text-slate-900 font-semibold">
                        {Number(quote.totalAmount).toFixed(3)} OMR
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            quote.status === "Accepted"
                              ? "default"
                              : quote.status === "SubmittedForApproval"
                                ? "outline"
                                : "muted"
                          }
                        >
                          {quote.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Link href={`/corporate-sales/quotations/${quote.id}`}>
                          <SimpleTooltip content="View Details">
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0 flex items-center justify-center"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </SimpleTooltip>
                        </Link>
                        <Link href={`/corporate-sales/quotations/${quote.id}/costing`}>
                          <SimpleTooltip content={["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status) ? "View Costing Sheet" : "Configure Costing Sheet"}>
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0 flex items-center justify-center"
                            >
                              {["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status) ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                <Settings className="h-4 w-4" />
                              )}
                            </Button>
                          </SimpleTooltip>
                        </Link>
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
    </div>
  );
}
