'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertPermission, assertBranchScope } from '../../../lib/auth-guard';
import { prisma } from '@ims/database';

const RequestRefundSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  refundType: z.enum(['Full', 'Partial']),
  amount: z.coerce.number().positive('Amount must be positive'),
  reasonCode: z.string().min(1, 'Reason code is required'),
  reasonNarrative: z.string().min(1, 'Description is required'),
});

export async function requestRefundAction(data: any) {
  try {
    // 1. Authenticate and enforce permission
    const session = await assertPermission('refund.request');

    // 2. Parse input data
    const parsed = RequestRefundSchema.parse(data);

    // 3. Query payment details
    const payment = await prisma.payment.findUnique({
      where: { id: parsed.paymentId, isDeleted: false },
      include: {
        refunds: {
          where: { isDeleted: false, status: { not: 'Rejected' } },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Assert branch scope for the payment's branch
    await assertBranchScope(payment.branchId);

    // 4. Import and call finance service
    const { financeService } = await import('../../../lib/runtime');
    const result = await financeService.requestRefund({
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      branchId: payment.branchId,
      refundType: parsed.refundType,
      amount: parsed.amount,
      reasonCode: parsed.reasonCode,
      reasonNarrative: parsed.reasonNarrative,
      requestedBy: session.userId,
    });

    revalidatePath('/finance/refunds');
    revalidatePath('/finance');

    return {
      success: true,
      data: {
        id: result.id,
        refundNumber: result.refundNumber,
        amount: result.amount.toNumber(),
      },
    };
  } catch (error: any) {
    console.error('requestRefundAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

export async function approveRefundAction(refundId: string, reason: string) {
  try {
    const session = await assertPermission('refund.approve');
    const { financeService } = await import('../../../lib/runtime');

    const result = await financeService.approveRefund(
      refundId,
      session.userId,
      reason,
    );

    revalidatePath('/finance/refunds');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('approveRefundAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

export async function rejectRefundAction(refundId: string, reason: string) {
  try {
    const session = await assertPermission('refund.approve');
    const { prisma } = await import('@ims/database');

    const result = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'Rejected',
        decidedBy: session.userId,
        decidedAt: new Date(),
        decisionReason: reason,
      },
    });

    revalidatePath('/finance/refunds');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('rejectRefundAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

export async function executeRefundAction(
  refundId: string,
  executionRef: string,
) {
  try {
    const session = await assertPermission('refund.approve');
    const { financeService } = await import('../../../lib/runtime');

    const result = await financeService.executeRefund(refundId, executionRef);

    revalidatePath('/finance/refunds');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('executeRefundAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
