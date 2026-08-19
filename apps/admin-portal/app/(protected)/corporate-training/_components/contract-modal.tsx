"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from "@ims/shared-ui";
import { CreateCorporateContractSchema, CreateCorporateContractInput } from "../schemas";
import { createCorporateContractAction, updateCorporateContractAction } from "../actions";

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  corporateAccountId: string;
  actorId: string;
  contract?: any;
}

export function ContractModal({
  isOpen,
  onClose,
  corporateAccountId,
  actorId,
  contract,
}: ContractModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateCorporateContractInput>({
    resolver: zodResolver(CreateCorporateContractSchema),
    defaultValues: {
      contractNumber: "",
      contractValue: 0,
      startDate: "",
      endDate: "",
      billingModel: "FIXED_CONTRACT",
      paymentTerms: "",
      status: "Active",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (contract) {
        reset({
          contractNumber: contract.contractNumber,
          contractValue: Number(contract.contractValue || 0),
          startDate: contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "",
          endDate: contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "",
          billingModel: contract.billingModel,
          paymentTerms: contract.paymentTerms,
          status: contract.status,
        });
      } else {
        reset({
          contractNumber: "",
          contractValue: 0,
          startDate: "",
          endDate: "",
          billingModel: "FIXED_CONTRACT",
          paymentTerms: "",
          status: "Active",
        });
      }
    }
  }, [contract, reset, isOpen]);

  if (!isOpen) return null;

  async function onSubmit(data: CreateCorporateContractInput) {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (contract) {
        await updateCorporateContractAction(contract.id, data, actorId);
      } else {
        await createCorporateContractAction(corporateAccountId, data, actorId);
      }
      reset();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save contract.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800 text-lg">
            {contract ? "Edit Training Contract" : "Register Training Contract"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="text-sm font-semibold p-3 bg-red-50 text-red-600 rounded-lg border border-red-100">
              ✗ {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField>
              <FormLabel required>Contract Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. CON-2026-0001"
                  {...register("contractNumber")}
                />
              </FormControl>
              <FormError>{errors.contractNumber?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel required>Contract Value (OMR)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  {...register("contractValue")}
                />
              </FormControl>
              <FormError>{errors.contractValue?.message}</FormError>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField>
              <FormLabel required>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...register("startDate")} />
              </FormControl>
              <FormError>{errors.startDate?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel required>End Date</FormLabel>
              <FormControl>
                <Input type="date" {...register("endDate")} />
              </FormControl>
              <FormError>{errors.endDate?.message}</FormError>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField>
              <FormLabel required>Billing Model</FormLabel>
              <FormControl>
                <Controller
                  name="billingModel"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      options={[
                        { value: "FIXED_CONTRACT", label: "Fixed Lump Sum" },
                        { value: "PER_STUDENT", label: "Per Nominated Student" },
                        { value: "PER_BATCH", label: "Per Batch Allocation" },
                        { value: "PER_HOUR", label: "Per Hour Training" },
                      ]}
                    />
                  )}
                />
              </FormControl>
              <FormError>{errors.billingModel?.message}</FormError>
            </FormField>

            <FormField>
              <FormLabel required>Contract Status</FormLabel>
              <FormControl>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      options={[
                        { value: "Active", label: "Active / Signed" },
                        { value: "Draft", label: "Draft Proposal" },
                      ]}
                    />
                  )}
                />
              </FormControl>
              <FormError>{errors.status?.message}</FormError>
            </FormField>
          </div>

          <FormField>
            <FormLabel required>Payment Terms & Schedule</FormLabel>
            <FormControl>
              <textarea
                placeholder="e.g. 50% advance on sign-off, 50% on batch completion."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                {...register("paymentTerms")}
              />
            </FormControl>
            <FormError>{errors.paymentTerms?.message}</FormError>
          </FormField>

          {/* Footer */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Contract"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
