"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Eye, ClipboardList, CheckCircle2, Phone, Mail, Clock, Building2, User } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  Pagination,
} from "@ims/shared-ui";
import { getCorporateFollowUpCountsAction, getCorporateFollowUpsAction } from "../../actions";
import { LogCorporateFollowUpDrawer } from "../../_components/log-corporate-followup-drawer";

type FollowUpGroup = "today" | "future" | "past";

interface CorporateFollowUpsClientProps {
  actorId: string;
  users: Array<{ id: string; name: string }>;
}

export function CorporateFollowUpsClient({ actorId, users }: CorporateFollowUpsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("tab") as FollowUpGroup) || "today";
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = 6;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Tab counts state
  const [counts, setCounts] = useState({ today: 0, overdue: 0, future: 0 });

  // Drawer log outcome state
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);

  // Fetch badges counts
  const fetchCounts = useCallback(async () => {
    try {
      const data = await getCorporateFollowUpCountsAction(actorId);
      setCounts({
        today: data.today,
        overdue: data.overdue,
        future: data.future,
      });
    } catch (err) {
      console.error("Failed to load follow-up counts:", err);
    }
  }, [actorId]);

  // Fetch follow-ups based on active tab and page
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCorporateFollowUpsAction(
        {
          tab: activeTab,
          page,
          limit,
        },
        actorId
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || "Error fetching follow-up tasks");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, actorId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleTabChange = (tab: FollowUpGroup) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOutcomeSaved = () => {
    setSelectedFollowUp(null);
    fetchCounts();
    fetchItems();
  };

  const getFollowUpTypeIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <Phone className="h-4 w-4 text-blue-500" />;
      case "Email":
        return <Mail className="h-4 w-4 text-amber-500" />;
      case "Meeting":
        return <Building2 className="h-4 w-4 text-purple-500" />;
      default:
        return <CalendarClock className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return "N/A";
    const date = typeof value === "string" ? new Date(value) : value;
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <CalendarClock className="h-6 w-6 shrink-0 text-[color:var(--ims-brass)] sm:h-8 sm:w-8" />
            Corporate Follow-ups
          </h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Scheduled follow-ups and touchpoints scoped to corporate sales.
          </p>
        </div>
      </header>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange("today")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "today"
              ? "border-[color:var(--ims-brass)] text-[color:var(--ims-brass)]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Today
          <Badge variant={counts.today > 0 ? "info" : "outline"} className="ml-1">
            {counts.today}
          </Badge>
        </button>

        <button
          onClick={() => handleTabChange("future")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "future"
              ? "border-[color:var(--ims-brass)] text-[color:var(--ims-brass)]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Future
          <Badge variant="outline" className="ml-1">
            {counts.future}
          </Badge>
        </button>

        <button
          onClick={() => handleTabChange("past")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === "past"
              ? "border-[color:var(--ims-brass)] text-[color:var(--ims-brass)]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Past Overdue
          <Badge variant={counts.overdue > 0 ? "error" : "outline"} className="ml-1">
            {counts.overdue}
          </Badge>
        </button>
      </div>

      {/* List / Loading / Cards Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-slate-100" />
              <CardContent className="h-32 bg-slate-50 space-y-2 p-4" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8 text-slate-400" />}
          title={`No ${activeTab} follow-ups`}
          description={`You do not have any pending corporate follow-ups for ${activeTab}.`}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const executiveName =
              users.find((u) => u.id === item.lead?.salesOwnerId)?.name || "Unassigned";

            return (
              <Card
                key={item.id}
                className={`transition-all hover:border-[var(--ims-brass)] shadow-sm hover:shadow-md ${
                  activeTab === "past" ? "border-rose-250 bg-rose-50/5" : ""
                }`}
              >
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)] flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {item.lead?.corporateAccount?.accountCode || "B2B Lead"}
                      </p>
                      <p className="truncate text-sm font-bold text-[var(--ims-ink)]">
                        {item.lead?.corporateAccount?.accountName}
                      </p>
                    </div>
                    <Badge variant={activeTab === "past" ? "error" : "default"} className="flex items-center gap-1 font-bold">
                      {getFollowUpTypeIcon(item.followUpType)}
                      {item.followUpType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--ims-muted)] flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Follow-up Date
                      </p>
                      <p className="font-bold text-slate-800">{formatDateTime(item.followUpDate)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--ims-muted)] flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        Executive
                      </p>
                      <p className="font-medium text-slate-800 truncate">{executiveName}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="font-semibold text-[var(--ims-muted)]">Lead Stage</p>
                      <p>
                        <Badge variant="outline" className="font-bold">{item.lead?.stage || "N/A"}</Badge>
                      </p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="font-semibold text-[var(--ims-muted)]">Agenda / Notes</p>
                      <p className="bg-slate-50 p-2 rounded text-slate-700 italic border border-slate-100 max-h-16 overflow-y-auto">
                        {item.notes || "No agenda recorded"}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[11px]"
                    onClick={() => router.push(`/corporate-sales/leads/${item.corporateSalesLeadId}`)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Lead
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-[11px] bg-[color:var(--ims-brass)] text-white hover:bg-[color:var(--ims-brass-hover)] font-bold"
                    onClick={() => setSelectedFollowUp(item)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Log Outcome
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination control */}
      {!loading && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          limit={limit}
          pageSizeOptions={[6, 12, 24]}
        />
      )}

      {/* Outcome log drawer */}
      {selectedFollowUp && (
        <LogCorporateFollowUpDrawer
          followUp={selectedFollowUp}
          isOpen={selectedFollowUp !== null}
          onClose={() => setSelectedFollowUp(null)}
          onSuccess={handleOutcomeSaved}
          actorId={actorId}
        />
      )}
    </div>
  );
}
