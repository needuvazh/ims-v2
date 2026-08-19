"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Search } from "lucide-react";
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from "@ims/shared-ui";
import {
  addCorporateContactAction,
  updateCorporateContactAction,
} from "../actions";
import {
  CreateCorporateContactSchema,
  CreateCorporateContactInput,
  UpdateCorporateContactSchema,
  UpdateCorporateContactInput,
} from "../schemas";

interface CoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  corporateAccountId: string;
  actorId: string;
  contact?: any; // If provided, we are in Edit mode
}

export function CoordinatorModal({
  isOpen,
  onClose,
  corporateAccountId,
  actorId,
  contact,
}: CoordinatorModalProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!contact;

  // React Hook Form for Create Mode
  const createForm = useForm<CreateCorporateContactInput>({
    resolver: zodResolver(CreateCorporateContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nationalId: "",
      email: "",
      phone: "",
      designation: "",
      department: "",
      isPrimary: false,
      portalAccessEnabled: false,
    },
  });

  // React Hook Form for Edit Mode
  const editForm = useForm<UpdateCorporateContactInput>({
    resolver: zodResolver(UpdateCorporateContactSchema),
    defaultValues: {
      email: "",
      phone: "",
      designation: "",
      department: "",
      isPrimary: false,
      portalAccessEnabled: false,
      status: "Active",
    },
  });

  // Populate form defaults if editing
  useEffect(() => {
    if (contact) {
      editForm.reset({
        email: contact.email || "",
        phone: contact.phone || "",
        designation: contact.designation || "",
        department: contact.department || "",
        isPrimary: contact.isPrimary || false,
        portalAccessEnabled: contact.portalAccessEnabled || false,
        status: contact.status || "Active",
      });
    } else {
      createForm.reset({
        firstName: "",
        lastName: "",
        nationalId: "",
        email: "",
        phone: "",
        designation: "",
        department: "",
        isPrimary: false,
        portalAccessEnabled: false,
      });
    }
  }, [contact, isOpen]);

  if (!isOpen) return null;

  async function onFormSubmit(data: any) {
    setLoading(true);
    setServerError(null);

    try {
      if (isEdit) {
        await updateCorporateContactAction(contact.id, data, actorId);
      } else {
        await addCorporateContactAction(corporateAccountId, data, actorId);
      }
      onClose();
    } catch (err: any) {
      setServerError(err.message || "Failed to save contact coordinator.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800 text-lg">
            {isEdit ? "Edit Coordinator Details" : "Add Client Coordinator"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content / Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {serverError && (
            <div className="text-sm font-semibold p-3 bg-red-50 text-red-600 rounded-lg border border-red-100">
              ✗ {serverError}
            </div>
          )}

          <form
            onSubmit={
              isEdit
                ? editForm.handleSubmit(onFormSubmit)
                : createForm.handleSubmit(onFormSubmit)
            }
            className="space-y-4"
            id="coordinator-form"
          >
            {/* National ID (Create only) */}
            {!isEdit ? (
              <FormField>
                <FormLabel required>National ID / Civil Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 123456789"
                    {...createForm.register("nationalId")}
                  />
                </FormControl>
                <FormError>{createForm.formState.errors.nationalId?.message}</FormError>
              </FormField>
            ) : (
              <FormField>
                <FormLabel>National ID (Immutable)</FormLabel>
                <FormControl>
                  <Input
                    disabled
                    value={contact.person?.nationalId || "N/A"}
                  />
                </FormControl>
              </FormField>
            )}

            {/* Names (Create only) */}
            {!isEdit && (
              <div className="grid grid-cols-2 gap-4">
                <FormField>
                  <FormLabel required>First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Fatma"
                      {...createForm.register("firstName")}
                    />
                  </FormControl>
                  <FormError>{createForm.formState.errors.firstName?.message}</FormError>
                </FormField>

                <FormField>
                  <FormLabel required>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Al-Riyami"
                      {...createForm.register("lastName")}
                    />
                  </FormControl>
                  <FormError>{createForm.formState.errors.lastName?.message}</FormError>
                </FormField>
              </div>
            )}

            {/* Contact channels */}
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Email Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. fatma@alsaud.om"
                    {...(isEdit ? editForm.register("email") : createForm.register("email"))}
                  />
                </FormControl>
                <FormError>
                  {isEdit
                    ? editForm.formState.errors.email?.message
                    : createForm.formState.errors.email?.message}
                </FormError>
              </FormField>

              <FormField>
                <FormLabel required>Mobile Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. +968 9333 4444"
                    {...(isEdit ? editForm.register("phone") : createForm.register("phone"))}
                  />
                </FormControl>
                <FormError>
                  {isEdit
                    ? editForm.formState.errors.phone?.message
                    : createForm.formState.errors.phone?.message}
                </FormError>
              </FormField>
            </div>

            {/* Job Title & Department */}
            <div className="grid grid-cols-2 gap-4">
              <FormField>
                <FormLabel required>Designation / Job Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. HR Manager"
                    {...(isEdit
                      ? editForm.register("designation")
                      : createForm.register("designation"))}
                  />
                </FormControl>
                <FormError>
                  {isEdit
                    ? editForm.formState.errors.designation?.message
                    : createForm.formState.errors.designation?.message}
                </FormError>
              </FormField>

              <FormField>
                <FormLabel required>Department</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Human Resources"
                    {...(isEdit
                      ? editForm.register("department")
                      : createForm.register("department"))}
                  />
                </FormControl>
                <FormError>
                  {isEdit
                    ? editForm.formState.errors.department?.message
                    : createForm.formState.errors.department?.message}
                </FormError>
              </FormField>
            </div>

            {/* Checkbox triggers */}
            <div className="bg-slate-50/50 p-4 rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-semibold text-slate-800">
                    Primary Coordinator
                  </FormLabel>
                  <span className="text-xs text-slate-500 block">
                    Mark as the lead operational contact point.
                  </span>
                </div>
                {isEdit ? (
                  <Controller
                    name="isPrimary"
                    control={editForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? "true" : "false"}
                        onChange={(e) => field.onChange(e.target.value === "true")}
                        className="w-32"
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="isPrimary"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? "true" : "false"}
                        onChange={(e) => field.onChange(e.target.value === "true")}
                        className="w-32"
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                      />
                    )}
                  />
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-semibold text-slate-800">
                    Client Portal Access
                  </FormLabel>
                  <span className="text-xs text-slate-500 block">
                    Allow login to view program progress.
                  </span>
                </div>
                {isEdit ? (
                  <Controller
                    name="portalAccessEnabled"
                    control={editForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? "true" : "false"}
                        onChange={(e) => field.onChange(e.target.value === "true")}
                        className="w-32"
                        options={[
                          { value: "false", label: "Disabled" },
                          { value: "true", label: "Enabled" },
                        ]}
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="portalAccessEnabled"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? "true" : "false"}
                        onChange={(e) => field.onChange(e.target.value === "true")}
                        className="w-32"
                        options={[
                          { value: "false", label: "Disabled" },
                          { value: "true", label: "Enabled" },
                        ]}
                      />
                    )}
                  />
                )}
              </div>

              {isEdit && (
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-semibold text-slate-800">
                      Contact Status
                    </FormLabel>
                  </div>
                  <Controller
                    name="status"
                    control={editForm.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-32"
                        options={[
                          { value: "Active", label: "Active" },
                          { value: "Inactive", label: "Inactive" },
                        ]}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="coordinator-form"
            variant="primary"
            disabled={loading}
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
          </Button>
        </div>
      </div>
    </div>
  );
}
