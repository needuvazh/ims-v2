import { PrismaClient, Prisma } from '@prisma/client';
import { CreateLeadInput, LeadStage } from '../domain/lead';

export interface ILeadRepository {
  create(
    data: CreateLeadInput & { personId: string; leadNumber: string },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<any>;
  updateStage(id: string, stage: LeadStage, tx?: Prisma.TransactionClient): Promise<void>;
  assignCounselor(id: string, counselorId: string, tx?: Prisma.TransactionClient): Promise<void>;
}

export class LeadRepository implements ILeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateLeadInput & { personId: string; leadNumber: string },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string }> {
    const client = tx || this.prisma;
    const lead = await client.lead.create({
      data: {
        branchId: data.branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone,
        interestedCourseId: data.interestedCourseId,
        source: data.source as any,
        counselorId: data.counselorId || null,
        notes: data.notes || null,
        stage: 'New',
        leadNumber: data.leadNumber,
        personId: data.personId,
      },
      select: { id: true },
    });
    return lead;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const client = tx || this.prisma;
    return client.lead.findUnique({
      where: { id },
    });
  }

  async updateStage(id: string, stage: LeadStage, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.lead.update({
      where: { id },
      data: { stage: stage as any },
    });
  }

  async assignCounselor(id: string, counselorId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.lead.update({
      where: { id },
      data: { counselorId },
    });
  }
}
