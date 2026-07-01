'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { buildCrmActionFailure } from './form-errors';
import { assertPermission, assertBranchScope, getSession } from '../../lib/auth-guard';
import { CreateLeadSchema } from '@ims/crm-leads';
import { prisma } from '@ims/database';

const createLeadSchema = CreateLeadSchema.extend({
  bypassDuplicateBlock: z.boolean().optional(),
});

const updateLeadSchema = createLeadSchema.extend({
  id: z.string().uuid(),
  version: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int({ message: 'Version is required for concurrency control' })),
  lostReasonCode: z.string().optional().nullable().or(z.literal('')),
  lostReasonNotes: z.string().optional().nullable().or(z.literal('')),
});

async function getActorId(): Promise<string> {
  const session = await getSession();
  return session.userId;
}

async function assertCounselorLeadScope(leadId: string, session: any) {
  const { leadService } = await import('../../lib/runtime');
  const lead = await leadService.getLeadById(leadId);
  if (!lead) {
    throw new Error('ERR_CRM_LEAD_NOT_FOUND');
  }

  const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
  if (!hasGlobalRead && lead.counselorId !== session.userId) {
    throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
  }
  return lead;
}

export async function createLeadAction(data: any) {
  try {
    const preparedData = {
      ...data,
      email: data.email === '' ? undefined : data.email,
      counselorId: data.counselorId === '' ? undefined : data.counselorId,
      notes: data.notes === '' ? undefined : data.notes,
      bypassDuplicateBlock: !!data.bypassDuplicateBlock,
    };
    const parsed = createLeadSchema.parse(preparedData);

    // Enforce permission and branch scoping
    await assertPermission('lead.create');
    await assertBranchScope(parsed.branchId);

    const actorId = await getActorId();
    const { leadService } = await import('../../lib/runtime');

    const lead = await leadService.createLead(
      {
        branchId: parsed.branchId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email || undefined,
        phone: parsed.phone,
        dateOfBirth: parsed.dateOfBirth,
        interestedCourseId: parsed.interestedCourseId,
        source: parsed.source,
        counselorId: parsed.counselorId || undefined,
        notes: parsed.notes,
        bypassDuplicateBlock: parsed.bypassDuplicateBlock || false,
      },
      actorId
    );

    revalidatePath('/leads');
    return { success: true, data: { id: lead.id } };
  } catch (error: any) {
    return buildCrmActionFailure(error);
  }
}

export async function updateLeadAction(data: any) {
  try {
    console.log('updateLeadAction raw data:', data);
    const preparedData = {
      ...data,
      email: data.email === '' ? null : data.email,
      counselorId: data.counselorId === '' ? null : data.counselorId,
      notes: data.notes === '' ? null : data.notes,
      lostReasonCode: data.lostReasonCode === '' ? null : data.lostReasonCode,
      lostReasonNotes: data.lostReasonNotes === '' ? null : data.lostReasonNotes,
      bypassDuplicateBlock: !!data.bypassDuplicateBlock,
    };
    const parsed = updateLeadSchema.parse(preparedData);

    // Enforce permissions
    const session = await assertPermission('lead.update');

    const { branchScopeResolver, leadService } = await import('../../lib/runtime');

    // Fetch original lead to verify scoping
    const lead = await assertCounselorLeadScope(parsed.id, session);

    // Branch scoping on original branch
    const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
      session.userId as any,
      session.activeBranchId as any
    );
    if (allowedBranchIds.length > 0 && !allowedBranchIds.includes(lead.branchId as any)) {
      throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
    }

    // Branch scoping on target branch
    await assertBranchScope(parsed.branchId);

    const updatePayload = {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone,
      email: parsed.email,
      dateOfBirth: parsed.dateOfBirth,
      notes: parsed.notes,
      interestedCourseId: parsed.interestedCourseId,
      counselorId: parsed.counselorId,
      lostReasonCode: parsed.lostReasonCode,
      lostReasonNotes: parsed.lostReasonNotes,
      version: parsed.version,
      branchId: parsed.branchId,
      source: parsed.source,
      bypassDuplicateBlock: parsed.bypassDuplicateBlock || false,
    };

    await leadService.updateLead(parsed.id, updatePayload, undefined, session.userId);

    revalidatePath('/leads');
    return { success: true, data: { id: parsed.id } };
  } catch (error: any) {
    console.error('updateLeadAction error details:', error);
    return buildCrmActionFailure(error);
  }
}

export async function convertLeadAction(leadId: string, documentLinks: string[]) {
  try {
    // Enforce lead conversion permission
    const session = await assertPermission('lead.convert');

    // Enforce counselor scoping check
    await assertCounselorLeadScope(leadId, session);

    const actorId = await getActorId();
    const { leadConversionOrchestrator } = await import('../../lib/runtime');

    const result = await leadConversionOrchestrator.convertLeadToAdmission(leadId, documentLinks, actorId);
    revalidatePath('/leads');
    return { success: true, data: result };
  } catch (error: any) {
    return buildCrmActionFailure(error);
  }
}

export async function addLeadNoteAction(leadId: string, content: string) {
  try {
    const session = await assertPermission('lead.update');

    if (!leadId || !content || content.trim().length === 0) {
      throw new Error('Content is required');
    }

    const { leadService } = await import('../../lib/runtime');
    const lead = await leadService.getLeadById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    await prisma.leadNote.create({
      data: {
        leadId,
        content: content.trim(),
        createdBy: session.userId,
      },
    });

    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLeadStageAction(
  leadId: string,
  stage: string,
  lostReasonCode?: string,
  lostReasonNotes?: string,
  version?: number
) {
  try {
    const session = await assertPermission('lead.update');

    // Counselor & Branch Scope Check
    await assertCounselorLeadScope(leadId, session);

    const { leadService } = await import('../../lib/runtime');

    if (stage === 'Lost') {
      if (!lostReasonCode || lostReasonCode.trim() === '') {
        throw new Error('Lost reason code is required when stage is Lost');
      }
      if (!lostReasonNotes || lostReasonNotes.trim().length < 15) {
        throw new Error('Lost reason notes must be at least 15 characters');
      }

      await leadService.closeLeadLost(
        leadId,
        {
          lostReasonCode,
          lostReasonNotes,
        },
        session.userId
      );
    } else {
      await leadService.updateStage(
        leadId,
        {
          newStage: stage as any,
          version: version || 1,
        },
        session.userId
      );
    }

    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (error: any) {
    return buildCrmActionFailure(error);
  }
}
