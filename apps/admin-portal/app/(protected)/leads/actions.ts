'use server';

import { revalidatePath } from 'next/cache';
import { LeadConversionOrchestrator, AdmissionService, AdmissionRepository } from '@ims/admissions-enrollment';
import { LeadService, LeadRepository } from '@ims/crm-leads';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const leadRepo = new LeadRepository(prisma);
const leadService = new LeadService(leadRepo);
const admissionRepo = new AdmissionRepository(prisma);
const admissionService = new AdmissionService(admissionRepo);
const orchestrator = new LeadConversionOrchestrator(prisma, leadService, admissionService);

export async function convertLeadAction(leadId: string) {
  try {
    const result = await orchestrator.convertLeadToAdmission(leadId);
    revalidatePath('/leads');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
