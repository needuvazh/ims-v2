'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Input,
  Select,
  Button,
  FormField,
  FormLabel,
  FormControl,
  FormError,
  Alert,
} from '@ims/shared-ui';
import { toast } from 'sonner';
import { recordPaymentAction } from '../../invoices/actions';

const recordPaymentFormSchema = z.object({
  invoiceId: z.string().uuid('Please select an invoice'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMethod: z.enum([
    'Cash',
    'BankTransfer',
    'Card',
    'Online',
    'Cheque',
    'CorporateBilling',
  ]),
  paymentDate: z.string().min(1, 'Payment date is required'),
  referenceNumber: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

type PaymentFormData = z.infer<typeof recordPaymentFormSchema>;

interface PaymentFormProps {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    branchId: string;
    totalAmount: number;
    outstandingAmount: number;
    payerName: string;
  }>;
}

export function PaymentForm({ invoices }: PaymentFormProps) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues: {
      invoiceId: '',
      amount: 0,
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
    },
  });

  const watchInvoiceId = watch('invoiceId');
  const selectedInvoice = invoices.find((i) => i.id === watchInvoiceId);

  // Automatically update the amount with outstanding balance when invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      setValue('amount', selectedInvoice.outstandingAmount);
    }
  }, [selectedInvoice, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    setErrorState(null);

    if (!selectedInvoice) {
      setErrorState('Please select a valid invoice');
      return;
    }

    try {
      const payload = {
        ...data,
        branchId: selectedInvoice.branchId,
        paymentDate: new Date(data.paymentDate),
      };

      const res = await recordPaymentAction(payload);
      if (res.success) {
        toast.success(
          `Payment recorded successfully: ${res.data?.paymentNumber || ''}`,
        );
        router.push('/finance/payments');
        router.refresh();
      } else {
        setErrorState(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      console.error(err);
      setErrorState('A network or server error occurred');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-2xl mx-auto pb-12"
    >
      {errorState && (
        <Alert variant="error" title="Reconciliation Failed">
          {errorState}
        </Alert>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 text-sm border-b pb-2">
          Receipt Details
        </h4>

        <FormField>
          <FormLabel>Select Unpaid / Active Invoice</FormLabel>
          <FormControl>
            <Controller
              name="invoiceId"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder="-- Choose Outstanding Invoice --"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setValue('amount', 0);
                  }}
                  options={invoices.map((inv) => ({
                    value: inv.id,
                    label: `${inv.invoiceNumber} - ${inv.payerName} (Total: ${inv.totalAmount.toFixed(3)} OMR, Due: ${inv.outstandingAmount.toFixed(3)} OMR)`,
                  }))}
                />
              )}
            />
          </FormControl>
          {errors.invoiceId && (
            <FormError>{errors.invoiceId.message}</FormError>
          )}
        </FormField>

        {selectedInvoice && (
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg text-xs border border-slate-200">
            <div>
              <span className="text-slate-400 block font-medium">
                Customer Payer
              </span>
              <span className="font-semibold text-slate-700">
                {selectedInvoice.payerName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">
                Invoice Number
              </span>
              <span className="font-mono font-semibold text-slate-700">
                {selectedInvoice.invoiceNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">
                Invoice Total
              </span>
              <span className="font-mono font-semibold text-slate-700">
                {selectedInvoice.totalAmount.toFixed(3)} OMR
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">
                Remaining Outstanding Balance
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {selectedInvoice.outstandingAmount.toFixed(3)} OMR
              </span>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <FormLabel>Payment Method</FormLabel>
            <FormControl>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    options={[
                      { value: 'Cash', label: 'Cash Payment' },
                      { value: 'BankTransfer', label: 'Bank Transfer' },
                      { value: 'Card', label: 'Card Swipe / POS' },
                      { value: 'Online', label: 'Online Payment Gateway' },
                      { value: 'Cheque', label: 'Cheque Payment' },
                      {
                        value: 'CorporateBilling',
                        label: 'Corporate B2B Billing',
                      },
                    ]}
                  />
                )}
              />
            </FormControl>
            {errors.paymentMethod && (
              <FormError>{errors.paymentMethod.message}</FormError>
            )}
          </FormField>

          <FormField>
            <FormLabel>Amount Received (OMR)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                {...register('amount')}
                className="w-full font-mono font-semibold text-emerald-700"
              />
            </FormControl>
            {errors.amount && <FormError>{errors.amount.message}</FormError>}
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <FormLabel>Payment Date</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...register('paymentDate')}
                className="w-full"
              />
            </FormControl>
            {errors.paymentDate && (
              <FormError>{errors.paymentDate.message}</FormError>
            )}
          </FormField>

          <FormField>
            <FormLabel>Reference Number (Tx / Cheque / Bank ID)</FormLabel>
            <FormControl>
              <Input
                placeholder="Optional receipt reference..."
                {...register('referenceNumber')}
                className="w-full"
              />
            </FormControl>
            {errors.referenceNumber && (
              <FormError>{errors.referenceNumber.message}</FormError>
            )}
          </FormField>
        </div>

        <FormField>
          <FormLabel>Internal Collection Remarks</FormLabel>
          <FormControl>
            <textarea
              {...register('remarks')}
              rows={3}
              placeholder="Provide any additional comments about the bank account deposit or cash receipt..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 font-sans"
            />
          </FormControl>
          {errors.remarks && <FormError>{errors.remarks.message}</FormError>}
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/finance/payments')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Recording...' : 'Record Payment Reconcile'}
        </Button>
      </div>
    </form>
  );
}
