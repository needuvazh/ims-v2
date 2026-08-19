"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Calculator, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Button,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
} from "@ims/shared-ui";
import { createQuotationAction } from "../../../actions";

// Helper function to validate if a string is a valid date (accounting for month lengths, leap years, etc.)
const isValidDate = (isoStr: string) => {
  const parts = isoStr.split("-");
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based index
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
};

// Convert YYYY-MM-DD to DD/MM/YYYY
const formatToDisplay = (val: string) => {
  if (!val) return "";
  const parts = val.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
};

// Convert DD/MM/YYYY to YYYY-MM-DD
const parseToIso = (val: string) => {
  if (!val) return "";
  const parts = val.split("/");
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return "";
};

interface DatePickerProps {
  label: string;
  required?: boolean;
  value: string; // "yyyy-mm-dd"
  onChange: (value: string) => void;
  errorText?: string;
  disabled?: boolean;
}

function DatePicker({ label, required, value, onChange, errorText, disabled }: DatePickerProps) {
  const [displayText, setDisplayText] = useState(formatToDisplay(value));
  const [prevLength, setPrevLength] = useState(displayText.length);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayText(formatToDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let text = e.target.value;
    text = text.replace(/[^0-9/]/g, "");

    const isAdding = text.length > prevLength;
    setPrevLength(text.length);

    if (isAdding) {
      if (text.length === 2 && !text.includes("/")) {
        text = text + "/";
      } else if (text.length === 5 && text.split("/").length === 2) {
        text = text + "/";
      }
    }

    if (text.length > 10) {
      text = text.slice(0, 10);
    }

    setDisplayText(text);

    const iso = parseToIso(text);
    if (iso && isValidDate(iso)) {
      onChange(iso);
    }
  };

  const handleBlur = () => {
    const parsed = parseToIso(displayText);
    if (!parsed || !isValidDate(parsed)) {
      setDisplayText(formatToDisplay(value));
    }
  };

  const triggerPicker = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        dateInputRef.current.click();
      }
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        label={label}
        disabled={disabled}
        placeholder="DD/MM/YYYY"
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        required={required}
        errorText={errorText}
        rightIcon={
          <button
            type="button"
            disabled={disabled}
            onClick={triggerPicker}
            className="text-slate-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition-colors"
            title="Open Calendar"
          >
            <Calendar className="h-5 w-5" />
          </button>
        }
      />
      <input
        ref={dateInputRef}
        type="date"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="absolute bottom-3 right-3 w-[1px] h-[1px] overflow-hidden opacity-0 pointer-events-none"
      />
    </div>
  );
}

const quotationFormSchema = z.object({
  corporateSalesLeadId: z.string().uuid("Please select a B2B Lead"),
  corporateAccountId: z.string().uuid("Corporate Account is required"),
  branchId: z.string().uuid("Branch is required"),
  quotationDate: z.string().min(1, "Quotation date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  corporateMarketingVisitId: z.string().uuid().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        courseId: z.string().uuid("Please select a course"),
        quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
        unitPrice: z.coerce.number().positive("Unit price must be greater than 0"),
      })
    )
    .min(1, "At least one line item is required"),
}).refine(
  (data) => {
    const qDate = new Date(data.quotationDate);
    const vDate = new Date(data.validUntil);
    return vDate.getTime() >= qDate.getTime();
  },
  {
    message: "Validity date must be on or after the quotation date",
    path: ["validUntil"],
  }
);

type QuotationFormInput = z.infer<typeof quotationFormSchema>;

interface LeadOption {
  id: string;
  corporateAccountId: string;
  accountName: string;
  branchId: string;
}

interface CourseOption {
  id: string;
  nameEnglish: string;
  code: string;
  basePrice: number;
  hasCorporatePrice: boolean;
}

interface CreateQuotationClientFormProps {
  leads: LeadOption[];
  courses: CourseOption[];
  initialLeadId?: string;
  actorId: string;
  initialVisit?: {
    id: string;
    coursesDiscussed: string | null;
    expectedCandidates: number;
  } | null;
}

export function CreateQuotationClientForm({
  leads,
  courses,
  initialLeadId,
  actorId,
  initialVisit,
}: CreateQuotationClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Default values
  const defaultLead = leads.find((l) => l.id === initialLeadId) || leads[0];

  // Resolve line items from visit if present
  let defaultLineItems = [
    {
      courseId: "",
      quantity: 1,
      unitPrice: 0,
    },
  ];

  if (initialVisit && initialVisit.coursesDiscussed) {
    const discussedNames = initialVisit.coursesDiscussed.split(", ");
    const matched = discussedNames
      .map((name: string) =>
        courses.find((c) => `${c.nameEnglish} (${c.code})` === name)
      )
      .filter((c: any): c is NonNullable<typeof c> => !!c);

    if (matched.length > 0) {
      defaultLineItems = matched.map((c: any) => ({
        courseId: c.id,
        quantity: initialVisit.expectedCandidates || 1,
        unitPrice: c.basePrice > 0 ? c.basePrice : 100,
      }));
    }
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuotationFormInput>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      corporateSalesLeadId: defaultLead?.id || "",
      corporateAccountId: defaultLead?.corporateAccountId || "",
      branchId: defaultLead?.branchId || "",
      quotationDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      corporateMarketingVisitId: initialVisit?.id || null,
      lineItems: defaultLineItems,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const selectedLeadId = watch("corporateSalesLeadId");
  const formLineItems = watch("lineItems") || [];

  // Update account and branch automatically when lead changes
  useEffect(() => {
    if (selectedLeadId) {
      const match = leads.find((l) => l.id === selectedLeadId);
      if (match) {
        setValue("corporateAccountId", match.corporateAccountId);
        setValue("branchId", match.branchId);
      }
    }
  }, [selectedLeadId, leads, setValue]);

  // Intercept PageHeader back button click to redirect to history back
  useEffect(() => {
    const backBtn = document.querySelector('a[aria-label="Go back"]');
    if (backBtn) {
      const handleBack = (e: MouseEvent) => {
        e.preventDefault();
        router.back();
      };
      backBtn.addEventListener("click", handleBack as any);
      return () => {
        backBtn.removeEventListener("click", handleBack as any);
      };
    }
  }, [router]);

  // Real-time price telemetry calculations
  const subtotal = formLineItems.reduce((sum, item) => {
    const qty = Number(item?.quantity || 0);
    const price = Number(item?.unitPrice || 0);
    return sum + qty * price;
  }, 0);

  const vat = subtotal * 0.05;
  const totalAmount = subtotal + vat;

  async function onSubmit(data: QuotationFormInput) {
    setLoading(true);
    setServerError(null);

    // Validate if any course does not have Corporate Pricing setup
    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];
      const match = courses.find((c) => c.id === item.courseId);
      if (match && !match.hasCorporatePrice) {
        setServerError(`Course "${match.nameEnglish}" does not have a Corporate Price setup. Please configure the corporate price in the Course Catalog first.`);
        toast.error("Missing Corporate Course Pricing");
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        corporateAccountId: data.corporateAccountId,
        corporateSalesLeadId: data.corporateSalesLeadId,
        quotationDate: new Date(data.quotationDate),
        validUntil: new Date(data.validUntil),
        branchId: data.branchId,
        corporateMarketingVisitId: data.corporateMarketingVisitId || null,
        lineItems: data.lineItems.map((item) => ({
          courseId: item.courseId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const result = await createQuotationAction(payload, actorId);
      toast.success("Quotation generated successfully!");
      router.push(`/corporate-sales/quotations/${result.id}/costing`);
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || "Failed to generate B2B quotation");
      toast.error("Error creating quotation");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="text-sm font-semibold p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 max-w-5xl mx-auto animate-in fade-in duration-200">
          ✗ {serverError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 max-w-5xl mx-auto">
        {/* Left Section: B2B Opportunity Parameters (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-sm sm:p-6 space-y-5"
          >
            {/* Top gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-800 text-base">
                Quotation Proposal Context
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <FormLabel required>Linked Opportunity / Lead</FormLabel>
                <FormControl>
                  <Controller
                    name="corporateSalesLeadId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        disabled
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        options={[
                          { value: "", label: "-- Select Lead --" },
                          ...leads.map((l) => ({
                            value: l.id,
                            label: `${l.accountName} (Lead: ${l.id.slice(0, 8)})`,
                          })),
                        ]}
                      />
                    )}
                  />
                </FormControl>
                <FormError>{errors.corporateSalesLeadId?.message}</FormError>
              </FormField>

              <FormField>
                <FormLabel>Corporate Client Account</FormLabel>
                <FormControl>
                  <Select
                    disabled
                    value={watch("corporateAccountId")}
                    options={[
                      { value: "", label: "-- Auto-derived --" },
                      ...leads.map((l) => ({
                        value: l.corporateAccountId,
                        label: l.accountName,
                      })),
                    ]}
                  />
                </FormControl>
              </FormField>

              <Controller
                name="quotationDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Quotation Date"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    errorText={errors.quotationDate?.message}
                  />
                )}
              />

              <Controller
                name="validUntil"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Valid Until"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    errorText={errors.validUntil?.message}
                  />
                )}
              />
            </div>
          </motion.div>

          {/* Line Items Dynamic Area */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-sm sm:p-6 space-y-4"
          >
            {/* Top gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-base">
                Course Quotation Lines
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ courseId: "", quantity: 1, unitPrice: 0 })}
                className="text-xs hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="grid gap-3 items-end sm:grid-cols-[3fr_1.2fr_1.5fr_0.5fr] border-b border-slate-100/50 pb-3 overflow-hidden"
                  >
                    <FormField>
                      <FormLabel required={index === 0}>Course / Training Program</FormLabel>
                      <FormControl>
                        <Controller
                          name={`lineItems.${index}.courseId` as const}
                          control={control}
                          render={({ field: selectField }) => (
                            <Select
                              value={selectField.value}
                              onChange={(e) => {
                                const selectedCourseId = e.target.value;
                                selectField.onChange(selectedCourseId);
                                const match = courses.find((c) => c.id === selectedCourseId);
                                if (match) {
                                  setValue(
                                    `lineItems.${index}.unitPrice`,
                                    match.basePrice > 0 ? match.basePrice : 100
                                  );
                                }
                              }}
                              options={[
                                { value: "", label: "-- Choose Course --" },
                                ...courses.map((c) => ({
                                  value: c.id,
                                  label: `${c.nameEnglish} (${c.code || "No Code"})`,
                                })),
                              ]}
                            />
                          )}
                        />
                      </FormControl>
                      <FormError>
                        {(() => {
                          const val = watch(`lineItems.${index}.courseId`);
                          const match = courses.find((c) => c.id === val);
                          if (match && !match.hasCorporatePrice) {
                            return "✗ No Corporate Price setup found. Please configure in Course Catalog first.";
                          }
                          return errors.lineItems?.[index]?.courseId?.message;
                        })()}
                      </FormError>
                    </FormField>

                    <FormField>
                      <FormLabel required={index === 0}>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 5"
                          {...register(`lineItems.${index}.quantity` as const, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormControl>
                      <FormError>
                        {errors.lineItems?.[index]?.quantity?.message}
                      </FormError>
                    </FormField>

                    <FormField>
                      <FormLabel required={index === 0}>Unit Price (OMR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="e.g. 150"
                          {...register(`lineItems.${index}.unitPrice` as const, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormControl>
                      <FormError>
                        {errors.lineItems?.[index]?.unitPrice?.message}
                      </FormError>
                    </FormField>

                    <div className="flex justify-center pb-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 border-slate-200 h-9 w-9 p-0 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <FormError>{errors.lineItems?.root?.message}</FormError>
          </motion.div>
        </div>

        {/* Right Section: Totals & Submission Telemetry (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-sm sm:p-6 space-y-5"
          >
            {/* Top gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
            
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calculator className="h-5 w-5 text-emerald-600 animate-pulse" />
              <h3 className="font-semibold text-slate-800 text-base">
                Price Telemetry
              </h3>
            </div>

            <div className="space-y-3.5 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal Value:</span>
                <span className="font-semibold text-slate-800">
                  {subtotal.toFixed(3)} OMR
                </span>
              </div>
              <div className="flex justify-between">
                <span>VAT (5%):</span>
                <span className="font-semibold text-slate-800">
                  {vat.toFixed(3)} OMR
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3.5 flex justify-between font-bold text-base">
                <span className="text-slate-800">Grand Total:</span>
                <span className="text-slate-900 font-extrabold">
                  {totalAmount.toFixed(3)} OMR
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 flex flex-col gap-2">
              <Button type="submit" disabled={loading} variant="primary" className="w-full">
                {loading ? "Generating..." : "Generate Quotation Proposal"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full hover:bg-slate-50"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </form>
  );
}

