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
  ArrowRight,
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
import { submitQuotationAction, cancelQuotationAction } from "../../../actions";

interface QuotationDetailsClientProps {
  quote: any;
  actorId: string;
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

export function QuotationDetailsClient({
  quote,
  actorId,
}: QuotationDetailsClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showDirectDetails, setShowDirectDetails] = useState(false);
  const [showIndirectDetails, setShowIndirectDetails] = useState(false);

  const costing = quote.costingSheet;
  const lineItems = quote.lineItems || [];
  const hasSalesOrder = quote.salesOrders && quote.salesOrders.length > 0;

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
    
    // Fallback to static columns
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

  const [cancelling, setCancelling] = useState(false);

  async function handleSubmitForApproval() {
    setSubmitting(true);
    try {
      await submitQuotationAction(quote.id, actorId);
      toast.success("Quotation submitted for approval successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quotation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelQuotation() {
    if (!confirm("Are you sure you want to cancel this quotation? This action cannot be undone.")) {
      return;
    }
    setCancelling(true);
    try {
      await cancelQuotationAction(quote.id, actorId);
      toast.success("Quotation cancelled successfully.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel quotation");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title={`Quotation: ${quote.quotationNumber}`}
        description={`Inspect details and configure margins for B2B client proposal.`}
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
                label: "Quotations",
                href: "/corporate-sales/quotations",
              },
              {
                label: quote.quotationNumber,
                icon: <Compass className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
        actions={
          <div className="flex gap-2 items-center">
            <a href={`/api/v1/corporate-sales/quotations/${quote.id}/download`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                Print / Save PDF
              </Button>
            </a>
            <Link href={`/corporate-sales/quotations/${quote.id}/costing`}>
              <Button variant="outline">
                {["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status)
                  ? "View Costing Sheet"
                  : "Configure Costing Sheet"}
              </Button>
            </Link>
            {["Approved", "Sent", "Accepted"].includes(quote.status) && (
              <Link href={`/corporate-sales/orders?quotationId=${quote.id}`}>
                <Button variant="primary">
                  Confirm Sales Order <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Panel: Proposal details & line items (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Corporate Client & Quote Info */}
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
                  <span className="text-slate-500 font-medium">Revision Number</span>
                  <span className="text-slate-900 font-semibold">
                    v{quote.revisionCount || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    {lineItems.map((item: any) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Costs, Margins, Telemetry (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Price & Cost Summary */}
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
                    <span>Total Estimated Cost:</span>
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

          {/* Action Card */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">
                Proposal Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Status:</span>
                <Badge
                  variant={
                    quote.status === "Accepted"
                      ? "default"
                      : quote.status === "SubmittedForApproval"
                        ? "outline"
                        : quote.status === "Cancelled"
                          ? "outline"
                          : "muted"
                  }
                  className={
                    quote.status === "Cancelled"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : undefined
                  }
                >
                  {quote.status}
                </Badge>
              </div>

              {quote.status === "Draft" && (
                <div className="space-y-2 pt-2">
                  <Button
                    onClick={handleSubmitForApproval}
                    disabled={submitting || !quote.costingSheet}
                    variant="primary"
                    className="w-full text-xs py-2.5 h-auto font-bold"
                  >
                    {submitting ? "Submitting..." : "Submit Quotation for Review"}
                  </Button>
                  {!quote.costingSheet && (
                    <p className="text-[10px] text-center text-amber-600 font-medium">
                      ⓘ Configure costing sheet to enable review submissions.
                    </p>
                  )}
                </div>
              )}

              {quote.status === "SubmittedForApproval" && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-700 space-y-1.5">
                  <div className="font-bold">🔐 Proposal Under Review</div>
                  <div>
                    This quotation has been routed to the Branch Manager queue for review and manual approval.
                  </div>
                </div>
              )}

              {["Approved", "Sent"].includes(quote.status) && (
                <div className="space-y-2 pt-2">
                  <Link href={`/corporate-sales/orders?quotationId=${quote.id}`} className="w-full block">
                    <Button variant="primary" className="w-full text-xs py-2.5 h-auto font-bold">
                      Convert to Won Sales Order
                    </Button>
                  </Link>
                  <p className="text-[10px] text-center text-slate-500 font-medium">
                    ⓘ Provide LPO document references to register win.
                  </p>
                </div>
              )}

              {quote.status === "Accepted" && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-700 space-y-1.5">
                  <div className="font-bold">✓ Quotation Won & Confirmed</div>
                  <div>
                    This proposal was accepted and converted into a confirmed Sales Order successfully.
                  </div>
                </div>
              )}

              {quote.status === "Cancelled" && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-700 space-y-1.5">
                  <div className="font-bold">🚫 Quotation Cancelled</div>
                  <div>
                    This quotation has been cancelled and is no longer active.
                  </div>
                </div>
              )}

              {quote.status !== "Cancelled" && quote.status !== "Accepted" && !hasSalesOrder && (
                <div className="pt-2 border-t border-slate-100">
                  <Button
                    onClick={handleCancelQuotation}
                    disabled={cancelling}
                    variant="outline"
                    className="w-full text-xs py-2 h-auto text-rose-600 border-rose-200 bg-rose-50/10 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Quotation"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
