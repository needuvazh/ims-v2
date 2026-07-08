'use server';

import { revalidatePath } from 'next/cache';
import { assertPermission, assertBranchScope } from '@/lib/auth-guard';
import { prisma, enrollmentService, financeService } from '@/lib/runtime';
import { randomUUID } from 'crypto';

export async function createEnrollmentWithBillingAction(data: any) {
  try {
    // 1. Authenticate and enforce permission
    const session = await assertPermission('enrollment.create');

    // 2. Resolve branch from the selected admission
    const admission = await prisma.admission.findUnique({
      where: { id: data.admissionId },
      select: { branchId: true }
    });
    if (!admission) {
      throw new Error('ERR_ADMISSION_NOT_FOUND');
    }
    
    // 3. Assert active branch scope
    await assertBranchScope(admission.branchId);

    // Run in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check for duplicate enrollment (studentProfileId + batchId)
      if (data.studentProfileId) {
        const duplicate = await tx.enrollment.findFirst({
          where: {
            studentProfileId: data.studentProfileId,
            batchId: data.batchId,
            isDeleted: false
          }
        });
        if (duplicate) {
          throw new Error('This student is already enrolled in the selected batch.');
        }
      }

      // 4. Create enrollment (returns the enrollment)
      const enrollment = await enrollmentService.createEnrollment({
        studentProfileId: data.studentProfileId,
        admissionId: data.admissionId,
        courseId: data.courseId,
        batchId: data.batchId,
        branchId: admission.branchId,
        enrollmentType: data.enrollmentType,
        promoCodes: data.promoCodes,
        actorId: session.userId
      }, tx);

      // Map line items (calculate discount allocations across non-discount items)
      const lineItemsRaw = data.lineItems || [];
      const nonDiscountItems = lineItemsRaw.filter((li: any) => !li.isDiscount);
      const discountItems = lineItemsRaw.filter((li: any) => li.isDiscount);

      const subtotal = nonDiscountItems.reduce((sum: number, item: any) => {
        return sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      }, 0);

      const totalDiscount = discountItems.reduce((sum: number, item: any) => {
        return sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      }, 0);

      if (totalDiscount > subtotal) {
        throw new Error('Total discount amount cannot exceed subtotal.');
      }

      let remainingDiscount = totalDiscount;
      const mappedLineItems = nonDiscountItems.map((item: any) => {
        const itemPrice = Number(item.unitPrice);
        const itemDiscount = Math.min(itemPrice, remainingDiscount);
        remainingDiscount -= itemDiscount;

        return {
          enrollmentId: enrollment.id,
          courseId: item.courseId || data.courseId,
          sourceBranchId: item.sourceBranchId || admission.branchId,
          descriptionEnglish: item.descriptionEnglish,
          quantity: Number(item.quantity) || 1,
          unitPrice: itemPrice,
          discountAmount: Number(itemDiscount.toFixed(3)),
          taxRate: Number(data.taxRate) / 100,
        };
      });

      // 5. Create Invoice
      const invoice = await financeService.createInvoice({
        invoiceType: data.enrollmentType === 'Corporate' ? 'CorporateInvoice' : 'StudentInvoice',
        category: data.enrollmentType === 'Corporate' ? 'Corporate' : 'Student',
        subCategory: data.invoiceSubCategory,
        studentProfileId: enrollment.studentProfileId,
        corporateAccountId: data.corporateAccountId || null,
        enrollmentId: enrollment.id,
        branchId: admission.branchId,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.invoiceDueDate),
        currency: 'OMR',
        lineItems: mappedLineItems,
        numberOfInstallments: data.invoiceSubCategory === 'Installment' ? data.numberOfInstallments : null,
        installments: data.invoiceSubCategory === 'Installment' ? data.installments.map((inst: any) => ({
          dueDate: new Date(inst.dueDate),
          amount: Number(inst.amount)
        })) : null
      }, tx);

      // 6. Issue Invoice immediately so it accepts payments
      const issuedInvoice = await financeService.issueInvoice(invoice.id, tx);

      // 7. Record Payment (if collected amount > 0)
      let paymentResult = null;
      if (data.paymentCollected && Number(data.paymentCollected) > 0) {
        paymentResult = await financeService.recordPayment({
          invoiceId: issuedInvoice.id,
          amount: Number(data.paymentCollected),
          paymentMethod: data.paymentMethod,
          paymentDate: new Date(data.paymentDate),
          referenceNumber: data.paymentReference || null,
          remarks: data.paymentRemarks || null,
          branchId: admission.branchId,
          currency: 'OMR',
          receivedBy: session.userId,
          idempotencyKey: randomUUID(),
          allocations: [] // auto-allocation
        }, tx);
      }

      return {
        enrollmentId: enrollment.id,
        invoiceId: issuedInvoice.id,
        paymentId: paymentResult?.payment.id || null
      };
    });

    revalidatePath('/enrollments');
    revalidatePath(`/enrollments/${result.enrollmentId}`);
    revalidatePath('/finance/invoices');
    revalidatePath('/finance/payments');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createEnrollmentWithBillingAction failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}
