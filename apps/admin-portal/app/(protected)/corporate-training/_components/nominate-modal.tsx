"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Button,
  Input,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from "@ims/shared-ui";
import { nominateCorporateParticipantAction } from "../actions";
import {
  NominateCorporateParticipantSchema,
  NominateCorporateParticipantInput,
} from "../schemas";

interface NominateModalProps {
  isOpen: boolean;
  onClose: () => void;
  corporateAccountId: string;
  actorId: string;
}

export function NominateModal({
  isOpen,
  onClose,
  corporateAccountId,
  actorId,
}: NominateModalProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NominateCorporateParticipantInput>({
    resolver: zodResolver(NominateCorporateParticipantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nationalId: "",
      email: "",
      phone: "",
      employeeCode: "",
      designation: "",
      department: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        firstName: "",
        lastName: "",
        nationalId: "",
        email: "",
        phone: "",
        employeeCode: "",
        designation: "",
        department: "",
      });
      setServerError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function onSubmit(data: NominateCorporateParticipantInput) {
    setLoading(true);
    setServerError(null);

    try {
      await nominateCorporateParticipantAction(corporateAccountId, data, actorId);
      onClose();
    } catch (err: any) {
      setServerError(err.message || "Failed to nominate B2B participant.");
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
            Nominate B2B Candidate
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {serverError && (
            <div className="text-sm font-semibold p-3 bg-red-50 text-red-600 rounded-lg border border-red-100">
              ✗ {serverError}
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            id="nominate-form"
          >
            <FormField>
              <FormLabel required>National ID / Civil Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. NID-445566" {...register("nationalId")} />
              </FormControl>
              <FormError>{errors.nationalId?.message}</FormError>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Sara" {...register("firstName")} />
                </FormControl>
                <FormError>{errors.firstName?.message}</FormError>
              </FormField>

              <FormField>
                <FormLabel required>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Al-Hadi" {...register("lastName")} />
                </FormControl>
                <FormError>{errors.lastName?.message}</FormError>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. sara@alsaud.om" {...register("email")} />
                </FormControl>
                <FormError>{errors.email?.message}</FormError>
              </FormField>

              <FormField>
                <FormLabel required>Mobile Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. +968 9456 7890" {...register("phone")} />
                </FormControl>
                <FormError>{errors.phone?.message}</FormError>
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField className="col-span-1">
                <FormLabel>Emp Code</FormLabel>
                <FormControl>
                  <Input placeholder="EMP-103" {...register("employeeCode")} />
                </FormControl>
                <FormError>{errors.employeeCode?.message}</FormError>
              </FormField>

              <FormField className="col-span-1">
                <FormLabel>Designation</FormLabel>
                <FormControl>
                  <Input placeholder="Developer" {...register("designation")} />
                </FormControl>
                <FormError>{errors.designation?.message}</FormError>
              </FormField>

              <FormField className="col-span-1">
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="IT" {...register("department")} />
                </FormControl>
                <FormError>{errors.department?.message}</FormError>
              </FormField>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="nominate-form" variant="primary" disabled={loading}>
            {loading ? "Nominating..." : "Nominate Candidate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
