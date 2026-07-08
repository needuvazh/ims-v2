'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Input,
  Select,
  FormField,
  FormLabel,
  FormControl,
} from '@ims/shared-ui';
import { CheckCircle2, Landmark, Loader2, Download } from 'lucide-react';
import { issueInvoiceAction, recordPaymentAction } from '../actions';

interface InvoiceActionsClientProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: any;
    outstandingAmount: any;
    currency: string;
    branchId: string;
    refunds?: { id: string; amount: any; status: string }[];
    studentProfile?: {
      person: {
        firstName: string;
        lastName: string;
      };
    } | null;
    corporateAccount?: {
      accountName: string;
    } | null;
  };
}

export function InvoiceActionsClient({ invoice }: InvoiceActionsClientProps) {
  const [isPending, setIsPending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form states for record payment
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amount, setAmount] = useState(
    Number(invoice.outstandingAmount).toString(),
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const payerName = invoice.studentProfile
    ? `${invoice.studentProfile.person.firstName} ${invoice.studentProfile.person.lastName}`
    : invoice.corporateAccount?.accountName || 'N/A';

  // Outstanding caused entirely by refund reversals — don't show Pay
  const totalRefunded = (invoice.refunds || []).reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const outstandingDueToRefund =
    totalRefunded >= Number(invoice.outstandingAmount) && totalRefunded > 0;
  const canPay = !outstandingDueToRefund;

  const handleIssue = async () => {
    setIsPending(true);
    try {
      const res = await issueInvoiceAction(invoice.id);
      if (res.success) {
        toast.success(`Invoice ${invoice.invoiceNumber} has been issued!`);
      } else {
        toast.error(res.error || 'Failed to issue invoice');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = Number(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }

    if (payAmount > Number(invoice.outstandingAmount)) {
      toast.error('Payment amount cannot exceed the outstanding balance');
      return;
    }

    setIsPending(true);
    try {
      const res = await recordPaymentAction({
        invoiceId: invoice.id,
        amount: payAmount,
        paymentMethod,
        paymentDate: new Date(paymentDate),
        referenceNumber: referenceNumber || null,
        remarks: remarks || null,
        branchId: invoice.branchId,
      });

      if (res.success) {
        toast.success(
          `Payment recorded successfully! Receipt: ${res.data?.receiptNumber}`,
        );
        setIsDialogOpen(false);
      } else {
        toast.error(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {invoice.status === 'Draft' && (
        <Button
          onClick={handleIssue}
          disabled={isPending}
          size="sm"
          className="gap-1.5 h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Issue
        </Button>
      )}

      {invoice.status !== 'Draft' && (
        <a
          href={`/api/v1/finance/invoices/${invoice.id}/download`}
          target="_blank"
          rel="noopener noreferrer"
          title="Download / Print Invoice"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      )}

      {(invoice.status === 'Issued' || invoice.status === 'PartiallyPaid') &&
        canPay && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs text-emerald-600 hover:bg-emerald-50 border-emerald-200"
              onClick={() => {
                setAmount(Number(invoice.outstandingAmount).toString());
                setIsDialogOpen(true);
              }}
            >
              <Landmark className="h-3.5 w-3.5" />
              Pay
            </Button>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Record Manual Payment</DialogTitle>
                <DialogDescription>
                  Record a collection receipt against Invoice{' '}
                  <span className="font-mono font-bold">
                    {invoice.invoiceNumber}
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handlePostPayment} className="space-y-4 pt-2">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payer:</span>
                    <span className="font-semibold text-slate-800">
                      {payerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Billed:</span>
                    <span className="font-mono text-slate-800">
                      {Number(invoice.totalAmount).toFixed(3)}{' '}
                      {invoice.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">
                      Outstanding Balance:
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      {Number(invoice.outstandingAmount).toFixed(3)}{' '}
                      {invoice.currency}
                    </span>
                  </div>
                </div>

                <FormField>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      options={[
                        { value: 'Cash', label: 'Cash' },
                        { value: 'BankTransfer', label: 'Bank Transfer' },
                        { value: 'Card', label: 'Credit/Debit Card' },
                        { value: 'Online', label: 'Online Payment' },
                        { value: 'Cheque', label: 'Cheque' },
                        {
                          value: 'CorporateBilling',
                          label: 'Corporate Billing',
                        },
                      ]}
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Amount to Pay ({invoice.currency})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      max={Number(invoice.outstandingAmount)}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Reference Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="e.g. Transaction ID, Cheque #"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Payment notes..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </FormControl>
                </FormField>

                <DialogFooter className="pt-2">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Post Payment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
}
