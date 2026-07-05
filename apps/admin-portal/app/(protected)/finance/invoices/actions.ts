'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission, assertBranchScope, getSession } from '../../../lib/auth-guard';
import { prisma } from '@ims/database';

const CreateInvoiceRequestSchema = z.object({
  invoiceType: z.enum([
    'StudentInvoice',
    'CorporateInvoice',
    'AdvanceInvoice',
    'MilestoneInvoice',
    'FinalInvoice',
    'RefundInvoice'
  ]),
  studentProfileId: z.string().uuid().nullable().optional(),
  corporateAccountId: z.string().uuid().nullable().optional(),
  enrollmentId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  invoiceDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  dueDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  currency: z.string().length(3).default('OMR'),
  lineItems: z.array(
    z.object({
      enrollmentId: z.string().uuid().nullable().optional(),
      courseId: z.string().uuid().nullable().optional(),
      sourceBranchId: z.string().uuid(),
      descriptionEnglish: z.string().min(1),
      descriptionArabic: z.string().optional().nullable(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      discountAmount: z.number().nonnegative().default(0),
      taxRate: z.number().nonnegative().default(0.05)
    })
  ).min(1),
  sourceQuotationId: z.string().uuid().nullable().optional(),
  sourceSalesOrderId: z.string().uuid().nullable().optional()
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
      branchId: targetBranchId
    });

    revalidatePath('/finance/invoices');
    revalidatePath('/finance');

    return {
      success: true,
      data: {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount.toNumber()
      }
    };
  } catch (error: any) {
    console.error('createInvoiceAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}
