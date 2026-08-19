"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  ClipboardList,
  Clock,
  Eye,
  Home,
  User,
  Activity,
  Compass,
  Building2,
  DollarSign,
  Calendar,
  CreditCard,
  Shield,
  MapPin,
  Hash,
  CheckCircle2,
  Mail,
  Phone,
  FileText,
  Search,
  Plus,
  BookOpen,
  ArrowUpDown,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  LinkButton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumbs,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ResponsiveDataTable,
  SearchInput,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ims/shared-ui";
import { LogVisitButtonAndSheet, ScheduleFollowUpButtonAndDialog } from "./activity-forms";
import { LogCorporateFollowUpDrawer } from "../../../_components/log-corporate-followup-drawer";
import { updateCorporateAccountCreditLimitAction } from "../../../actions";
import { useRouter } from "next/navigation";

interface CorporateLeadDetailsClientProps {
  lead: any;
  users: Array<{ id: string; name: string }>;
  actorId: string;
  courses: Array<{ id: string; name: string }>;
}

function formatDate(dateInput: any) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  
  const isDateOnly = 
    (typeof dateInput === 'string' && (
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput) || 
      /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(dateInput)
    )) || 
    (dateInput instanceof Date && 
      dateInput.getUTCHours() === 0 && 
      dateInput.getUTCMinutes() === 0 && 
      dateInput.getUTCSeconds() === 0 && 
      dateInput.getUTCMilliseconds() === 0
    );

  const day = String(isDateOnly ? date.getUTCDate() : date.getDate()).padStart(2, '0');
  const month = String(isDateOnly ? date.getUTCMonth() + 1 : date.getMonth() + 1).padStart(2, '0');
  const year = isDateOnly ? date.getUTCFullYear() : date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function CorporateLeadDetailsClient({
  lead,
  users,
  actorId,
  courses,
}: CorporateLeadDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  const executiveName = users.find((u) => u.id === lead.salesOwnerId)?.name || "Unassigned";

  // Follow-up Completion State
  const [activeFollowUpToComplete, setActiveFollowUpToComplete] = useState<any>(null);

  // Credit Policy Update State
  const [isCreditLimitOpen, setIsCreditLimitOpen] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState(Number(lead.corporateAccount.creditLimit || 5000));
  const [blockOnCreditLimitInput, setBlockOnCreditLimitInput] = useState(Boolean(lead.corporateAccount.blockOnCreditLimit));
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  async function handleUpdateCreditPolicy(e: React.FormEvent) {
    e.preventDefault();
    setCreditLoading(true);
    setCreditError(null);

    try {
      await updateCorporateAccountCreditLimitAction(
        lead.corporateAccountId,
        Number(creditLimitInput),
        blockOnCreditLimitInput,
        actorId
      );
      setIsCreditLimitOpen(false);
      router.refresh();
    } catch (err: any) {
      setCreditError(err.message || "Failed to update credit limit");
    } finally {
      setCreditLoading(false);
    }
  }

  // Marketing Visits Filter & Sort States
  const [visitSearch, setVisitSearch] = useState("");
  const [visitOutcomeFilter, setVisitOutcomeFilter] = useState("all");
  const [visitSortField, setVisitSortField] = useState("meetingDate");
  const [visitSortOrder, setVisitSortOrder] = useState<"asc" | "desc">("desc");

  // Scheduled Follow-Ups Filter & Sort States
  const [followUpSearch, setFollowUpSearch] = useState("");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState("all");
  const [followUpSortField, setFollowUpSortField] = useState("followUpDate");
  const [followUpSortOrder, setFollowUpSortOrder] = useState<"asc" | "desc">("desc");

  // Quotations Filter & Sort States
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("all");
  const [quoteSortField, setQuoteSortField] = useState("quotationDate");
  const [quoteSortOrder, setQuoteSortOrder] = useState<"asc" | "desc">("desc");

  // Sales Orders Filter & Sort States
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSortField, setOrderSortField] = useState("orderDate");
  const [orderSortOrder, setOrderSortOrder] = useState<"asc" | "desc">("desc");

  // Credit calculation
  const creditLimit = Number(lead.corporateAccount.creditLimit || 5000);
  const outstanding = Number(lead.corporateAccount.currentOutstanding || 0);
  const availableCredit = creditLimit - outstanding;
  const percentUsed = Math.min(100, Math.max(0, (outstanding / creditLimit) * 100));
  const progressColor = percentUsed > 90 ? "bg-red-500" : percentUsed > 70 ? "bg-amber-500" : "bg-emerald-500";

  // --- Marketing Visits Client logic ---
  const filteredVisits = (lead.visits || []).filter((visit: any) => {
    const searchLower = visitSearch.toLowerCase();
    const matchesSearch =
      visit.contactPersonNameSnapshot.toLowerCase().includes(searchLower) ||
      visit.companyNameSnapshot.toLowerCase().includes(searchLower) ||
      (visit.discussionNotes || "").toLowerCase().includes(searchLower) ||
      (visit.coursesDiscussed || "").toLowerCase().includes(searchLower) ||
      (visit.visitOutcome || "").toLowerCase().includes(searchLower);

    const matchesOutcome =
      visitOutcomeFilter === "all" ||
      (visit.visitOutcome || "").toLowerCase() === visitOutcomeFilter.toLowerCase();

    return matchesSearch && matchesOutcome;
  });

  const sortedVisits = [...filteredVisits].sort((a, b) => {
    let aValue = a[visitSortField] || "";
    let bValue = b[visitSortField] || "";

    if (visitSortField === "meetingDate") {
      aValue = new Date(a.meetingDate).getTime();
      bValue = new Date(b.meetingDate).getTime();
    }

    if (aValue < bValue) return visitSortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return visitSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleVisitSort = (field: string) => {
    if (visitSortField === field) {
      setVisitSortOrder(visitSortOrder === "asc" ? "desc" : "asc");
    } else {
      setVisitSortField(field);
      setVisitSortOrder("asc");
    }
  };

  // --- Follow-ups Client logic ---
  const filteredFollowUps = (lead.followUps || []).filter((follow: any) => {
    const searchLower = followUpSearch.toLowerCase();
    const matchesSearch =
      follow.notes.toLowerCase().includes(searchLower) ||
      follow.followUpType.toLowerCase().includes(searchLower) ||
      (follow.outcome || "").toLowerCase().includes(searchLower);

    const matchesStatus =
      followUpStatusFilter === "all" ||
      follow.status.toLowerCase() === followUpStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const sortedFollowUps = [...filteredFollowUps].sort((a, b) => {
    let aValue = a[followUpSortField] || "";
    let bValue = b[followUpSortField] || "";

    if (followUpSortField === "followUpDate") {
      aValue = new Date(a.followUpDate).getTime();
      bValue = new Date(b.followUpDate).getTime();
    }

    if (aValue < bValue) return followUpSortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return followUpSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleFollowUpSort = (field: string) => {
    if (followUpSortField === field) {
      setFollowUpSortOrder(followUpSortOrder === "asc" ? "desc" : "asc");
    } else {
      setFollowUpSortField(field);
      setFollowUpSortOrder("asc");
    }
  };

  // --- Quotations Client logic ---
  const filteredQuotes = (lead.quotations || []).filter((quote: any) => {
    const searchLower = quoteSearch.toLowerCase();
    const matchesSearch =
      quote.quotationNumber.toLowerCase().includes(searchLower) ||
      quote.status.toLowerCase().includes(searchLower);

    const matchesStatus =
      quoteStatusFilter === "all" ||
      quote.status.toLowerCase() === quoteStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let aValue = a[quoteSortField] || "";
    let bValue = b[quoteSortField] || "";

    if (quoteSortField === "quotationDate") {
      aValue = new Date(a.quotationDate).getTime();
      bValue = new Date(b.quotationDate).getTime();
    } else if (quoteSortField === "validUntil") {
      aValue = new Date(a.validUntil).getTime();
      bValue = new Date(b.validUntil).getTime();
    } else if (quoteSortField === "totalAmount") {
      aValue = Number(a.totalAmount);
      bValue = Number(b.totalAmount);
    }

    if (aValue < bValue) return quoteSortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return quoteSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleQuoteSort = (field: string) => {
    if (quoteSortField === field) {
      setQuoteSortOrder(quoteSortOrder === "asc" ? "desc" : "asc");
    } else {
      setQuoteSortField(field);
      setQuoteSortOrder("asc");
    }
  };

  // --- Orders Client logic ---
  const allOrders = (lead.quotations || []).flatMap((quote: any) =>
    (quote.salesOrders || []).map((order: any) => ({
      ...order,
      quotationNumber: quote.quotationNumber,
    }))
  );

  const filteredOrders = allOrders.filter((order: any) => {
    const searchLower = orderSearch.toLowerCase();
    const matchesSearch =
      order.salesOrderNumber.toLowerCase().includes(searchLower) ||
      order.status.toLowerCase().includes(searchLower) ||
      order.quotationNumber.toLowerCase().includes(searchLower);

    const matchesStatus =
      orderStatusFilter === "all" ||
      order.status.toLowerCase() === orderStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue = a[orderSortField] || "";
    let bValue = b[orderSortField] || "";

    if (orderSortField === "orderDate") {
      aValue = new Date(a.orderDate).getTime();
      bValue = new Date(b.orderDate).getTime();
    } else if (orderSortField === "totalAmount") {
      aValue = Number(a.totalAmount);
      bValue = Number(b.totalAmount);
    }

    if (aValue < bValue) return orderSortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return orderSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleOrderSort = (field: string) => {
    if (orderSortField === field) {
      setOrderSortOrder(orderSortOrder === "asc" ? "desc" : "asc");
    } else {
      setOrderSortField(field);
      setOrderSortOrder("asc");
    }
  };



  // --- Visit Column definitions ---
  const visitColumns = [
    {
      header: "Meeting Date",
      sortable: true,
      sortDirection: visitSortField === "meetingDate" ? visitSortOrder : null,
      onSort: () => handleVisitSort("meetingDate"),
      render: (visit: any) => (
        <span className="font-medium text-[color:var(--ims-ink)]">
          {formatDate(visit.meetingDate)}
        </span>
      ),
    },
    {
      header: "Contact Person",
      sortable: true,
      sortDirection: visitSortField === "contactPersonNameSnapshot" ? visitSortOrder : null,
      onSort: () => handleVisitSort("contactPersonNameSnapshot"),
      render: (visit: any) => (
        <div>
          <p className="font-semibold text-[color:var(--ims-ink)]">{visit.contactPersonNameSnapshot}</p>
          <p className="text-xs text-[color:var(--ims-muted)] italic">{visit.companyNameSnapshot}</p>
        </div>
      ),
    },
    {
      header: "Contact Info",
      render: (visit: any) => (
        <div className="text-xs text-[color:var(--ims-ink)] space-y-0.5">
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-[color:var(--ims-muted)]" />
            <span>{visit.emailSnapshot}</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-[color:var(--ims-muted)]" />
            <span>{visit.contactNumberSnapshot}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Outcome",
      sortable: true,
      sortDirection: visitSortField === "visitOutcome" ? visitSortOrder : null,
      onSort: () => handleVisitSort("visitOutcome"),
      render: (visit: any) => (
        <Badge variant={visit.visitOutcome ? "default" : "outline"}>
          {visit.visitOutcome || "No Outcome"}
        </Badge>
      ),
    },
    {
      header: "Discussion Notes & Courses",
      render: (visit: any) => (
        <div className="max-w-xs space-y-1">
          <p className="text-xs italic text-[color:var(--ims-muted)] line-clamp-2">"{visit.discussionNotes}"</p>
          {visit.coursesDiscussed && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] bg-[color:var(--ims-accent-soft)] px-1.5 py-0.5 rounded text-[color:var(--ims-ink)] font-semibold">
                Courses: {visit.coursesDiscussed}
              </span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                Candidates: {visit.expectedCandidates}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      render: (visit: any) => {
        const linkedQuotation = (lead.quotations || []).find(
          (q: any) => q.corporateMarketingVisitId === visit.id
        );
        const isRequested = visit.visitOutcome?.toLowerCase() === "requested quotation";

        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-[color:var(--ims-brass)] hover:text-[color:var(--ims-ink)] px-2"
              onClick={() => setSelectedVisit(visit)}
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </Button>
            {isRequested && (
              linkedQuotation ? (
                <Link
                  href={`/corporate-sales/quotations/${linkedQuotation.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition"
                >
                  View Quote
                </Link>
              ) : (
                <Link
                  href={`/corporate-sales/quotations/create?leadId=${lead.id}&branchId=${lead.branchId}&visitId=${visit.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold py-1.5 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition"
                >
                  Generate Quote
                </Link>
              )
            )}
          </div>
        );
      },
    },
  ];

  const renderVisitCard = (visit: any) => (
    <Card className="p-4 space-y-3 bg-[color:var(--ims-surface)] border border-[color:var(--ims-border)]">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-[color:var(--ims-ink)]">{visit.contactPersonNameSnapshot}</p>
          <p className="text-xs text-[color:var(--ims-muted)]">{formatDate(visit.meetingDate)}</p>
        </div>
        <Badge variant={visit.visitOutcome ? "default" : "outline"}>
          {visit.visitOutcome || "No Outcome"}
        </Badge>
      </div>
      <div className="text-xs text-[color:var(--ims-ink)] space-y-1">
        <p>Company: <span className="font-medium">{visit.companyNameSnapshot}</span></p>
        <p>Email: <span className="font-mono">{visit.emailSnapshot}</span></p>
        <p>Phone: <span>{visit.contactNumberSnapshot}</span></p>
        {visit.coursesDiscussed && <p>Courses: <span className="font-semibold">{visit.coursesDiscussed}</span></p>}
      </div>
      {visit.discussionNotes && (
        <div className="text-xs italic bg-[color:var(--ims-accent-soft)] p-2 rounded text-[color:var(--ims-muted)] line-clamp-3">
          "{visit.discussionNotes}"
        </div>
      )}
      <div className="pt-2 border-t border-[color:var(--ims-border)] flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex justify-center gap-1.5 text-[color:var(--ims-brass)]"
          onClick={() => setSelectedVisit(visit)}
        >
          <Eye className="h-4 w-4" />
          <span>View Details</span>
        </Button>
        {visit.visitOutcome?.toLowerCase() === "requested quotation" && (
          (() => {
            const linked = (lead.quotations || []).find((q: any) => q.corporateMarketingVisitId === visit.id);
            return linked ? (
              <Link
                href={`/corporate-sales/quotations/${linked.id}`}
                className="inline-flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition"
              >
                View Quote
              </Link>
            ) : (
              <Link
                href={`/corporate-sales/quotations/create?leadId=${lead.id}&branchId=${lead.branchId}&visitId=${visit.id}`}
                className="inline-flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition"
              >
                Generate Quote
              </Link>
            );
          })()
        )}
      </div>
    </Card>
  );

  // --- Follow-ups Column definitions ---
  const followUpColumns = [
    {
      header: "Follow Up Date",
      sortable: true,
      sortDirection: followUpSortField === "followUpDate" ? followUpSortOrder : null,
      onSort: () => handleFollowUpSort("followUpDate"),
      render: (follow: any) => (
        <span className="font-medium text-[color:var(--ims-ink)]">
          {formatDate(follow.followUpDate)}
        </span>
      ),
    },
    {
      header: "Type",
      sortable: true,
      sortDirection: followUpSortField === "followUpType" ? followUpSortOrder : null,
      onSort: () => handleFollowUpSort("followUpType"),
      render: (follow: any) => <Badge variant="outline">{follow.followUpType}</Badge>,
    },
    {
      header: "Status",
      sortable: true,
      sortDirection: followUpSortField === "status" ? followUpSortOrder : null,
      onSort: () => handleFollowUpSort("status"),
      render: (follow: any) => (
        <Badge variant={follow.status === "Scheduled" ? "warning" : "default"}>
          {follow.status}
        </Badge>
      ),
    },
    {
      header: "Notes & Agenda",
      render: (follow: any) => (
        <p className="max-w-xs text-xs text-[color:var(--ims-muted)]">
          {follow.notes}
        </p>
      ),
    },
    {
      header: "Outcome & Next Date",
      render: (follow: any) => (
        <div className="space-y-1 text-xs">
          {follow.outcome ? (
            <p className="text-emerald-700 font-medium">Outcome: {follow.outcome}</p>
          ) : (
            <p className="text-[color:var(--ims-muted)] italic">No outcome logged yet</p>
          )}
          {follow.nextFollowUpDate && (
            <p className="text-[color:var(--ims-muted)] text-[10px]">
              Next Date: {formatDate(follow.nextFollowUpDate)}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (follow: any) => (
        <div className="flex justify-end">
          {follow.status === "Scheduled" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFollowUpToComplete(follow)}
            >
              Log Outcome
            </Button>
          ) : (
            <span className="text-xs text-[color:var(--ims-muted)] font-medium">Completed</span>
          )}
        </div>
      ),
    },
  ];

  const renderFollowUpCard = (follow: any) => (
    <Card className="p-4 space-y-3 bg-[color:var(--ims-surface)] border border-[color:var(--ims-border)]">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{follow.followUpType}</Badge>
            <Badge variant={follow.status === "Scheduled" ? "warning" : "default"}>
              {follow.status}
            </Badge>
          </div>
          <p className="text-xs text-[color:var(--ims-muted)]">{formatDate(follow.followUpDate)}</p>
        </div>
        {follow.status === "Scheduled" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveFollowUpToComplete(follow)}
          >
            Log Outcome
          </Button>
        )}
      </div>
      <div className="text-xs text-[color:var(--ims-ink)]">
        <p className="font-semibold">Notes / Agenda:</p>
        <p className="text-[color:var(--ims-muted)] mt-0.5">{follow.notes}</p>
      </div>
      {follow.outcome && (
        <div className="text-xs bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-100">
          <span className="font-semibold">Outcome:</span> {follow.outcome}
        </div>
      )}
      {follow.nextFollowUpDate && (
        <p className="text-[10px] text-[color:var(--ims-muted)]">
          Next Scheduled Follow-up: {formatDate(follow.nextFollowUpDate)}
        </p>
      )}
    </Card>
  );

  // --- Quotations Column definitions ---
  const quoteColumns = [
    {
      header: "Quotation Number",
      sortable: true,
      sortDirection: quoteSortField === "quotationNumber" ? quoteSortOrder : null,
      onSort: () => handleQuoteSort("quotationNumber"),
      render: (quote: any) => (
        <span className="font-mono text-xs font-semibold text-[color:var(--ims-ink)]">
          {quote.quotationNumber}
        </span>
      ),
    },
    {
      header: "Quotation Date",
      sortable: true,
      sortDirection: quoteSortField === "quotationDate" ? quoteSortOrder : null,
      onSort: () => handleQuoteSort("quotationDate"),
      render: (quote: any) => (
        <span className="text-xs text-[color:var(--ims-muted)]">
          {formatDate(quote.quotationDate)}
        </span>
      ),
    },
    {
      header: "Valid Until",
      sortable: true,
      sortDirection: quoteSortField === "validUntil" ? quoteSortOrder : null,
      onSort: () => handleQuoteSort("validUntil"),
      render: (quote: any) => (
        <span className="text-xs text-[color:var(--ims-muted)]">
          {formatDate(quote.validUntil)}
        </span>
      ),
    },
    {
      header: "Total (Inc. VAT)",
      sortable: true,
      sortDirection: quoteSortField === "totalAmount" ? quoteSortOrder : null,
      onSort: () => handleQuoteSort("totalAmount"),
      render: (quote: any) => (
        <span className="font-bold text-[color:var(--ims-ink)]">
          {Number(quote.totalAmount).toFixed(3)} OMR
        </span>
      ),
    },
    {
      header: "Status",
      sortable: true,
      sortDirection: quoteSortField === "status" ? quoteSortOrder : null,
      onSort: () => handleQuoteSort("status"),
      render: (quote: any) => (
        <Badge
          variant={
            quote.status === "Accepted"
              ? "success"
              : quote.status === "SubmittedForApproval"
                ? "warning"
                : "muted"
          }
        >
          {quote.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (quote: any) => (
        <div className="flex justify-end gap-2">
          <LinkButton href={`/corporate-sales/quotations/${quote.id}`} variant="outline" size="sm">
            Details
          </LinkButton>
          <LinkButton href={`/corporate-sales/quotations/${quote.id}/costing`} variant="outline" size="sm">
            {["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status)
              ? "View Costing"
              : "Costing Sheet"}
          </LinkButton>
        </div>
      ),
    },
  ];

  const renderQuotationCard = (quote: any) => (
    <Card className="p-4 space-y-3 bg-[color:var(--ims-surface)] border border-[color:var(--ims-border)]">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-mono text-xs font-bold text-[color:var(--ims-ink)]">{quote.quotationNumber}</span>
          <span className="text-[10px] text-[color:var(--ims-muted)] block mt-0.5">
            Issued: {formatDate(quote.quotationDate)}
          </span>
        </div>
        <Badge
          variant={
            quote.status === "Accepted"
              ? "success"
              : quote.status === "SubmittedForApproval"
                ? "warning"
                : "muted"
          }
        >
          {quote.status}
        </Badge>
      </div>
      <div className="flex justify-between items-center text-xs pt-1">
        <span className="text-[color:var(--ims-muted)]">Valid Until: {formatDate(quote.validUntil)}</span>
        <span className="font-bold text-[color:var(--ims-ink)]">{Number(quote.totalAmount).toFixed(3)} OMR</span>
      </div>
      <div className="flex gap-2 pt-2 border-t border-[color:var(--ims-border)]">
        <LinkButton href={`/corporate-sales/quotations/${quote.id}`} variant="outline" size="sm" className="w-1/2 justify-center">
          Details
        </LinkButton>
        <LinkButton href={`/corporate-sales/quotations/${quote.id}/costing`} variant="outline" size="sm" className="w-1/2 justify-center">
          {["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status)
            ? "View Costing"
            : "Costing"}
        </LinkButton>
      </div>
    </Card>
  );

  // --- Sales Orders Column definitions ---
  const orderColumns = [
    {
      header: "Sales Order Number",
      sortable: true,
      sortDirection: orderSortField === "salesOrderNumber" ? orderSortOrder : null,
      onSort: () => handleOrderSort("salesOrderNumber"),
      render: (order: any) => (
        <span className="font-mono text-xs font-semibold text-[color:var(--ims-ink)]">
          {order.salesOrderNumber}
        </span>
      ),
    },
    {
      header: "Order Date",
      sortable: true,
      sortDirection: orderSortField === "orderDate" ? orderSortOrder : null,
      onSort: () => handleOrderSort("orderDate"),
      render: (order: any) => (
        <span className="text-xs text-[color:var(--ims-muted)]">
          {formatDate(order.orderDate)}
        </span>
      ),
    },
    {
      header: "Quotation Ref",
      render: (order: any) => (
        <span className="font-mono text-xs text-[color:var(--ims-muted)]">
          {order.quotationNumber || "N/A"}
        </span>
      ),
    },
    {
      header: "Total Amount",
      sortable: true,
      sortDirection: orderSortField === "totalAmount" ? orderSortOrder : null,
      onSort: () => handleOrderSort("totalAmount"),
      render: (order: any) => (
        <span className="font-bold text-[color:var(--ims-ink)]">
          {Number(order.totalAmount).toFixed(3)} OMR
        </span>
      ),
    },
    {
      header: "Status",
      sortable: true,
      sortDirection: orderSortField === "status" ? orderSortOrder : null,
      onSort: () => handleOrderSort("status"),
      render: (order: any) => (
        <Badge variant={order.status === "Confirmed" ? "success" : "outline"}>
          {order.status}
        </Badge>
      ),
    },
  ];

  const renderOrderCard = (order: any) => (
    <Card className="p-4 space-y-3 bg-[color:var(--ims-surface)] border border-[color:var(--ims-border)]">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-mono text-xs font-bold text-[color:var(--ims-ink)]">{order.salesOrderNumber}</span>
          <span className="text-[10px] text-[color:var(--ims-muted)] block mt-0.5">
            Date: {formatDate(order.orderDate)}
          </span>
        </div>
        <Badge variant={order.status === "Confirmed" ? "success" : "outline"}>
          {order.status}
        </Badge>
      </div>
      <div className="flex justify-between items-center text-xs pt-1">
        <span className="text-[color:var(--ims-muted)]">Quote Ref: <span className="font-mono">{order.quotationNumber}</span></span>
        <span className="font-bold text-[color:var(--ims-ink)]">{Number(order.totalAmount).toFixed(3)} OMR</span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        eyebrow="B2B Corporate Lead"
        title={lead.corporateAccount.accountName}
        description={`Configure B2B commercial opportunity details and log sales pipeline logs.`}
        backUrl="/corporate-sales/leads"
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
                label: lead.corporateAccount.accountCode,
                icon: <Compass className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
        actions={
          <div className="flex gap-2 items-center">
            <LinkButton
              href={`/corporate-sales/leads/${lead.id}/edit`}
              variant="outline"
              size="sm"
            >
              Edit Lead Info
            </LinkButton>
            <LinkButton
              href={`/corporate-sales/quotations/create?leadId=${lead.id}&branchId=${lead.branchId}`}
              variant="primary"
              size="sm"
            >
              Generate Quotation
            </LinkButton>
          </div>
        }
      />

      {/* Main Profile Summary Card */}
      <Card className="animate-fade-in-up border border-[color:var(--ims-border)] shadow-[0_8px_24px_rgba(16,36,58,0.02)]">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[color:var(--ims-border)]">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">
                Pipeline Stage
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={lead.stage === "Confirmed" ? "default" : "outline"} className="px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">
                  {lead.stage}
                </Badge>
              </div>
            </div>

            <div className="space-y-1 md:pl-6 pt-4 md:pt-0">
              <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">
                Expected Deal Value
              </span>
              <span className="text-xl font-bold text-[color:var(--ims-ink)] flex items-center">
                <DollarSign className="h-4.5 w-4.5 text-[color:var(--ims-brass)] mr-0.5" />
                {Number(lead.expectedValue).toFixed(3)} <span className="text-xs ml-1 text-[color:var(--ims-muted)] font-medium">OMR</span>
              </span>
            </div>

            <div className="space-y-1 md:pl-6 pt-4 md:pt-0">
              <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">
                Assigned Executive
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-[color:var(--ims-ink)] text-sm font-semibold">
                <User className="h-4 w-4 text-[color:var(--ims-brass)]" />
                {executiveName.split(" (")[0]}
              </div>
            </div>

            <div className="space-y-1 md:pl-6 pt-4 md:pt-0">
              <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">
                Expected Close Date
              </span>
              <span className="text-sm font-semibold text-[color:var(--ims-ink)] flex items-center mt-1">
                <Calendar className="h-4 w-4 text-[color:var(--ims-brass)] mr-1.5" />
                {formatDate(lead.expectedCloseDate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="w-full flex-wrap justify-start rounded-2xl bg-[color:var(--ims-accent-soft)] p-1 h-auto gap-1 border border-[color:var(--ims-border)]">
          <TabsTrigger
            value="overview"
            className="gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all"
          >
            <User className="h-4 w-4" />
            Overview & Account Details
          </TabsTrigger>
          <TabsTrigger
            value="visits"
            className="gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all"
          >
            <Compass className="h-4 w-4" />
            Marketing Visits ({lead.visits?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all"
          >
            <Clock className="h-4 w-4" />
            Sales Follow-Ups ({lead.followUps?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="quotations"
            className="gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all"
          >
            <ClipboardList className="h-4 w-4" />
            Quotations & Orders ({lead.quotations?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="pt-2 space-y-6 animate-fade-in-up">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Lead Metadata */}
            <Card className="border border-[color:var(--ims-border)] shadow-[0_4px_16px_rgba(16,36,58,0.01)] overflow-hidden">
              <CardHeader className="bg-[color:var(--ims-accent-soft)] py-4 border-b border-[color:var(--ims-border)]">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[color:var(--ims-ink)] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[color:var(--ims-brass)]" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm text-[color:var(--ims-ink)]">
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <Activity className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Lead Stage</span>
                  </div>
                  <Badge variant={lead.stage === "Confirmed" ? "default" : "outline"} className="font-semibold">
                    {lead.stage}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <DollarSign className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Expected Deal Value</span>
                  </div>
                  <span className="font-bold text-[color:var(--ims-ink)]">
                    {Number(lead.expectedValue).toFixed(3)} OMR
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <MapPin className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Target Branch</span>
                  </div>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {lead.branch ? `${lead.branch.branchName} (${lead.branch.branchCode})` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <Calendar className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Expected Close Date</span>
                  </div>
                  <span className="font-medium text-[color:var(--ims-ink)]">
                    {formatDate(lead.expectedCloseDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <User className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Sales Executive</span>
                  </div>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {executiveName}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Corporate Account details */}
            <Card className="border border-[color:var(--ims-border)] shadow-[0_4px_16px_rgba(16,36,58,0.01)] overflow-hidden">
              <CardHeader className="bg-[color:var(--ims-accent-soft)] py-3 px-6 border-b border-[color:var(--ims-border)] flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[color:var(--ims-ink)] flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[color:var(--ims-brass)]" />
                  B2B Corporate Account Details
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsCreditLimitOpen(true)}>
                  Edit Policy
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm text-[color:var(--ims-ink)]">
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <Building2 className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Account Name</span>
                  </div>
                  <span className="font-bold text-[color:var(--ims-ink)]">
                    {lead.corporateAccount.accountName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <Hash className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Account Code</span>
                  </div>
                  <Badge variant="outline" className="font-mono font-semibold tracking-wider bg-white">
                    {lead.corporateAccount.accountCode}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <Shield className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Credit Policy</span>
                  </div>
                  <Badge variant={lead.corporateAccount.blockOnCreditLimit ? "error" : "warning"} className="font-semibold text-[10px] uppercase">
                    {lead.corporateAccount.blockOnCreditLimit ? "Strict Block" : "Flexible"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[color:var(--ims-border)]">
                  <div className="flex items-center gap-2 font-medium text-[color:var(--ims-muted)]">
                    <Building2 className="h-4 w-4 text-[color:var(--ims-muted)]" />
                    <span>Organization</span>
                  </div>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {lead.branch?.institute?.instituteName || "Al Saud Training Institute (ASTI)"}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Credit Limit</span>
                    <span className="font-bold text-[color:var(--ims-ink)] block">{creditLimit.toFixed(3)} OMR</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Outstanding</span>
                    <span className="font-bold text-rose-600 block">{outstanding.toFixed(3)} OMR</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[color:var(--ims-border)]">
                  <div className="flex justify-between text-[11px] font-bold text-[color:var(--ims-muted)]">
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-[color:var(--ims-muted)]" />
                      CREDIT UTILIZATION ({percentUsed.toFixed(1)}%)
                    </span>
                    <span>{availableCredit.toFixed(3)} OMR Avail.</span>
                  </div>
                  <div className="w-full bg-[color:var(--ims-border)] rounded-full h-2">
                    <div className={`h-2 rounded-full ${progressColor} transition-all`} style={{ width: `${percentUsed}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Marketing Visits Tab Content */}
        <TabsContent value="visits" className="pt-2 animate-fade-in-up space-y-4">
          <Card className="border border-[color:var(--ims-border)]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[color:var(--ims-border)] py-4 bg-white">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[color:var(--ims-ink)] flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[color:var(--ims-brass)]" />
                  Logged Visits
                </CardTitle>
                <p className="text-xs text-[color:var(--ims-muted)]">History of physical sales team visits and discussions.</p>
              </div>
              <div className="flex gap-2 items-center justify-between sm:justify-end w-full sm:w-auto">
                <Badge variant="default" className="bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-ink)] border border-[color:var(--ims-border)] px-2 py-0.5 font-bold whitespace-nowrap">
                  {lead.visits?.length || 0} Visits
                </Badge>
                <LogVisitButtonAndSheet lead={lead} actorId={actorId} courses={courses} />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchInput
                    placeholder="Search contact person, company name, courses, or notes..."
                    value={visitSearch}
                    onChange={(e) => setVisitSearch(e.target.value)}
                    onClear={() => setVisitSearch("")}
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={visitOutcomeFilter}
                    onChange={(e) => setVisitOutcomeFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Outcomes" },
                      { value: "requested quotation", label: "Requested Quotation" },
                      { value: "follow up scheduled", label: "Follow-up Scheduled" },
                      { value: "interested", label: "Interested" },
                      { value: "no interest", label: "No Interest" },
                    ]}
                  />
                </div>
              </div>

              {/* Data Table */}
              <ResponsiveDataTable
                data={sortedVisits}
                columns={visitColumns}
                renderCard={renderVisitCard}
                keyExtractor={(visit) => visit.id}
                emptyState={
                  <div className="py-12 text-center text-[color:var(--ims-muted)] text-sm border border-dashed border-[color:var(--ims-border)] rounded-xl">
                    <Compass className="mx-auto h-8 w-8 text-[color:var(--ims-muted)] mb-2" />
                    No marketing visits match your search criteria.
                  </div>
                }
              />

            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Ups Tab Content */}
        <TabsContent value="followups" className="pt-2 animate-fade-in-up space-y-4">
          <Card className="border border-[color:var(--ims-border)]">
            <CardHeader className="flex justify-between flex-row items-center border-b border-[color:var(--ims-border)] py-4 bg-white">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[color:var(--ims-ink)] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[color:var(--ims-primary)]" />
                  Scheduled Follow-Ups
                </CardTitle>
                <p className="text-xs text-[color:var(--ims-muted)]">Track planned follow-ups, calls, or reminders.</p>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="default" className="bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-ink)] border border-[color:var(--ims-border)] px-2 py-0.5 font-bold">
                  {lead.followUps?.length || 0} Scheduled
                </Badge>
                <ScheduleFollowUpButtonAndDialog lead={lead} actorId={actorId} />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchInput
                    placeholder="Search agenda notes, types, or outcomes..."
                    value={followUpSearch}
                    onChange={(e) => setFollowUpSearch(e.target.value)}
                    onClear={() => setFollowUpSearch("")}
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={followUpStatusFilter}
                    onChange={(e) => setFollowUpStatusFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "scheduled", label: "Scheduled" },
                      { value: "completed", label: "Completed" },
                    ]}
                  />
                </div>
              </div>

              {/* Data Table */}
              <ResponsiveDataTable
                data={sortedFollowUps}
                columns={followUpColumns}
                renderCard={renderFollowUpCard}
                keyExtractor={(follow) => follow.id}
                emptyState={
                  <div className="py-12 text-center text-[color:var(--ims-muted)] text-sm border border-dashed border-[color:var(--ims-border)] rounded-xl">
                    <Clock className="mx-auto h-8 w-8 text-[color:var(--ims-muted)] mb-2" />
                    No sales follow-ups scheduled or match your query.
                  </div>
                }
              />

            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations & Orders Tab Content */}
        <TabsContent value="quotations" className="pt-2 space-y-6 animate-fade-in-up">
          
          {/* Quotations Card */}
          <Card className="border border-[color:var(--ims-border)]">
            <CardHeader className="flex justify-between flex-row items-center border-b border-[color:var(--ims-border)] py-4 bg-white">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[color:var(--ims-ink)]">
                  Lead Quotations
                </CardTitle>
                <p className="text-xs text-[color:var(--ims-muted)]">Quotations, costing sheets, and pricing drafts.</p>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="default" className="bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-ink)] border border-[color:var(--ims-border)] px-2 py-0.5 font-bold">
                  {lead.quotations?.length || 0} Proposals
                </Badge>
                <LinkButton
                  href={`/corporate-sales/quotations/create?leadId=${lead.id}&branchId=${lead.branchId}`}
                  variant="primary"
                  size="sm"
                >
                  Generate Quotation
                </LinkButton>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchInput
                    placeholder="Search quotation number, status..."
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    onClear={() => setQuoteSearch("")}
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={quoteStatusFilter}
                    onChange={(e) => setQuoteStatusFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "draft", label: "Draft" },
                      { value: "submittedforapproval", label: "Submitted for Approval" },
                      { value: "approved", label: "Approved" },
                      { value: "rejected", label: "Rejected" },
                      { value: "accepted", label: "Accepted" },
                    ]}
                  />
                </div>
              </div>

              {/* Data Table */}
              <ResponsiveDataTable
                data={sortedQuotes}
                columns={quoteColumns}
                renderCard={renderQuotationCard}
                keyExtractor={(quote) => quote.id}
                emptyState={
                  <div className="py-12 text-center text-[color:var(--ims-muted)] text-sm border border-dashed border-[color:var(--ims-border)] rounded-xl">
                    <ClipboardList className="mx-auto h-8 w-8 text-[color:var(--ims-muted)] mb-2" />
                    No quotations generated or match search filters.
                  </div>
                }
              />

            </CardContent>
          </Card>

          {/* Sales Orders Card */}
          <Card className="border border-[color:var(--ims-border)]">
            <CardHeader className="flex justify-between flex-row items-center border-b border-[color:var(--ims-border)] py-4 bg-white">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-[color:var(--ims-ink)]">
                  Confirmed Sales Orders
                </CardTitle>
                <p className="text-xs text-[color:var(--ims-muted)]">Signed contracts and validated client agreements.</p>
              </div>
              <Badge variant="default" className="bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-ink)] border border-[color:var(--ims-border)] px-2 py-0.5 font-bold">
                {sortedOrders.length} Confirmed
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchInput
                    placeholder="Search sales order number, status, quotation ref..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    onClear={() => setOrderSearch("")}
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "confirmed", label: "Confirmed" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                  />
                </div>
              </div>

              {/* Data Table */}
              <ResponsiveDataTable
                data={sortedOrders}
                columns={orderColumns}
                renderCard={renderOrderCard}
                keyExtractor={(order) => order.id}
                emptyState={
                  <div className="py-12 text-center text-[color:var(--ims-muted)] text-sm border border-dashed border-[color:var(--ims-border)] rounded-xl">
                    <BookOpen className="mx-auto h-8 w-8 text-[color:var(--ims-muted)] mb-2" />
                    No confirmed sales orders match filters.
                  </div>
                }
              />

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Complete Follow Up (Log Outcome) Drawer */}
      {activeFollowUpToComplete && (
        <LogCorporateFollowUpDrawer
          followUp={activeFollowUpToComplete}
          isOpen={activeFollowUpToComplete !== null}
          onClose={() => setActiveFollowUpToComplete(null)}
          onSuccess={() => {
            setActiveFollowUpToComplete(null);
            router.refresh();
          }}
          actorId={actorId}
        />
      )}

      {/* Edit Credit Policy Dialog */}
      <Dialog open={isCreditLimitOpen} onOpenChange={setIsCreditLimitOpen}>
        <DialogContent className="max-w-md p-6 bg-[color:var(--ims-surface)] rounded-xl shadow-lg border border-[color:var(--ims-border)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[color:var(--ims-ink)] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[color:var(--ims-brass)]" />
              Edit Credit Policy
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCreditPolicy} className="space-y-4 mt-2">
            {creditError && <div className="text-xs font-semibold text-red-600">{creditError}</div>}

            <div className="space-y-4 text-xs text-[color:var(--ims-ink)]">
              <div>
                <label className="font-semibold text-[color:var(--ims-muted)] block">Credit Limit (OMR)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  min={0}
                  value={creditLimitInput}
                  onChange={(e) => setCreditLimitInput(Number(e.target.value))}
                  className="mt-1 w-full border border-[color:var(--ims-border)] p-2 rounded bg-white text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="blockOnCreditLimit"
                  checked={blockOnCreditLimitInput}
                  onChange={(e) => setBlockOnCreditLimitInput(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[color:var(--ims-brass)] focus:ring-[color:var(--ims-brass)] cursor-pointer"
                />
                <label htmlFor="blockOnCreditLimit" className="font-semibold text-[color:var(--ims-ink)] cursor-pointer">
                  Strict block on credit limit exceed
                </label>
              </div>
              <p className="text-[10px] text-[color:var(--ims-muted)] leading-relaxed">
                If checked, any enrollments that exceed the corporate account's credit limit will be blocked. Otherwise, it will only warn but allow continuation.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--ims-border)] pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreditLimitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creditLoading} variant="primary">
                {creditLoading ? "Saving..." : "Save Policy"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Logged Visit Details Sheet */}
      <Sheet open={!!selectedVisit} onOpenChange={(open) => !open && setSelectedVisit(null)}>
        <SheetContent className="sm:max-w-md md:max-w-lg w-full">
          <SheetHeader>
            <SheetTitle>Marketing Visit Details</SheetTitle>
          </SheetHeader>
          {selectedVisit && (
            <div className="space-y-6 mt-4 text-sm text-[color:var(--ims-ink)]">
              <div>
                <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Meeting Date</span>
                <span className="font-medium text-base">{formatDate(selectedVisit.meetingDate)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Company Name</span>
                  <span className="font-medium block break-words">{selectedVisit.companyNameSnapshot}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Contact Person</span>
                  <span className="font-medium block break-words">{selectedVisit.contactPersonNameSnapshot}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Contact Number</span>
                  <span className="font-medium block break-words">{selectedVisit.contactNumberSnapshot}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Contact Email</span>
                  <span className="font-medium font-mono block break-all">{selectedVisit.emailSnapshot}</span>
                </div>
              </div>
              <div className="border-t border-[color:var(--ims-border)] pt-4">
                <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block mb-1">Discussion Notes</span>
                <div className="p-3 bg-[color:var(--ims-accent-soft)] rounded-xl border border-[color:var(--ims-border)] text-sm italic leading-relaxed text-[color:var(--ims-ink)] whitespace-pre-wrap">
                  "{selectedVisit.discussionNotes}"
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-[color:var(--ims-border)] pt-4">
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Courses Discussed</span>
                  <span className="font-medium block break-words">{selectedVisit.coursesDiscussed || "None"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Expected Candidates</span>
                  <span className="font-medium">{selectedVisit.expectedCandidates}</span>
                </div>
              </div>
              {selectedVisit.expectedTrainingDate && (
                <div>
                  <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block">Expected Start Date</span>
                  <span className="font-medium">{formatDate(selectedVisit.expectedTrainingDate)}</span>
                </div>
              )}
              <div className="border-t border-[color:var(--ims-border)] pt-4">
                <span className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider block mb-1.5">Visit Outcome</span>
                <Badge variant={selectedVisit.visitOutcome ? "default" : "outline"} className="text-xs px-2.5 py-1">
                  {selectedVisit.visitOutcome || "No Outcome"}
                </Badge>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
