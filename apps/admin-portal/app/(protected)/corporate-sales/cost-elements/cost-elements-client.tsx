"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  PageHeader,
  Breadcrumbs,
  Input,
  Pagination,
} from "@ims/shared-ui";
import { Home, Briefcase, FileSliders, Plus, Edit2, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  createDirectCostElementAction,
  updateDirectCostElementAction,
  deleteDirectCostElementAction,
} from "../actions";

interface CostElement {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface CostElementsClientProps {
  elements: CostElement[];
  total: number;
  currentPage: number;
  actorId: string;
}

export function CostElementsClient({
  elements,
  total,
  currentPage,
  actorId,
}: CostElementsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [nameInput, setNameInput] = useState("");
  const [statusInput, setStatusInput] = useState("Active");
  const [loading, setLoading] = useState(false);

  // Search, filter, and sorting states
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");

  const currentSortBy = searchParams.get("sortBy") || "name";
  const currentSortOrder = searchParams.get("sortOrder") || "asc";

  // Sync state if URL changes
  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "");
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

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatusFilter(val);
    updateParams({ status: val || null, page: "1" });
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

  const renderSortableHeader = (label: string, field: string) => {
    const isActive = currentSortBy === field;
    return (
      <th
        onClick={() => handleHeaderSort(field)}
        className="px-6 py-3 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-medium text-slate-500 uppercase tracking-wider text-left"
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

  const handleOpenAdd = () => {
    setDialogMode("add");
    setEditingId(null);
    setNameInput("");
    setStatusInput("Active");
    setIsOpen(true);
  };

  const handleOpenEdit = (el: CostElement) => {
    setDialogMode("edit");
    setEditingId(el.id);
    setNameInput(el.name);
    setStatusInput(el.status);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      if (dialogMode === "add") {
        await createDirectCostElementAction({ name: nameInput.trim(), status: statusInput }, actorId);
        toast.success("Cost element created successfully!");
      } else {
        await updateDirectCostElementAction(
          { id: editingId!, name: nameInput.trim(), status: statusInput },
          actorId
        );
        toast.success("Cost element updated successfully!");
      }
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save cost element");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${name}"?`)) {
      return;
    }

    try {
      await deleteDirectCostElementAction(id, actorId);
      toast.success("Cost element deleted or deactivated successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete cost element");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Direct Cost Elements Master"
        description="Configure types of direct costs used across quotation costing & margin sheets."
        backUrl="/corporate-sales/leads"
        actions={
          <Button onClick={handleOpenAdd} className="flex gap-2 items-center">
            <Plus className="h-4 w-4" /> Add Cost Element
          </Button>
        }
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
                label: "Cost Elements Master",
                icon: <FileSliders className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      {/* Search and Filters */}
      <div className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)] mb-1">
            Search Cost Elements
          </label>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by cost element name..."
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
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
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-white text-[color:var(--ims-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ims-brass)] focus:border-[color:var(--ims-brass)]"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 flex flex-row justify-between items-center py-4 px-6">
          <CardTitle className="text-base font-semibold">Cost Elements List</CardTitle>
          <span className="text-xs text-slate-500 font-medium">
            Showing {elements.length} of {total} elements
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {renderSortableHeader("Cost Type Name", "name")}
                  {renderSortableHeader("Status", "status")}
                  {renderSortableHeader("Created Date", "createdAt")}
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {elements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      No cost elements found. Click "Add Cost Element" to create one.
                    </td>
                  </tr>
                ) : (
                  elements.map((el) => (
                    <tr key={el.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{el.name}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={el.status === "Active" ? "default" : "outline"}
                          className={
                            el.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }
                        >
                          {el.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(el.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(el)}
                            className="h-8 w-8 text-slate-600 hover:text-slate-900"
                            aria-label={`Edit ${el.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(el.id, el.name)}
                            className="h-8 w-8 text-rose-600 hover:text-rose-900 hover:bg-rose-50"
                            aria-label={`Delete ${el.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "add" ? "Add Direct Cost Element" : "Edit Direct Cost Element"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500" htmlFor="elementName">
                  Cost Element Name
                </label>
                <input
                  id="elementName"
                  type="text"
                  placeholder="e.g. Catering Costs, Visa Fees"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white"
                  required
                  disabled={loading}
                />
              </div>

              {dialogMode === "edit" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500" htmlFor="elementStatus">
                    Status
                  </label>
                  <select
                    id="elementStatus"
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white"
                    disabled={loading}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Element"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
