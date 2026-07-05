'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Button, FormField, FormLabel, FormControl, FormError, Alert } from '@ims/shared-ui';
import { toast } from 'sonner';
import { requestRefundAction } from '../actions';

const requestRefundFormSchema = z.object({
  paymentId: z.string().uuid('Please select a payment'),
  refundType: z.enum(['Full', 'Partial']),
  amount: z.coerce.number().positive('Amount must be positive'),
  reasonCode: z.string().min(1, 'Reason code is required'),
  reasonNarrative: z.string().min(1, 'Description is required')
});

type RefundFormData = z.infer<typeof requestRefundFormSchema>;

interface RefundFormProps {
  payments: Array<{
    id: string;
    paymentNumber: string;
    invoiceId: string;
    branchId: string;
    paidAmount: number;
    alreadyRefunded: number;
    availableAmount: number;
    payerName: string;
  }>;
}

export function RefundForm({ payments }: RefundFormProps) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RefundFormData>({
    resolver: zodResolver(requestRefundFormSchema),
    defaultValues: {
      paymentId: '',
      refundType: 'Full',
      amount: 0,
      reasonCode: '',
      reasonNarrative: ''
    }
  });

  const watchPaymentId = watch('paymentId');
  const watchRefundType = watch('refundType');
  const selectedPayment = payments.find((p) => p.id === watchPaymentId);

  // Automatically update the amount if Refund Type is "Full"
  useEffect(() => {
    if (selectedPayment && watchRefundType === 'Full') {
      setValue('amount', selectedPayment.availableAmount);
    }
  }, [selectedPayment, watchRefundType, setValue]);

  const onSubmit = async (data: RefundFormData) => {
    setErrorState(null);

    if (selectedPayment && data.amount > selectedPayment.availableAmount) {
      setErrorState(`Requested amount exceeds available refund balance of ${selectedPayment.availableAmount.toFixed(3)} OMR`);
      return;
    }

    try {
      const res = await requestRefundAction(data);
      if (res.success) {
        toast.success(`Refund requested successfully: ${res.data?.refundNumber}`);
        router.push('/finance/refunds');
        router.refresh();
      } else {
        setErrorState(res.error || 'Failed to submit refund request');
      }
    } catch (err: any) {
      console.error(err);
      setErrorState('A network or server error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto pb-12">
      {errorState && (
        <Alert variant="error" title="Request Failed">
          {errorState}
        </Alert>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 text-sm border-b pb-2">Refund Details</h4>

        <FormField>
          <FormLabel>Select Paid Transaction</FormLabel>
          <FormControl>
            <Controller
              name="paymentId"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder="-- Choose Paid Payment to Refund --"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    // Reset amount when payment changes
                    setValue('amount', 0);
                  }}
                  options={payments.map((p) => ({
                    value: p.id,
                    label: `${p.paymentNumber} - ${p.payerName} (Paid: ${p.paidAmount.toFixed(3)} OMR, Available: ${p.availableAmount.toFixed(3)} OMR)`
                  }))}
                />
              )}
            />
          </FormControl>
          {errors.paymentId && <FormError>{errors.paymentId.message}</FormError>}
        </FormField>

        {selectedPayment && (
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg text-xs border border-slate-200">
            <div>
              <span className="text-slate-400 block font-medium">Customer Payer</span>
              <span className="font-semibold text-slate-700">{selectedPayment.payerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Original Paid Amount</span>
              <span className="font-mono font-semibold text-slate-700">{selectedPayment.paidAmount.toFixed(3)} OMR</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Already Refunded</span>
              <span className="font-mono font-semibold text-slate-700">{selectedPayment.alreadyRefunded.toFixed(3)} OMR</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Available Balance to Refund</span>
              <span className="font-mono font-bold text-indigo-600">{selectedPayment.availableAmount.toFixed(3)} OMR</span>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <FormLabel>Refund Type</FormLabel>
            <FormControl>
              <Controller
                name="refundType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={[
                      { value: 'Full', label: 'Full Refund' },
                      { value: 'Partial', label: 'Partial Refund' }
                    ]}
                  />
                )}
              />
            </FormControl>
            {errors.refundType && <FormError>{errors.refundType.message}</FormError>}
          </FormField>

          <FormField>
            <FormLabel>Refund Amount (OMR)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                disabled={watchRefundType === 'Full'}
                {...register('amount')}
                className="w-full bg-slate-50 disabled:bg-slate-100 font-mono font-semibold"
              />
            </FormControl>
            {errors.amount && <FormError>{errors.amount.message}</FormError>}
          </FormField>
        </div>

        <FormField>
          <FormLabel>Reason Code</FormLabel>
          <FormControl>
            <Controller
              name="reasonCode"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder="-- Select Reason --"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  options={[
                    { value: 'CourseWithdrawal', label: 'Student Course Withdrawal' },
                    { value: 'Overpayment', label: 'Overpayment Correction' },
                    { value: 'CourseCancellation', label: 'Course Batch Cancellation' },
                    { value: 'Other', label: 'Other Reason' }
                  ]}
                />
              )}
            />
          </FormControl>
          {errors.reasonCode && <FormError>{errors.reasonCode.message}</FormError>}
        </FormField>

        <FormField>
          <FormLabel>Reason Description (Narrative)</FormLabel>
          <FormControl>
            <textarea
              {...register('reasonNarrative')}
              rows={4}
              placeholder="Provide a detailed explanation of the refund request..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 font-sans"
            />
          </FormControl>
          {errors.reasonNarrative && <FormError>{errors.reasonNarrative.message}</FormError>}
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/finance/refunds')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
        </Button>
      </div>
    </form>
  );
}
