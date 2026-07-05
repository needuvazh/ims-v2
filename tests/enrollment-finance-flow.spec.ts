import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../packages/database/src/client';
import { EnrollmentService } from '../packages/admissions-enrollment/src/application/enrollment-service';
import { handleEnrollmentApproved } from '../apps/worker/src/index';
import { createUuid } from '../packages/shared-kernel/src/value-objects';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

describe('Enrollment Finance Flow & Promo Codes Integration', () => {
  let enrollmentService: EnrollmentService;
  let branchId: string;
  let courseId: string;
  let batchId: string;
  let studentProfileId: string;
  let admissionId: string;

  const actorId = createUuid('00000000-0000-0000-0000-000000000001');

  beforeAll(async () => {
    enrollmentService = new EnrollmentService(prisma);

    // Setup Branch
    let branch = await prisma.branch.findFirst({ where: { isDeleted: false } });
    if (!branch) {
      const instId = createUuid(randomUUID());
      await prisma.institute.create({
        data: { id: instId, instituteCode: 'FININST', instituteName: 'Finance Inst' }
      });
      branch = await prisma.branch.create({
        data: { id: createUuid(randomUUID()), instituteId: instId, branchCode: 'FINBR', branchName: 'Finance Branch', status: 'Active' }
      });
    }
    branchId = branch.id;

    // Setup Department
    let dept = await prisma.department.findFirst({ where: { isDeleted: false } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          id: createUuid(randomUUID()),
          branchId,
          departmentCode: `FDEPT-${Date.now().toString().slice(-4)}`,
          departmentName: 'Finance Dept',
          status: 'Active'
        }
      });
    }

    // Setup Course Category
    const category = await prisma.courseCategory.create({
      data: { id: createUuid(randomUUID()), code: `FCAT-${Date.now().toString().slice(-4)}`, nameEnglish: 'Finance Test Category', nameArabic: 'تمويل' }
    });

    // Setup Course
    const course = await prisma.course.create({
      data: {
        id: createUuid(randomUUID()),
        courseCode: `FCRS-${Date.now().toString().slice(-4)}`,
        nameEnglish: 'Finance Integrations Course',
        nameArabic: 'تمويل',
        status: 'Published',
        courseClassification: 'Regular',
        durationType: 'Weeks',
        durationValue: 4,
        effectiveStartDate: new Date(),
        categoryId: category.id,
        departmentId: dept.id,
        allowWalkInCompletion: true,
      }
    });
    courseId = course.id;

    // Setup Course Pricing
    await prisma.coursePricing.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        status: 'Active',
        customerType: 'Individual',
        batchType: 'Regular',
        basePrice: new Decimal(200.000), // 200 OMR base price
        taxPercentage: new Decimal(5.000), // 5% Oman VAT
        effectiveStartDate: new Date(),
        currency: 'OMR'
      }
    });

    // Setup Promo Codes
    // 1. Percentage discount: WELCOME10 (10% off base price = 20 OMR)
    await prisma.courseDiscount.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        discountType: 'Individual',
        discountMode: 'Percentage',
        discountValue: new Decimal(10.000),
        discountCode: 'WELCOME10',
        effectiveStartDate: new Date(),
        status: 'Active',
      }
    });

    // 2. Fixed discount: LOYAL5 (5 OMR off)
    await prisma.courseDiscount.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        discountType: 'Individual',
        discountMode: 'FixedAmount',
        discountValue: new Decimal(5.000),
        discountCode: 'LOYAL5',
        effectiveStartDate: new Date(),
        status: 'Active',
      }
    });

    // Setup Learning Batch
    const batch = await prisma.batch.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        branchId,
        batchCode: `FBAT-${Date.now().toString().slice(-4)}`,
        batchNameEnglish: 'Finance Test Batch',
        batchNameArabic: 'دفعة اختبار المالية',
        batchType: 'Regular',
        status: 'Planned',
        capacity: 10,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: actorId,
      }
    });
    batchId = batch.id;

    // Setup Student Profile
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'Finance',
        lastName: 'Student',
        email: `fin.student.${Date.now()}@test.com`,
        mobile: '+96899991111',
        gender: 'Male',
        dateOfBirth: new Date(1998, 5, 15),
      }
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        id: createUuid(randomUUID()),
        person: { connect: { id: person.id } },
        branch: { connect: { id: branchId } },
        studentNumber: `S-FIN-${Date.now().toString().slice(-4)}`,
        status: 'Active',
      }
    });
    studentProfileId = studentProfile.id;

    // Setup Admission Profile
    const admission = await prisma.admission.create({
      data: {
        id: createUuid(randomUUID()),
        studentProfile: { connect: { id: studentProfileId } },
        person: { connect: { id: person.id } },
        course: { connect: { id: courseId } },
        branch: { connect: { id: branchId } },
        admissionNumber: `ADM-${Date.now().toString().slice(-5)}`,
        admissionStatus: 'Approved',
        admissionDate: new Date(),
      }
    });
    admissionId = admission.id;
  });

  it('calculates multiple promo codes correctly (cumulative percentage and fixed discounts)', async () => {
    // Cumulative discount: 10% of 200 (20 OMR) + 5 OMR = 25 OMR
    // Base Price: 200. TotalPrice with 5% tax = 210.
    // Net Payable: 210 - 25 = 185 OMR.
    const enrollment = await enrollmentService.createEnrollment({
      studentProfileId,
      admissionId,
      courseId,
      batchId,
      branchId,
      enrollmentType: 'Regular',
      actorId,
      promoCodes: ['WELCOME10', 'LOYAL5'],
    });

    expect(enrollment.resolvedPrice.toNumber()).toBe(200);
    expect(enrollment.resolvedDiscount.toNumber()).toBe(25); // 20 + 5
    expect(enrollment.finalAmount.toNumber()).toBe(185); // 210 - 25
    expect(enrollment.appliedDiscountCodes).toBe('WELCOME10,LOYAL5');
  });

  it('fails standard enrollment validation if promo code is invalid', async () => {
    await expect(
      enrollmentService.createEnrollment({
        studentProfileId,
        admissionId,
        courseId,
        batchId,
        branchId,
        enrollmentType: 'Regular',
        actorId,
        promoCodes: ['INVALID_CODE_XYZ'],
      })
    ).rejects.toThrow('ERR_CRS_INVALID_PROMO_CODE');
  });

  it('emits EnrollmentApproved outbox event and worker generates correct invoice', async () => {
    // Setup unique student for this test to avoid studentProfileId + batchId collision
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'FinanceEvent',
        lastName: 'Student',
        email: `fin.event.${Date.now()}@test.com`,
        mobile: `+9689999${Math.floor(1000 + Math.random() * 9000)}`,
        gender: 'Male',
        dateOfBirth: new Date(1998, 5, 15),
      }
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        id: createUuid(randomUUID()),
        person: { connect: { id: person.id } },
        branch: { connect: { id: branchId } },
        studentNumber: `S-EVT-${Date.now().toString().slice(-4)}`,
        status: 'Active',
      }
    });

    const admission = await prisma.admission.create({
      data: {
        id: createUuid(randomUUID()),
        studentProfile: { connect: { id: studentProfile.id } },
        person: { connect: { id: person.id } },
        course: { connect: { id: courseId } },
        branch: { connect: { id: branchId } },
        admissionNumber: `ADM-EVT-${Date.now().toString().slice(-4)}`,
        admissionStatus: 'Approved',
        admissionDate: new Date(),
      }
    });

    // 1. Create a clean enrollment
    const enrollment = await enrollmentService.createEnrollment({
      studentProfileId: studentProfile.id,
      admissionId: admission.id,
      courseId,
      batchId,
      branchId,
      enrollmentType: 'Regular',
      actorId,
      promoCodes: ['WELCOME10'], // 10% of 200 = 20 OMR discount. Net = 190.
    });

    // 2. Transition enrollment to Submitted first, then Approve
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { enrollmentStatus: 'Submitted' }
    });
    await enrollmentService.approveEnrollment(enrollment.id, actorId);
    const approved = await prisma.enrollment.findUnique({ where: { id: enrollment.id } });
    expect(approved?.enrollmentStatus).toBe('Approved');

    // 3. Process the outbox event handler directly
    await handleEnrollmentApproved({ enrollmentId: enrollment.id });

    // 4. Verify invoice details
    const invoice = await prisma.invoice.findFirst({
      where: { enrollmentId: enrollment.id, isDeleted: false },
      include: { lineItems: true }
    });

    expect(invoice).toBeDefined();
    expect(invoice?.invoiceType).toBe('StudentInvoice');
    expect(invoice?.branchId).toBe(branchId);
    expect(invoice?.lineItems.length).toBe(1);

    const line = invoice?.lineItems[0];
    expect(line?.unitPrice.toNumber()).toBe(200);
    expect(line?.discountAmount.toNumber()).toBe(20);
    expect(line?.taxRate.toNumber()).toBe(0.05); // 5% Oman VAT
  });

  it('supports ad-hoc promo codes application on Walk-In payment recording', async () => {
    const email = `walkin.${Date.now()}@test.com`;
    const phone = `+9689999${Math.floor(1000 + Math.random() * 9000)}`;
    const walkIn = await enrollmentService.createWalkInEnrollment({
      courseId,
      batchId,
      branchId,
      firstName: 'WalkIn',
      lastName: 'Student',
      phone,
      email,
      gender: 'Female',
      dateOfBirth: new Date(1999, 1, 1),
      actorId,
    });

    // Walk-In starts as Approved
    expect(walkIn.enrollment.enrollmentStatus).toBe('Approved');
    expect(walkIn.enrollment.finalAmount.toNumber()).toBe(210); // Standard pricing (200 + 5% tax)

    // Create a verified CIVIL_ID_FRONT document for this walk-in enrollment to pass the document gate
    const docId = createUuid(randomUUID());
    await prisma.document.create({
      data: {
        id: docId,
        fileKey: 'test-key-civil-id',
        fileName: 'civil_id_front.jpg',
        fileType: 'image/jpeg',
        documentType: 'CIVIL_ID_FRONT',
        branchId: branchId,
        status: 'Active',
        owners: {
          create: {
            id: createUuid(randomUUID()),
            ownerId: walkIn.enrollment.id,
            ownerType: 'Enrollment',
          }
        },
        verifications: {
          create: {
            id: createUuid(randomUUID()),
            outcome: 'Verified',
            verifiedAt: new Date(),
          }
        }
      }
    });

    // 2. Record payment applying WELCOME10 promo code (10% off of walkin resolvedPrice 210 = 21 OMR. Net = 189).
    const result = await enrollmentService.recordWalkInPayment(
      walkIn.enrollment.id,
      189, // collected exactly net amount
      actorId,
      'Paid discounted Walk-In',
      'Cash',
      ['WELCOME10']
    );

    // 3. Verify confirmation and status updates
    expect(result.enrollment.enrollmentStatus).toBe('Confirmed');
    expect(result.enrollment.resolvedDiscount.toNumber()).toBe(21);
    expect(result.enrollment.finalAmount.toNumber()).toBe(189);
    expect(result.enrollment.appliedDiscountCodes).toBe('WELCOME10');
  });
});
