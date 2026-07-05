import { expect, test, vi } from 'vitest';
import { FinanceService } from './finance-service';
import { Decimal } from 'decimal.js';

test('createInvoice should compute line totals, subtotal, tax, final total and persist invoice with initial open receivable', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    outboxEvent: { create: vi.fn().mockResolvedValue(null) }
  } as any;

  const service = new FinanceService(mockPrisma);

  // Mock repository methods
  const mockInvoice = {
    id: 'invoice-123',
    invoiceNumber: 'INV-2026-000001',
    totalAmount: new Decimal(105),
    outstandingAmount: new Decimal(105),
    studentProfileId: 'student-123',
    branchId: 'branch-123',
    dueDate: new Date('2026-08-01')
  };

  vi.spyOn(service['repo'], 'getNextInvoiceNumber').mockResolvedValue('INV-2026-000001');
  vi.spyOn(service['repo'], 'createInvoice').mockResolvedValue(mockInvoice as any);
  vi.spyOn(service['repo'], 'upsertReceivable').mockResolvedValue(null as any);

  const input = {
    invoiceType: 'StudentInvoice' as const,
    category: 'Student' as const,
    subCategory: 'FullPayment' as const,
    studentProfileId: 'student-123',
    branchId: 'branch-123',
    invoiceDate: new Date('2026-07-04'),
    dueDate: new Date('2026-08-01'),
    currency: 'OMR',
    lineItems: [
      {
        sourceBranchId: 'branch-123',
        descriptionEnglish: 'Course Fee',
        quantity: 1,
        unitPrice: 100,
        discountAmount: 0,
        taxRate: 0.05
      }
    ]
  };

  const invoice = await service.createInvoice(input);

  expect(invoice.id).toBe('invoice-123');
  expect(service['repo'].getNextInvoiceNumber).toHaveBeenCalledWith('branch-123', mockPrisma);
  
  // Verify calculations passed to repo.createInvoice
  expect(service['repo'].createInvoice).toHaveBeenCalledWith(
    expect.objectContaining({
      invoiceNumber: 'INV-2026-000001',
      subtotal: expect.any(Decimal),
      taxAmount: expect.any(Decimal),
      totalAmount: expect.any(Decimal),
      outstandingAmount: expect.any(Decimal),
      lineItems: expect.any(Array)
    }),
    mockPrisma
  );

  // Validate subtotal = 100, tax = 5, total = 105
  const callArgs = vi.mocked(service['repo'].createInvoice).mock.calls[0][0];
  expect(callArgs.subtotal.toNumber()).toBe(100);
  expect(callArgs.taxAmount.toNumber()).toBe(5);
  expect(callArgs.totalAmount.toNumber()).toBe(105);

  // Verify outbox event created
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
});

test('createInvoice should create an installment plan when subCategory is Installment', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    outboxEvent: { create: vi.fn().mockResolvedValue(null) },
    installmentPlan: {
      update: vi.fn().mockResolvedValue({ id: 'plan-123', status: 'Active' })
    }
  } as any;

  const service = new FinanceService(mockPrisma);

  const mockInvoice = {
    id: 'invoice-123',
    invoiceNumber: 'INV-2026-000002',
    totalAmount: new Decimal(100),
    outstandingAmount: new Decimal(100),
    studentProfileId: 'student-123',
    branchId: 'branch-123',
    dueDate: new Date('2026-08-01')
  };

  const mockInstallmentPlan = {
    id: 'plan-123',
    invoiceId: 'invoice-123',
    numberOfInstallments: 2,
    totalAmount: new Decimal(100)
  };

  vi.spyOn(service['repo'], 'getNextInvoiceNumber').mockResolvedValue('INV-2026-000002');
  vi.spyOn(service['repo'], 'createInvoice').mockResolvedValue(mockInvoice as any);
  vi.spyOn(service['repo'], 'upsertReceivable').mockResolvedValue(null as any);
  vi.spyOn(service['repo'], 'createInstallmentPlan').mockResolvedValue(mockInstallmentPlan as any);

  const input = {
    invoiceType: 'StudentInvoice' as const,
    category: 'Student' as const,
    subCategory: 'Installment' as const,
    studentProfileId: 'student-123',
    enrollmentId: 'enroll-123',
    branchId: 'branch-123',
    invoiceDate: new Date('2026-07-04'),
    dueDate: new Date('2026-08-01'),
    currency: 'OMR',
    numberOfInstallments: 2,
    installments: [
      { dueDate: new Date('2026-08-01'), amount: 50 },
      { dueDate: new Date('2026-09-01'), amount: 50 }
    ],
    lineItems: [
      {
        sourceBranchId: 'branch-123',
        descriptionEnglish: 'Course Fee',
        quantity: 1,
        unitPrice: 100,
        discountAmount: 0,
        taxRate: 0
      }
    ]
  };

  const invoice = await service.createInvoice(input);

  expect(invoice.id).toBe('invoice-123');
  expect(service['repo'].createInstallmentPlan).toHaveBeenCalledWith(
    expect.objectContaining({
      invoiceId: 'invoice-123',
      numberOfInstallments: 2,
      totalAmount: 100
    }),
    mockPrisma
  );
  expect(mockPrisma.installmentPlan.update).toHaveBeenCalledWith({
    where: { id: 'plan-123' },
    data: { status: 'Active', activatedAt: expect.any(Date) }
  });
});

test('createInstallmentPlan should fail validation if total amount does not match sum of installment amounts', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma))
  } as any;

  const service = new FinanceService(mockPrisma);

  const input = {
    enrollmentId: 'enroll-123',
    invoiceId: 'invoice-123',
    branchId: 'branch-123',
    planName: '3-Month Plan',
    totalAmount: 300,
    numberOfInstallments: 3,
    installments: [
      { sequenceNumber: 1, dueDate: new Date('2026-08-01'), amount: 100 },
      { sequenceNumber: 2, dueDate: new Date('2026-09-01'), amount: 100 },
      { sequenceNumber: 3, dueDate: new Date('2026-10-01'), amount: 90 } // Sum = 290, expected 300
    ]
  };

  await expect(service.createInstallmentPlan(input))
    .rejects
    .toThrow('Sum of installment amounts (290) does not match total amount of the plan (300)');
});

test('recordPayment should auto-allocate to invoice directly and generate receipt, transitioning status to Paid', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    outboxEvent: { create: vi.fn().mockResolvedValue(null) }
  } as any;

  const service = new FinanceService(mockPrisma);

  const mockInvoice = {
    id: 'invoice-123',
    totalAmount: new Decimal(100),
    paidAmount: new Decimal(0),
    outstandingAmount: new Decimal(100),
    branchId: 'branch-123',
    invoiceDate: new Date('2026-07-04'),
    dueDate: new Date('2026-08-01'),
    installmentPlans: []
  };

  const mockPayment = {
    id: 'pay-123',
    paymentNumber: 'PAY-2026-000001',
    amount: new Decimal(100),
    currency: 'OMR'
  };

  const mockReceipt = {
    id: 'receipt-123',
    receiptNumber: 'RCP-2026-000001'
  };

  vi.spyOn(service['repo'], 'findInvoiceById').mockResolvedValue(mockInvoice as any);
  vi.spyOn(service['repo'], 'getNextPaymentNumber').mockResolvedValue('PAY-2026-000001');
  vi.spyOn(service['repo'], 'createPayment').mockResolvedValue(mockPayment as any);
  vi.spyOn(service['repo'], 'updateInvoiceStatus').mockResolvedValue(null as any);
  vi.spyOn(service['repo'], 'createReceipt').mockResolvedValue(mockReceipt as any);
  vi.spyOn(service['repo'], 'upsertReceivable').mockResolvedValue(null as any);

  const input = {
    invoiceId: 'invoice-123',
    branchId: 'branch-123',
    paymentDate: new Date(),
    paymentMethod: 'Cash' as const,
    currency: 'OMR',
    amount: 100,
    receivedBy: 'user-123',
    idempotencyKey: 'idemp-123',
    allocations: [] // auto-allocate
  };

  const result = await service.recordPayment(input);

  expect(result.payment.id).toBe('pay-123');
  expect(result.receipt.id).toBe('receipt-123');
  expect(service['repo'].updateInvoiceStatus).toHaveBeenCalledWith('invoice-123', 'Paid', 100, 0, mockPrisma);
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
});

test('verifyCorporateCreditLimit should throw if outstanding amount exceeds limit and block limit flag is true', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    outboxEvent: { create: vi.fn().mockResolvedValue(null) }
  } as any;

  const service = new FinanceService(mockPrisma);

  vi.spyOn(service['repo'], 'getCorporateCreditLimit').mockResolvedValue({
    creditLimit: 1000,
    currentOutstanding: 950, // Available: 50
    committedAmount: 0,
    blockOnCreditLimit: true
  });

  // Requesting 100 OMR, which exceeds 50 OMR available limit
  await expect(service.verifyCorporateCreditLimit('corp-123', 'branch-123', 100))
    .rejects
    .toThrow('Corporate credit limit exceeded. Available credit is 50.000 OMR but requested 100.000 OMR.');
  
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
});
