import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../packages/database/src/client';
import {
  leadConversionOrchestrator,
  leadService,
} from '../apps/admin-portal/app/lib/runtime';
import { createUuid } from '../packages/shared-kernel/src/value-objects';
import { randomUUID } from 'crypto';

describe('Lead to Admission Handoff Integration', () => {
  let branchId: string;
  let courseId: string;
  let counselorId: string;

  beforeAll(async () => {
    // Always create a unique branch to isolate document requirement configuration
    const instituteId = createUuid(randomUUID());
    await prisma.institute.create({
      data: {
        id: instituteId,
        instituteCode: `INST-${Math.floor(Math.random() * 1000000)}`,
        instituteName: 'Handoff Institute',
      },
    });
    const branch = await prisma.branch.create({
      data: {
        id: createUuid(randomUUID()),
        instituteId,
        branchCode: `BR-${Math.floor(Math.random() * 1000000)}`,
        branchName: 'Handoff Branch',
        status: 'Active',
      },
    });
    branchId = branch.id;

    // 2. Fetch or create a Course
    let course = await prisma.course.findFirst({
      where: { status: 'Published' },
    });
    if (!course) {
      const dept =
        (await prisma.department.findFirst()) ||
        (await prisma.department.create({
          data: {
            id: createUuid(randomUUID()),
            branchId,
            departmentCode: 'DEPT-HANDOFF',
            departmentName: 'Handoff Department',
            status: 'Active',
          },
        }));
      course = await prisma.course.create({
        data: {
          id: createUuid(randomUUID()),
          courseCode: 'CRS-HANDOFF',
          nameEnglish: 'Handoff IELTS Preparation',
          nameArabic: 'الإعداد للآيلتس',
          departmentId: dept.id,
          courseClassification: 'Regular',
          durationType: 'Weeks',
          durationValue: 6,
          status: 'Published',
        },
      });
    }
    courseId = course.id;

    // 3. Fetch or create a Counselor User
    let counselor = await prisma.user.findFirst({
      where: { status: 'Active' },
    });
    if (!counselor) {
      const person = await prisma.person.create({
        data: {
          id: createUuid(randomUUID()),
          firstName: 'Counselor',
          lastName: 'User',
          mobile: '+96899991234',
          email: 'counselor@example.om',
        },
      });
      counselor = await prisma.user.create({
        data: {
          id: createUuid(randomUUID()),
          personId: person.id,
          username: 'counselor_handoff',
          email: 'counselor@example.om',
          passwordHash: 'dummy-hash',
          userType: 'Counselor',
          status: 'Active',
        },
      });
    }
    counselorId = counselor.id;
  });

  it('should convert lead successfully when age is valid (>= 12) and no active admission exists', async () => {
    // 1. Create a Person record with valid age (e.g. 25 years old)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);

    const suffix = Math.floor(100000 + Math.random() * 900000);
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'Ahmed',
        lastName: 'Al-Saeedi',
        mobile: `+96890${suffix}`,
        email: `ahmed.${suffix}@example.om`,
        dateOfBirth: birthDate,
      },
    });

    // 2. Create Lead
    const lead = await prisma.lead.create({
      data: {
        id: createUuid(randomUUID()),
        leadNumber: `LD-${suffix}`,
        personId: person.id,
        branchId,
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.mobile,
        email: person.email,
        interestedCourseId: courseId,
        counselorId,
        stage: 'Qualified',
      },
    });

    const documents = [
      {
        fileName: 'civil.pdf',
        fileKey: 'uploads/civil.pdf',
        fileType: 'application/pdf',
        documentType: 'CIVIL_ID_FRONT' as any,
      },
    ];

    const result = await leadConversionOrchestrator.convertLeadToAdmission(
      lead.id,
      documents,
      counselorId,
    );
    expect(result.admissionId).toBeDefined();

    const admission = await prisma.admission.findUnique({
      where: { id: result.admissionId },
    });
    expect(admission).toBeDefined();
    expect(admission?.admissionStatus).toBe('Draft');

    const updatedLead = await prisma.lead.findUnique({
      where: { id: lead.id },
    });
    expect(updatedLead?.stage).toBe('Converted');
  });

  it('should block conversion if learner is under 12 years old', async () => {
    // 1. Create a Person record under 12 (e.g. 10 years old)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 10);

    const suffix = Math.floor(100000 + Math.random() * 900000);
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'Young',
        lastName: 'Learner',
        mobile: `+96890${suffix}`,
        email: `young.${suffix}@example.om`,
        dateOfBirth: birthDate,
      },
    });

    // 2. Create Lead
    const lead = await prisma.lead.create({
      data: {
        id: createUuid(randomUUID()),
        leadNumber: `LD-${suffix}`,
        personId: person.id,
        branchId,
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.mobile,
        email: person.email,
        interestedCourseId: courseId,
        counselorId,
        stage: 'Qualified',
      },
    });

    const documents = [
      {
        fileName: 'civil.pdf',
        fileKey: 'uploads/civil.pdf',
        fileType: 'application/pdf',
        documentType: 'CIVIL_ID_FRONT' as any,
      },
    ];

    await expect(
      leadConversionOrchestrator.convertLeadToAdmission(
        lead.id,
        documents,
        counselorId,
      ),
    ).rejects.toThrow('ERR_ADM_AGE_LIMIT');
  });

  it('should block conversion if active admission already exists in the branch', async () => {
    // 1. Create a Person record with valid age (e.g. 20 years old)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 20);

    const suffix = Math.floor(100000 + Math.random() * 900000);
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'Duplicate',
        lastName: 'Learner',
        mobile: `+96890${suffix}`,
        email: `dup.${suffix}@example.om`,
        dateOfBirth: birthDate,
        nationalId: `NID-${suffix}`,
        nationality: 'Omani',
      },
    });

    // 2. Create StudentProfile
    const profile = await prisma.studentProfile.create({
      data: {
        id: createUuid(randomUUID()),
        personId: person.id,
        studentNumber: `STU-${suffix}`,
        status: 'Active',
        branchId,
      },
    });

    // 3. Create active Admission for the student
    await prisma.admission.create({
      data: {
        id: createUuid(randomUUID()),
        admissionNumber: `ADM-${suffix}`,
        personId: person.id,
        studentProfileId: profile.id,
        branchId,
        courseId,
        admissionStatus: 'Draft', // Draft or Submitted is active
      },
    });

    // 4. Create Lead pointing to the same person
    const lead = await prisma.lead.create({
      data: {
        id: createUuid(randomUUID()),
        leadNumber: `LD-${suffix}`,
        personId: person.id,
        branchId,
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.mobile,
        email: person.email,
        interestedCourseId: courseId,
        counselorId,
        stage: 'Qualified',
        nationalId: `NID-${suffix}`,
        nationality: 'Omani',
      },
    });

    const documents = [
      {
        fileName: 'civil.pdf',
        fileKey: 'uploads/civil.pdf',
        fileType: 'application/pdf',
        documentType: 'CIVIL_ID_FRONT' as any,
      },
    ];

    await expect(
      leadConversionOrchestrator.convertLeadToAdmission(
        lead.id,
        documents,
        counselorId,
      ),
    ).rejects.toThrow('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
  });

  it('should roll back lead stage change and outbox events if admission creation fails due to age invariant (atomic rollback)', async () => {
    // 1. Create a Person record under 12 (10 years old)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 10);

    const suffix = Math.floor(100000 + Math.random() * 900000);
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'Young',
        lastName: 'AtomicRollback',
        mobile: `+96890${suffix}`,
        email: `rollback.${suffix}@example.om`,
        dateOfBirth: birthDate,
      },
    });

    // 2. Create Lead in Qualified stage
    const lead = await prisma.lead.create({
      data: {
        id: createUuid(randomUUID()),
        leadNumber: `LD-${suffix}`,
        personId: person.id,
        branchId,
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.mobile,
        email: person.email,
        interestedCourseId: courseId,
        counselorId,
        stage: 'Qualified',
      },
    });

    const documents = [
      {
        fileName: 'civil.pdf',
        fileKey: 'uploads/civil.pdf',
        fileType: 'application/pdf',
        documentType: 'CIVIL_ID_FRONT' as any,
      },
    ];

    // 3. Conversion must reject due to age limit
    await expect(
      leadConversionOrchestrator.convertLeadToAdmission(
        lead.id,
        documents,
        counselorId,
      ),
    ).rejects.toThrow('ERR_ADM_AGE_LIMIT');

    // 4. Assert lead stage remains Qualified (not Converted)
    const leadAfter = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(leadAfter?.stage).toBe('Qualified');

    // 5. Assert no admission record was created
    const admissionCount = await prisma.admission.count({
      where: { leadId: lead.id },
    });
    expect(admissionCount).toBe(0);

    // 6. Assert no outbox events committed for Lead Won/Converted
    const outboxCount = await prisma.outboxEvent.count({
      where: {
        aggregateId: lead.id,
        eventType: { in: ['LeadWon', 'LeadConverted'] },
      },
    });
    expect(outboxCount).toBe(0);
  });

  it('should reject conversion if the lead is not in Qualified stage', async () => {
    // 1. Create a Person record with valid age (20 years old)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 20);

    const suffix = Math.floor(100000 + Math.random() * 900000);
    const person = await prisma.person.create({
      data: {
        id: createUuid(randomUUID()),
        firstName: 'Ahmed',
        lastName: 'NewStage',
        mobile: `+96890${suffix}`,
        email: `new.${suffix}@example.om`,
        dateOfBirth: birthDate,
      },
    });

    // 2. Create Lead in New stage
    const lead = await prisma.lead.create({
      data: {
        id: createUuid(randomUUID()),
        leadNumber: `LD-${suffix}`,
        personId: person.id,
        branchId,
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.mobile,
        email: person.email,
        interestedCourseId: courseId,
        counselorId,
        stage: 'New', // Not Qualified
      },
    });

    const documents = [
      {
        fileName: 'civil.pdf',
        fileKey: 'uploads/civil.pdf',
        fileType: 'application/pdf',
        documentType: 'CIVIL_ID_FRONT' as any,
      },
    ];

    // 3. Conversion must reject due to stage precondition
    await expect(
      leadConversionOrchestrator.convertLeadToAdmission(
        lead.id,
        documents,
        counselorId,
      ),
    ).rejects.toThrow('ERR_CRM_INVALID_STAGE_TRANSITION');

    // 4. Assert lead stage remains New
    const leadAfter = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(leadAfter?.stage).toBe('New');
  });
});
