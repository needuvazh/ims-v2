import { z } from 'zod';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const PaymentMethodSchema = z.enum([
  'Cash',
  'BankTransfer',
  'Card',
  'Online',
  'Cheque',
  'CorporateBilling',
]);

export const PaymentStatusSchema = z.enum([
  'Pending',
  'Posted',
  'Failed',
  'Reversed',
  'Refunded',
  'PartiallyRefunded',
]);

export const PaymentAllocationInputSchema = z.object({
  invoiceId: z.string().uuid(),
  installmentId: z.string().uuid().nullable().optional(),
  allocatedAmount: z.number().positive(),
});

export type PaymentAllocationInput = z.infer<
  typeof PaymentAllocationInputSchema
>;

export const CreatePaymentInputSchema = z.object({
  invoiceId: z.string().uuid(),
  studentProfileId: z.string().uuid().nullable().optional(),
  corporateAccountId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid(),
  paymentDate: z.date(),
  paymentMethod: PaymentMethodSchema,
  currency: z.string().length(3).default('OMR'),
  amount: z.number().positive(),
  referenceNumber: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  receivedBy: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  allocations: z.array(PaymentAllocationInputSchema),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

export function validatePaymentAllocations(input: CreatePaymentInput): void {
  if (input.allocations.length === 0) {
    // If no allocations are explicitly provided, that's fine, we can auto-allocate during service execution.
    return;
  }

  let totalAllocated = new Decimal(0);
  for (const alloc of input.allocations) {
    totalAllocated = totalAllocated.plus(new Decimal(alloc.allocatedAmount));
  }

  const paymentAmount = new Decimal(input.amount);
  if (!totalAllocated.equals(paymentAmount)) {
    throw new Error(
      `Total allocated amount (${totalAllocated.toString()}) does not match the payment amount (${paymentAmount.toString()})`,
    );
  }
}
