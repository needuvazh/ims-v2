import { PrismaClient, Prisma } from '@prisma/client';
import { CalculatedInvoice, AgingBucket } from '../domain/invoice';
import { CreateInstallmentPlanInput } from '../domain/installment-plan';
import { CreatePaymentInput } from '../domain/payment';
import { RequestRefundInput } from '../domain/refund';

export class PrismaFinanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // --- INVOICE METHODS ---

  async getNextInvoiceNumber(
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    // Using a sequence pattern for invoices
    const count = await client.invoice.count({
      where: {
        branchId,
        invoiceDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    const seq = (count + 1).toString().padStart(6, '0');
    return `INV-${year}-${seq}`;
  }

  async createInvoice(
    data: CalculatedInvoice & {
      invoiceNumber: string;
      invoiceType: any;
      category: any;
      subCategory: any;
      studentProfileId?: string | null;
      corporateAccountId?: string | null;
      enrollmentId?: string | null;
      branchId: string;
      invoiceDate: Date;
      dueDate: Date;
      currency: string;
      sourceQuotationId?: string | null;
      sourceSalesOrderId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    return client.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        invoiceType: data.invoiceType,
        category: data.category,
        subCategory: data.subCategory,
        studentProfileId: data.studentProfileId || null,
        corporateAccountId: data.corporateAccountId || null,
        enrollmentId: data.enrollmentId || null,
        branchId: data.branchId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        currency: data.currency,
        subtotal: new Prisma.Decimal(data.subtotal.toString()),
        discountAmount: new Prisma.Decimal(data.discountAmount.toString()),
        taxAmount: new Prisma.Decimal(data.taxAmount.toString()),
        totalAmount: new Prisma.Decimal(data.totalAmount.toString()),
        outstandingAmount: new Prisma.Decimal(
          data.outstandingAmount.toString(),
        ),
        status: 'Draft',
        sourceQuotationId: data.sourceQuotationId || null,
        sourceSalesOrderId: data.sourceSalesOrderId || null,
        lineItems: {
          create: data.lineItems.map((item) => ({
            enrollmentId: item.enrollmentId || null,
            courseId: item.courseId || null,
            sourceBranchId: item.sourceBranchId,
            lineSequence: item.lineSequence,
            descriptionEnglish: item.descriptionEnglish,
            descriptionArabic: item.descriptionArabic || null,
            quantity: new Prisma.Decimal(item.quantity.toString()),
            unitPrice: new Prisma.Decimal(item.unitPrice.toString()),
            discountAmount: new Prisma.Decimal(item.discountAmount.toString()),
            taxableAmount: new Prisma.Decimal(item.taxableAmount.toString()),
            taxRate: new Prisma.Decimal(item.taxRate.toString()),
            taxAmount: new Prisma.Decimal(item.taxAmount.toString()),
            lineTotal: new Prisma.Decimal(item.lineTotal.toString()),
          })),
        },
      },
      include: {
        lineItems: true,
      },
    });
  }

  async findInvoiceById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.invoice.findFirst({
      where: { id, isDeleted: false },
      include: {
        lineItems: true,
        installmentPlans: {
          include: {
            installments: {
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
        payments: {
          where: { isDeleted: false },
        },
      },
    });
  }

  async updateInvoiceStatus(
    id: string,
    status: any,
    paidAmount: number,
    outstandingAmount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.invoice.update({
      where: { id },
      data: {
        status,
        paidAmount: new Prisma.Decimal(paidAmount.toString()),
        outstandingAmount: new Prisma.Decimal(outstandingAmount.toString()),
      },
    });
  }

  // --- INSTALLMENT PLAN METHODS ---

  async createInstallmentPlan(
    data: CreateInstallmentPlanInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    return client.installmentPlan.create({
      data: {
        enrollmentId: data.enrollmentId || null,
        invoiceId: data.invoiceId,
        branchId: data.branchId,
        planName: data.planName,
        totalAmount: new Prisma.Decimal(data.totalAmount.toString()),
        numberOfInstallments: data.numberOfInstallments,
        status: 'Draft',
        installments: {
          create: data.installments.map((inst) => ({
            sequenceNumber: inst.sequenceNumber,
            dueDate: inst.dueDate,
            amount: new Prisma.Decimal(inst.amount.toString()),
            status: 'Pending',
          })),
        },
      },
      include: {
        installments: true,
      },
    });
  }

  async findInstallmentPlanByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.installmentPlan.findFirst({
      where: { invoiceId, isDeleted: false },
      include: {
        installments: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });
  }

  async updateInstallmentPaidAmount(
    installmentId: string,
    paidAmount: number,
    status: any,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.installment.update({
      where: { id: installmentId },
      data: {
        paidAmount: new Prisma.Decimal(paidAmount.toString()),
        status,
        lastPaymentAt: new Date(),
      },
    });
  }

  // --- PAYMENT METHODS ---

  async getNextPaymentNumber(
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const count = await client.payment.count({
      where: {
        branchId,
        paymentDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    const seq = (count + 1).toString().padStart(6, '0');
    return `PAY-${year}-${seq}`;
  }

  async createPayment(
    data: CreatePaymentInput & { paymentNumber: string; status: any },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    return client.payment.create({
      data: {
        paymentNumber: data.paymentNumber,
        invoiceId: data.invoiceId,
        studentProfileId: data.studentProfileId || null,
        corporateAccountId: data.corporateAccountId || null,
        branchId: data.branchId,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        currency: data.currency,
        amount: new Prisma.Decimal(data.amount.toString()),
        referenceNumber: data.referenceNumber || null,
        remarks: data.remarks || null,
        receivedBy: data.receivedBy,
        status: data.status,
        idempotencyKey: data.idempotencyKey,
        allocations: {
          create: data.allocations.map((alloc, idx) => ({
            invoiceId: alloc.invoiceId,
            installmentId: alloc.installmentId || null,
            allocatedAmount: new Prisma.Decimal(
              alloc.allocatedAmount.toString(),
            ),
            allocationSequence: idx + 1,
            allocatedAt: new Date(),
          })),
        },
      },
      include: {
        allocations: true,
      },
    });
  }

  async findPaymentById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.payment.findFirst({
      where: { id, isDeleted: false },
      include: {
        allocations: true,
        receipt: true,
      },
    });
  }

  // --- RECEIPT METHODS ---

  async getNextReceiptNumber(
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const count = await client.receipt.count({
      where: {
        branchId,
        receiptDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    const seq = (count + 1).toString().padStart(6, '0');
    return `RCP-${year}-${seq}`;
  }

  async createReceipt(
    data: {
      paymentId: string;
      branchId: string;
      amount: number;
      currency: string;
      issuedBy: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const receiptNumber = await this.getNextReceiptNumber(data.branchId, tx);

    return client.receipt.create({
      data: {
        receiptNumber,
        paymentId: data.paymentId,
        branchId: data.branchId,
        receiptDate: new Date(),
        amount: new Prisma.Decimal(data.amount.toString()),
        currency: data.currency,
        issuedBy: data.issuedBy,
        issuedAt: new Date(),
      },
    });
  }

  // --- REFUND METHODS ---

  async getNextRefundNumber(
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const count = await client.refund.count({
      where: {
        branchId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    const seq = (count + 1).toString().padStart(6, '0');
    return `RFD-${year}-${seq}`;
  }

  async createRefund(
    data: RequestRefundInput & { refundNumber: string; status: any },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    return client.refund.create({
      data: {
        refundNumber: data.refundNumber,
        paymentId: data.paymentId,
        invoiceId: data.invoiceId,
        branchId: data.branchId,
        refundType: data.refundType,
        amount: new Prisma.Decimal(data.amount.toString()),
        currency: 'OMR',
        reasonCode: data.reasonCode,
        reasonNarrative: data.reasonNarrative,
        status: data.status,
        requestedBy: data.requestedBy,
        requestedAt: new Date(),
      },
    });
  }

  async findRefundById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.refund.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async updateRefundStatus(
    id: string,
    status: any,
    decidedBy?: string,
    decisionReason?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.refund.update({
      where: { id },
      data: {
        status,
        decidedBy: decidedBy || null,
        decidedAt: decidedBy ? new Date() : null,
        decisionReason: decisionReason || null,
        executedAt: status === 'Executed' ? new Date() : null,
      },
    });
  }

  // --- RECEIVABLE METHODS ---

  async upsertReceivable(
    data: {
      invoiceId: string;
      branchId: string;
      dueDate: Date;
      outstandingAmount: number;
      status: any;
      agingBucket: AgingBucket;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    return client.receivable.upsert({
      where: { invoiceId: data.invoiceId },
      update: {
        outstandingAmount: new Prisma.Decimal(
          data.outstandingAmount.toString(),
        ),
        status: data.status,
        agingBucket: data.agingBucket,
        lastCalculatedAt: new Date(),
      },
      create: {
        invoiceId: data.invoiceId,
        branchId: data.branchId,
        dueDate: data.dueDate,
        outstandingAmount: new Prisma.Decimal(
          data.outstandingAmount.toString(),
        ),
        status: data.status,
        agingBucket: data.agingBucket,
        lastCalculatedAt: new Date(),
      },
    });
  }

  async findReceivableByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.receivable.findUnique({
      where: { invoiceId, isDeleted: false },
    });
  }

  // --- CORPORATE CREDIT METHODS ---

  async getCorporateCreditLimit(
    corporateAccountId: string,
    branchId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    creditLimit: number;
    currentOutstanding: number;
    committedAmount: number;
    blockOnCreditLimit: boolean;
  }> {
    const client = tx || this.prisma;

    // Get from credit rules
    const rule = await client.corporateCreditRule.findFirst({
      where: {
        corporateAccountId,
        branchId,
        status: 'Active',
        isDeleted: false,
      },
    });

    if (rule) {
      return {
        creditLimit: rule.creditLimit.toNumber(),
        currentOutstanding: rule.currentOutstanding.toNumber(),
        committedAmount: rule.committedAmount.toNumber(),
        blockOnCreditLimit: rule.blockOnCreditLimit,
      };
    }

    // Default corporate account values
    const account = await client.corporateAccount.findFirst({
      where: { id: corporateAccountId, isDeleted: false },
    });

    if (account) {
      return {
        creditLimit: account.creditLimit.toNumber(),
        currentOutstanding: account.currentOutstanding.toNumber(),
        committedAmount: 0,
        blockOnCreditLimit: account.blockOnCreditLimit,
      };
    }

    return {
      creditLimit: 0,
      currentOutstanding: 0,
      committedAmount: 0,
      blockOnCreditLimit: true,
    };
  }

  async updateCorporateOutstanding(
    corporateAccountId: string,
    branchId: string,
    amountChange: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const change = new Prisma.Decimal(amountChange.toString());

    // Update Corporate Account outstanding
    await client.corporateAccount.update({
      where: { id: corporateAccountId },
      data: {
        currentOutstanding: {
          increment: change,
        },
      },
    });

    // Also update rule outstanding if rule exists
    const rule = await client.corporateCreditRule.findFirst({
      where: {
        corporateAccountId,
        branchId,
        status: 'Active',
        isDeleted: false,
      },
    });

    if (rule) {
      await client.corporateCreditRule.update({
        where: { id: rule.id },
        data: {
          currentOutstanding: {
            increment: change,
          },
          availableCredit: {
            decrement: change,
          },
        },
      });
    }
  }
}
