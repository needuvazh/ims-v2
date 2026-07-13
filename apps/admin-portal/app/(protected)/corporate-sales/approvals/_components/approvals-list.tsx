"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  X,
  TrendingUp,
  Percent,
  CheckSquare,
  Compass,
  Briefcase,
  Home,
  AlertTriangle,
  Eye,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
  Input,
  Select,
  Pagination,
  PageHeader,
  Breadcrumbs,
  SimpleTooltip,
} from "@ims/shared-ui";
import Link from "next/link";

function formatDate(dateInput: any) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

interface ApprovalsListProps {
  pendingQuotes: any[];
  total: number;
  currentPage: number;
  actorId: string;
  branches: Array<{ id: string; name: string }>;
  kpis: {
    totalPending: number;
    avgMargin: number;
    minMargin: number;
  };
}

export function ApprovalsList({
  pendingQuotes,
  total,
  currentPage,
  actorId,
  branches,
  kpis,
}: ApprovalsListProps) {
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
      <PageHeader
        title="Manager Approvals Queue"
        description="Review and manually override sub-threshold B2B quotations (< 25.00% profit margin)."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: "Dashboard",
                href: "/dashboard",
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: "B2B Leads",
                href: "/corporate-sales/leads",
                icon: <Briefcase className="h-3.5 w-3.5" />,
              },
              {
                label: "Quotations",
                href: "/corporate-sales/quotations",
              },
              {
                label: "Approvals Queue",
                icon: <Compass className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <StatCard
          title="Pending Reviews"
          value={kpis.totalPending}
          description="Quotations waiting for override decision"
          icon={<CheckSquare className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Avg Proposal Margin"
          value={`${kpis.avgMargin.toFixed(2)}%`}
          description="Average margin of pending queue items"
          icon={<Percent className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Lowest Profit Margin"
          value={`${kpis.minMargin.toFixed(2)}%`}
          description="Lowest profit margin in the queue"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Search Queue
          </label>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by quote number or client..."
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
              { value: "totalAmount-desc", label: "Selling Price (High to Low)" },
              { value: "totalAmount-asc", label: "Selling Price (Low to High)" },
              { value: "profitPercentage-asc", label: "Margin (Low to High)" },
              { value: "profitPercentage-desc", label: "Margin (High to Low)" },
            ]}
            className="h-10 bg-white"
          />
        </div>
      </div>

      {/* Approvals Table */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-indigo-600" />
            Pending B2B Manager Override Approvals
          </CardTitle>
          <Badge variant="warning">{total} Pending</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/50 border-b">
                  {renderSortableHeader("Quotation Number", "quotationNumber")}
                  {renderSortableHeader("Corporate Client", "accountName")}
                  {renderSortableHeader("Quotation Date", "quotationDate")}
                  {renderSortableHeader("Selling Price", "totalAmount")}
                  {renderSortableHeader("Target Margin", "profitPercentage")}
                  <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No quotations pending approval. All margins are within target threshold.
                    </td>
                  </tr>
                ) : (
                  pendingQuotes.map((quote: any) => (
                    <tr key={quote.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                        {quote.quotationNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {quote.corporateAccount.accountName}
                      </td>
                      <td className="p-4 text-slate-500">
                        {formatDate(quote.quotationDate)}
                      </td>
                      <td className="p-4 text-slate-800 font-medium">
                        {Number(quote.subtotal).toFixed(3)} OMR
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                          {Number(quote.costingSheet?.profitPercentage || 0).toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/corporate-sales/approvals/${quote.id}`}>
                          <SimpleTooltip content="Review Details & Decide">
                            <Button variant="outline" size="sm">
                              Review & Decide
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
