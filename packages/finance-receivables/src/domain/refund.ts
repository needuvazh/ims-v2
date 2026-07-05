import { z } from 'zod';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const RefundTypeSchema = z.enum([
  'Full',
  'Partial'
]);

export const RefundStatusSchema = z.enum([
  'Requested',
  'Approved',
  'Rejected',
  'Executed',
  'Cancelled',
  'Failed'
]);

export const RequestRefundInputSchema = z.object({
  paymentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  branchId: z.string().uuid(),
  refundType: RefundTypeSchema,
  amount: z.number().positive(),
  reasonCode: z.string().min(1),
  reasonNarrative: z.string().min(1),
  requestedBy: z.string().uuid()
});

export type RequestRefundInput = z.infer<typeof RequestRefundInputSchema>;

export function validateRefundAmount(refundAmount: number, paymentPaidAmount: number, alreadyRefundedAmount: number): void {
  const refundDec = new Decimal(refundAmount);
  const paidDec = new Decimal(paymentPaidAmount);
  const alreadyRefundedDec = new Decimal(alreadyRefundedAmount);

  const availableToRefund = paidDec.minus(alreadyRefundedDec);
  if (refundDec.greaterThan(availableToRefund)) {
    throw new Error(`Requested refund amount (${refundDec.toString()}) exceeds the available paid amount to refund (${availableToRefund.toString()})`);
  }
}
