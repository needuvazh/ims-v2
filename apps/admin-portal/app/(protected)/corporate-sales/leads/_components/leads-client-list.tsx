"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  Clock,
  Search,
  X,
  Eye,
  Edit2,
  Plus,
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

interface LeadListItem {
  id: string;
  stage: string;
  expectedValue: any;
  expectedCloseDate: string;
  salesOwnerId: string;
  visits: any[];
  followUps: any[];
  corporateAccount: {
    accountCode: string;
    accountName: string;
  };
}

interface LeadsClientListProps {
  leads: LeadListItem[];
  branches: Array<{ id: string; name: string }>;
  corporateAccounts: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  total: number;
  currentPage: number;
  actorId: string;
  kpis: {
    total: number;
    visitsCount: number;
    pendingFollowUps: number;
  };
}

export function LeadsClientList({
  leads,
  branches,
  corporateAccounts,
  users,
  total,
  currentPage,
  actorId,
  kpis,
}: LeadsClientListProps) {
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
            <Briefcase className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            B2B Corporate Leads
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage corporate accounts pipeline, log marketing visits, and schedule follow-ups.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <SimpleTooltip content="Create B2B Lead">
            <Link href="/corporate-sales/leads/create">
              <Button variant="primary" className="sm:px-4 px-3">
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Create B2B Lead</span>
              </Button>
            </Link>
          </SimpleTooltip>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
        <StatCard
          title="Active Pipelines"
          value={kpis.total}
          description="Total active B2B pipelines"
          icon={<Briefcase className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Visit Logs"
          value={kpis.visitsCount}
          description="Total logged customer visits"
          icon={<ClipboardList className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Upcoming Follow-Ups"
          value={kpis.pendingFollowUps}
          description="Pending sales follow-ups scheduled"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Search Leads
          </label>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by corporate name or account code..."
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
              { value: "expectedValue-desc", label: "Expected Value (High to Low)" },
              { value: "expectedValue-asc", label: "Expected Value (Low to High)" },
              { value: "expectedCloseDate-asc", label: "Expected Close (Earliest)" },
              { value: "expectedCloseDate-desc", label: "Expected Close (Latest)" },
              { value: "accountName-asc", label: "Account Name (A-Z)" },
              { value: "accountName-desc", label: "Account Name (Z-A)" },
              { value: "stage-asc", label: "Stage (A-Z)" },
              { value: "stage-desc", label: "Stage (Z-A)" },
            ]}
            className="h-10 bg-white"
          />
        </div>
      </div>

      {/* Leads Table */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="text-lg">Commercial Leads List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/50 border-b">
                  {renderSortableHeader("Account Code", "accountCode")}
                  {renderSortableHeader("Account Name", "accountName")}
                  {renderSortableHeader("Pipeline Stage", "stage")}
                  {renderSortableHeader("Expected Value", "expectedValue")}
                  {renderSortableHeader("Expected Close", "expectedCloseDate")}
                  <th className="p-4 font-semibold text-slate-700">Executive</th>
                  <th className="p-4 font-semibold text-slate-700">Visits</th>
                  <th className="p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No active B2B leads found matching filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const execName = users.find((u) => u.id === lead.salesOwnerId)?.name || "Unassigned";
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                          {lead.corporateAccount.accountCode}
                        </td>
                        <td className="p-4 font-medium text-slate-900">
                          {lead.corporateAccount.accountName}
                        </td>
                        <td className="p-4">
                          <Badge variant={lead.stage === "Confirmed" ? "default" : "outline"}>
                            {lead.stage}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-600">
                          {Number(lead.expectedValue).toFixed(3)} OMR
                        </td>
                        <td className="p-4 text-slate-500">
                          {formatDate(lead.expectedCloseDate)}
                        </td>
                        <td className="p-4 font-medium text-slate-700">
                          {execName}
                        </td>
                        <td className="p-4 text-slate-500">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                            {lead.visits.length} Logs
                          </span>
                        </td>
                        <td className="p-4 flex gap-2">
                          <Link href={`/corporate-sales/leads/${lead.id}`}>
                            <SimpleTooltip content="View Details">
                              <Button
                                variant="outline"
                                className="h-8 w-8 p-0 flex items-center justify-center"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </SimpleTooltip>
                          </Link>
                          <Link href={`/corporate-sales/leads/${lead.id}/edit`}>
                            <SimpleTooltip content="Edit Details">
                              <Button
                                variant="outline"
                                className="h-8 w-8 p-0 flex items-center justify-center"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </SimpleTooltip>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
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
