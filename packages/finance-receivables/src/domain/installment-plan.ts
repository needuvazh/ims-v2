import { z } from 'zod';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const InstallmentPlanStatusSchema = z.enum([
  'Draft',
  'Active',
  'Completed',
  'Cancelled',
]);

export const InstallmentStatusSchema = z.enum([
  'Pending',
  'PartiallyPaid',
  'Paid',
  'Overdue',
  'Cancelled',
]);

export const InstallmentInputSchema = z.object({
  sequenceNumber: z.number().int().positive(),
  dueDate: z.date(),
  amount: z.number().positive(),
});

export type InstallmentInput = z.infer<typeof InstallmentInputSchema>;

export const CreateInstallmentPlanInputSchema = z.object({
  enrollmentId: z.string().uuid().nullable().optional(),
  invoiceId: z.string().uuid(),
  branchId: z.string().uuid(),
  planName: z.string().min(1),
  totalAmount: z.number().positive(),
  numberOfInstallments: z.number().int().positive(),
  installments: z.array(InstallmentInputSchema).min(1),
});

export type CreateInstallmentPlanInput = z.infer<
  typeof CreateInstallmentPlanInputSchema
>;

export function validateInstallmentPlan(
  input: CreateInstallmentPlanInput,
): void {
  // Validate that installments count matches input.numberOfInstallments
  if (input.installments.length !== input.numberOfInstallments) {
    throw new Error(
      `Number of installments (${input.installments.length}) does not match numberOfInstallments field (${input.numberOfInstallments})`,
    );
  }

  // Validate sum of installment amounts equals plan totalAmount
  let sum = new Decimal(0);
  for (const inst of input.installments) {
    sum = sum.plus(new Decimal(inst.amount));
  }

  const expectedTotal = new Decimal(input.totalAmount);
  if (!sum.equals(expectedTotal)) {
    throw new Error(
      `Sum of installment amounts (${sum.toString()}) does not match total amount of the plan (${expectedTotal.toString()})`,
    );
  }

  // Validate sequence numbers are continuous starting from 1
  const sortedSeqs = [...input.installments]
    .map((i) => i.sequenceNumber)
    .sort((a, b) => a - b);
  for (let idx = 0; idx < sortedSeqs.length; idx++) {
    if (sortedSeqs[idx] !== idx + 1) {
      throw new Error(
        `Sequence numbers must be consecutive and start from 1. Found sequence: ${sortedSeqs.join(', ')}`,
      );
    }
  }
}
