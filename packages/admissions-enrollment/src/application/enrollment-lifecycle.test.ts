import { expect, test, vi, beforeAll } from 'vitest';
import { EnrollmentService } from './enrollment-service';
import { StudentStatusService } from './student-status-service';
import { Prisma } from '@prisma/client';

// Stub out StudentStatusService.activatePending for all enrollment-lifecycle
// tests so they remain focused on enrollment behavior, not status transitions.
// Status transition behavior is covered in student-management.test.ts.
beforeAll(() => {
  vi.spyOn(StudentStatusService.prototype, 'activatePending').mockResolvedValue(
    undefined,
  );
});

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
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'crs-1', courseCode: 'REG-101' }),
    },
    branch: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'branch-1', branchCode: 'BR-1' }),
    },
    enrollment: {
      create: vi
        .fn()
        .mockImplementation(({ data }) => {
          const result: any = { id: 'enr-1', ...data };
          if (data.studentProfile?.connect?.id) {
            result.studentProfileId = data.studentProfile.connect.id;
          }
          if (data.admission?.connect?.id) {
            result.admissionId = data.admission.connect.id;
          }
          return Promise.resolve(result);
        }),
      count: vi.fn().mockResolvedValue(0),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 10,
        waitingListEnabled: false,
        isDeleted: false,
      }),
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    studentProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'stu-1',
        personId: 'person-1',
        branchId: 'branch-1',
        status: 'Active',
        isDeleted: false,
        person: { isDeleted: false },
        admissions: [{ id: 'adm-1', branchId: 'branch-1', isDeleted: false }],
        enrollments: [],
      }),
    },
    lead: {
      count: vi.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  // Mock resolvePricing inside CoursePricingService
  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).pricingService,
    'resolveCoursePricing',
  ).mockResolvedValue({
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
    }),
  ).rejects.toThrow('ERR_ENR_MISSING_ADMISSION');
});

test('EnrollmentService createEnrollment should auto-convert Corporate Participant and create StudentProfile and Admission', async () => {
  const mockPrisma = {
    studentProfile: {
      findFirst: vi.fn().mockResolvedValue(null), // Missing profile
      create: vi.fn().mockResolvedValue({
        id: 'stu-profile-1',
        studentNumber: 'STU-2026-00001',
      }),
    },
    admission: {
      findFirst: vi.fn().mockResolvedValue(null), // Missing admission
      create: vi.fn().mockResolvedValue({
        id: 'corp-adm-1',
        admissionNumber: 'ADM-2026-00001',
      }),
    },
    enrollment: {
      create: vi
        .fn()
        .mockImplementation(({ data }) => {
          const result: any = { id: 'enr-1', ...data };
          if (data.studentProfile?.connect?.id) {
            result.studentProfileId = data.studentProfile.connect.id;
          }
          if (data.admission?.connect?.id) {
            result.admissionId = data.admission.connect.id;
          }
          return Promise.resolve(result);
        }),
      count: vi.fn().mockResolvedValue(0),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 10,
        waitingListEnabled: false,
        isDeleted: false,
      }),
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    // Raw SQL mock for sequences
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ nextval: '10001' }]),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).pricingService,
    'resolveCoursePricing',
  ).mockResolvedValue({
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
      findFirst: vi.fn().mockResolvedValue(null), // No duplicate enrollment
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null), // No promotion reservation
      count: vi.fn().mockResolvedValue(0),
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
  vi.spyOn(
    (enrollmentService as any).batchService,
    'enqueueWaitlist',
  ).mockResolvedValue({ id: 'wl-1' });

  await enrollmentService.approveEnrollment('enr-1', 'actor-1');

  expect(
    (enrollmentService as any).batchService.enqueueWaitlist,
  ).toHaveBeenCalledWith(
    {
      batchId: 'batch-1',
      studentProfileId: 'stu-1',
      leadId: null,
      enrollmentId: 'enr-1',
      actorId: 'actor-1',
    },
    mockPrisma,
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
      findFirst: vi.fn().mockResolvedValue(null), // No duplicate enrollment
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null), // No promotion reservation
      count: vi.fn().mockResolvedValue(0),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true,
        corporateAccountId: 'corp-account-1',
      }),
    },
    corporateAccount: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'corp-account-1',
        creditLimit: new Prisma.Decimal(1000),
        currentOutstanding: new Prisma.Decimal(700),
        blockOnCreditLimit: true,
        status: 'Active',
        isDeleted: false,
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.approveEnrollment('enr-corp', 'actor-1'),
  ).rejects.toThrow('ERR_ENR_CREDIT_EXCEEDED');
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
      create: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'enr-1', ...data }),
        ),
      count: vi.fn().mockResolvedValue(0),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 10,
        waitingListEnabled: false,
        isDeleted: false,
      }),
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    studentProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'stu-1',
        personId: 'person-1',
        branchId: 'branch-1',
        status: 'Active',
        isDeleted: false,
        person: { isDeleted: false },
        admissions: [{ id: 'adm-1', branchId: 'branch-1', isDeleted: false }],
        enrollments: [],
      }),
    },
    lead: {
      count: vi.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).pricingService,
    'resolveCoursePricing',
  ).mockResolvedValue({
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
      { discountId: 'disc-1', discountName: 'EarlyBird', discountValue: 30 },
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

test('EnrollmentService approveEnrollment should throw ERR_ENR_DUPLICATE_ENROLLMENT if active/pending enrollment exists', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-1',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-1',
        enrollmentStatus: 'Submitted',
      }),
      findFirst: vi.fn().mockResolvedValue({ id: 'enr-duplicate' }), // Duplicate exists
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true,
        corporateAccountId: 'corp-account-1',
      }),
    },
    corporateAccount: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'corp-account-1',
        creditLimit: new Prisma.Decimal(1000),
        currentOutstanding: new Prisma.Decimal(900),
        blockOnCreditLimit: true,
        status: 'Active',
        isDeleted: false,
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.approveEnrollment('enr-1', 'actor-1'),
  ).rejects.toThrow('ERR_ENR_DUPLICATE_ENROLLMENT');
});

test('EnrollmentService approveEnrollment should bypass capacity check and resolve waitlist entry if candidate holds a reservation', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-1',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-1',
        enrollmentStatus: 'Submitted',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(15), // Capacity is full!
      update: vi
        .fn()
        .mockResolvedValue({ id: 'enr-1', enrollmentStatus: 'Approved' }),
    },
    waitingList: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'wl-promoted', status: 'Promoted' }), // Holds reservation!
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true,
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).batchService,
    'resolveWaitlistEntry',
  ).mockResolvedValue(null);

  await enrollmentService.approveEnrollment('enr-1', 'actor-1');

  expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
    where: { id: 'enr-1' },
    data: { enrollmentStatus: 'Approved' },
  });
  expect(
    (enrollmentService as any).batchService.resolveWaitlistEntry,
  ).toHaveBeenCalledWith('stu-1', 'batch-1', mockPrisma);
});

test('EnrollmentService approveEnrollment should prevent seat stealing by waitlisted student without reservation', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-stealer',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-stealer',
        enrollmentStatus: 'Submitted',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(14), // 14 active seats taken
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null), // Holds NO reservation!
      count: vi.fn().mockResolvedValue(1), // But 1 seat is reserved by A (Promoted)
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15, // Max capacity is 15. So 14 + 1 = 15 = full.
        waitingListEnabled: true,
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
  vi.spyOn(
    (enrollmentService as any).batchService,
    'enqueueWaitlist',
  ).mockResolvedValue({ id: 'wl-new' });

  await enrollmentService.approveEnrollment('enr-stealer', 'actor-1');

  // Should get redirected to waitlist (enqueueWaitlist called)
  expect(
    (enrollmentService as any).batchService.enqueueWaitlist,
  ).toHaveBeenCalledWith(
    {
      batchId: 'batch-1',
      studentProfileId: 'stu-stealer',
      leadId: null,
      enrollmentId: 'enr-stealer',
      actorId: 'actor-1',
    },
    mockPrisma,
  );
});

test('EnrollmentService approveEnrollment should allow approval for student holding a promotion reservation and resolve reservation', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-promoted',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-promoted',
        enrollmentStatus: 'Submitted',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(14), // 14 active seats taken
      update: vi.fn().mockResolvedValue({
        id: 'enr-promoted',
        enrollmentStatus: 'Approved',
      }),
    },
    waitingList: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'wl-promoted', status: 'Promoted' }), // Holds reservation!
      count: vi.fn().mockResolvedValue(1),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true,
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).batchService,
    'resolveWaitlistEntry',
  ).mockResolvedValue(null);

  await enrollmentService.approveEnrollment('enr-promoted', 'actor-1');

  // Should bypass capacity check, transition to Approved, and resolve waitlist
  expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
    where: { id: 'enr-promoted' },
    data: { enrollmentStatus: 'Approved' },
  });
  expect(
    (enrollmentService as any).batchService.resolveWaitlistEntry,
  ).toHaveBeenCalledWith('stu-promoted', 'batch-1', mockPrisma);
});

test('EnrollmentService approveEnrollment should support worker resolution when enrollmentId must be looked up by studentProfileId and batchId', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-resolved-by-worker',
        batchId: 'batch-1',
        branchId: 'branch-1',
        studentProfileId: 'stu-1',
        enrollmentStatus: 'Submitted',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(10),
      update: vi.fn().mockResolvedValue({
        id: 'enr-resolved-by-worker',
        enrollmentStatus: 'Approved',
      }),
    },
    waitingList: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'wl-promoted', status: 'Promoted' }),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-1',
        capacity: 15,
        waitingListEnabled: true,
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).batchService,
    'resolveWaitlistEntry',
  ).mockResolvedValue(null);

  const foundEnrollmentId = 'enr-resolved-by-worker';
  await enrollmentService.approveEnrollment(foundEnrollmentId, 'system-worker');

  expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
    where: { id: foundEnrollmentId },
    data: { enrollmentStatus: 'Approved' },
  });
  expect(
    (enrollmentService as any).batchService.resolveWaitlistEntry,
  ).toHaveBeenCalledWith('stu-1', 'batch-1', mockPrisma);
});

test('EnrollmentService createEnrollment should reject WalkIn type with ERR_ENR_GENERIC_WALKIN_BLOCKED', async () => {
  const mockPrisma = {} as any;
  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.createEnrollment({
      enrollmentType: 'WalkIn',
    }),
  ).rejects.toThrow('ERR_ENR_GENERIC_WALKIN_BLOCKED');
});

test('EnrollmentService createWalkInEnrollment should successfully create person, profile, admission, enrollment and auto-approve', async () => {
  let enrollmentStatus = 'Draft';
  const mockPrisma = {
    course: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'crs-walk', allowWalkInCompletion: true }),
    },
    person: {
      findFirst: vi.fn().mockResolvedValue(null), // New person
      create: vi.fn().mockResolvedValue({ id: 'person-walk-1' }),
    },
    studentProfile: {
      findFirst: vi.fn().mockResolvedValue(null), // New profile
      create: vi.fn().mockResolvedValue({
        id: 'stu-walk-1',
        studentNumber: 'STU-2026-99999',
      }),
    },
    admission: {
      create: vi.fn().mockResolvedValue({
        id: 'adm-walk-1',
        admissionNumber: 'ADM-2026-99999',
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    enrollment: {
      create: vi.fn().mockImplementation(({ data }) => {
        enrollmentStatus = data.enrollmentStatus;
        return Promise.resolve({ id: 'enr-walk-1', ...data });
      }),
      update: vi.fn().mockImplementation(({ data }) => {
        if (data.enrollmentStatus) {
          enrollmentStatus = data.enrollmentStatus;
        }
        return Promise.resolve({ id: 'enr-walk-1', enrollmentStatus });
      }),
      findUnique: vi.fn().mockImplementation(() =>
        Promise.resolve({
          id: 'enr-walk-1',
          enrollmentStatus,
          studentProfileId: 'stu-walk-1',
          batchId: 'batch-walk-1',
          branchId: 'branch-1',
          courseId: 'crs-walk',
        }),
      ),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0), // Batch has empty seats
    },
    walkInEnrollment: {
      create: vi.fn().mockResolvedValue({ id: 'wie-1' }),
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-walk-1',
        courseId: 'crs-walk',
        branchId: 'branch-1',
        capacity: 10,
        waitingListEnabled: true,
        isDeleted: false,
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $queryRawUnsafe: vi.fn().mockImplementation((sql) => {
      if (sql.includes('student_number_seq'))
        return Promise.resolve([{ nextval: '99999' }]);
      if (sql.includes('admission_number_seq'))
        return Promise.resolve([{ nextval: '99999' }]);
      if (sql.includes('batches'))
        return Promise.resolve([
          { id: 'batch-walk-1', capacity: 10, waitingListEnabled: true },
        ]);
      return Promise.resolve([]);
    }),
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).pricingService,
    'resolveCoursePricing',
  ).mockResolvedValue({
    courseId: 'crs-walk',
    resolvedBranchId: 'branch-1',
    customerType: 'Individual',
    basePrice: 100,
    taxPercentage: 0,
    isTaxExempt: true,
    currency: 'OMR',
    totalPrice: 100,
    applicableDiscounts: [],
    pricingSource: 'GlobalDefault',
  });

  const res = await enrollmentService.createWalkInEnrollment({
    firstName: 'Ahmed',
    lastName: 'Al Balushi',
    phone: '+96899998888',
    courseId: 'crs-walk',
    batchId: 'batch-walk-1',
    branchId: 'branch-1',
    actorId: 'actor-1',
  });

  expect(res.enrollment.id).toBe('enr-walk-1');
  expect(res.enrollment.enrollmentStatus).toBe('Approved');
  expect(mockPrisma.person.create).toHaveBeenCalled();
  expect(mockPrisma.studentProfile.create).toHaveBeenCalled();
  expect(mockPrisma.admission.create).toHaveBeenCalled();
  expect(mockPrisma.enrollment.create).toHaveBeenCalled();
  expect(mockPrisma.walkInEnrollment.create).toHaveBeenCalledWith({
    data: {
      enrollmentId: 'enr-walk-1',
      paymentCollected: new Prisma.Decimal(0.0),
      counterUserId: 'actor-1',
      remarks: null,
      createdBy: 'actor-1',
    },
  });
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ eventType: 'AdmissionCreated' }),
  });
});

test('EnrollmentService createWalkInEnrollment should reject duplicate active admissions in the same branch', async () => {
  const mockPrisma = {
    course: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'crs-walk', allowWalkInCompletion: true }),
    },
    person: {
      findFirst: vi.fn().mockResolvedValue({ id: 'person-existing-1' }),
    },
    studentProfile: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'stu-existing-1',
        studentNumber: 'STU-existing',
      }),
    },
    admission: {
      count: vi.fn().mockResolvedValue(1),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-walk-1',
        courseId: 'crs-walk',
        branchId: 'branch-1',
        isDeleted: false,
        capacity: 10,
        waitingListEnabled: true,
      }),
    },
    enrollment: {
      create: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);

  await expect(
    enrollmentService.createWalkInEnrollment({
      firstName: 'Ahmed',
      lastName: 'Al Balushi',
      phone: '+96899998888',
      courseId: 'crs-walk',
      batchId: 'batch-walk-1',
      branchId: 'branch-1',
      actorId: 'actor-1',
    }),
  ).rejects.toThrow('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
});

test('EnrollmentService createWalkInEnrollment should reject walk-in for course without walk-in completion enabled', async () => {
  const mockPrisma = {
    course: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'crs-normal', allowWalkInCompletion: false }), // Disabled!
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.createWalkInEnrollment({
      firstName: 'Ahmed',
      lastName: 'Al Balushi',
      phone: '+96899998888',
      courseId: 'crs-normal',
      batchId: 'batch-1',
      branchId: 'branch-1',
      actorId: 'actor-1',
    }),
  ).rejects.toThrow('ERR_COURSE_NOT_WALKIN_ENABLED');
});

test('EnrollmentService createWalkInEnrollment should reject batch/course mismatch', async () => {
  const mockPrisma = {
    course: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'crs-walk', allowWalkInCompletion: true }),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-walk-1',
        courseId: 'other-course',
        branchId: 'branch-1',
        capacity: 10,
        waitingListEnabled: true,
        isDeleted: false,
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.createWalkInEnrollment({
      firstName: 'Ahmed',
      lastName: 'Al Balushi',
      phone: '+96899998888',
      courseId: 'crs-walk',
      batchId: 'batch-walk-1',
      branchId: 'branch-1',
      actorId: 'actor-1',
    }),
  ).rejects.toThrow('ERR_ENR_BATCH_COURSE_MISMATCH');
});

test('EnrollmentService createWalkInEnrollment should route to waitlist when batch is full and waitlist is enabled', async () => {
  let enrollmentStatus = 'Draft';
  const mockPrisma = {
    course: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'crs-walk', allowWalkInCompletion: true }),
    },
    person: {
      findFirst: vi.fn().mockResolvedValue({ id: 'person-existing-1' }),
    },
    studentProfile: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'stu-existing-1',
        studentNumber: 'STU-existing',
      }),
    },
    admission: {
      create: vi.fn().mockResolvedValue({
        id: 'adm-walk-1',
        admissionNumber: 'ADM-2026-99999',
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    enrollment: {
      create: vi.fn().mockImplementation(({ data }) => {
        enrollmentStatus = data.enrollmentStatus;
        return Promise.resolve({ id: 'enr-walk-1', ...data });
      }),
      update: vi.fn().mockImplementation(({ data }) => {
        if (data.enrollmentStatus) {
          enrollmentStatus = data.enrollmentStatus;
        }
        return Promise.resolve({ id: 'enr-walk-1', enrollmentStatus });
      }),
      findUnique: vi.fn().mockImplementation(() =>
        Promise.resolve({
          id: 'enr-walk-1',
          enrollmentStatus,
          studentProfileId: 'stu-existing-1',
          batchId: 'batch-walk-1',
          branchId: 'branch-1',
          courseId: 'crs-walk',
        }),
      ),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(10), // Capacity reached!
    },
    walkInEnrollment: {
      create: vi.fn().mockResolvedValue({ id: 'wie-1' }),
    },
    waitingList: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    batch: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'batch-walk-1',
        courseId: 'crs-walk',
        branchId: 'branch-1',
        capacity: 10,
        waitingListEnabled: true,
        isDeleted: false,
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $queryRawUnsafe: vi.fn().mockImplementation((sql) => {
      if (sql.includes('student_number_seq'))
        return Promise.resolve([{ nextval: '99999' }]);
      if (sql.includes('admission_number_seq'))
        return Promise.resolve([{ nextval: '99999' }]);
      if (sql.includes('batches'))
        return Promise.resolve([
          { id: 'batch-walk-1', capacity: 10, waitingListEnabled: true },
        ]);
      return Promise.resolve([]);
    }),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    (enrollmentService as any).pricingService,
    'resolveCoursePricing',
  ).mockResolvedValue({
    courseId: 'crs-walk',
    resolvedBranchId: 'branch-1',
    customerType: 'Individual',
    basePrice: 100,
    taxPercentage: 0,
    isTaxExempt: true,
    currency: 'OMR',
    totalPrice: 100,
    applicableDiscounts: [],
    pricingSource: 'GlobalDefault',
  });
  vi.spyOn(
    (enrollmentService as any).batchService,
    'enqueueWaitlist',
  ).mockResolvedValue({ id: 'wl-1' });

  const res = await enrollmentService.createWalkInEnrollment({
    firstName: 'Ahmed',
    lastName: 'Al Balushi',
    phone: '+96899998888',
    courseId: 'crs-walk',
    batchId: 'batch-walk-1',
    branchId: 'branch-1',
    actorId: 'actor-1',
  });

  expect(res.enrollment.enrollmentStatus).toBe('Submitted'); // Left in Submitted status due to waitlisting!
  expect(
    (enrollmentService as any).batchService.enqueueWaitlist,
  ).toHaveBeenCalled();
});

test('EnrollmentService recordWalkInPayment should update payment, transition to Confirmed, and create WalkInConfirmation', async () => {
  let currentStatus = 'Approved';
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockImplementation(() =>
        Promise.resolve({
          id: 'enr-approved-1',
          enrollmentType: 'WalkIn',
          enrollmentStatus: currentStatus,
          enrollmentNumber: 'ENR-888',
          studentProfileId: 'stu-1',
          batchId: 'batch-1',
          branchId: 'branch-1',
          courseId: 'crs-1',
          admission: { personId: 'person-1' },
          walkInEnrollment: { id: 'wie-1' },
        }),
      ),
      update: vi.fn().mockImplementation(({ data }) => {
        if (data.enrollmentStatus) {
          currentStatus = data.enrollmentStatus;
        }
        return Promise.resolve({
          id: 'enr-approved-1',
          enrollmentStatus: currentStatus,
        });
      }),
    },
    walkInEnrollment: {
      update: vi.fn().mockResolvedValue({ id: 'wie-1' }),
    },
    walkInPayment: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'wip-1',
        amount: new Prisma.Decimal(120.0),
        paymentMethod: 'Cash',
      }),
    },
    walkInConfirmation: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'wic-1',
        confirmationNumber: 'WIC-2026-10001',
        documentUrl:
          'https://storage.asti.edu.om/confirmations/WIC-2026-10001.pdf',
      }),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    $executeRawUnsafe: vi.fn().mockResolvedValue(null),
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ nextval: '10001' }]),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    enrollmentService,
    'verifyEnrollmentDocumentsGate',
  ).mockResolvedValue(undefined as any);
  const res = await enrollmentService.recordWalkInPayment(
    'enr-approved-1',
    120.0,
    'actor-1',
    'Cash at counter',
  );

  expect(res.enrollment.enrollmentStatus).toBe('Confirmed');
  expect(enrollmentService.verifyEnrollmentDocumentsGate).toHaveBeenCalledWith(
    'enr-approved-1',
    mockPrisma,
  );
  expect(mockPrisma.walkInEnrollment.update).toHaveBeenCalledWith({
    where: { enrollmentId: 'enr-approved-1' },
    data: {
      paymentCollected: new Prisma.Decimal(120.0),
      confirmationIssued: true,
      remarks: 'Cash at counter',
      updatedBy: 'actor-1',
    },
  });
  expect(mockPrisma.walkInPayment.create).toHaveBeenCalledWith({
    data: {
      walkInEnrollmentId: 'wie-1',
      enrollmentId: 'enr-approved-1',
      amount: new Prisma.Decimal(120.0),
      paymentMethod: 'Cash',
      receivedBy: 'actor-1',
      remarks: 'Cash at counter',
      createdBy: 'actor-1',
    },
  });
  expect(mockPrisma.enrollment.update).toHaveBeenNthCalledWith(1, {
    where: { id: 'enr-approved-1' },
    data: {
      paymentValidationRequired: false,
      updatedBy: 'actor-1',
    },
  });
  expect(mockPrisma.enrollment.update).toHaveBeenNthCalledWith(2, {
    where: { id: 'enr-approved-1' },
    data: {
      enrollmentStatus: 'Confirmed',
      confirmedAt: expect.any(Date),
    },
  });
  expect(mockPrisma.walkInConfirmation.create).toHaveBeenCalledWith({
    data: {
      walkInEnrollmentId: 'wie-1',
      confirmationNumber: 'WIC-2026-10001',
      issuedBy: 'actor-1',
      documentUrl:
        'https://storage.asti.edu.om/confirmations/WIC-2026-10001.pdf',
      createdBy: 'actor-1',
    },
  });
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ eventType: 'WalkInEnrollmentCreated' }),
  });
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ eventType: 'WalkInPaymentRecorded' }),
  });
});

test('EnrollmentService recordWalkInPayment should be idempotent when enrollment is already confirmed', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-approved-1',
        enrollmentType: 'WalkIn',
        enrollmentStatus: 'Confirmed',
        enrollmentNumber: 'ENR-888',
        studentProfileId: 'stu-1',
        batchId: 'batch-1',
        branchId: 'branch-1',
        courseId: 'crs-1',
        admission: { personId: 'person-1' },
        walkInEnrollment: { id: 'wie-1' },
      }),
      update: vi.fn(),
    },
    walkInConfirmation: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'wic-1',
        confirmationNumber: 'WIC-2026-10001',
        documentUrl:
          'https://storage.asti.edu.om/confirmations/WIC-2026-10001.pdf',
      }),
      create: vi.fn(),
    },
    walkInPayment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'wip-1',
        amount: new Prisma.Decimal(120.0),
        paymentMethod: 'Cash',
      }),
      create: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  vi.spyOn(
    enrollmentService,
    'verifyEnrollmentDocumentsGate',
  ).mockResolvedValue(undefined as any);

  const res = await enrollmentService.recordWalkInPayment(
    'enr-approved-1',
    120.0,
    'actor-1',
    'Cash at counter',
  );

  expect(res.enrollment.enrollmentStatus).toBe('Confirmed');
  expect(mockPrisma.enrollment.update).not.toHaveBeenCalled();
  expect(mockPrisma.walkInPayment.create).not.toHaveBeenCalled();
  expect(mockPrisma.walkInConfirmation.create).not.toHaveBeenCalled();
});

test('EnrollmentService recordWalkInPayment should block payment recording for waitlisted (Submitted) enrollment', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-waitlisted-1',
        enrollmentType: 'WalkIn',
        enrollmentStatus: 'Submitted', // Waitlisted
        walkInEnrollment: { id: 'wie-1' },
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.recordWalkInPayment('enr-waitlisted-1', 120.0, 'actor-1'),
  ).rejects.toThrow('ERR_ENR_PAYMENT_BLOCKED_WAITLIST');
});

test('EnrollmentService recordWalkInPayment should block partial payment before confirmation', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-approved-1',
        enrollmentType: 'WalkIn',
        enrollmentStatus: 'Approved',
        enrollmentNumber: 'ENR-888',
        studentProfileId: 'stu-1',
        batchId: 'batch-1',
        branchId: 'branch-1',
        courseId: 'crs-1',
        finalAmount: new Prisma.Decimal(120.0),
        admission: { personId: 'person-1' },
        walkInEnrollment: { id: 'wie-1' },
      }),
    },
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);
  await expect(
    enrollmentService.recordWalkInPayment(
      'enr-approved-1',
      80.0,
      'actor-1',
      'Cash at counter',
    ),
  ).rejects.toThrow('ERR_ENR_PAYMENT_INCOMPLETE');
});
