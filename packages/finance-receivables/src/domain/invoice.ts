import { z } from 'zod';
import { Decimal } from 'decimal.js';

// Set decimal.js precision and rounding mode
Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const InvoiceTypeSchema = z.enum([
  'StudentInvoice',
  'CorporateInvoice',
  'AdvanceInvoice',
  'MilestoneInvoice',
  'FinalInvoice',
  'RefundInvoice'
]);

export const InvoiceStatusSchema = z.enum([
  'Draft',
  'Issued',
  'PartiallyPaid',
  'Paid',
  'Overdue',
  'Cancelled'
]);

export const InvoiceLineItemInputSchema = z.object({
  enrollmentId: z.string().uuid().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  sourceBranchId: z.string().uuid(),
  descriptionEnglish: z.string().min(1),
  descriptionArabic: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0.05) // Standard 5% Oman VAT
});

export type InvoiceLineItemInput = z.infer<typeof InvoiceLineItemInputSchema>;

export const InvoiceCategorySchema = z.enum(['Student', 'Corporate']);
export const InvoiceSubCategorySchema = z.enum(['FullPayment', 'Advance', 'PartialPayment', 'Installment']);

export const CreateInvoiceInputSchema = z.object({
  invoiceType: InvoiceTypeSchema,
  category: InvoiceCategorySchema,
  subCategory: InvoiceSubCategorySchema,
  studentProfileId: z.string().uuid().nullable().optional(),
  corporateAccountId: z.string().uuid().nullable().optional(),
  enrollmentId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid(),
  invoiceDate: z.date(),
  dueDate: z.date(),
  currency: z.string().length(3).default('OMR'),
  lineItems: z.array(InvoiceLineItemInputSchema).min(1),
  sourceQuotationId: z.string().uuid().nullable().optional(),
  sourceSalesOrderId: z.string().uuid().nullable().optional(),
  numberOfInstallments: z.number().int().positive().nullable().optional(),
  installments: z.array(
    z.object({
      dueDate: z.date(),
      amount: z.number().positive()
    })
  ).nullable().optional()
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

export interface CalculatedLineItem {
  enrollmentId?: string | null;
  courseId?: string | null;
  sourceBranchId: string;
  lineSequence: number;
  descriptionEnglish: string;
  descriptionArabic?: string | null;
  quantity: Decimal;
  unitPrice: Decimal;
  discountAmount: Decimal;
  taxableAmount: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  lineTotal: Decimal;
}

export interface CalculatedInvoice {
  subtotal: Decimal;
  discountAmount: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
  outstandingAmount: Decimal;
  lineItems: CalculatedLineItem[];
}

export function calculateInvoice(input: CreateInvoiceInput): CalculatedInvoice {
  let subtotal = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalAmount = new Decimal(0);

  const calculatedItems = input.lineItems.map((item, idx) => {
    const qty = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const discount = new Decimal(item.discountAmount);
    
    // Line Subtotal = qty * unitPrice
    const lineSubtotal = qty.times(unitPrice);
    
    // Taxable Amount = (qty * unitPrice) - discount
    const taxable = lineSubtotal.minus(discount);
    if (taxable.isNegative()) {
      throw new Error(`Discount cannot exceed line subtotal for item ${idx + 1}`);
    }

    const taxRate = new Decimal(item.taxRate);
    const taxAmt = taxable.times(taxRate);
    const lineTotal = taxable.plus(taxAmt);

    subtotal = subtotal.plus(lineSubtotal);
    totalDiscount = totalDiscount.plus(discount);
    totalTax = totalTax.plus(taxAmt);
    totalAmount = totalAmount.plus(lineTotal);

    return {
      enrollmentId: item.enrollmentId,
      courseId: item.courseId,
      sourceBranchId: item.sourceBranchId,
      lineSequence: idx + 1,
      descriptionEnglish: item.descriptionEnglish,
      descriptionArabic: item.descriptionArabic,
      quantity: qty,
      unitPrice: unitPrice,
      discountAmount: discount,
      taxableAmount: taxable,
      taxRate: taxRate,
      taxAmount: taxAmt,
      lineTotal: lineTotal
    };
  });

  return {
    subtotal,
    discountAmount: totalDiscount,
    taxAmount: totalTax,
    totalAmount,
    outstandingAmount: totalAmount,
    lineItems: calculatedItems
  };
}

export const AgingBucketSchema = z.enum([
  'Current',
  'Days30',
  'Days60',
  'Days90',
  'Days120Plus'
]);

export type AgingBucket = z.infer<typeof AgingBucketSchema>;

export function resolveAgingBucket(dueDate: Date, calculationDate: Date = new Date()): AgingBucket {
  const diffTime = calculationDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'Current';
  } else if (diffDays <= 30) {
    return 'Days30';
  } else if (diffDays <= 60) {
    return 'Days60';
  } else if (diffDays <= 119) {
    return 'Days90';
  } else {
    return 'Days120Plus';
  }
}
