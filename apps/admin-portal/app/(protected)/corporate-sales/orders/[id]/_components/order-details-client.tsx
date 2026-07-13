"use client";

import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumbs,
  PageHeader,
  SimpleTooltip,
} from "@ims/shared-ui";
import {
  Home,
  Compass,
  Building,
  Calendar,
  FileText,
  Receipt,
  BookOpen,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface OrderDetailsClientProps {
  order: any;
  actorId: string;
}

export function OrderDetailsClient({ order, actorId }: OrderDetailsClientProps) {
  const router = useRouter();

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="B2B Sales Order"
        title={order.salesOrderNumber}
        description="View complete training deliverables, client LPO attachments, costing sheet profitability, and sales contract status."
        backUrl="/corporate-sales/orders"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: "Dashboard",
                href: "/dashboard",
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: "B2B Sales Orders",
                href: "/corporate-sales/orders",
                icon: <Receipt className="h-3.5 w-3.5" />,
              },
              {
                label: order.salesOrderNumber,
                icon: <Compass className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      {/* Top Details & Status Banner */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between border-b p-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600" />
            Overview Specifications
          </CardTitle>
          <div className="flex gap-2">
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Building className="h-3.5 w-3.5" />
                <span>Corporate Client</span>
              </div>
              <p className="font-semibold text-slate-900">{order.corporateAccount.accountName}</p>
              <p className="text-xs text-slate-500 font-mono">Code: {order.corporateAccount.accountCode}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>Order Confirmation Date</span>
              </div>
              <p className="font-semibold text-slate-900">{formatDate(order.orderDate)}</p>
              <p className="text-xs text-slate-500">Wins registered in sales pipeline</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <FileText className="h-3.5 w-3.5" />
                <span>LPO Reference Code</span>
              </div>
              <p className="font-semibold text-slate-900">{order.LpoDocumentId ? "LPO Attached" : "N/A"}</p>
              <p className="text-xs text-slate-500 font-mono truncate">{order.LpoDocumentId || "No reference code"}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Receipt className="h-3.5 w-3.5" />
                <span>Linked Quotation Ref</span>
              </div>
              <p className="font-semibold text-slate-900">{order.quotation?.quotationNumber || "N/A"}</p>
              <p className="text-xs text-slate-500">Date: {formatDate(order.quotation?.quotationDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchased Courses / Deliverables Table */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between border-b p-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Training Deliverables
          </CardTitle>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
            {order.quotation?.lineItems?.length || 0} Programs
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b text-slate-500 font-semibold">
                  <th className="p-4">Course Name & Code</th>
                  <th className="p-4 text-center">Qty (Participants)</th>
                  <th className="p-4 text-right">Unit Price</th>
                  <th className="p-4 text-right">Discount</th>
                  <th className="p-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!order.quotation?.lineItems || order.quotation.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No training program lines specified in this order.
                    </td>
                  </tr>
                ) : (
                  order.quotation.lineItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-medium text-slate-900">
                        <div className="font-semibold">{item.course?.courseName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.course?.courseCode}</div>
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-800">{item.quantity}</td>
                      <td className="p-4 text-right text-slate-600">{Number(item.unitPrice).toFixed(3)} OMR</td>
                      <td className="p-4 text-right text-slate-600">-{Number(item.discountAmount).toFixed(3)} OMR</td>
                      <td className="p-4 text-right font-bold text-indigo-950">{Number(item.lineTotal).toFixed(3)} OMR</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summaries and Margins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quotation Finance Summary */}
        <Card className="shadow-sm border">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Quotation Finance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{Number(order.quotation?.subtotal || 0).toFixed(3)} OMR</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2 text-slate-600">
              <span>Tax (VAT):</span>
              <span className="font-semibold text-slate-800">{Number(order.quotation?.taxAmount || 0).toFixed(3)} OMR</span>
            </div>
            <div className="flex justify-between items-center text-base font-bold text-slate-900">
              <span>Total Booked Revenue:</span>
              <span className="text-indigo-600 text-lg">{Number(order.totalAmount).toFixed(3)} OMR</span>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Metrics Card */}
        <Card className="shadow-sm border">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Sales Profitability Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {order.quotation?.costingSheet ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b pb-2 text-slate-600">
                  <span>Direct Trainer & Venue Costs:</span>
                  <span className="font-semibold text-slate-800">
                    {Number(order.quotation.costingSheet.totalDirectCost || 0).toFixed(3)} OMR
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2 text-slate-600">
                  <span>Net Estimated Profit:</span>
                  <span className="font-semibold text-emerald-600">
                    {Number(order.quotation.costingSheet.profitAmount || 0).toFixed(3)} OMR
                  </span>
                </div>
                <div className="flex justify-between items-center text-base font-bold text-slate-900">
                  <span>Gross Profit Margin:</span>
                  <span className="text-indigo-600 text-lg">
                    {Number(order.quotation.costingSheet.profitPercentage || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No costing sheet elements associated with this order's quotation.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
