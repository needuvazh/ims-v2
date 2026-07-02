import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../packages/database/src/client';
import { BatchRepository } from '../packages/training-delivery/src/infrastructure/batch-repository';
import { BatchService } from '../packages/training-delivery/src/application/batch-service';
import { createUuid } from '../packages/shared-kernel/src/value-objects';
import { randomUUID } from 'crypto';

describe('Batch Waitlist Integration Tests', () => {
  let batchRepository: BatchRepository;
  let batchService: BatchService;
  let branchId: string;
  let courseId: string;
  let studentProfileId1: string;
  let studentProfileId2: string;
  let leadId: string;
  let personIds: string[] = [];

  const actorId = createUuid('ebf48e69-a033-4985-aac6-e3c467b89c78');

  const dummySchedulingService = {
    getSessionsForTrainer: async () => []
  };

  beforeAll(async () => {
    batchRepository = new BatchRepository(prisma);
    batchService = new BatchService(prisma, batchRepository, dummySchedulingService as any);

    // Find/create branch
    let branch = await prisma.branch.findFirst({ where: { isDeleted: false } });
    if (!branch) {
      const instId = createUuid(randomUUID());
      await prisma.institute.create({
        data: { id: instId, instituteCode: 'TINST', instituteName: 'Test Inst' }
      });
      branch = await prisma.branch.create({
        data: { id: createUuid(randomUUID()), instituteId: instId, branchCode: 'TBR', branchName: 'Test Branch', status: 'Active' }
      });
    }
    branchId = branch.id;

    // Find/create published course
    let course = await prisma.course.findFirst({ where: { status: 'Published', isDeleted: false } });
    if (!course) {
      const category = await prisma.courseCategory.create({
        data: { id: createUuid(randomUUID()), code: 'TCAT', nameEnglish: 'Test Category', nameArabic: 'فئة' }
      });
      course = await prisma.course.create({
        data: {
          id: createUuid(randomUUID()),
          courseCode: 'TCRS-01',
          nameEnglish: 'Test Course',
          nameArabic: 'دورة',
          status: 'Published',
          courseClassification: 'Regular',
          durationType: 'Weeks',
          durationValue: 4,
          effectiveStartDate: new Date(),
        }
      });
      await prisma.coursePricing.create({
        data: { id: createUuid(randomUUID()), courseId: course.id, status: 'Active' }
      });
      await prisma.courseCompletionRule.create({
        data: { id: createUuid(randomUUID()), courseId: course.id, status: 'Active' }
      });
    }
    courseId = course.id;

    // Create students
    const p1 = randomUUID();
    const p2 = randomUUID();
    personIds.push(p1, p2);

    await prisma.person.createMany({
      data: [
        { id: p1, firstName: 'WStudent', lastName: 'One', mobile: `+96650${Math.floor(1000000 + Math.random() * 9000000)}` },
        { id: p2, firstName: 'WStudent', lastName: 'Two', mobile: `+96650${Math.floor(1000000 + Math.random() * 9000000)}` }
      ]
    });

    studentProfileId1 = randomUUID();
    studentProfileId2 = randomUUID();

    await prisma.studentProfile.createMany({
      data: [
        { id: studentProfileId1, personId: p1, studentNumber: `S-WL-${Math.floor(1000 + Math.random() * 9000)}`, status: 'Active' },
        { id: studentProfileId2, personId: p2, studentNumber: `S-WL-${Math.floor(1000 + Math.random() * 9000)}`, status: 'Active' }
      ]
    });

    // Create lead
    const p3 = randomUUID();
    personIds.push(p3);
    await prisma.person.create({
      data: { id: p3, firstName: 'WLead', lastName: 'One', mobile: `+96650${Math.floor(1000000 + Math.random() * 9000000)}` }
    });

    leadId = randomUUID();
    await prisma.lead.create({
      data: {
        id: leadId,
        leadNumber: `L-WL-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'WLead',
        lastName: 'One',
        phone: `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
        stage: 'New',
        person: { connect: { id: p3 } },
        branch: { connect: { id: branchId } },
        interestedCourse: { connect: { id: courseId } },
      }
    });

    // Create test user and branch access for actorId to satisfy branch scoping check
    await prisma.user.create({
      data: {
        id: actorId,
        username: `test-actor-${Math.floor(1000 + Math.random() * 9000)}`,
        passwordHash: 'hash',
        email: `test-actor-${Math.floor(1000 + Math.random() * 9000)}@asti.edu`,
        status: 'Active',
        userType: 'Admin',
        person: {
          create: {
            id: randomUUID(),
            firstName: 'Test',
            lastName: 'Actor',
            mobile: `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
          }
        },
        branchAccess: {
          create: {
            id: randomUUID(),
            branchId: branchId,
            status: 'Active',
          }
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup profiles
    await prisma.userBranchAccess.deleteMany({ where: { userId: actorId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
    await prisma.studentProfile.deleteMany({ where: { id: { in: [studentProfileId1, studentProfileId2] } } });
    await prisma.lead.deleteMany({ where: { id: leadId } });
    await prisma.person.deleteMany({ where: { id: { in: personIds } } });
  });

  it('should auto-promote next candidate when releaseSeatAndPromote is invoked', async () => {
    const batchCode = `B-WL-INT-${Math.floor(1000 + Math.random() * 9000)}`;
    const batch = await prisma.batch.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        branchId,
        batchCode,
        batchNameEnglish: 'WL Int Batch',
        batchNameArabic: 'دفعة',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        capacity: 1,
        currentEnrollmentCount: 1,
        waitingListEnabled: true,
        status: 'OpenForEnrollment',
      }
    });

    // Enqueue candidate 1 & 2
    const wl1 = await batchService.enqueueWaitlist(batch.id, studentProfileId1, null, actorId);
    const wl2 = await batchService.enqueueWaitlist(batch.id, null, leadId, actorId);

    expect(wl1.queuePosition).toBe(1);
    expect(wl2.queuePosition).toBe(2);

    // Cancel enrollment (release seat)
    await batchService.releaseSeatAndPromote(batch.id, actorId);

    // Candidate 1 should be promoted, Candidate 2 shifts to #1
    const wl1Updated = await prisma.waitingList.findUnique({ where: { id: wl1.id } });
    const wl2Updated = await prisma.waitingList.findUnique({ where: { id: wl2.id } });

    expect(wl1Updated?.status).toBe('Promoted');
    expect(wl2Updated?.status).toBe('Waiting');
    expect(wl2Updated?.queuePosition).toBe(1);

    // Cleanup
    await prisma.waitingList.deleteMany({ where: { batchId: batch.id } });
    await prisma.batch.delete({ where: { id: batch.id } });
  });

  it('should revert promotion and promote the next candidate on failed enrollment', async () => {
    const batchCode = `B-WL-REV-${Math.floor(1000 + Math.random() * 9000)}`;
    const batch = await prisma.batch.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        branchId,
        batchCode,
        batchNameEnglish: 'WL Rev Batch',
        batchNameArabic: 'دفعة',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        capacity: 1,
        currentEnrollmentCount: 1,
        waitingListEnabled: true,
        status: 'OpenForEnrollment',
      }
    });

    // Add student1 & student2 to waitlist
    const wl1 = await batchService.enqueueWaitlist(batch.id, studentProfileId1, null, actorId);
    const wl2 = await batchService.enqueueWaitlist(batch.id, studentProfileId2, null, actorId);

    // Manually simulate student1 promoted
    const correlationId = randomUUID();
    await prisma.waitingList.update({
      where: { id: wl1.id },
      data: { status: 'Promoted', promotionCorrelationId: correlationId }
    });
    await prisma.batch.update({
      where: { id: batch.id },
      data: { currentEnrollmentCount: 2 }
    });

    // Revert promotion of student 1 due to validation error
    await batchService.revertPromotion(batch.id, studentProfileId1, null, correlationId, 'Verification Failed', actorId);

    // student 1 should be Held, student 2 should be automatically Promoted
    const wl1Updated = await prisma.waitingList.findUnique({ where: { id: wl1.id } });
    const wl2Updated = await prisma.waitingList.findUnique({ where: { id: wl2.id } });

    expect(wl1Updated?.status).toBe('Held');
    expect(wl1Updated?.statusReason).toBe('Verification Failed');
    expect(wl2Updated?.status).toBe('Promoted');

    // Cleanup
    await prisma.waitingList.deleteMany({ where: { batchId: batch.id } });
    await prisma.batch.delete({ where: { id: batch.id } });
  });

  it('should auto-promote waitlisted students on manual capacity increase', async () => {
    const batchCode = `B-WL-CAP-${Math.floor(1000 + Math.random() * 9000)}`;
    const batch = await prisma.batch.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        branchId,
        batchCode,
        batchNameEnglish: 'WL Cap Batch',
        batchNameArabic: 'دفعة',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        capacity: 1,
        currentEnrollmentCount: 1,
        waitingListEnabled: true,
        status: 'OpenForEnrollment',
      }
    });

    // Enqueue candidate 1 & 2
    const wl1 = await batchService.enqueueWaitlist(batch.id, studentProfileId1, null, actorId);
    const wl2 = await batchService.enqueueWaitlist(batch.id, studentProfileId2, null, actorId);

    // Increase capacity bounds from 1 to 3
    await batchService.updateBatch(batch.id, { capacity: 3 }, 1, actorId);

    // Both candidates should be promoted automatically
    const wl1Updated = await prisma.waitingList.findUnique({ where: { id: wl1.id } });
    const wl2Updated = await prisma.waitingList.findUnique({ where: { id: wl2.id } });
    const batchUpdated = await prisma.batch.findUnique({ where: { id: batch.id } });

    expect(wl1Updated?.status).toBe('Promoted');
    expect(wl2Updated?.status).toBe('Promoted');
    expect(batchUpdated?.currentEnrollmentCount).toBe(3);

    // Cleanup
    await prisma.waitingList.deleteMany({ where: { batchId: batch.id } });
    await prisma.batch.delete({ where: { id: batch.id } });
  });

  it('concurrency control: parallel enqueues are safe and positions are sequential without gaps', async () => {
    const batchCode = `B-WL-CON-${Math.floor(1000 + Math.random() * 9000)}`;
    const batch = await prisma.batch.create({
      data: {
        id: createUuid(randomUUID()),
        courseId,
        branchId,
        batchCode,
        batchNameEnglish: 'WL Con Batch',
        batchNameArabic: 'دفعة',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        capacity: 1,
        currentEnrollmentCount: 1,
        waitingListEnabled: true,
        status: 'OpenForEnrollment',
      }
    });

    // Trigger parallel waitlist enqueues
    // In order to avoid duplicate user validations inside the test,
    // we create transient student profiles and launch enqueues concurrently.
    const tempPersons: string[] = [];
    const tempStudents: string[] = [];
    for (let i = 0; i < 4; i++) {
      const pId = randomUUID();
      const sId = randomUUID();
      tempPersons.push(pId);
      tempStudents.push(sId);
      await prisma.person.create({
        data: { id: pId, firstName: `ConStudent-${i}`, lastName: 'Test', mobile: `+96653${Math.floor(1000000 + Math.random() * 9000000)}` }
      });
      await prisma.studentProfile.create({
        data: { id: sId, personId: pId, studentNumber: `S-CON-${i}-${Math.floor(1000 + Math.random() * 9000)}`, status: 'Active' }
      });
    }

    // Run parallel enqueues!
    const promises = tempStudents.map((sId) => {
      return batchService.enqueueWaitlist(batch.id, sId, null, actorId);
    });

    const results = await Promise.all(promises);

    // Verify queue positions are sequential (1, 2, 3, 4) with no duplicates or gaps
    const positions = results.map(r => r.queuePosition).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 3, 4]);

    // Cleanup
    await prisma.waitingList.deleteMany({ where: { batchId: batch.id } });
    await prisma.batch.delete({ where: { id: batch.id } });
    await prisma.studentProfile.deleteMany({ where: { id: { in: tempStudents } } });
    await prisma.person.deleteMany({ where: { id: { in: tempPersons } } });
  });
});
