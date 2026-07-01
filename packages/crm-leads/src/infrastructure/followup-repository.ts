import { PrismaClient, Prisma } from '@prisma/client';
import { IFollowUpRepository } from '../domain/repositories';
import { ScheduleFollowUpInput } from '../domain/lead';

export class FollowUpRepository implements IFollowUpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: ScheduleFollowUpInput & { leadId: string; counselorId: string },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; followUpDate: Date; followUpType: string; status: string }> {
    const client = tx || this.prisma;
    const followUp = await client.leadFollowUp.create({
      data: {
        leadId: data.leadId,
        counselorId: data.counselorId,
        followUpDate: new Date(data.followUpDate),
        followUpType: data.followUpType,
        notes: data.agenda, // mapping agenda to notes
        status: 'Scheduled',
      },
      select: {
        id: true,
        followUpDate: true,
        followUpType: true,
        status: true,
      },
    });
    return followUp;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    const client = tx || this.prisma;
    return client.leadFollowUp.findUnique({
      where: { id, isDeleted: false },
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        counselor: { select: { id: true, username: true } },
      },
    });
  }

  async recordOutcome(
    id: string,
    outcome: string,
    notes: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.leadFollowUp.update({
      where: { id },
      data: {
        outcome,
        notes,
        status: 'Completed',
      },
    });
  }

  async cancelAllScheduled(leadId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || this.prisma;
    const result = await client.leadFollowUp.updateMany({
      where: {
        leadId,
        status: 'Scheduled',
        isDeleted: false,
      },
      data: {
        status: 'Cancelled',
      },
    });
    return result.count;
  }

  async findAllScheduledOverdue(since: Date, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma;
    return client.leadFollowUp.findMany({
      where: {
        status: 'Scheduled',
        followUpDate: { lte: since },
        isDeleted: false,
      },
      include: {
        lead: {
          select: {
            leadNumber: true,
            firstName: true,
            lastName: true,
            counselorId: true,
          },
        },
      },
    });
  }

  async findAllForLead(leadId: string, tx?: Prisma.TransactionClient): Promise<any[]> {
    const client = tx || this.prisma;
    return client.leadFollowUp.findMany({
      where: { leadId, isDeleted: false },
      orderBy: { followUpDate: 'desc' },
      include: {
        counselor: { select: { username: true } },
      },
    });
  }
}
