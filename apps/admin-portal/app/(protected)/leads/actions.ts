'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { buildCrmActionFailure } from './form-errors';
import { assertPermission, assertBranchScope, getSession } from '../../lib/auth-guard';
import { CreateLeadSchema, LeadSourceEnum } from '@ims/crm-leads';
import { prisma } from '@ims/database';

const FormDateOfBirthSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (!val.trim()) return undefined;
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d;
  }
  return val;
}, z.date({ required_error: 'Date of birth is required', invalid_type_error: 'Invalid date of birth' }));

const createLeadSchema = CreateLeadSchema.extend({
  email: z.string().min(1, 'Email address is required').email('Invalid email'),
  dateOfBirth: FormDateOfBirthSchema,
  nationality: z.string().min(1, 'Nationality is required'),
  nationalId: z.string().min(1, 'ID Number is required'),
  counselorId: z.string().min(1, 'Assigned staff is required').uuid('Invalid staff reference'),
  source: LeadSourceEnum,
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
      email: data.email,
      counselorId: data.counselorId,
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
        nationality: parsed.nationality || undefined,
        nationalId: parsed.nationalId || undefined,
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
      email: data.email,
      counselorId: data.counselorId,
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
      nationality: parsed.nationality,
      nationalId: parsed.nationalId,
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

export async function convertLeadAction(leadId: string, documents: any[]) {
  try {
    // Enforce lead conversion permission
    const session = await assertPermission('lead.convert');

    // Enforce counselor scoping check
    const lead = await assertCounselorLeadScope(leadId, session);

    // Enforce branch scope check
    await assertBranchScope(lead.branchId);

    const actorId = await getActorId();
    const { leadConversionOrchestrator } = await import('../../lib/runtime');

    // Map string URLs to DocumentCaptureInput structure
    const mappedDocs = documents.map((docOrUrl: any, index: number) => {
      if (docOrUrl && typeof docOrUrl === 'object' && docOrUrl.documentType) {
        return docOrUrl;
      }
      const url = String(docOrUrl);
      const isFirst = index === 0;
      const fileName = url.split('/').pop() || (isFirst ? 'civil_id_scan' : 'secondary_document');
      const ext = fileName.split('.').pop() || 'pdf';
      const fileType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      return {
        fileName,
        fileKey: url,
        fileType,
        documentType: isFirst ? 'CIVIL_ID_FRONT' : 'PASSPORT_SCAN',
        expiryDate: null,
      };
    });

    const result = await leadConversionOrchestrator.convertLeadToAdmission(leadId, mappedDocs, actorId);
    revalidatePath('/leads');
    return { success: true, data: result };
  } catch (error: any) {
    return buildCrmActionFailure(error, 'convert');
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
    return buildCrmActionFailure(error, 'stage');
  }
}
