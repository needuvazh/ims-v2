'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Plus, Trash2, Calculator } from 'lucide-react';
import {
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Button,
  Alert,
} from '@ims/shared-ui';

const invoiceFormSchema = z.object({
  invoiceType: z.enum([
    'StudentInvoice',
    'CorporateInvoice',
    'AdvanceInvoice',
    'MilestoneInvoice',
    'FinalInvoice',
    'RefundInvoice'
  ]),
  studentProfileId: z.string().nullable().optional(),
  corporateAccountId: z.string().nullable().optional(),
  enrollmentId: z.string().nullable().optional(),
  branchId: z.string().uuid('Please select a branch'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().length(3),
  lineItems: z.array(
    z.object({
      enrollmentId: z.string().uuid().nullable().optional(),
      courseId: z.string().uuid().nullable().optional(),
      sourceBranchId: z.string().uuid(),
      descriptionEnglish: z.string().min(1, 'Description is required'),
      quantity: z.coerce.number().positive('Quantity must be greater than 0'),
      unitPrice: z.coerce.number().nonnegative('Unit price must be positive'),
      discountAmount: z.coerce.number().nonnegative('Discount must be positive'),
      taxRate: z.coerce.number().nonnegative()
    })
  ).min(1, 'At least one line item is required')
}).refine((data) => {
  if (data.invoiceType === 'StudentInvoice') {
    return !!data.studentProfileId && data.studentProfileId.trim() !== '';
  }
  return true;
}, {
  message: 'Student is required for Student Invoices',
  path: ['studentProfileId']
}).refine((data) => {
  if (data.invoiceType === 'CorporateInvoice') {
    return !!data.corporateAccountId && data.corporateAccountId.trim() !== '';
  }
  return true;
}, {
  message: 'Corporate Account is required for Corporate Invoices',
  path: ['corporateAccountId']
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  branches: Array<{ id: string; name: string }>;
  students: Array<{ id: string; name: string; personId: string }>;
  corporateAccounts: Array<{ id: string; name: string }>;
  enrollments: Array<{
    id: string;
    enrollmentNumber: string;
    studentProfileId: string;
    courseId: string;
    resolvedPrice: number;
    resolvedDiscount: number;
    course?: { nameEnglish: string } | null;
  }>;
  onSubmitAction: (data: any) => Promise<any>;
}

export function InvoiceForm({
  branches,
  students,
  corporateAccounts,
  enrollments,
  onSubmitAction,
}: InvoiceFormProps) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);
  const due = defaultDueDate.toISOString().split('T')[0];

  const defaultBranchId = branches[0]?.id || '';

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceType: 'StudentInvoice',
      studentProfileId: '',
      corporateAccountId: '',
      enrollmentId: '',
      branchId: defaultBranchId,
      invoiceDate: today,
      dueDate: due,
      currency: 'OMR',
      lineItems: [
        {
          enrollmentId: null,
          courseId: null,
          sourceBranchId: defaultBranchId,
          descriptionEnglish: '',
          quantity: 1,
          unitPrice: 0,
          discountAmount: 0,
          taxRate: 0.05
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  });

  const watchInvoiceType = watch('invoiceType');
  const watchStudentId = watch('studentProfileId');
  const watchBranchId = watch('branchId');
  const watchLineItems = watch('lineItems');

  // Filter enrollments based on selected student
  const filteredEnrollments = enrollments.filter(
    (e) => e.studentProfileId === watchStudentId
  );

  // Sync line item source branch id when main branch changes
  useEffect(() => {
    if (watchBranchId) {
      watchLineItems.forEach((_, index) => {
        setValue(`lineItems.${index}.sourceBranchId`, watchBranchId);
      });
    }
  }, [watchBranchId, setValue]);

  // Interactively compute totals
  const subtotal = watchLineItems.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    return sum + (q * p);
  }, 0);

  const totalDiscount = watchLineItems.reduce((sum, item) => {
    return sum + (Number(item.discountAmount) || 0);
  }, 0);

  const totalTax = watchLineItems.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    const d = Number(item.discountAmount) || 0;
    const r = Number(item.taxRate) || 0.05;
    const taxable = Math.max(0, (q * p) - d);
    return sum + (taxable * r);
  }, 0);

  const totalAmount = Math.max(0, subtotal - totalDiscount) + totalTax;

  const handleEnrollmentSelect = (enrollmentId: string) => {
    if (!enrollmentId) return;
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (enrollment) {
      setValue('lineItems.0.descriptionEnglish', `Course Fee: ${enrollment.course?.nameEnglish || 'Course'} (${enrollment.enrollmentNumber})`);
      setValue('lineItems.0.unitPrice', Number(enrollment.resolvedPrice));
      setValue('lineItems.0.discountAmount', Number(enrollment.resolvedDiscount));
      setValue('lineItems.0.quantity', 1);
      setValue('lineItems.0.enrollmentId', enrollment.id);
      setValue('lineItems.0.courseId', enrollment.courseId);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setErrorState(null);

    const payload = {
      ...data,
      studentProfileId: data.invoiceType === 'StudentInvoice' && data.studentProfileId !== '' ? data.studentProfileId : null,
      corporateAccountId: data.invoiceType === 'CorporateInvoice' && data.corporateAccountId !== '' ? data.corporateAccountId : null,
      enrollmentId: data.invoiceType === 'StudentInvoice' && data.enrollmentId !== '' ? data.enrollmentId : null,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      lineItems: data.lineItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        taxRate: Number(item.taxRate)
      }))
    };

    const res = await onSubmitAction(payload);
    if (res && res.success) {
      toast.success(`Invoice manual creation success: ${res.data.invoiceNumber}`);
      router.push('/finance/invoices');
    } else {
      setErrorState(res?.error || 'Failed to create invoice');
      toast.error('Invoice creation failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto pb-12">
      {errorState && (
        <Alert variant="error" title="Submission Error">
          {errorState}
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Settings Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" /> Invoice Settings
          </h4>

          <FormField>
            <FormLabel>Invoice Category Type</FormLabel>
            <FormControl>
              <Controller
                name="invoiceType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setValue('studentProfileId', '');
                      setValue('corporateAccountId', '');
                      setValue('enrollmentId', '');
                    }}
                    options={[
                      { value: 'StudentInvoice', label: 'Student Invoice (B2C)' },
                      { value: 'CorporateInvoice', label: 'Corporate Client Invoice (B2B)' },
                      { value: 'AdvanceInvoice', label: 'Advance Payment Invoice' },
                      { value: 'MilestoneInvoice', label: 'Milestone Progress Invoice' },
                      { value: 'FinalInvoice', label: 'Final Invoice' }
                    ]}
                  />
                )}
              />
            </FormControl>
            {errors.invoiceType && <FormError>{errors.invoiceType.message}</FormError>}
          </FormField>

          <FormField>
            <FormLabel>Branch Location</FormLabel>
            <FormControl>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Select
                    placeholder="Select branch"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  />
                )}
              />
            </FormControl>
            {errors.branchId && <FormError>{errors.branchId.message}</FormError>}
          </FormField>

          {watchInvoiceType === 'StudentInvoice' && (
            <>
              <FormField>
                <FormLabel>Select Student</FormLabel>
                <FormControl>
                  <Controller
                    name="studentProfileId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        placeholder="-- Choose Student --"
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setValue('enrollmentId', '');
                        }}
                        options={students.map((s) => ({ value: s.id, label: s.name }))}
                      />
                    )}
                  />
                </FormControl>
                {errors.studentProfileId && <FormError>{errors.studentProfileId.message}</FormError>}
              </FormField>

              {watchStudentId && (
                <FormField>
                  <FormLabel>Link Student Enrollment (Optional)</FormLabel>
                  <FormControl>
                    <Controller
                      name="enrollmentId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          placeholder="-- Do Not Link (General Invoice) --"
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleEnrollmentSelect(e.target.value);
                          }}
                          options={filteredEnrollments.map((e) => ({
                            value: e.id,
                            label: `${e.course?.nameEnglish || 'Course'} (${e.enrollmentNumber})`
                          }))}
                        />
                      )}
                    />
                  </FormControl>
                </FormField>
              )}
            </>
          )}

          {watchInvoiceType === 'CorporateInvoice' && (
            <FormField>
              <FormLabel>Select Corporate Account</FormLabel>
              <FormControl>
                <Controller
                  name="corporateAccountId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      placeholder="-- Choose Corporate Payer --"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      options={corporateAccounts.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  )}
                />
              </FormControl>
              {errors.corporateAccountId && <FormError>{errors.corporateAccountId.message}</FormError>}
            </FormField>
          )}
        </div>

        {/* Date and Currency Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-500" /> Scheduling & Currency
          </h4>

          <FormField>
            <FormLabel>Invoice Date</FormLabel>
            <FormControl>
              <Input type="date" {...register('invoiceDate')} className="w-full" />
            </FormControl>
            {errors.invoiceDate && <FormError>{errors.invoiceDate.message}</FormError>}
          </FormField>

          <FormField>
            <FormLabel>Due Date</FormLabel>
            <FormControl>
              <Input type="date" {...register('dueDate')} className="w-full" />
            </FormControl>
            {errors.dueDate && <FormError>{errors.dueDate.message}</FormError>}
          </FormField>

          <FormField>
            <FormLabel>Currency</FormLabel>
            <FormControl>
              <Input type="text" {...register('currency')} disabled className="w-full bg-slate-50 font-bold" />
            </FormControl>
          </FormField>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" /> Invoice Line Items
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                enrollmentId: null,
                courseId: null,
                sourceBranchId: watchBranchId || defaultBranchId,
                descriptionEnglish: '',
                quantity: 1,
                unitPrice: 0,
                discountAmount: 0,
                taxRate: 0.05
              })
            }
            className="gap-1"
          >
            <Plus className="h-3 w-3" /> Add Item Line
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-4 md:grid-cols-12 items-end border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <div className="md:col-span-4">
              <FormField>
                <FormLabel className="text-xs">Description (English)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. course registration fees"
                    {...register(`lineItems.${index}.descriptionEnglish` as const)}
                    className="w-full"
                  />
                </FormControl>
                {errors.lineItems?.[index]?.descriptionEnglish && (
                  <FormError>{errors.lineItems[index].descriptionEnglish.message}</FormError>
                )}
              </FormField>
            </div>

            <div className="md:col-span-1">
              <FormField>
                <FormLabel className="text-xs">Qty</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...register(`lineItems.${index}.quantity` as const)}
                    className="w-full"
                  />
                </FormControl>
                {errors.lineItems?.[index]?.quantity && (
                  <FormError>{errors.lineItems[index].quantity.message}</FormError>
                )}
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField>
                <FormLabel className="text-xs">Unit Price (OMR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    {...register(`lineItems.${index}.unitPrice` as const)}
                    className="w-full"
                  />
                </FormControl>
                {errors.lineItems?.[index]?.unitPrice && (
                  <FormError>{errors.lineItems[index].unitPrice.message}</FormError>
                )}
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField>
                <FormLabel className="text-xs">Discount (OMR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    {...register(`lineItems.${index}.discountAmount` as const)}
                    className="w-full"
                  />
                </FormControl>
                {errors.lineItems?.[index]?.discountAmount && (
                  <FormError>{errors.lineItems[index].discountAmount.message}</FormError>
                )}
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField>
                <FormLabel className="text-xs">VAT Rate</FormLabel>
                <FormControl>
                  <Controller
                    name={`lineItems.${index}.taxRate` as const}
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        options={[
                          { value: '0.05', label: '5% Standard VAT' },
                          { value: '0', label: '0% Zero Rated' }
                        ]}
                      />
                    )}
                  />
                </FormControl>
              </FormField>
            </div>

            <div className="md:col-span-1 text-right">
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-10 text-rose-500 hover:text-rose-600 border-rose-200 hover:bg-rose-50 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Calculations Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-slate-500 text-xs max-w-sm">
          Dynamic VAT tax is resolved automatically per item as: <span className="font-semibold text-slate-700">((Qty * Price) - Discount) * Tax Rate</span>. Ensure values are accurate.
        </div>

        <div className="w-full md:w-80 space-y-2 border-t md:border-t-0 border-slate-200 pt-4 md:pt-0">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono">{subtotal.toFixed(3)} OMR</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Total Discounts:</span>
            <span className="font-mono text-rose-600">-{totalDiscount.toFixed(3)} OMR</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>VAT Tax (5%):</span>
            <span className="font-mono text-slate-700">+{totalTax.toFixed(3)} OMR</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 font-bold text-lg text-slate-900">
            <span>Total Amount:</span>
            <span className="font-mono text-indigo-600">{totalAmount.toFixed(3)} OMR</span>
          </div>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/finance/invoices')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-32 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          {isSubmitting ? 'Generating...' : 'Generate Invoice'}
        </Button>
      </div>
    </form>
  );
}
