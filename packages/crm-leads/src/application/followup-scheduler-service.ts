import { PrismaClient, Prisma } from '@prisma/client';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { IFollowUpRepository } from '../domain/repositories';

export class FollowUpSchedulerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly followUpRepository: IFollowUpRepository
  ) {}

  /**
   * Processes all scheduled follow-ups that are overdue and flags them.
   * Intended to be run periodically by a background job or cron worker.
   */
  async processOverdueFollowUps(actorId: string = 'system') {
    const now = new Date();
    
    // Find all follow-ups that are scheduled but their date has passed
    const overdueFollowUps = await this.followUpRepository.findAllScheduledOverdue(now);
    
    if (overdueFollowUps.length === 0) {
      return { processedCount: 0 };
    }

    let processedCount = 0;

    for (const followUp of overdueFollowUps) {
      // Process each overdue follow-up transactionally
      await this.prisma.$transaction(async (tx) => {
        // Double-check the status hasn't changed concurrently
        const currentFollowUp = await this.followUpRepository.findById(followUp.id, tx);
        if (!currentFollowUp || currentFollowUp.status !== 'Scheduled') {
          return; // Skip if already completed or cancelled
        }

        // Generate a LeadNote entity stating the follow-up is overdue
        await tx.leadNote.create({
          data: {
            id: createUuid(randomUUID()),
            leadId: followUp.leadId,
            content: `System: Scheduled follow-up (${followUp.followUpType}) is overdue.`,
            createdBy: actorId !== 'system' ? actorId : null,
          }
        });

        // We update the status to Overdue if the schema supports it.
        // Based on FRD, status is a string (Scheduled, Completed, Cancelled). 
        // We will update to 'Overdue' or keep it 'Scheduled' and just log the note. 
        // Wait, the FRD specifies 'Scheduled, Completed, Cancelled'. Let's update it to 'Overdue'.
        await tx.leadFollowUp.update({
          where: { id: followUp.id },
          data: {
            status: 'Overdue',
            updatedAt: new Date(),
            updatedBy: actorId !== 'system' ? actorId : null,
          }
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'LeadCrm',
            performedBy: actorId !== 'system' ? actorId : null,
            performedAt: new Date(),
            entityType: 'LeadFollowUp',
            entityId: followUp.id,
            action: 'MarkOverdue',
            newValue: {
              status: 'Overdue',
            },
            branchId: followUp.lead?.branchId || currentFollowUp.lead?.branchId,
          },
        });

        processedCount++;
      });
    }

    return { processedCount };
  }
}
