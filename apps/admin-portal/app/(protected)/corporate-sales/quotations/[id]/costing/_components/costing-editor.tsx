"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  PageHeader,
  Breadcrumbs,
} from "@ims/shared-ui";
import { Home, Briefcase, Compass, Trash2, Plus } from "lucide-react";
import { configureCostingSheetAction, submitQuotationAction } from "../../../../actions";
import { useRouter } from "next/navigation";

interface CostElementMaster {
  id: string;
  name: string;
  status: string;
}

interface CostingEditorProps {
  quote: any;
  costElements: CostElementMaster[];
  actorId: string;
}

export function CostingEditor({ quote, costElements, actorId }: CostingEditorProps) {
  const router = useRouter();

  const costing = quote.costingSheet || {};

  // Resolve initial direct costs dynamically
  const getInitialCosts = () => {
    if (costing.directCosts && costing.directCosts.length > 0) {
      return costing.directCosts.map((dc: any) => ({
        costElementId: dc.costElementId,
        name: dc.costElement?.name || "Unknown Cost",
        amount: Number(dc.amount),
      }));
    }

    const fallback: { costElementId: string; name: string; amount: number }[] = [];
    const staticFields = [
      { name: "Trainer Costs", value: costing.trainerCost },
      { name: "Venue Costs", value: costing.venueCost },
      { name: "Equipment Costs", value: costing.equipmentCost },
      { name: "Printing Costs", value: costing.printingCost },
      { name: "Certificate Costs", value: costing.certificateCost },
      { name: "Travel Costs", value: costing.travelCost },
      { name: "Accommodation Costs", value: costing.accommodationCost },
      { name: "Food Costs", value: costing.foodCost },
      { name: "Vehicle Costs", value: costing.vehicleCost },
    ];

    staticFields.forEach((field) => {
      const element = costElements.find(
        (el) => el.name.toLowerCase() === field.name.toLowerCase() && el.status === "Active"
      );
      if (element && field.value && Number(field.value) > 0) {
        fallback.push({
          costElementId: element.id,
          name: element.name,
          amount: Number(field.value),
        });
      }
    });

    if (fallback.length === 0) {
      return costElements
        .filter((el) => el.status === "Active")
        .map((el) => ({
          costElementId: el.id,
          name: el.name,
          amount: 0,
        }));
    }

    return fallback;
  };

  const [directCosts, setDirectCosts] = useState<{ costElementId: string; name: string; amount: number }[]>(
    getInitialCosts()
  );

  const [selectedToAdd, setSelectedToAdd] = useState("");

  const [administrationCost, setAdministrationCost] = useState(Number(costing.administrationCost || 0));
  const [marketingCost, setMarketingCost] = useState(Number(costing.marketingCost || 0));
  const [miscellaneousCost, setMiscellaneousCost] = useState(Number(costing.miscellaneousCost || 0));

  const [sellingPrice, setSellingPrice] = useState(Number(costing.sellingPrice || quote.subtotal || 0));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isLocked = ["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status);

  // Math equations
  const totalDirectCost = directCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalIndirectCost = administrationCost + marketingCost + miscellaneousCost;
  const totalCost = totalDirectCost + totalIndirectCost;
  const profitAmount = sellingPrice - totalCost;
  const profitPercentage =
    sellingPrice > 0 ? Number((((sellingPrice - totalCost) / sellingPrice) * 100).toFixed(2)) : 0;

  // Filter elements not yet added to local state
  const availableToSelect = costElements.filter(
    (el) => el.status === "Active" && !directCosts.some((dc) => dc.costElementId === el.id)
  );

  const handleAddCostElement = () => {
    if (!selectedToAdd) return;
    const element = costElements.find((el) => el.id === selectedToAdd);
    if (element) {
      setDirectCosts([...directCosts, { costElementId: element.id, name: element.name, amount: 0 }]);
      setSelectedToAdd("");
    }
  };

  const handleRemoveCostElement = (id: string) => {
    setDirectCosts(directCosts.filter((dc) => dc.costElementId !== id));
  };

  const handleAmountChange = (id: string, val: string) => {
    const amountNum = parseFloat(val) || 0;
    setDirectCosts(
      directCosts.map((dc) => (dc.costElementId === id ? { ...dc, amount: amountNum } : dc))
    );
  };

  async function handleSave() {
    setLoading(true);
    setMessage(null);
    try {
      await configureCostingSheetAction(
        {
          quotationId: quote.id,
          // pass old columns as 0 to avoid validation errors
          trainerCost: 0,
          venueCost: 0,
          equipmentCost: 0,
          printingCost: 0,
          certificateCost: 0,
          travelCost: 0,
          accommodationCost: 0,
          foodCost: 0,
          vehicleCost: 0,
          administrationCost,
          marketingCost,
          miscellaneousCost,
          sellingPrice,
          directCosts: directCosts.map((dc) => ({
            costElementId: dc.costElementId,
            amount: dc.amount,
          })),
        },
        actorId
      );
      setMessage("✓ Costing sheet saved successfully!");
      router.refresh();
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message || "Failed to save costing"}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage(null);
    try {
      await submitQuotationAction(quote.id, actorId);
      setMessage("✓ Quotation submitted successfully!");
      router.refresh();
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message || "Failed to submit quotation"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Breadcrumbs */}
      <PageHeader
        title="Costing & Margin Sheet"
        description={`Configure direct and indirect costs for B2B Client: ${quote.corporateAccount.accountName}`}
        backUrl={`/corporate-sales/quotations/${quote.id}`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Status:</span>
            <Badge variant="outline">{quote.status}</Badge>
          </div>
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
                label: "Quotations",
                href: "/corporate-sales/quotations",
              },
              {
                label: quote.quotationNumber,
                href: `/corporate-sales/quotations/${quote.id}`,
                icon: <Compass className="h-3.5 w-3.5" />,
              },
              {
                label: "Costing",
              },
            ]}
          />
        }
      />

      <div className="flex justify-between items-center bg-slate-50 p-4 border rounded shadow-sm">
        <div>
          <span className="text-xs text-slate-500 font-semibold uppercase font-sans">Margin Telemetry</span>
          <div className="flex gap-4 items-baseline mt-1">
            <span className="text-3xl font-extrabold text-slate-900">{profitPercentage.toFixed(2)}%</span>
            <span className="text-sm text-slate-500 font-medium font-sans">Profit Margin</span>
            <span className="text-slate-300">|</span>
            <span className="text-lg font-bold text-slate-700">{profitAmount.toFixed(3)} OMR</span>
            <span className="text-xs text-slate-500 font-sans">Net Profit</span>
          </div>
        </div>
        <div className="flex gap-2">
          {profitPercentage < 25.0 ? (
            <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
              Margin Below Target (Requires Approval)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              Target Margin Achieved (Requires Approval)
            </Badge>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3 bg-slate-100 border rounded text-sm text-slate-700 font-medium">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Direct Costs */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base font-semibold">Direct Cost Elements (OMR)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Dynamic Add Option */}
            {!isLocked && availableToSelect.length > 0 && (
              <div className="flex gap-2 items-end mb-4 border-b pb-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500" htmlFor="addCostElement">
                    Select Cost Element to Add
                  </label>
                  <select
                    id="addCostElement"
                    value={selectedToAdd}
                    onChange={(e) => setSelectedToAdd(e.target.value)}
                    className="mt-1 w-full border p-2 rounded text-sm bg-white"
                  >
                    <option value="">-- Select Element --</option>
                    {availableToSelect.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleAddCostElement} disabled={!selectedToAdd} variant="outline" className="h-9">
                  <Plus className="h-4 w-4 mr-1" /> Add Cost
                </Button>
              </div>
            )}

            {/* List of active direct costs */}
            {directCosts.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No direct cost elements added.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {directCosts.map((item) => (
                  <div key={item.costElementId} className="flex gap-2 items-end border p-3 rounded-lg bg-slate-50/20">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600 block truncate">{item.name}</label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          step="0.001"
                          disabled={isLocked}
                          value={item.amount || ""}
                          onChange={(e) => handleAmountChange(item.costElementId, e.target.value)}
                          placeholder="0.000"
                          className="w-full border p-2 rounded text-sm disabled:bg-slate-50 pr-12 font-medium"
                        />
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-semibold font-mono">
                          OMR
                        </span>
                      </div>
                    </div>
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveCostElement(item.costElementId)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 h-9 w-9 rounded-full shrink-0"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 flex justify-between text-sm font-semibold text-slate-800 font-sans">
              <span>Total Direct Costs:</span>
              <span className="font-mono text-slate-900">{totalDirectCost.toFixed(3)} OMR</span>
            </div>
          </CardContent>
        </Card>

        {/* Indirect Costs & Total Commercials */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 py-4">
              <CardTitle className="text-base font-semibold">Indirect & Selling (OMR)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500" htmlFor="adminCost">
                  Administration Overheads
                </label>
                <div className="relative mt-1">
                  <input
                    id="adminCost"
                    type="number"
                    step="0.001"
                    disabled={isLocked}
                    value={administrationCost || ""}
                    onChange={(e) => setAdministrationCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.000"
                    className="w-full border p-2 rounded text-sm disabled:bg-slate-50 pr-12"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-mono">
                    OMR
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500" htmlFor="marketingCost">
                  Marketing Overheads
                </label>
                <div className="relative mt-1">
                  <input
                    id="marketingCost"
                    type="number"
                    step="0.001"
                    disabled={isLocked}
                    value={marketingCost || ""}
                    onChange={(e) => setMarketingCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.000"
                    className="w-full border p-2 rounded text-sm disabled:bg-slate-50 pr-12"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-mono">
                    OMR
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="text-xs font-bold text-slate-700 font-sans">Total Indirect Costs:</label>
                <div className="text-sm font-semibold text-slate-800 mt-1 font-mono">{totalIndirectCost.toFixed(3)} OMR</div>
              </div>
              <div className="border-t pt-4 bg-slate-50 p-2.5 rounded">
                <label className="text-xs font-bold text-slate-800 font-sans" htmlFor="sellingPrice">
                  Net Selling Price (Excl. VAT)
                </label>
                <div className="relative mt-1">
                  <input
                    id="sellingPrice"
                    type="number"
                    step="0.001"
                    disabled={isLocked}
                    value={sellingPrice || ""}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.000"
                    className="w-full border border-slate-300 p-2 rounded text-sm font-bold disabled:bg-slate-100 pr-12 text-slate-900"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-mono">
                    OMR
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col gap-2">
            {!isLocked && (
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save Costing Sheet"}
              </Button>
            )}
            {quote.costingSheet && !isLocked && (
              <Button onClick={handleSubmit} disabled={loading} variant="secondary" className="w-full">
                {loading ? "Submitting..." : "Submit Quotation"}
              </Button>
            )}
            {isLocked && (
              <div className="text-xs text-center text-slate-400 font-semibold p-4 bg-slate-50 border rounded border-dashed font-sans">
                Quotation is locked ({quote.status})
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
