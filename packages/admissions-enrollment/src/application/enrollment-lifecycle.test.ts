import { expect, test, vi } from 'vitest';
import { EnrollmentService } from './enrollment-service';
import { Prisma } from '@prisma/client';

test('EnrollmentService createEnrollment should validate Approved Admission and snapshot pricing', async () => {
  const mockPrisma = {
    admission: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'adm-1',
        admissionStatus: 'Approved',
        isDeleted: false,
      }),
    },
    coursePricing: {
      findFirst: vi.fn().mockResolvedValue({
        basePrice: new Prisma.Decimal(250),
        taxPercentage: new Prisma.Decimal(5),
      }),
    },
    // Mock course pricing and discounts for course-catalog resolvePricing
    course: {
      findUnique: vi.fn().mockResolvedValue({ id: 'crs-1', courseCode: 'REG-101' }),
    },
    branch: {
      findUnique: vi.fn().mockResolvedValue({ id: 'branch-1', branchCode: 'BR-1' }),
    },
    enrollment: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'enr-1', ...data })),
    },
    studentProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'stu-1',
        status: 'Active',
        isDeleted: false,
        person: { isDeleted: false },
        admissions: [{ id: 'adm-1', branchId: 'branch-1', isDeleted: false }],
        enrollments: [],
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  // Mock resolvePricing inside CoursePricingService
  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn((enrollmentService as any).pricingService, 'resolveCoursePricing').mockResolvedValue({
    courseId: 'crs-1',
    resolvedBranchId: 'branch-1',
    customerType: 'Individual',
    batchType: 'Regular',
    basePrice: 250,
    taxPercentage: 5,
    isTaxExempt: false,
    currency: 'OMR',
    totalPrice: 262.5,
    effectiveStartDate: '2026-07-02',
    applicableDiscounts: [],
    pricingSource: 'GlobalDefault',
  });

  const res = await enrollmentService.createEnrollment({
    studentProfileId: 'stu-1',
    admissionId: 'adm-1',
    courseId: 'crs-1',
    batchId: 'batch-1',
    branchId: 'branch-1',
    enrollmentType: 'Regular',
  });

  expect(res.resolvedPrice).toEqual(new Prisma.Decimal(250));
  expect(res.finalAmount).toEqual(new Prisma.Decimal(262.5));
  expect(res.pricingSource).toBe('GlobalDefault');
  expect(res.priceEvaluationTimestamp).toBeInstanceOf(Date);
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
});

test('EnrollmentService createEnrollment should block draft creation if Admission is not Approved', async () => {
  const mockPrisma = {
    admission: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'adm-1',
        admissionStatus: 'Submitted', // Not Approved!
        isDeleted: false,
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.createEnrollment({
      studentProfileId: 'stu-1',
      admissionId: 'adm-1',
      courseId: 'crs-1',
      batchId: 'batch-1',
      branchId: 'branch-1',
      enrollmentType: 'Regular',
    })
  ).rejects.toThrow('ERR_ENR_MISSING_ADMISSION');
});

test('EnrollmentService createEnrollment should auto-convert Corporate Participant and create StudentProfile and Admission', async () => {
  const mockPrisma = {
    studentProfile: {
      findFirst: vi.fn().mockResolvedValue(null), // Missing profile
      create: vi.fn().mockResolvedValue({ id: 'stu-profile-1', studentNumber: 'STU-2026-00001' }),
    },
    admission: {
      findFirst: vi.fn().mockResolvedValue(null), // Missing admission
      create: vi.fn().mockResolvedValue({ id: 'corp-adm-1', admissionNumber: 'ADM-2026-00001' }),
    },
    enrollment: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'enr-1', ...data })),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    // Raw SQL mock for sequences
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ nextval: '10001' }]),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn((enrollmentService as any).pricingService, 'resolveCoursePricing').mockResolvedValue({
    courseId: 'crs-1',
    resolvedBranchId: 'branch-1',
    customerType: 'Corporate',
    batchType: 'Regular',
    basePrice: 250,
    taxPercentage: 5,
    isTaxExempt: false,
    currency: 'OMR',
    totalPrice: 262.5,
    effectiveStartDate: '2026-07-02',
    applicableDiscounts: [],
    pricingSource: 'GlobalDefault',
  });

  const res = await enrollmentService.createEnrollment({
    courseId: 'crs-1',
    batchId: 'batch-1',
    branchId: 'branch-1',
    enrollmentType: 'Corporate',
    corporateParticipantId: 'corp-part-1',
  });

  expect(res.studentProfileId).toBe('stu-profile-1');
  expect(res.admissionId).toBe('corp-adm-1');
  expect(mockPrisma.studentProfile.create).toHaveBeenCalled();
  expect(mockPrisma.admission.create).toHaveBeenCalled();
});

test('EnrollmentService approveEnrollment should handle full batch waitlisting', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-1',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-1',
        enrollmentStatus: 'Submitted',
      }),
      count: vi.fn().mockResolvedValue(15), // Capacity reached!
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true, // Waitlisting is active!
      }),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  // Mock enqueueWaitlist
  vi.spyOn((enrollmentService as any).batchService, 'enqueueWaitlist').mockResolvedValue({ id: 'wl-1' });

  await enrollmentService.approveEnrollment('enr-1', 'actor-1');

  expect((enrollmentService as any).batchService.enqueueWaitlist).toHaveBeenCalledWith(
    'batch-1',
    'stu-1',
    null,
    'actor-1',
    mockPrisma
  );
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ eventType: 'StudentAddedToWaitingList' }),
  });
});

test('EnrollmentService approveEnrollment should throw ERR_ENR_CREDIT_EXCEEDED if corporate credit limit checks fail', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-corp',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-1',
        enrollmentType: 'Corporate',
        corporateParticipantId: 'simulate-credit-exceeded-block',
        enrollmentStatus: 'Submitted',
        finalAmount: new Prisma.Decimal(500),
      }),
      count: vi.fn().mockResolvedValue(5), // Seats available
      update: vi.fn().mockResolvedValue(null),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true,
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(enrollmentService.approveEnrollment('enr-corp', 'actor-1')).rejects.toThrow('ERR_ENR_CREDIT_EXCEEDED');
});

test('EnrollmentService confirmEnrollment should confirm reactively and idempotently', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-1',
        enrollmentStatus: 'Confirmed', // Idempotency check: Confirmed already!
        branchId: 'branch-1',
        admission: { personId: 'person-1' },
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await enrollmentService.confirmEnrollment('enr-1', 'actor-1');

  // Should return early and not update database status
  expect(mockPrisma.enrollment.update).not.toHaveBeenCalled();
});

test('EnrollmentService createEnrollment should consume canonical totalPrice containing taxes and subtract discounts correctly', async () => {
  const mockPrisma = {
    admission: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'adm-1',
        admissionStatus: 'Approved',
        isDeleted: false,
      }),
    },
    enrollment: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'enr-1', ...data })),
    },
    studentProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'stu-1',
        status: 'Active',
        isDeleted: false,
        person: { isDeleted: false },
        admissions: [{ id: 'adm-1', branchId: 'branch-1', isDeleted: false }],
        enrollments: [],
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn((enrollmentService as any).pricingService, 'resolveCoursePricing').mockResolvedValue({
    courseId: 'crs-1',
    resolvedBranchId: 'branch-1',
    customerType: 'Individual',
    batchType: 'Regular',
    basePrice: 200,
    taxPercentage: 10,
    isTaxExempt: false,
    currency: 'OMR',
    totalPrice: 220, // 200 * 1.10
    effectiveStartDate: '2026-07-02',
    applicableDiscounts: [
      { discountId: 'disc-1', discountName: 'EarlyBird', discountValue: 30 }
    ],
    pricingSource: 'GlobalDefault',
  });

  const res = await enrollmentService.createEnrollment({
    studentProfileId: 'stu-1',
    admissionId: 'adm-1',
    courseId: 'crs-1',
    batchId: 'batch-1',
    branchId: 'branch-1',
    enrollmentType: 'Regular',
  });

  // totalPrice is 220, discount is 30, so finalAmount = 220 - 30 = 190.
  expect(res.resolvedPrice).toEqual(new Prisma.Decimal(200));
  expect(res.resolvedDiscount).toEqual(new Prisma.Decimal(30));
  expect(res.finalAmount).toEqual(new Prisma.Decimal(190));
});
