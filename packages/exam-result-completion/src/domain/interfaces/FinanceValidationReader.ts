export interface FinanceValidationReader {
  getPaymentStatusForEnrollment(enrollmentId: string): Promise<{
    totalDue: number;
    totalPaid: number;
    outstanding: number;
    outcome: 'Cleared' | 'Outstanding' | 'Overdue';
    lastPaymentDate: Date | null;
  } | null>;
}
