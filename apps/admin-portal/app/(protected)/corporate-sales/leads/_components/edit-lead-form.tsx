"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Compass } from "lucide-react";
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from "@ims/shared-ui";
import { updateLeadAction } from "../../actions";

// Zod Schema for B2B Corporate Lead edit validation
const editB2BLeadSchema = z.object({
  stage: z.string().min(1, "Stage selection is required"),
  salesOwnerId: z.string().uuid("Please select an Assigned Sales Executive"),
  branchId: z.string().uuid("Please select a Target Branch"),
  expectedValue: z.coerce.number({
    required_error: "Expected deal value is required",
    invalid_type_error: "Expected deal value must be a number",
  }).min(0, "Expected value must be a positive number"),
  expectedCloseDate: z.string().min(1, "Expected close date is required").refine(
    (val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date.getTime() >= today.getTime();
    },
    {
      message: "Expected close date cannot be in the past",
    }
  ),
});

type EditB2BLeadInput = z.infer<typeof editB2BLeadSchema>;

interface EditLeadFormProps {
  lead: any;
  branches: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  actorId: string;
}

export function EditLeadForm({
  lead,
  branches,
  users,
  actorId,
}: EditLeadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditB2BLeadInput>({
    resolver: zodResolver(editB2BLeadSchema),
    defaultValues: {
      stage: lead.stage,
      salesOwnerId: lead.salesOwnerId,
      branchId: lead.branchId,
      expectedValue: Number(lead.expectedValue),
      expectedCloseDate: new Date(lead.expectedCloseDate)
        .toISOString()
        .split("T")[0],
    },
  });

  async function onSubmit(data: EditB2BLeadInput) {
    setLoading(true);
    setServerError(null);

    try {
      await updateLeadAction(
        lead.id,
        {
          stage: data.stage,
          expectedValue: data.expectedValue,
          expectedCloseDate: new Date(data.expectedCloseDate),
          branchId: data.branchId,
          salesOwnerId: data.salesOwnerId,
        },
        actorId
      );
      router.push("/corporate-sales/leads");
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || "Failed to update corporate lead");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="text-sm font-semibold p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 max-w-4xl mx-auto animate-in fade-in duration-200">
          ✗ {serverError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl mx-auto">
        {/* Left Column: B2B Corporate Account Details */}
        <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                Corporate Account Details
              </h3>
            </div>
          </div>

          <FormField>
            <FormLabel>Account Name</FormLabel>
            <FormControl>
              <Input
                disabled
                value={lead.corporateAccount.accountName}
              />
            </FormControl>
          </FormField>

          <FormField>
            <FormLabel>Account Code</FormLabel>
            <FormControl>
              <Input
                disabled
                value={lead.corporateAccount.accountCode}
              />
            </FormControl>
          </FormField>

          <FormField>
            <FormLabel required>Pipeline Stage</FormLabel>
            <FormControl>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={[
                      { value: "New", label: "New" },
                      { value: "VisitPlanned", label: "Visit Planned" },
                      { value: "VisitCompleted", label: "Visit Completed" },
                      { value: "QuotationSent", label: "Quotation Sent" },
                      { value: "Confirmed", label: "Confirmed" },
                      { value: "Lost", label: "Lost" },
                    ]}
                  />
                )}
              />
            </FormControl>
            <FormError>{errors.stage?.message}</FormError>
          </FormField>
        </div>

        {/* Right Column: Lead Pipeline & Value */}
        <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                Lead Pipeline & Assignment
              </h3>
            </div>
          </div>

          <FormField>
            <FormLabel required>Assigned Executive (Sales Owner)</FormLabel>
            <FormControl>
              <Controller
                name="salesOwnerId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={users.map((u) => ({ value: u.id, label: u.name }))}
                  />
                )}
              />
            </FormControl>
            <FormError>{errors.salesOwnerId?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Target Branch</FormLabel>
            <FormControl>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                )}
              />
            </FormControl>
            <FormError>{errors.branchId?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Expected Deal Value (OMR)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.001"
                placeholder="e.g. 2500.750"
                {...register("expectedValue")}
              />
            </FormControl>
            <FormError>{errors.expectedValue?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Expected Close Date</FormLabel>
            <FormControl>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                {...register("expectedCloseDate")}
              />
            </FormControl>
            <FormError>{errors.expectedCloseDate?.message}</FormError>
          </FormField>
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex justify-end gap-3 max-w-4xl mx-auto border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/corporate-sales/leads")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} variant="primary">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
