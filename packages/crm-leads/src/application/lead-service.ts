import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { ILeadRepository } from '../infrastructure/lead-repository';
import { CreateLeadInput } from '../domain/lead';

export class LeadService {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async createLead(input: CreateLeadInput, tx?: Prisma.TransactionClient) {
    // Under ASTI DDD rules, personId would normally be resolved by checking duplicate matches or creating a Person record.
    // For this service stub, we generate a fallback random UUID for personId and a sequential Lead Number.
    const personId = randomUUID();
    const leadNumber = `LD-2026-MCT-${Math.floor(10000 + Math.random() * 90000)}`;

    return this.leadRepository.create(
      {
        ...input,
        personId,
        leadNumber,
      },
      tx
    );
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
