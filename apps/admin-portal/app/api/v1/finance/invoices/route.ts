import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

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

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_FINANCE_INVOICE_INTERNAL_ERROR';

  if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  } else if (msg.includes('Discount cannot exceed line subtotal')) {
    status = 422;
    code = 'ERR_FINANCE_INVALID_DISCOUNT';
  }

  return NextResponse.json(
    { success: false, errorCode: code, messageEnglish: msg, statusCode: status },
    { status }
  );
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'finance.invoice.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const body = await request.json();
      const parsed = CreateInvoiceRequestSchema.parse(body);

      const targetBranchId = parsed.branchId || session.activeBranchId;
      if (!targetBranchId) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const { branchScopeResolver, financeService } = await import('../../../../lib/runtime');

      // Verify branch permission scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(targetBranchId as Uuid)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const result = await financeService.createInvoice({
        ...parsed,
        branchId: targetBranchId
      });

      const response = NextResponse.json(
        {
          success: true,
          invoiceId: result.id,
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/finance/invoices',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.finance.invoices.create.failed', { status: 'failed', error: error as Error });
      return errorResponse(error as Error);
    }
  }), { route: '/api/v1/finance/invoices' });
}
