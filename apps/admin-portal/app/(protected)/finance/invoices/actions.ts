'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  assertPermission,
  assertBranchScope,
  getSession,
} from '../../../lib/auth-guard';
import { prisma } from '@ims/database';

const CreateInvoiceRequestSchema = z.object({
  invoiceType: z.enum([
    'StudentInvoice',
    'CorporateInvoice',
    'AdvanceInvoice',
    'MilestoneInvoice',
    'FinalInvoice',
    'RefundInvoice',
  ]),
  category: z.enum(['Student', 'Corporate']),
  subCategory: z.enum([
    'FullPayment',
    'Advance',
    'PartialPayment',
    'Installment',
  ]),
  studentProfileId: z.string().uuid().nullable().optional(),
  corporateAccountId: z.string().uuid().nullable().optional(),
  enrollmentId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  invoiceDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date(),
  ),
  dueDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date(),
  ),
  currency: z.string().length(3).default('OMR'),
  lineItems: z
    .array(
      z.object({
        enrollmentId: z.string().uuid().nullable().optional(),
        courseId: z.string().uuid().nullable().optional(),
        sourceBranchId: z.string().uuid(),
        descriptionEnglish: z.string().min(1),
        descriptionArabic: z.string().optional().nullable(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        discountAmount: z.number().nonnegative().default(0),
        taxRate: z.number().nonnegative().default(0.05),
      }),
    )
    .min(1),
  sourceQuotationId: z.string().uuid().nullable().optional(),
  sourceSalesOrderId: z.string().uuid().nullable().optional(),
  numberOfInstallments: z.number().int().positive().nullable().optional(),
  installments: z
    .array(
      z.object({
        dueDate: z.preprocess(
          (val) => (typeof val === 'string' ? new Date(val) : val),
          z.date(),
        ),
        amount: z.number().positive(),
      }),
    )
    .nullable()
    .optional(),
});

export async function createInvoiceAction(data: any) {
  try {
    // 1. Authenticate and enforce permission
    const session = await assertPermission('finance.invoice.create');

    // 2. Parse input data
    const parsed = CreateInvoiceRequestSchema.parse(data);

    // 3. Resolve target branch
    const targetBranchId = parsed.branchId || session.activeBranchId;
    if (!targetBranchId) {
      throw new Error('ERR_AUTH_BRANCH_DENIED');
    }

    // 4. Assert active branch scope
    await assertBranchScope(targetBranchId);

    // 5. Import and call finance service
    const { financeService } = await import('../../../lib/runtime');
    const result = await financeService.createInvoice({
      ...parsed,
      branchId: targetBranchId,
    });

    // Automatically transition invoice status from Draft to Issued
    await financeService.issueInvoice(result.id);

    revalidatePath('/finance/invoices');
    revalidatePath('/finance');
    if (parsed.enrollmentId) {
      revalidatePath(`/enrollments/${parsed.enrollmentId}`);
    }

    return {
      success: true,
      data: {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount.toNumber(),
      },
    };
  } catch (error: any) {
    console.error('createInvoiceAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

export async function issueInvoiceAction(invoiceId: string) {
  try {
    // 1. Authenticate and enforce permission
    const session = await assertPermission('finance.invoice.create');

    // 2. Resolve target branch scope by checking invoice branch first
    const { prisma, financeService } = await import('../../../lib/runtime');
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { branchId: true },
    });
    if (!invoice) {
      throw new Error('ERR_FIN_INVOICE_NOT_FOUND');
    }
    await assertBranchScope(invoice.branchId);

    const result = await financeService.issueInvoice(invoiceId);

    revalidatePath('/finance/invoices');
    revalidatePath('/finance');

    return {
      success: true,
      data: {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
        status: result.status,
      },
    };
  } catch (error: any) {
    console.error('issueInvoiceAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

const RecordPaymentRequestSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum([
    'Cash',
    'BankTransfer',
    'Card',
    'Online',
    'Cheque',
    'CorporateBilling',
  ]),
  paymentDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date(),
  ),
  referenceNumber: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  branchId: z.string().uuid(),
});

export async function recordPaymentAction(data: any) {
  try {
    // 1. Authenticate and enforce permission
    const session = await assertPermission('payment.create');

    // 2. Parse input data
    const parsed = RecordPaymentRequestSchema.parse(data);

    // Fetch the invoice to get its branchId and currency
    const { prisma, financeService } = await import('../../../lib/runtime');
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.invoiceId },
      select: { branchId: true, currency: true, enrollmentId: true },
    });
    if (!invoice) {
      throw new Error('ERR_FIN_INVOICE_NOT_FOUND');
    }

    // 3. Assert active branch scope based on invoice
    await assertBranchScope(invoice.branchId);

    // 4. Generate idempotencyKey and record payment
    const { randomUUID } = await import('crypto');
    const result = await financeService.recordPayment({
      invoiceId: parsed.invoiceId,
      amount: parsed.amount,
      paymentMethod: parsed.paymentMethod,
      paymentDate: parsed.paymentDate,
      referenceNumber: parsed.referenceNumber,
      remarks: parsed.remarks,
      branchId: invoice.branchId,
      currency: invoice.currency,
      receivedBy: session.userId,
      idempotencyKey: randomUUID(),
      allocations: [], // auto-allocation
    });

    revalidatePath('/finance/invoices');
    revalidatePath('/finance/payments');
    revalidatePath('/finance');
    if (invoice.enrollmentId) {
      revalidatePath(`/enrollments/${invoice.enrollmentId}`);
    }

    // Try to auto-confirm if enrollment is Approved
    if (invoice.enrollmentId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: invoice.enrollmentId },
        select: { enrollmentStatus: true },
      });
      if (enrollment?.enrollmentStatus === 'Approved') {
        try {
          const { enrollmentService } = await import('../../../lib/runtime');
          await enrollmentService.confirmEnrollment(invoice.enrollmentId, session.userId);
        } catch (enrErr: any) {
          console.warn('Auto-confirmation during payment skipped:', enrErr.message);
        }
      }
    }

    return {
      success: true,
      data: {
        paymentId: result.payment.id,
        paymentNumber: result.payment.paymentNumber,
        receiptNumber: result.receipt.receiptNumber,
      },
    };
  } catch (error: any) {
    console.error('recordPaymentAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
