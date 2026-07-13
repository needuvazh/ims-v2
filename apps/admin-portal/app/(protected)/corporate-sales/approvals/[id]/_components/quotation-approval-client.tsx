"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Home,
  Briefcase,
  Compass,
  Building2,
  Calendar,
  Calculator,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumbs,
  PageHeader,
} from "@ims/shared-ui";
import { toast } from "sonner";
import { approveQuotationAction, rejectQuotationAction } from "../../../actions";

interface QuotationApprovalClientProps {
  quote: any;
  actorId: string;
  decisionHistory?: Array<{
    id: string;
    action: string;
    performedAt: Date | string;
    reason: string | null;
    performerName: string;
  }>;
}

function formatDate(dateInput: any) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function QuotationApprovalClient({
  quote,
  actorId,
  decisionHistory = [],
}: QuotationApprovalClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [showDirectDetails, setShowDirectDetails] = useState(true);
  const [showIndirectDetails, setShowIndirectDetails] = useState(true);

  const costing = quote.costingSheet;
  const lineItems = quote.lineItems || [];

  const subtotal = Number(quote.subtotal || 0);
  const vat = subtotal * 0.05;
  const totalAmount = Number(quote.totalAmount || subtotal + vat);

  const getDirectCostsBreakdown = () => {
    if (costing?.directCosts && costing.directCosts.length > 0) {
      return costing.directCosts.map((dc: any) => ({
        name: dc.costElement?.name || "Unknown Cost",
        amount: Number(dc.amount),
      }));
    }
    
    const list = [];
    const fields = [
      { name: "Trainer Cost", value: costing?.trainerCost },
      { name: "Venue Cost", value: costing?.venueCost },
      { name: "Equipment Cost", value: costing?.equipmentCost },
      { name: "Printing Cost", value: costing?.printingCost },
      { name: "Certificate Cost", value: costing?.certificateCost },
      { name: "Travel Cost", value: costing?.travelCost },
      { name: "Accommodation Cost", value: costing?.accommodationCost },
      { name: "Food Cost", value: costing?.foodCost },
      { name: "Vehicle Cost", value: costing?.vehicleCost },
    ];
    for (const f of fields) {
      if (f.value && Number(f.value) > 0) {
        list.push({ name: f.name, amount: Number(f.value) });
      }
    }
    return list;
  };

  const getIndirectCostsBreakdown = () => {
    const list = [];
    const fields = [
      { name: "Administration Overheads", value: costing?.administrationCost },
      { name: "Marketing Overheads", value: costing?.marketingCost },
      { name: "Miscellaneous Costs", value: costing?.miscellaneousCost },
    ];
    for (const f of fields) {
      if (f.value && Number(f.value) > 0) {
        list.push({ name: f.name, amount: Number(f.value) });
      }
    }
    return list;
  };

  async function handleApprove() {
    if (!remarks.trim()) {
      toast.error("Please provide approval remarks for manager overrides.");
      return;
    }
    setLoading(true);
    try {
      await approveQuotationAction(quote.id, actorId, remarks);
      toast.success("Quotation approved successfully!");
      router.push("/corporate-sales/approvals");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve quotation");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!remarks.trim()) {
      toast.error("Please provide rejection remarks.");
      return;
    }
    setLoading(true);
    try {
      await rejectQuotationAction(quote.id, actorId, remarks);
      toast.error("Quotation proposal rejected.");
      router.push("/corporate-sales/approvals");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject quotation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Review Quotation: ${quote.quotationNumber}`}
        description="Inspect margins and costing details to decide manager override approval."
        backUrl="/corporate-sales/approvals"
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
                label: "Approvals Queue",
                href: "/corporate-sales/approvals",
                icon: <Compass className="h-3.5 w-3.5" />,
              },
              {
                label: quote.quotationNumber,
              },
            ]}
          />
        }
      />

      {/* Warning Alert Banner */}
      {quote.status === "SubmittedForApproval" && (
        Number(costing?.profitPercentage || 0) < 25.00 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Manager Override Required:</span> This B2B proposal has a profit margin of{" "}
              <span className="font-bold">{Number(costing?.profitPercentage || 0).toFixed(2)}%</span> which is below the 25.00% gross profit threshold. You must review the cost breakdown and provide decision remarks.
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
            <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Proposal Under Review:</span> This B2B proposal is submitted for manager approval. The profit margin is <span className="font-bold">{Number(costing?.profitPercentage || 0).toFixed(2)}%</span> (above threshold). Please review the details and provide decision remarks.
            </div>
          </div>
        )
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column - Details & Line Items (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Corporate Client
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-sm">
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Account Name</span>
                  <span className="text-slate-900 font-semibold">
                    {quote.corporateAccount.accountName}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Account Code</span>
                  <span className="text-slate-900 font-mono text-xs font-semibold">
                    {quote.corporateAccount.accountCode}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Credit Limit</span>
                  <span className="text-slate-900">
                    {Number(quote.corporateAccount.creditLimit || 5000).toFixed(3)} OMR
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  Quotation Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-sm">
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Quotation Date</span>
                  <span className="text-slate-900">
                    {formatDate(quote.quotationDate)}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Valid Until</span>
                  <span className="text-slate-900">
                    {formatDate(quote.validUntil)}
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span>
                    <Badge variant={quote.status === "SubmittedForApproval" ? "warning" : "muted"}>
                      {quote.status}
                    </Badge>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rejection/Approval History */}
          {decisionHistory && decisionHistory.length > 0 && (
            <Card className="shadow-sm border border-slate-200">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-indigo-500" />
                  Previous Decisions & Override Remarks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="divide-y divide-slate-100">
                  {decisionHistory.map((history) => (
                    <div key={history.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={history.action === "APPROVE" ? "default" : "outline"}
                            className={
                              history.action === "REJECT"
                                ? "bg-rose-50 text-rose-700 border-rose-200 text-xs"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                            }
                          >
                            {history.action === "APPROVE" ? "Approved" : "Rejected"}
                          </Badge>
                          <span className="text-sm font-semibold text-slate-900">
                            {history.performerName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDate(history.performedAt)}
                        </span>
                      </div>
                      {history.reason && (
                        <div className="mt-2 text-sm text-slate-700 bg-slate-50 border p-3 rounded-lg font-medium italic">
                          "{history.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items Table */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">
                Quotation Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-500 border-b font-medium">
                      <th className="p-4">Training Program / Course</th>
                      <th className="p-4 text-center">Quantity</th>
                      <th className="p-4">Unit Rate</th>
                      <th className="p-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No line items configured.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4">
                            <div className="font-semibold text-slate-900">
                              {item.course.nameEnglish}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Code: {item.course.code || "N/A"}
                            </div>
                          </td>
                          <td className="p-4 text-center text-slate-800 font-medium">
                            {item.quantity}
                          </td>
                          <td className="p-4 text-slate-600">
                            {Number(item.unitPrice).toFixed(3)} OMR
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-900">
                            {(Number(item.quantity) * Number(item.unitPrice)).toFixed(3)} OMR
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Override Form */}
          {quote.status === "SubmittedForApproval" && (
            <Card className="shadow-sm border">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Override Decision Form
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Approval Override Remarks
                  </label>
                  <textarea
                    placeholder="Provide a detailed business justification for this override (e.g. strategic partnership account, package deal offset, bulk purchase override)..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  />
                  {!remarks.trim() && (
                    <p className="text-xs text-amber-600">
                      ⓘ Remarks are required to process manager override approvals or rejections.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center gap-3 pt-2 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleReject}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-5"
                  >
                    Reject Proposal
                  </Button>

                  <div className="flex gap-3">
                    <Link href="/corporate-sales/approvals">
                      <Button type="button" variant="outline" disabled={loading}>
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      disabled={loading || !remarks.trim()}
                      onClick={handleApprove}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                    >
                      {loading ? "Processing..." : "Approve Override"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Costing & Margin Analysis (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-indigo-500" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm">
              <div className="space-y-2.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Value:</span>
                  <span className="font-semibold text-slate-700">
                    {subtotal.toFixed(3)} OMR
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT (5%):</span>
                  <span className="font-semibold text-slate-700">
                    {vat.toFixed(3)} OMR
                  </span>
                </div>
                <div className="border-t pt-2.5 flex justify-between font-bold text-base">
                  <span className="text-slate-800">Grand Total:</span>
                  <span className="text-slate-900 font-extrabold">
                    {totalAmount.toFixed(3)} OMR
                  </span>
                </div>
              </div>

              {costing ? (
                <div className="border-t pt-4 space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Margin Analysis
                  </span>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-500">
                      <button
                        onClick={() => setShowDirectDetails(!showDirectDetails)}
                        className="flex items-center gap-1 hover:text-slate-900 transition font-medium text-left"
                      >
                        <span>Direct Costs:</span>
                        {showDirectDetails ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>
                      <span className="font-semibold text-slate-700">
                        {Number(costing.totalDirectCost || 0).toFixed(3)} OMR
                      </span>
                    </div>
                    {showDirectDetails && (
                      <div className="pl-4 py-1.5 space-y-1 border-l border-slate-200 bg-slate-50/50 rounded-r-md">
                        {getDirectCostsBreakdown().length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">No direct cost breakdown.</div>
                        ) : (
                          getDirectCostsBreakdown().map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                              <span>{item.name}:</span>
                              <span className="font-mono font-medium">{item.amount.toFixed(3)} OMR</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-500">
                      <button
                        onClick={() => setShowIndirectDetails(!showIndirectDetails)}
                        className="flex items-center gap-1 hover:text-slate-900 transition font-medium text-left"
                      >
                        <span>Indirect Costs:</span>
                        {showIndirectDetails ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>
                      <span className="font-semibold text-slate-700">
                        {Number(costing.totalIndirectCost || 0).toFixed(3)} OMR
                      </span>
                    </div>
                    {showIndirectDetails && (
                      <div className="pl-4 py-1.5 space-y-1 border-l border-slate-200 bg-slate-50/50 rounded-r-md">
                        {getIndirectCostsBreakdown().length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">No indirect cost breakdown.</div>
                        ) : (
                          getIndirectCostsBreakdown().map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                              <span>{item.name}:</span>
                              <span className="font-mono font-medium">{item.amount.toFixed(3)} OMR</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-slate-500 pt-1">
                    <span>Total Cost:</span>
                    <span className="font-bold text-slate-700">
                      {Number(costing.totalCost).toFixed(3)} OMR
                    </span>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-2.5 flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Profit Margin:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-950">
                        {Number(costing.profitPercentage || 0).toFixed(2)}%
                      </span>
                      {Number(costing.profitPercentage || 0) < 25.00 ? (
                        <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-[10px]">
                          Low
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-[10px]">
                          Target
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4 text-xs text-slate-400 text-center py-2 italic">
                  Costing sheet not configured.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
