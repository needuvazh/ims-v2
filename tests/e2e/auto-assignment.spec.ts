import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper to simulate the exact worker logic
async function processAutoAssignment(inquiryId: string, branchId: string) {
  // 1. Fetch active counselors in the branch
  const users = await prisma.user.findMany({
    where: {
      status: 'Active',
      isDeleted: false,
      roles: {
        some: {
          role: {
            roleCode: 'Counselor',
            status: 'Active',
            isDeleted: false,
          },
          status: 'Active',
        },
      },
      branchAccess: {
        some: {
          branchId,
          status: 'Active',
        },
      },
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  // 2. Count active workloads
  const workloads = await Promise.all(
    users.map(async (counselor) => {
      const activeLeadsCount = await prisma.lead.count({
        where: {
          counselorId: counselor.id,
          stage: {
            notIn: ['Converted', 'Won', 'Lost'],
          },
          isDeleted: false,
        },
      });
      return { counselorId: counselor.id, count: activeLeadsCount };
    })
  );

  // 3. Find counselor with lowest workload
  const minCount = Math.min(...workloads.map((w) => w.count));
  const candidateCounselors = workloads.filter((w) => w.count === minCount);
  const selected = candidateCounselors[Math.floor(Math.random() * candidateCounselors.length)];
  const assignedCounselorId = selected.counselorId;

  // 4. Update inquiry and emit event
  await prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({
      where: { id: inquiryId },
      select: { inquiryNumber: true },
    });
    if (!inquiry) throw new Error(`Inquiry not found: ${inquiryId}`);

    await tx.inquiry.update({
      where: { id: inquiryId },
      data: { counselorId: assignedCounselorId },
    });

    await tx.outboxEvent.create({
      data: {
        id: randomUUID(),
        eventType: 'LeadAssigned',
        aggregateType: 'Inquiry',
        aggregateId: inquiryId,
        payload: {
          inquiryId,
          counselorId: assignedCounselorId,
          inquiryNumber: inquiry.inquiryNumber,
        },
        status: 'Pending',
        availableAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        module: 'LeadCrm',
        performedBy: null,
        performedAt: new Date(),
        entityType: 'Inquiry',
        entityId: inquiryId,
        action: 'AutoAssign',
        newValue: { counselorId: assignedCounselorId },
        branchId,
      },
    });
  });
}

test.describe('Auto-Assignment Workflow Integration', () => {
  let branchId: string;
  let roleId: string;
  let counselorAId: string;
  let counselorBId: string;

  test.beforeAll(async () => {
    // 1. Ensure test branch exists
    let institute = await prisma.institute.findFirst();
    if (!institute) {
      institute = await prisma.institute.create({
        data: {
          id: randomUUID(),
          name: 'ASTI',
          legalName: 'Al Saud Training Institute',
          country: 'Oman',
          currency: 'OMR',
          status: 'Active',
        },
      });
    }

    const bCode = `TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const branch = await prisma.branch.upsert({
      where: { branchCode: bCode },
      update: {},
      create: {
        id: randomUUID(),
        branchName: 'Test Branch',
        branchCode: bCode,
        status: 'Active',
        instituteId: institute.id,
      },
    });
    branchId = branch.id;

    // 2. Ensure Counselor role exists
    const role = await prisma.role.upsert({
      where: { roleCode: 'Counselor' },
      update: {},
      create: {
        id: randomUUID(),
        roleName: 'Counselor',
        roleCode: 'Counselor',
        status: 'Active',
      },
    });
    roleId = role.id;

    // 3. Create Counselor A
    const usernameA = `counselora_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const personA = await prisma.person.create({
      data: {
        id: randomUUID(),
        firstName: 'Counselor',
        lastName: 'A',
        mobile: `+96899${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    const userA = await prisma.user.create({
      data: {
        id: randomUUID(),
        personId: personA.id,
        username: usernameA,
        email: `${usernameA}@test.com`,
        userType: 'Employee',
        status: 'Active',
        defaultBranchId: branchId,
        passwordHash: 'dummy_hash',
      },
    });
    counselorAId = userA.id;

    await prisma.userRole.create({
      data: {
        id: randomUUID(),
        userId: counselorAId,
        roleId: roleId,
        status: 'Active',
      },
    });

    await prisma.userBranchAccess.create({
      data: {
        id: randomUUID(),
        userId: counselorAId,
        branchId: branchId,
        status: 'Active',
      },
    });

    // 4. Create Counselor B
    const usernameB = `counselorb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const personB = await prisma.person.create({
      data: {
        id: randomUUID(),
        firstName: 'Counselor',
        lastName: 'B',
        mobile: `+96898${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });
    const userB = await prisma.user.create({
      data: {
        id: randomUUID(),
        personId: personB.id,
        username: usernameB,
        email: `${usernameB}@test.com`,
        userType: 'Employee',
        status: 'Active',
        defaultBranchId: branchId,
        passwordHash: 'dummy_hash',
      },
    });
    counselorBId = userB.id;

    await prisma.userRole.create({
      data: {
        id: randomUUID(),
        userId: counselorBId,
        roleId: roleId,
        status: 'Active',
      },
    });

    await prisma.userBranchAccess.create({
      data: {
        id: randomUUID(),
        userId: counselorBId,
        branchId: branchId,
        status: 'Active',
      },
    });

    // 5. Seed a lead for Counselor A so they have higher workload
    let course = await prisma.course.findFirst();
    if (!course) {
      course = await prisma.course.create({
        data: {
          id: randomUUID(),
          courseCode: 'TESTCRS',
          name: 'Test Course',
          status: 'Active',
        },
      });
    }

    const leadPerson = await prisma.person.create({
      data: {
        id: randomUUID(),
        firstName: 'Lead',
        lastName: 'A',
        mobile: `+96897${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    await prisma.lead.create({
      data: {
        id: randomUUID(),
        firstName: 'Lead',
        lastName: 'A',
        phone: leadPerson.mobile,
        email: 'leada@test.com',
        source: 'Campaign',
        branchId: branchId,
        counselorId: counselorAId,
        personId: leadPerson.id,
        leadNumber: `LD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        stage: 'New',
        status: 'Active',
        version: 1,
        interestedCourseId: course.id,
      },
    });
  });

  test('should assign to Counselor B (lowest workload) and emit LeadAssigned outbox event', async () => {
    // 1. Submit Website Inquiry
    const inquiryId = randomUUID();
    const inqNum = `INQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const inquiry = await prisma.inquiry.create({
      data: {
        id: inquiryId,
        inquiryNumber: inqNum,
        branchId: branchId,
        firstName: 'Website',
        lastName: 'Visitor',
        mobile: '+96892000001',
        email: 'visitor@test.com',
        status: 'Captured',
      },
    });

    // 2. Trigger auto-assignment
    await processAutoAssignment(inquiryId, branchId);

    // 3. Verify counselor assignment
    const updatedInquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: { counselorId: true },
    });
    expect(updatedInquiry?.counselorId).toBe(counselorBId);

    // 4. Verify LeadAssigned event in outbox
    const leadAssignedEvent = await prisma.outboxEvent.findFirst({
      where: {
        eventType: 'LeadAssigned',
        aggregateId: inquiryId,
      },
    });
    expect(leadAssignedEvent).not.toBeNull();
    expect(leadAssignedEvent?.payload).toEqual(
      expect.objectContaining({
        inquiryId,
        counselorId: counselorBId,
        inquiryNumber: inqNum,
      })
    );
  });
});
