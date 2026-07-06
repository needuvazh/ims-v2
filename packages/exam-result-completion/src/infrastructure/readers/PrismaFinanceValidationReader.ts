import { PrismaClient } from '@prisma/client';
import { FinanceValidationReader } from '../../domain/interfaces/FinanceValidationReader';

export class PrismaFinanceValidationReader implements FinanceValidationReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getPaymentStatusForEnrollment(enrollmentId: string): Promise<{
    totalDue: number;
    totalPaid: number;
    outstanding: number;
    outcome: 'Cleared' | 'Outstanding' | 'Overdue';
    lastPaymentDate: Date | null;
  } | null> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        enrollmentId,
        isDeleted: false,
      },
    });

    if (invoices.length === 0) {
      return null;
    }

    const totalDue = invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
    const outstanding = totalDue - totalPaid;

    let outcome: 'Cleared' | 'Outstanding' | 'Overdue';
    if (outstanding <= 0) {
      outcome = 'Cleared';
    } else {
      const hasOverdue = invoices.some((inv) => {
        return inv.dueDate < new Date() && (inv.status === 'Issued' || inv.status === 'PartiallyPaid');
      });
      outcome = hasOverdue ? 'Overdue' : 'Outstanding';
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        invoiceId: { in: invoices.map((inv) => inv.id) },
        isDeleted: false,
        status: 'Posted',
      },
      orderBy: { paymentDate: 'desc' },
      take: 1,
    });

    const lastPaymentDate = payments.length > 0 ? payments[0].paymentDate : null;

    return {
      totalDue,
      totalPaid,
      outstanding: Math.max(0, outstanding),
      outcome,
      lastPaymentDate,
    };
  }
}
