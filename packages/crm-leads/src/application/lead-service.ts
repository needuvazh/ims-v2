import { PrismaClient, Prisma } from '@prisma/client';
import { ILeadRepository } from '../infrastructure/lead-repository';
import { CreateLeadInput, LeadStage } from '../domain/lead';

export class LeadService {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async createLead(input: CreateLeadInput, tx?: Prisma.TransactionClient) {
    // Invariants or checks can go here
    return this.leadRepository.create(input, tx);
  }

  async assignCounselor(leadId: string, counselorId: string, tx?: Prisma.TransactionClient) {
    await this.leadRepository.assignCounselor(leadId, counselorId, tx);
  }

  async convertLead(leadId: string, tx?: Prisma.TransactionClient) {
    const lead = await this.leadRepository.findById(leadId, tx);
    if (!lead) {
      throw new Error('Lead not found');
    }
    if (lead.stage === 'Converted') {
      throw new Error('Lead is already converted');
    }
    await this.leadRepository.updateStage(leadId, 'Converted', tx);
    return lead; // returning lead data so the orchestrator can use it
  }
}
