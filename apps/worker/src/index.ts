import { prisma, IamQueryService } from '@ims/database';
import { createStructuredLogger } from '@ims/observability';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { ExportService } from './export-service';
import { BatchRepository, BatchService } from '@ims/training-delivery';
import { EnrollmentService } from '@ims/admissions-enrollment';
import { SchedulingService, PrismaSchedulingRepository } from '@ims/scheduling';

const logger = createStructuredLogger({});
const POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10);
const BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10);
const MAX_ATTEMPTS = 5;
const exportService = new ExportService();
const iamQueryService = new IamQueryService(prisma);
const batchRepository = new BatchRepository(prisma);
const batchService = new BatchService(prisma, batchRepository);
const enrollmentService = new EnrollmentService(prisma);
const schedulingRepository = new PrismaSchedulingRepository(prisma);
const schedulingService = new SchedulingService(prisma, schedulingRepository);

let isShuttingDown = false;
let lastOverdueSweepTime = 0;
const OVERDUE_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DATABASE_RETRY_BACKOFF_MS = 30_000;
let databaseUnavailable = false;
let lastDatabaseWarningAt = 0;

function isDatabaseConnectivityError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: string; message?: string; code?: string };
  return (
    candidate.name === 'PrismaClientInitializationError' ||
    candidate.code === 'P1001' ||
    Boolean(candidate.message?.includes("Can't reach database server"))
  );
}

function getDatabaseErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as { message?: string };
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim().split('\n').slice(-1)[0] ?? candidate.message.trim();
    }
  }

  return 'Unknown database connectivity error';
}

function getDatabaseErrorCode(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as { code?: string; name?: string };
    if (typeof candidate.code === 'string' && candidate.code.trim()) {
      return candidate.code.trim();
    }
    if (typeof candidate.name === 'string' && candidate.name.trim()) {
      return candidate.name.trim();
    }
  }

  return 'DB_UNAVAILABLE';
}

function reportDatabaseWarning(scope: string, error: unknown) {
  const now = Date.now();
  if (!databaseUnavailable || now - lastDatabaseWarningAt >= DATABASE_RETRY_BACKOFF_MS) {
    logger.warn(`Database unavailable while ${scope}; retrying in ${DATABASE_RETRY_BACKOFF_MS / 1000}s`, {
      code: getDatabaseErrorCode(error),
      message: getDatabaseErrorMessage(error)
    });
    lastDatabaseWarningAt = now;
  }

  databaseUnavailable = true;
}

function clearDatabaseWarning() {
  databaseUnavailable = false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleWebsiteInquirySubmitted(payload: Record<string, unknown>) {
  const inquiryId = payload.id as string | undefined;
  const branchId = payload.branchId as string | undefined;
  if (!inquiryId || !branchId) {
    logger.warn('WebsiteInquirySubmitted payload missing id or branchId');
    return;
  }

  // 1. Fetch active counselors in the branch via IamQueryService
  const counselors = await iamQueryService.getActiveUsersByRoleAndBranch('Counselor', branchId);
  if (counselors.length === 0) {
    logger.warn(`No active counselors found for branch: ${branchId}. Auto-assignment skipped.`, { entityId: inquiryId, entityType: 'Inquiry' });
    return;
  }

  // 2. Count active, non-terminal leads assigned to each counselor
  const workloads = await Promise.all(
    counselors.map(async (counselor) => {
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

  // 3. Find the lowest workload
  const minCount = Math.min(...workloads.map((w) => w.count));
  const candidateCounselors = workloads.filter((w) => w.count === minCount);

  // 4. Random tie-breaker
  const selected = candidateCounselors[Math.floor(Math.random() * candidateCounselors.length)];
  const assignedCounselorId = selected.counselorId;

  // 5. Persist counselorId on Inquiry and emit LeadAssigned event in transaction
  await prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({
      where: { id: inquiryId },
      select: { inquiryNumber: true },
    });
    if (!inquiry) {
      throw new Error(`Inquiry not found: ${inquiryId}`);
    }

    await tx.inquiry.update({
      where: { id: inquiryId },
      data: { counselorId: assignedCounselorId },
    });

    await tx.outboxEvent.create({
      data: {
        id: createUuid(randomUUID()),
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

    // Write Audit Log
    await tx.auditLog.create({
      data: {
        id: createUuid(randomUUID()),
        module: 'LeadCrm',
        performedBy: null, // System auto-assignment
        performedAt: new Date(),
        entityType: 'Inquiry',
        entityId: inquiryId,
        action: 'AutoAssign',
        newValue: { counselorId: assignedCounselorId },
        branchId,
      },
    });
  });

  logger.info(`Auto-assigned website inquiry ${inquiryId} to counselor ${assignedCounselorId}`);
}

async function handleReceiptGenerated(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId as string | undefined;
  if (!enrollmentId) {
    logger.warn('ReceiptGenerated event payload missing enrollmentId');
    return;
  }
  logger.info(`Processing ReceiptGenerated confirmation gate for enrollment ${enrollmentId}`);
  // confirmEnrollment is already idempotent and checks document verification gates internally
  await enrollmentService.confirmEnrollment(enrollmentId, 'System');
}

async function handleBatchStarted(payload: Record<string, unknown>) {
  const batchId = payload.batchId as string | undefined;
  if (!batchId) {
    logger.warn('BatchStarted event payload missing batchId');
    return;
  }
  logger.info(`Processing BatchStarted activation for batch ${batchId}`);
  await enrollmentService.activateEnrollmentsByBatch(batchId);
}

async function sweepOverdueFollowUps() {
  try {
    logger.info('Starting overdue follow-ups sweep...');

    // Sweep open follow-ups older than current_time - 60 minutes (excluding soft-deleted and terminal leads)
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
    const overdueFollowUps = await prisma.leadFollowUp.findMany({
      where: {
        status: 'Scheduled',
        followUpDate: { lte: sixtyMinutesAgo },
        isDeleted: false,
        lead: {
          isDeleted: false,
          stage: { notIn: ['Converted', 'Won', 'Lost'] },
        },
      },
      include: {
        lead: {
          select: {
            leadNumber: true,
            branchId: true,
          },
        },
      },
    });

    if (overdueFollowUps.length === 0) {
      logger.info('No overdue follow-ups found.');
      return;
    }

    logger.info(`Found ${overdueFollowUps.length} overdue follow-ups. Processing...`);

    for (const followUp of overdueFollowUps) {
      await prisma.$transaction(async (tx) => {
        // Update status to 'Missed' in same transaction
        await tx.leadFollowUp.update({
          where: { id: followUp.id },
          data: { status: 'Missed' },
        });

        // Recalculate parent lead nextFollowUpDate
        const nextScheduled = await tx.leadFollowUp.findMany({
          where: {
            leadId: followUp.leadId,
            status: 'Scheduled',
            id: { not: followUp.id },
            isDeleted: false,
          },
          orderBy: { followUpDate: 'asc' },
          take: 1,
        });

        const newNextFollowUpDate = nextScheduled[0]?.followUpDate || null;

        await tx.lead.update({
          where: { id: followUp.leadId },
          data: { nextFollowUpDate: newNextFollowUpDate },
        });

        // Write event to outbox
        await tx.outboxEvent.create({
          data: {
            id: createUuid(randomUUID()),
            eventType: 'FollowUpOverdue',
            aggregateType: 'LeadFollowUp',
            aggregateId: followUp.id,
            payload: {
              followUpId: followUp.id,
              leadId: followUp.leadId,
              counselorId: followUp.counselorId,
              leadNumber: followUp.lead.leadNumber,
              followUpDate: followUp.followUpDate,
            },
            status: 'Pending',
            availableAt: new Date(),
          },
        });

        // Write Audit Log
        await tx.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'LeadCrm',
            performedBy: null, // System job
            performedAt: new Date(),
            entityType: 'LeadFollowUp',
            entityId: followUp.id,
            action: 'OverdueAlert',
            newValue: { status: 'Missed' },
            branchId: followUp.lead.branchId,
          },
        });
      });
      logger.info(`Marked follow-up ${followUp.id} as Missed and emitted FollowUpOverdue event.`);
    }

    logger.info('Finished overdue follow-ups sweep.');
    clearDatabaseWarning();
  } catch (err) {
    if (isDatabaseConnectivityError(err)) {
      reportDatabaseWarning('sweeping overdue follow-ups', err);
      return;
    }

    logger.error('Error sweeping overdue follow-ups', { error: err as Error });
  }
}

async function handleWaitlistEntryPromoted(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId as string | undefined;
  const promotionCorrelationId = payload.promotionCorrelationId as string | undefined;
  const studentProfileId = payload.studentProfileId as string | undefined;
  const batchId = payload.batchId as string | undefined;

  logger.info(`Handling WaitlistEntryPromoted - enrollmentId: ${enrollmentId}, promotionCorrelationId: ${promotionCorrelationId}, studentProfileId: ${studentProfileId}, batchId: ${batchId}`);

  if (enrollmentId) {
    await enrollmentService.approveEnrollment(enrollmentId, 'system-worker');
    return;
  }

  if (studentProfileId && batchId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentProfileId,
        batchId,
        enrollmentStatus: 'Submitted',
        isDeleted: false,
      },
    });
    if (enrollments.length === 1) {
      await enrollmentService.approveEnrollment(enrollments[0].id, 'system-worker');
    } else if (enrollments.length === 0) {
      logger.info(`Manual waitlist entry promoted with no pending enrollment - studentProfileId: ${studentProfileId}, batchId: ${batchId}. Awaiting manual resolution.`);
    } else {
      throw new Error(`Could not uniquely resolve pending enrollment for waitlist candidate - studentProfileId: ${studentProfileId}, batchId: ${batchId}, foundCount: ${enrollments.length}`);
    }
    return;
  }

  // Lead or other manual enqueue without student profile
  logger.info(`Manual waitlist entry promoted with no student profile - payload: ${JSON.stringify(payload)}. Awaiting manual resolution.`);
}

async function processOutboxEvents() {
  if (isShuttingDown) return;

  try {
    const events = await prisma.outboxEvent.findMany({
      where: {
        status: 'Pending',
        availableAt: { lte: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { availableAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (events.length === 0) {
      return;
    }

    logger.debug(`Found ${events.length} outbox events to process.`);

    for (const event of events) {
      if (isShuttingDown) break;

      try {
        logger.info('Processing outbox event', { entityId: event.id, entityType: event.eventType });
        
        if (event.eventType === 'WebsiteInquirySubmitted') {
          await handleWebsiteInquirySubmitted(event.payload as Record<string, unknown>);
        } else if (event.eventType === 'ReceiptGenerated') {
          await handleReceiptGenerated(event.payload as Record<string, unknown>);
        } else if (event.eventType === 'BatchStarted') {
          await handleBatchStarted(event.payload as Record<string, unknown>);
        } else if (event.eventType === 'EnrollmentCancelled') {
          const payload = event.payload as { batchId: string; releasedSeats?: number };
          logger.info(`Handling EnrollmentCancelled for batch ${payload.batchId}`);
          await batchService.releaseSeatAndPromote(payload.batchId, payload.releasedSeats || 1);
        } else if (event.eventType === 'WaitlistEntryPromoted') {
          await handleWaitlistEntryPromoted(event.payload as Record<string, unknown>);
        } else if (event.eventType === 'BusinessCalendarCreated') {
          // Future: may want to re-validate whole year?
        } else if (event.eventType === 'HolidayCreated') {
          const payload = event.payload as { branchId: string; date: string; instituteId: string };
          logger.info(`Handling HolidayCreated for branch ${payload.branchId} on ${payload.date}`);
          await schedulingService.processExternalCalendarChange(payload.branchId, new Date(payload.date), payload.instituteId);
        } else if (event.eventType === 'VenueBlockCreated') {
          const payload = event.payload as { branchId: string; blockDate: string; instituteId?: string };
          logger.info(`Handling VenueBlockCreated for branch ${payload.branchId} on ${payload.blockDate}`);
          // Note: VenueBlock payload might miss instituteId, need to fetch it or pass it.
          // For now assume single institute or resolve from branch.
          const branch = await prisma.branch.findUnique({ where: { id: payload.branchId }, select: { instituteId: true } });
          if (branch) {
            await schedulingService.processExternalCalendarChange(payload.branchId, new Date(payload.blockDate), branch.instituteId);
          }
        } else if (event.eventType === 'EnrollmentCreationFailed') {
          const payload = event.payload as {
            batchId: string;
            studentProfileId?: string | null;
            studentId?: string | null;
            leadId?: string | null;
            promotionCorrelationId?: string | null;
            correlationId?: string | null;
            reason?: string | null;
          };
          logger.info(`Handling EnrollmentCreationFailed for batch ${payload.batchId}`);
          await batchService.revertPromotion(
            payload.batchId,
            payload.studentProfileId || payload.studentId || null,
            payload.leadId || null,
            payload.promotionCorrelationId || payload.correlationId || null,
            payload.reason || null,
            'system-worker'
          );
        } else {
          // TODO: In Phase 2, route event.payload to the actual domain handlers.
          // For Phase 1, we just simulate processing to ensure the loop works.
          await new Promise((resolve) => setTimeout(resolve, 50)); 
        }
        
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'Processed',
            processedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        
        logger.info('Successfully processed outbox event', { entityId: event.id });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('Failed to process outbox event', { entityId: event.id, error: err as Error });
        
        const newAttempts = event.attempts + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? 'Failed' : 'Pending';
        
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: newStatus,
            attempts: newAttempts,
            lastError: errorMsg,
          },
        });
      }
    }

    clearDatabaseWarning();
  } catch (err) {
    if (isDatabaseConnectivityError(err)) {
      reportDatabaseWarning('polling outbox events', err);
      return;
    }

    logger.error('Error polling outbox events', { error: err as Error });
  }
}

async function processExportJobs() {
  if (isShuttingDown) return;

  try {
    const jobs = await prisma.exportJob.findMany({
      where: { status: 'Pending' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (jobs.length === 0) {
      return;
    }

    logger.debug(`Found ${jobs.length} export jobs to process.`);

    for (const job of jobs) {
      if (isShuttingDown) break;

      try {
        await prisma.exportJob.update({
          where: { id: job.id },
          data: { status: 'Processing', updatedAt: new Date() },
        });

        const result = await exportService.export({
          id: job.id,
          reportType: job.reportType,
          requestedBy: job.requestedBy,
          branchId: job.branchId,
          filters: job.filters,
          format: job.format as 'CSV' | 'XLSX' | 'PDF',
          status: 'Processing',
          fileUrl: job.fileUrl,
          errorMessage: job.errorMessage,
        });

        await prisma.exportJob.update({
          where: { id: job.id },
          data: {
            status: 'Done',
            fileUrl: result.fileUrl,
            errorMessage: null,
            updatedAt: new Date(),
          },
        });

        logger.info('Successfully processed export job', { entityId: job.id, entityType: job.reportType });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('Failed to process export job', { entityId: job.id, error: err as Error });

        await prisma.exportJob.update({
          where: { id: job.id },
          data: {
            status: 'Failed',
            errorMessage: errorMsg,
            updatedAt: new Date(),
          },
        });
      }
    }

    clearDatabaseWarning();
  } catch (err) {
    if (isDatabaseConnectivityError(err)) {
      reportDatabaseWarning('polling export jobs', err);
      return;
    }

    logger.error('Error polling export jobs', { error: err as Error });
  }
}

async function startWorker() {
  logger.info('Starting Outbox Worker', { count: BATCH_SIZE });
  
  while (!isShuttingDown) {
    await processOutboxEvents();
    await processExportJobs();
    
    const now = Date.now();
    if (now - lastOverdueSweepTime >= OVERDUE_SWEEP_INTERVAL_MS) {
      await sweepOverdueFollowUps();
      lastOverdueSweepTime = now;
    }

    const waitMs = databaseUnavailable ? Math.max(POLL_INTERVAL_MS, DATABASE_RETRY_BACKOFF_MS) : POLL_INTERVAL_MS;
    for (let i = 0; i < waitMs; i += 100) {
      if (isShuttingDown) break;
      await sleep(100);
    }
  }
  
  logger.info('Outbox Worker stopped.');
  await prisma.$disconnect();
}

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  isShuttingDown = true;
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  isShuttingDown = true;
});

startWorker().catch((err) => {
  logger.error('Worker crashed', { error: err });
  process.exit(1);
});
