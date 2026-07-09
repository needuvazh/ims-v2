import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaFinanceRepository } from '../infrastructure/prisma-finance-repository';
import {
  CreateInvoiceInput,
  calculateInvoice,
  resolveAgingBucket,
} from '../domain/invoice';
import {
  CreateInstallmentPlanInput,
  validateInstallmentPlan,
} from '../domain/installment-plan';
import {
  CreatePaymentInput,
  validatePaymentAllocations,
} from '../domain/payment';
import { RequestRefundInput, validateRefundAmount } from '../domain/refund';
import { checkCorporateCredit } from '../domain/corporate-credit';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export class FinanceService {
  private readonly repo: PrismaFinanceRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinanceRepository(prisma);
  }

  // 1. Create Invoice
  async createInvoice(
    input: CreateInvoiceInput,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      // Perform domain calculations
      const calculated = calculateInvoice(input);
      const invoiceNumber = await this.repo.getNextInvoiceNumber(
        input.branchId,
        client,
      );

      const invoice = await this.repo.createInvoice(
        {
          ...calculated,
          invoiceNumber,
          invoiceType: input.invoiceType,
          category: input.category,
          subCategory: input.subCategory,
          studentProfileId: input.studentProfileId,
          corporateAccountId: input.corporateAccountId,
          enrollmentId: input.enrollmentId,
          branchId: input.branchId,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
          currency: input.currency,
          sourceQuotationId: input.sourceQuotationId,
          sourceSalesOrderId: input.sourceSalesOrderId,
        },
        client,
      );

      // Create initial Receivable
      const agingBucket = resolveAgingBucket(input.dueDate, input.invoiceDate);
      await this.repo.upsertReceivable(
        {
          invoiceId: invoice.id,
          branchId: invoice.branchId,
          dueDate: invoice.dueDate,
          outstandingAmount: invoice.outstandingAmount.toNumber(),
          status: 'Open',
          agingBucket,
        },
        client,
      );

      // Handle installment plan generation/validation
      if (input.subCategory === 'Installment') {
        if (
          !input.numberOfInstallments ||
          !input.installments ||
          input.installments.length === 0
        ) {
          throw new Error(
            'Installment details (numberOfInstallments, installments) are required when subCategory is Installment',
          );
        }

        // Validate installments
        const planInput = {
          enrollmentId: input.enrollmentId,
          invoiceId: invoice.id,
          branchId: invoice.branchId,
          planName: `Installment Plan for ${invoiceNumber}`,
          totalAmount: calculated.totalAmount.toNumber(),
          numberOfInstallments: input.numberOfInstallments,
          installments: input.installments.map((inst, index) => ({
            sequenceNumber: index + 1,
            dueDate: inst.dueDate,
            amount: inst.amount,
          })),
        };

        validateInstallmentPlan(planInput);

        // Create the installment plan
        const plan = await this.repo.createInstallmentPlan(planInput, client);
        await client.installmentPlan.update({
          where: { id: plan.id },
          data: { status: 'Active', activatedAt: new Date() },
        });

        // Publish outbox event for the installment plan
        await client.outboxEvent.create({
          data: {
            eventType: 'InstallmentPlanCreated',
            aggregateType: 'InstallmentPlan',
            aggregateId: plan.id,
            payload: {
              installmentPlanId: plan.id,
              invoiceId: plan.invoiceId,
              numberOfInstallments: plan.numberOfInstallments,
              totalAmount: plan.totalAmount.toNumber(),
            },
            availableAt: new Date(),
          },
        });
      }

      // Publish transactional outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'InvoiceGenerated',
          aggregateType: 'Invoice',
          aggregateId: invoice.id,
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount.toNumber(),
            outstandingAmount: invoice.outstandingAmount.toNumber(),
            studentProfileId: invoice.studentProfileId,
            corporateAccountId: invoice.corporateAccountId,
            enrollmentId: invoice.enrollmentId,
            branchId: invoice.branchId,
          },
          availableAt: new Date(),
        },
      });

      return invoice;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // 2. Create Installment Plan
  async createInstallmentPlan(
    input: CreateInstallmentPlanInput,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      // Domain validation
      validateInstallmentPlan(input);

      // Verify invoice exists
      const invoice = await this.repo.findInvoiceById(input.invoiceId, client);
      if (!invoice) {
        throw new Error('ERR_FIN_INVOICE_NOT_FOUND');
      }

      // Create plan
      const plan = await this.repo.createInstallmentPlan(input, client);

      // Update installment plan status to Active
      await client.installmentPlan.update({
        where: { id: plan.id },
        data: { status: 'Active', activatedAt: new Date() },
      });

      // Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'InstallmentPlanCreated',
          aggregateType: 'InstallmentPlan',
          aggregateId: plan.id,
          payload: {
            installmentPlanId: plan.id,
            invoiceId: plan.invoiceId,
            numberOfInstallments: plan.numberOfInstallments,
            totalAmount: plan.totalAmount.toNumber(),
          },
          availableAt: new Date(),
        },
      });

      return plan;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // 3. Record Payment
  async recordPayment(
    input: CreatePaymentInput,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      // Domain validation
      validatePaymentAllocations(input);

      // Find invoice
      const invoice = await this.repo.findInvoiceById(input.invoiceId, client);
      if (!invoice) {
        throw new Error('ERR_FIN_INVOICE_NOT_FOUND');
      }

      // Check if the invoice is linked to an enrollment and batch capacity is exceeded
      if (invoice.enrollmentId) {
        const enrollment = await client.enrollment.findUnique({
          where: { id: invoice.enrollmentId },
        });
        if (enrollment && !enrollment.isDeleted) {
          const batch = await client.batch.findUnique({
            where: { id: enrollment.batchId },
          });
          if (batch && !batch.isDeleted) {
            // Check if student holds a waitlist promotion reservation
            const promotedWaitlistEntry = await client.waitingList.findFirst({
              where: {
                batchId: enrollment.batchId,
                studentProfileId: enrollment.studentProfileId,
                status: 'Promoted',
                isDeleted: false,
              },
            });
            const hasReservation = !!promotedWaitlistEntry;

            const activeCount = await client.enrollment.count({
              where: {
                batchId: enrollment.batchId,
                enrollmentStatus: { in: ['Approved', 'Confirmed', 'Active'] },
                isDeleted: false,
              },
            });

            const maxCapacity = batch.capacity || 0;
            if (!hasReservation) {
              const promotedCount = await client.waitingList.count({
                where: {
                  batchId: enrollment.batchId,
                  status: 'Promoted',
                  isDeleted: false,
                },
              });
              const totalReserved = activeCount + promotedCount;

              if (totalReserved >= maxCapacity) {
                if (!batch.waitingListEnabled) {
                  throw new Error('ERR_ENR_BATCH_FULL');
                }
              }
            }
          }
        }
      }

      const paymentNumber = await this.repo.getNextPaymentNumber(
        input.branchId,
        client,
      );

      // Auto allocation if allocations array is empty
      let allocations = [...input.allocations];
      if (allocations.length === 0) {
        // If there's an active installment plan, allocate to the pending installments in order
        if (invoice.installmentPlans && invoice.installmentPlans.length > 0) {
          const activePlan = invoice.installmentPlans.find(
            (p) => p.status === 'Active',
          );
          if (activePlan) {
            let remainingPayment = new Decimal(input.amount);
            for (const inst of activePlan.installments) {
              if (remainingPayment.isZero()) break;

              const instOutstanding = new Decimal(inst.amount.toString()).minus(
                new Decimal(inst.paidAmount.toString()),
              );
              if (instOutstanding.greaterThan(0)) {
                const allocateAmt = Decimal.min(
                  remainingPayment,
                  instOutstanding,
                );
                allocations.push({
                  invoiceId: invoice.id,
                  installmentId: inst.id,
                  allocatedAmount: allocateAmt.toNumber(),
                });
                remainingPayment = remainingPayment.minus(allocateAmt);
              }
            }
          }
        }

        // If still remaining payment or no installment plan, allocate to the invoice directly
        if (allocations.length === 0) {
          allocations.push({
            invoiceId: invoice.id,
            allocatedAmount: input.amount,
          });
        }
      }

      // Create Payment and allocations
      const payment = await this.repo.createPayment(
        {
          ...input,
          paymentNumber,
          allocations,
          status: 'Posted',
        },
        client,
      );

      // Post Payment: update invoice paid & outstanding amounts
      const newPaidAmount = new Decimal(invoice.paidAmount.toString()).plus(
        new Decimal(input.amount),
      );
      const newOutstandingAmount = new Decimal(
        invoice.totalAmount.toString(),
      ).minus(newPaidAmount);
      let newInvoiceStatus: any = 'PartiallyPaid';
      if (newOutstandingAmount.lessThanOrEqualTo(0)) {
        newInvoiceStatus = 'Paid';
      }

      await this.repo.updateInvoiceStatus(
        invoice.id,
        newInvoiceStatus,
        newPaidAmount.toNumber(),
        newOutstandingAmount.toNumber(),
        client,
      );

      // Update individual installments if payment was allocated to them
      for (const alloc of allocations) {
        if (alloc.installmentId) {
          const installment = await client.installment.findUnique({
            where: { id: alloc.installmentId },
          });
          if (installment) {
            const currentPaid = new Decimal(installment.paidAmount.toString());
            const newInstPaid = currentPaid.plus(
              new Decimal(alloc.allocatedAmount),
            );
            const expectedAmt = new Decimal(installment.amount.toString());
            const instStatus = newInstPaid.greaterThanOrEqualTo(expectedAmt)
              ? 'Paid'
              : 'PartiallyPaid';

            await this.repo.updateInstallmentPaidAmount(
              alloc.installmentId,
              newInstPaid.toNumber(),
              instStatus,
              client,
            );
          }
        }
      }

      // Check if installment plan is fully completed
      if (invoice.installmentPlans && invoice.installmentPlans.length > 0) {
        const activePlan = invoice.installmentPlans.find(
          (p) => p.status === 'Active',
        );
        if (activePlan) {
          // Refresh plan installments
          const planInsts = await client.installment.findMany({
            where: { installmentPlanId: activePlan.id },
          });
          const allPaid = planInsts.every((inst) => inst.status === 'Paid');
          if (allPaid) {
            await client.installmentPlan.update({
              where: { id: activePlan.id },
              data: { status: 'Completed', completedAt: new Date() },
            });
          }
        }
      }

      // Generate Receipt
      const receipt = await this.repo.createReceipt(
        {
          paymentId: payment.id,
          branchId: input.branchId,
          amount: payment.amount.toNumber(),
          currency: payment.currency,
          issuedBy: input.receivedBy,
        },
        client,
      );

      // Update Receivable
      const recStatus = newOutstandingAmount.lessThanOrEqualTo(0)
        ? 'Settled'
        : 'PartiallyPaid';
      await this.repo.upsertReceivable(
        {
          invoiceId: invoice.id,
          branchId: invoice.branchId,
          dueDate: invoice.dueDate,
          outstandingAmount: newOutstandingAmount.toNumber(),
          status: recStatus,
          agingBucket: resolveAgingBucket(invoice.dueDate, new Date()),
        },
        client,
      );

      // If corporate, update corporate outstanding balance
      if (invoice.corporateAccountId) {
        // Decrease outstanding by the paid amount
        await this.repo.updateCorporateOutstanding(
          invoice.corporateAccountId,
          invoice.branchId,
          -input.amount,
          client,
        );
      }

      // Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'PaymentRecorded',
          aggregateType: 'Payment',
          aggregateId: payment.id,
          payload: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            invoiceId: payment.invoiceId,
            receiptId: receipt.id,
            receiptNumber: receipt.receiptNumber,
            amount: payment.amount.toNumber(),
            currency: payment.currency,
          },
          availableAt: new Date(),
        },
      });

      return { payment, receipt };
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // 4. Request Refund
  async requestRefund(
    input: RequestRefundInput,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      // Find payment
      const payment = await this.repo.findPaymentById(input.paymentId, client);
      if (!payment) {
        throw new Error('ERR_FIN_PAYMENT_NOT_FOUND');
      }

      // Check already refunded amount
      const refunds = await client.refund.findMany({
        where: {
          paymentId: payment.id,
          status: { in: ['Requested', 'Approved', 'Executed'] },
        },
      });
      const refundedTotal = refunds.reduce(
        (sum, r) => sum.plus(new Decimal(r.amount.toString())),
        new Decimal(0),
      );

      validateRefundAmount(
        input.amount,
        payment.amount.toNumber(),
        refundedTotal.toNumber(),
      );

      const refundNumber = await this.repo.getNextRefundNumber(
        input.branchId,
        client,
      );

      const refund = await this.repo.createRefund(
        {
          ...input,
          refundNumber,
          status: 'Requested',
        },
        client,
      );

      // Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'RefundRequested',
          aggregateType: 'Refund',
          aggregateId: refund.id,
          payload: {
            refundId: refund.id,
            refundNumber: refund.refundNumber,
            paymentId: refund.paymentId,
            amount: refund.amount.toNumber(),
          },
          availableAt: new Date(),
        },
      });

      return refund;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // 5. Approve Refund
  async approveRefund(
    refundId: string,
    deciderId: string,
    decisionReason: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const refund = await this.repo.findRefundById(refundId, client);
      if (!refund) {
        throw new Error('ERR_FIN_REFUND_NOT_FOUND');
      }
      if (refund.status !== 'Requested') {
        throw new Error('ERR_FIN_REFUND_NOT_PENDING');
      }

      const updated = await this.repo.updateRefundStatus(
        refundId,
        'Approved',
        deciderId,
        decisionReason,
        client,
      );

      // Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'RefundApproved',
          aggregateType: 'Refund',
          aggregateId: refund.id,
          payload: {
            refundId: refund.id,
            paymentId: refund.paymentId,
            approvedBy: deciderId,
          },
          availableAt: new Date(),
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // 6. Execute Refund
  async executeRefund(
    refundId: string,
    executionRef: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const refund = await this.repo.findRefundById(refundId, client);
      if (!refund) {
        throw new Error('ERR_FIN_REFUND_NOT_FOUND');
      }
      if (refund.status !== 'Approved') {
        throw new Error('ERR_FIN_REFUND_NOT_APPROVED');
      }

      // Update refund status to Executed
      const updated = await client.refund.update({
        where: { id: refundId },
        data: {
          status: 'Executed',
          executedAt: new Date(),
          executionReference: executionRef,
        },
      });

      // Update the invoice paidAmount and outstandingAmount (reversing the paid amount)
      const invoice = await this.repo.findInvoiceById(refund.invoiceId, client);
      if (invoice) {
        const refundedAmt = new Decimal(refund.amount.toString());
        const newPaidAmount = new Decimal(invoice.paidAmount.toString()).minus(
          refundedAmt,
        );
        const newOutstandingAmount = new Decimal(
          invoice.outstandingAmount.toString(),
        ).plus(refundedAmt);
        const status = newOutstandingAmount.greaterThan(0)
          ? 'PartiallyPaid'
          : 'Paid';

        await this.repo.updateInvoiceStatus(
          invoice.id,
          status,
          newPaidAmount.toNumber(),
          newOutstandingAmount.toNumber(),
          client,
        );

        // Also update Receivable outstanding
        await this.repo.upsertReceivable(
          {
            invoiceId: invoice.id,
            branchId: invoice.branchId,
            dueDate: invoice.dueDate,
            outstandingAmount: newOutstandingAmount.toNumber(),
            status: newOutstandingAmount.greaterThan(0) ? 'Open' : 'Settled',
            agingBucket: resolveAgingBucket(invoice.dueDate, new Date()),
          },
          client,
        );

        // If corporate, update corporate outstanding (increase exposure again due to refund)
        if (invoice.corporateAccountId) {
          await this.repo.updateCorporateOutstanding(
            invoice.corporateAccountId,
            invoice.branchId,
            refund.amount.toNumber(),
            client,
          );
        }
      }

      // Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'RefundExecuted',
          aggregateType: 'Refund',
          aggregateId: refund.id,
          payload: {
            refundId: refund.id,
            paymentId: refund.paymentId,
            amount: refund.amount.toNumber(),
            executionReference: executionRef,
          },
          availableAt: new Date(),
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // 7. Verify Corporate Credit
  async verifyCorporateCreditLimit(
    corporateAccountId: string,
    branchId: string,
    newAmount: number,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx || this.prisma;

    const creditData = await this.repo.getCorporateCreditLimit(
      corporateAccountId,
      branchId,
      client,
    );
    const result = checkCorporateCredit({
      creditLimit: creditData.creditLimit,
      currentOutstanding: creditData.currentOutstanding,
      committedAmount: creditData.committedAmount,
      blockOnCreditLimit: creditData.blockOnCreditLimit,
      requestedAmount: newAmount,
    });

    if (!result.passed) {
      // Publish event that validation failed
      await client.outboxEvent.create({
        data: {
          eventType: 'CorporateCreditValidationFailed',
          aggregateType: 'CorporateAccount',
          aggregateId: corporateAccountId,
          payload: {
            corporateAccountId,
            requestedAmount: newAmount,
            message: result.message,
          },
          availableAt: new Date(),
        },
      });
      throw new Error(result.message);
    }

    // Publish event validation passed
    await client.outboxEvent.create({
      data: {
        eventType: 'CorporateCreditValidationPassed',
        aggregateType: 'CorporateAccount',
        aggregateId: corporateAccountId,
        payload: {
          corporateAccountId,
          requestedAmount: newAmount,
          message: result.message,
        },
        availableAt: new Date(),
      },
    });

    return true;
  }

  // 8. Issue Invoice
  async issueInvoice(invoiceId: string, tx?: Prisma.TransactionClient) {
    const run = async (client: Prisma.TransactionClient) => {
      const invoice = await this.repo.findInvoiceById(invoiceId, client);
      if (!invoice) {
        throw new Error('ERR_FIN_INVOICE_NOT_FOUND');
      }
      if (invoice.status !== 'Draft') {
        throw new Error('ERR_FIN_INVOICE_NOT_DRAFT');
      }

      const updated = await client.invoice.update({
        where: { id: invoiceId },
        data: { status: 'Issued', issuedAt: new Date() },
      });

      // Publish outbox event
      await client.outboxEvent.create({
        data: {
          eventType: 'InvoiceIssued',
          aggregateType: 'Invoice',
          aggregateId: invoiceId,
          payload: {
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount.toNumber(),
          },
          availableAt: new Date(),
        },
      });

      return updated;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }
}
