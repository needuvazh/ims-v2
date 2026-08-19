"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ShieldAlert } from "lucide-react";
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from "@ims/shared-ui";
import { createCorporateAccountAction } from "../actions";
import { CreateCorporateAccountInput, CreateCorporateAccountSchema } from "../schemas";

interface CreateAccountClientFormProps {
  branches: Array<{ id: string; name: string }>;
  actorId: string;
}

export function CreateAccountClientForm({
  branches,
  actorId,
}: CreateAccountClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateCorporateAccountInput>({
    resolver: zodResolver(CreateCorporateAccountSchema),
    defaultValues: {
      accountName: "",
      accountCode: "",
      branchId: branches[0]?.id || "",
      creditLimit: 5000.0,
      blockOnCreditLimit: true,
      billingCycle: "Monthly",
      status: "Active",
    },
  });

  async function onSubmit(data: CreateCorporateAccountInput) {
    setLoading(true);
    setServerError(null);

    try {
      await createCorporateAccountAction(data, actorId);
      router.push("/corporate-training/accounts");
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || "Failed to register corporate account");
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
        {/* Left Column: Account Profile Details */}
        <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                Corporate Client Details
              </h3>
            </div>
          </div>

          <FormField>
            <FormLabel required>Company Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Al Saud Solutions LLC"
                {...register("accountName")}
              />
            </FormControl>
            <FormError>{errors.accountName?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Account Code</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. ACC-ALSAUD"
                {...register("accountCode")}
              />
            </FormControl>
            <FormError>{errors.accountCode?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Target Scope Branch</FormLabel>
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
        </div>

        {/* Right Column: Credit Controls & Rules */}
        <div className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                Credit & Risk Control Policies
              </h3>
            </div>
          </div>

          <FormField>
            <FormLabel required>Allocated Credit Limit (OMR)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.001"
                placeholder="e.g. 5000.000"
                {...register("creditLimit")}
              />
            </FormControl>
            <FormError>{errors.creditLimit?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Block On Credit Exceedance?</FormLabel>
            <FormControl>
              <Controller
                name="blockOnCreditLimit"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? "true" : "false"}
                    onChange={(e) => field.onChange(e.target.value === "true")}
                    options={[
                      { value: "true", label: "Yes - Block B2B registrations" },
                      { value: "false", label: "No - Allow with warnings" },
                    ]}
                  />
                )}
              />
            </FormControl>
            <FormError>{errors.blockOnCreditLimit?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Billing Cycle</FormLabel>
            <FormControl>
              <Controller
                name="billingCycle"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={[
                      { value: "Monthly", label: "Monthly Billing" },
                      { value: "Quarterly", label: "Quarterly Billing" },
                      { value: "Immediate", label: "Immediate on Enrollment" },
                    ]}
                  />
                )}
              />
            </FormControl>
            <FormError>{errors.billingCycle?.message}</FormError>
          </FormField>

          <FormField>
            <FormLabel required>Account Status</FormLabel>
            <FormControl>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Suspended", label: "Suspended" },
                    ]}
                  />
                )}
              />
            </FormControl>
            <FormError>{errors.status?.message}</FormError>
          </FormField>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex justify-end gap-3 max-w-4xl mx-auto border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/corporate-training/accounts")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} variant="primary">
          {loading ? "Registering..." : "Register Account"}
        </Button>
      </div>
    </form>
  );
}
