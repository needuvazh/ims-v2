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
  category: z.enum(['Student', 'Corporate']),
  subCategory: z.enum(['FullPayment', 'Advance', 'PartialPayment', 'Installment']),
  studentProfileId: z.string().nullable().optional(),
  corporateAccountId: z.string().nullable().optional(),
  enrollmentId: z.string().nullable().optional(),
  branchId: z.string().uuid('Please select a branch'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().length(3),
  taxRate: z.coerce.number().min(0, 'VAT rate must be positive').max(100, 'VAT rate cannot exceed 100'),
  lineItems: z.array(
    z.object({
      enrollmentId: z.string().uuid().nullable().optional(),
      courseId: z.string().uuid().nullable().optional(),
      sourceBranchId: z.string().uuid(),
      descriptionEnglish: z.string().min(1, 'Description is required'),
      quantity: z.coerce.number().positive('Quantity must be greater than 0'),
      unitPrice: z.coerce.number().nonnegative('Price must be positive'),
      isDiscount: z.boolean().optional()
    })
  ).min(1, 'At least one line item is required'),
  numberOfInstallments: z.coerce.number().int().positive().nullable().optional(),
  installments: z.array(
    z.object({
      dueDate: z.string().min(1, 'Installment date is required'),
      amount: z.coerce.number().positive('Installment amount must be greater than 0')
    })
  ).nullable().optional()
}).refine((data) => {
  if (data.category === 'Student') {
    return !!data.studentProfileId && data.studentProfileId.trim() !== '';
  }
  return true;
}, {
  message: 'Student is required for Student Invoices',
  path: ['studentProfileId']
}).refine((data) => {
  if (data.category === 'Corporate') {
    return !!data.corporateAccountId && data.corporateAccountId.trim() !== '';
  }
  return true;
}, {
  message: 'Corporate Account is required for Corporate Invoices',
  path: ['corporateAccountId']
}).refine((data) => {
  if (data.subCategory === 'Installment') {
    return !!data.numberOfInstallments && data.numberOfInstallments >= 1;
  }
  return true;
}, {
  message: 'Number of installments must be at least 1',
  path: ['numberOfInstallments']
}).refine((data) => {
  if (data.subCategory === 'Installment') {
    return !!data.installments && data.installments.length === data.numberOfInstallments;
  }
  return true;
}, {
  message: 'Number of installment records must match number of installments',
  path: ['numberOfInstallments']
}).refine((data) => {
  if (data.subCategory === 'Installment' && data.installments) {
    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.isDiscount ? 0 : Number(item.unitPrice)), 0);
    const totalDiscount = data.lineItems.reduce((sum, item) => sum + (item.isDiscount ? Number(item.unitPrice) : 0), 0);
    const commonTaxRate = data.taxRate / 100;
    const taxable = Math.max(0, subtotal - totalDiscount);
    const totalTax = taxable * commonTaxRate;
    const totalAmt = taxable + totalTax;

    const installmentsSum = data.installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
    return Math.abs(totalAmt - installmentsSum) < 0.005;
  }
  return true;
}, {
  message: 'Sum of installments must equal the total invoice amount',
  path: ['numberOfInstallments']
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
  courses: Array<{ id: string; name: string }>;
  onSubmitAction: (data: any) => Promise<any>;
}

export function InvoiceForm({
  branches,
  students,
  corporateAccounts,
  enrollments,
  courses,
  onSubmitAction,
}: InvoiceFormProps) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');

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
      category: 'Student',
      subCategory: 'FullPayment',
      studentProfileId: '',
      corporateAccountId: '',
      enrollmentId: '',
      branchId: defaultBranchId,
      invoiceDate: today,
      dueDate: due,
      currency: 'OMR',
      taxRate: 5,
      numberOfInstallments: 1,
      installments: [],
      lineItems: [
        {
          enrollmentId: null,
          courseId: null,
          sourceBranchId: defaultBranchId,
          descriptionEnglish: '',
          quantity: 1,
          unitPrice: 0,
          isDiscount: false
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  });

  const { fields: installmentFields, replace: replaceInstallments } = useFieldArray({
    control,
    name: 'installments'
  });

  const watchInvoiceType = watch('invoiceType');
  const watchStudentId = watch('studentProfileId');
  const watchBranchId = watch('branchId');
  const watchLineItems = watch('lineItems');
  const watchSubCategory = watch('subCategory');
  const watchNumberOfInstallments = watch('numberOfInstallments');
  const watchInvoiceDate = watch('invoiceDate');
  const watchCategory = watch('category');

  // Programmatically resolve invoiceType based on category and subCategory
  useEffect(() => {
    if (watchSubCategory === 'Advance') {
      setValue('invoiceType', 'AdvanceInvoice');
    } else if (watchCategory === 'Student') {
      setValue('invoiceType', 'StudentInvoice');
    } else if (watchCategory === 'Corporate') {
      setValue('invoiceType', 'CorporateInvoice');
    }
  }, [watchCategory, watchSubCategory, setValue]);

  // Reset course selection when category or invoice type changes
  useEffect(() => {
    setSelectedCourseId('');
  }, [watchCategory, watchInvoiceType]);

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

  const watchTaxRate = watch('taxRate') || 0;

  // Interactively compute totals
  const subtotal = watchLineItems.reduce((sum, item) => {
    if (item.isDiscount) return sum;
    const q = Number(item.quantity) || 1;
    const p = Number(item.unitPrice) || 0;
    return sum + (q * p);
  }, 0);

  const totalDiscount = watchLineItems.reduce((sum, item) => {
    if (!item.isDiscount) return sum;
    const q = Number(item.quantity) || 1;
    const p = Number(item.unitPrice) || 0;
    return sum + (q * p);
  }, 0);

  const commonTaxRate = (Number(watchTaxRate) || 0) / 100;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const totalTax = taxableAmount * commonTaxRate;

  const totalAmount = taxableAmount + totalTax;

  const generateEqualSplit = () => {
    const num = Number(watchNumberOfInstallments) || 1;
    if (num < 1) return;

    // Equal split of totalAmount
    const baseAmt = Math.floor((totalAmount / num) * 1000) / 1000;
    const remainder = Number((totalAmount - (baseAmt * num)).toFixed(3));

    const newInstallments = [];
    const baseDate = new Date(watchInvoiceDate || new Date());

    for (let i = 0; i < num; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + i + 1); // standard monthly gap

      const amt = i === num - 1 ? baseAmt + remainder : baseAmt;

      newInstallments.push({
        dueDate: dueDate.toISOString().split('T')[0],
        amount: Number(amt.toFixed(3))
      });
    }

    replaceInstallments(newInstallments);
  };

  const handleEnrollmentSelect = (enrollmentId: string) => {
    if (!enrollmentId) return;
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (enrollment) {
      const resolvedPrice = Number(enrollment.resolvedPrice);
      const resolvedDiscount = Number(enrollment.resolvedDiscount);

      setValue('lineItems.0.descriptionEnglish', `Course Fee: ${enrollment.course?.nameEnglish || 'Course'} (${enrollment.enrollmentNumber})`);
      setValue('lineItems.0.unitPrice', resolvedPrice);
      setValue('lineItems.0.isDiscount', false);
      setValue('lineItems.0.quantity', 1);
      setValue('lineItems.0.enrollmentId', enrollment.id);
      setValue('lineItems.0.courseId', enrollment.courseId);

      // Clean up previous dynamically appended discount rows if any
      if (fields.length > 1) {
        for (let i = fields.length - 1; i >= 1; i--) {
          remove(i);
        }
      }

      if (resolvedDiscount > 0) {
        append({
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          sourceBranchId: watchBranchId || defaultBranchId,
          descriptionEnglish: `Discount: Scholarship/Promo (${enrollment.enrollmentNumber})`,
          quantity: 1,
          unitPrice: resolvedDiscount,
          isDiscount: true
        });
      }
    }
  };

  const handleCourseSelect = async (courseId: string) => {
    if (!courseId) return;

    if (!watchBranchId) {
      toast.warning('Please select a branch location first.');
      return;
    }

    const customerType = watchCategory === 'Corporate' ? 'Corporate' : 'Individual';

    try {
      const response = await fetch(
        `/api/v1/courses/${courseId}/pricing/resolve?customerType=${customerType}&branchId=${watchBranchId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.messageEnglish || 'Failed to resolve pricing for the selected course.');
      }

      const courseName = courses.find((c) => c.id === courseId)?.name.split(' (')[0] || 'Course';

      setValue('lineItems.0.descriptionEnglish', `${watchCategory === 'Corporate' ? 'Corporate Training' : 'Course Fee'}: ${courseName}`);
      setValue('lineItems.0.unitPrice', Number(data.data.basePrice));
      setValue('lineItems.0.isDiscount', false);
      setValue('lineItems.0.quantity', 1);
      setValue('lineItems.0.courseId', courseId);
      setValue('lineItems.0.enrollmentId', null);
      setValue('enrollmentId', '');

      toast.success(`Pricing resolved: ${Number(data.data.basePrice).toFixed(3)} OMR`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not resolve pricing for this course/branch combination.');
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setErrorState(null);

    const nonDiscountSubtotal = data.lineItems.filter(item => !item.isDiscount).reduce((sum, item) => sum + Number(item.unitPrice), 0);
    const totalDiscount = data.lineItems.filter(item => item.isDiscount).reduce((sum, item) => sum + Number(item.unitPrice), 0);

    if (totalDiscount > nonDiscountSubtotal) {
      setErrorState('Total discount amount cannot exceed the subtotal of all items.');
      return;
    }

    const nonDiscountItems = data.lineItems.filter(item => !item.isDiscount);
    let remainingDiscount = totalDiscount;

    const mappedLineItems = nonDiscountItems.map((item) => {
      const itemPrice = Number(item.unitPrice);
      const itemDiscount = Math.min(itemPrice, remainingDiscount);
      remainingDiscount -= itemDiscount;

      return {
        enrollmentId: item.enrollmentId,
        courseId: item.courseId,
        sourceBranchId: item.sourceBranchId,
        descriptionEnglish: item.descriptionEnglish,
        quantity: Number(item.quantity),
        unitPrice: itemPrice,
        discountAmount: Number(itemDiscount.toFixed(3)),
        taxRate: Number(data.taxRate) / 100
      };
    });

    const payload = {
      ...data,
      studentProfileId: data.category === 'Student' && data.studentProfileId !== '' ? data.studentProfileId : null,
      corporateAccountId: data.category === 'Corporate' && data.corporateAccountId !== '' ? data.corporateAccountId : null,
      enrollmentId: data.category === 'Student' && data.enrollmentId !== '' ? data.enrollmentId : null,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      lineItems: mappedLineItems,
      numberOfInstallments: data.subCategory === 'Installment' ? Number(data.numberOfInstallments) : null,
      installments: data.subCategory === 'Installment' && data.installments
        ? data.installments.map((inst) => ({
          dueDate: new Date(inst.dueDate),
          amount: Number(inst.amount)
        }))
        : null
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
            <FormLabel>Category</FormLabel>
            <FormControl>
              <Controller
                name="category"
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
                      { value: 'Student', label: 'Student (B2C)' },
                      { value: 'Corporate', label: 'Corporate (B2B)' }
                    ]}
                  />
                )}
              />
            </FormControl>
            {errors.category && <FormError>{errors.category.message}</FormError>}
          </FormField>

          <FormField>
            <FormLabel>Sub Category</FormLabel>
            <FormControl>
              <Controller
                name="subCategory"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={[
                      { value: 'FullPayment', label: 'Full Payment' },
                      { value: 'Advance', label: 'Advance' },
                      { value: 'PartialPayment', label: 'Partial Payment' },
                      { value: 'Installment', label: 'Installment' }
                    ]}
                  />
                )}
              />
            </FormControl>
            {errors.subCategory && <FormError>{errors.subCategory.message}</FormError>}
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
                <>
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
                              if (e.target.value) {
                                setSelectedCourseId('');
                              }
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

                  {!watch('enrollmentId') && (
                    <FormField>
                      <FormLabel>Select Course</FormLabel>
                      <FormControl>
                        <Select
                          placeholder="-- Choose Course to Auto-Resolve Price --"
                          value={selectedCourseId}
                          onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            handleCourseSelect(e.target.value);
                          }}
                          options={courses.map((c) => ({ value: c.id, label: c.name }))}
                        />
                      </FormControl>
                    </FormField>
                  )}
                </>
              )}
            </>
          )}

          {watchInvoiceType === 'CorporateInvoice' && (
            <>
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

              {watch('corporateAccountId') && (
                <FormField>
                  <FormLabel>Select Course</FormLabel>
                  <FormControl>
                    <Select
                      placeholder="-- Choose Course to Auto-Resolve Price --"
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        handleCourseSelect(e.target.value);
                      }}
                      options={courses.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </FormControl>
                </FormField>
              )}
            </>
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

          <FormField>
            <FormLabel>VAT Rate (%)</FormLabel>
            <FormControl>
              <Input type="number" step="0.1" {...register('taxRate')} className="w-full" />
            </FormControl>
            {errors.taxRate && <FormError>{errors.taxRate.message}</FormError>}
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
                isDiscount: false
              })
            }
            className="gap-1"
          >
            <Plus className="h-3 w-3" /> Add Item Line
          </Button>
        </div>

        {/* Column Headers */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b">
          <div className="md:col-span-6">Description</div>
          <div className="md:col-span-3">Price / Amount (OMR)</div>
          <div className="md:col-span-2 text-center">Is Discount?</div>
          <div className="md:col-span-1"></div>
        </div>

        {fields.map((field, index) => {
          const isAutoFetchedCourse = index === 0 && !!(watch('lineItems.0.courseId') || watch('lineItems.0.enrollmentId'));

          return (
            <div key={field.id} className="grid gap-4 md:grid-cols-12 items-center border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <input
                type="hidden"
                {...register(`lineItems.${index}.quantity` as const)}
                value={1}
              />

              <div className="md:col-span-6">
                <FormField>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="e.g. course registration fees"
                      {...register(`lineItems.${index}.descriptionEnglish` as const)}
                      readOnly={isAutoFetchedCourse}
                      className={`w-full ${isAutoFetchedCourse ? 'bg-slate-50 border-dashed cursor-not-allowed font-medium text-slate-600' : ''}`}
                    />
                  </FormControl>
                  {errors.lineItems?.[index]?.descriptionEnglish && (
                    <FormError>{errors.lineItems[index].descriptionEnglish.message}</FormError>
                  )}
                </FormField>
              </div>

              <div className="md:col-span-3">
                <FormField>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      {...register(`lineItems.${index}.unitPrice` as const)}
                      readOnly={isAutoFetchedCourse}
                      className={`w-full ${isAutoFetchedCourse ? 'bg-slate-50 border-dashed cursor-not-allowed font-semibold text-slate-600' : ''}`}
                    />
                  </FormControl>
                  {errors.lineItems?.[index]?.unitPrice && (
                    <FormError>{errors.lineItems[index].unitPrice.message}</FormError>
                  )}
                </FormField>
              </div>

              <div className="md:col-span-2 flex flex-col items-center justify-center">
                <span className="md:hidden text-xs font-semibold text-slate-500 mb-1">Is Discount?</span>
                <input
                  type="checkbox"
                  disabled={isAutoFetchedCourse}
                  {...register(`lineItems.${index}.isDiscount` as const)}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-1 text-right">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-10 text-rose-500 hover:text-rose-600 border-rose-200 hover:bg-rose-50 p-2 w-full flex justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Installment Plan Section (Only visible if subCategory === 'Installment') */}
      {watchSubCategory === 'Installment' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-500" /> Installment Schedule
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateEqualSplit}
              className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Calculator className="h-3.5 w-3.5" /> Auto-Split Equally
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField>
              <FormLabel>Number of Installments</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...register('numberOfInstallments')}
                  className="w-full"
                />
              </FormControl>
              {errors.numberOfInstallments && (
                <FormError>{errors.numberOfInstallments.message}</FormError>
              )}
            </FormField>
          </div>

          {installmentFields.map((field, idx) => (
            <div key={field.id} className="grid gap-4 md:grid-cols-12 items-end border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div className="md:col-span-2 text-sm font-semibold text-slate-500 pb-2">
                Installment #{idx + 1}
              </div>

              <div className="md:col-span-5">
                <FormField>
                  <FormLabel className="text-xs">Due Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...register(`installments.${idx}.dueDate` as const)}
                      className="w-full"
                    />
                  </FormControl>
                </FormField>
              </div>

              <div className="md:col-span-5">
                <FormField>
                  <FormLabel className="text-xs">Amount (OMR)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      {...register(`installments.${idx}.amount` as const)}
                      className="w-full"
                    />
                  </FormControl>
                </FormField>
              </div>
            </div>
          ))}
        </div>
      )}

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
