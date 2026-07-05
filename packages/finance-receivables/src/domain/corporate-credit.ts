import { z } from 'zod';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const CorporateCreditRuleStatusSchema = z.enum([
  'Draft',
  'Active',
  'Superseded',
  'Expired',
  'Suspended'
]);

export const CorporateCreditCheckSchema = z.object({
  creditLimit: z.number().nonnegative(),
  currentOutstanding: z.number().nonnegative(),
  committedAmount: z.number().nonnegative(),
  blockOnCreditLimit: z.boolean(),
  requestedAmount: z.number().positive()
});

export type CorporateCreditCheck = z.infer<typeof CorporateCreditCheckSchema>;

export interface CorporateCreditCheckResult {
  passed: boolean;
  message: string;
  availableCredit: Decimal;
}

export function checkCorporateCredit(input: CorporateCreditCheck): CorporateCreditCheckResult {
  const limit = new Decimal(input.creditLimit);
  const outstanding = new Decimal(input.currentOutstanding);
  const committed = new Decimal(input.committedAmount);
  const requested = new Decimal(input.requestedAmount);

  // Available Credit = Credit Limit - (Outstanding + Committed)
  const totalExposure = outstanding.plus(committed);
  const availableCredit = limit.minus(totalExposure);

  const meetsLimit = availableCredit.greaterThanOrEqualTo(requested);

  if (!meetsLimit && input.blockOnCreditLimit) {
    return {
      passed: false,
      message: `Corporate credit limit exceeded. Available credit is ${availableCredit.toFixed(3)} OMR but requested ${requested.toFixed(3)} OMR.`,
      availableCredit
    };
  }

  return {
    passed: true,
    message: meetsLimit 
      ? `Credit check passed. Available credit is ${availableCredit.toFixed(3)} OMR.`
      : `Credit check warning: limit exceeded, but block flag is false. Available credit is ${availableCredit.toFixed(3)} OMR but requested ${requested.toFixed(3)} OMR.`,
    availableCredit
  };
}
