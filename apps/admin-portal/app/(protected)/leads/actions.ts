'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { buildCrmActionFailure } from './form-errors';
import {
  assertPermission,
  assertBranchScope,
  getSession,
} from '../../lib/auth-guard';
import {
  CreateLeadSchema,
  LeadSourceEnum,
  LeadStageEnum,
} from '@ims/crm-leads';
import { prisma } from '@ims/database';

const FormDateOfBirthSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      if (!val.trim()) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d;
    }
    return val;
  },
  z.date({
    required_error: 'Date of birth is required',
    invalid_type_error: 'Invalid date of birth',
  }),
);

const createLeadSchema = CreateLeadSchema.extend({
  email: z.string().min(1, 'Email address is required').email('Invalid email'),
  dateOfBirth: FormDateOfBirthSchema,
  nationality: z.string().min(1, 'Nationality is required'),
  nationalId: z.string().min(1, 'ID Number is required'),
  counselorId: z
    .string()
    .min(1, 'Assigned staff is required')
    .uuid('Invalid staff reference'),
  source: LeadSourceEnum,
  bypassDuplicateBlock: z.boolean().optional(),
});

const updateLeadSchema = createLeadSchema
  .extend({
    id: z.string().uuid(),
    version: z.preprocess(
      (val) => (val ? Number(val) : undefined),
      z
        .number()
        .int({ message: 'Version is required for concurrency control' }),
    ),
    stage: LeadStageEnum,
    lostReasonCode: z.string().optional().nullable().or(z.literal('')),
    lostReasonNotes: z.string().optional().nullable().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.stage === 'Lost') {
        return !!data.lostReasonCode && data.lostReasonCode.trim() !== '';
      }
      return true;
    },
    {
      message: 'Lost reason code is required when stage is Lost',
      path: ['lostReasonCode'],
    },
  )
  .refine(
    (data) => {
      if (data.stage === 'Lost') {
        return (
          !!data.lostReasonNotes && data.lostReasonNotes.trim().length >= 15
        );
      }
      return true;
    },
    {
      message: 'Lost reason notes must be at least 15 characters',
      path: ['lostReasonNotes'],
    },
  );

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
      actorId,
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
      lostReasonNotes:
        data.lostReasonNotes === '' ? null : data.lostReasonNotes,
      bypassDuplicateBlock: !!data.bypassDuplicateBlock,
    };
    const parsed = updateLeadSchema.parse(preparedData);

    // Enforce permissions
    const session = await assertPermission('lead.update');

    const { branchScopeResolver, leadService } =
      await import('../../lib/runtime');

    // Fetch original lead to verify scoping
    const lead = await assertCounselorLeadScope(parsed.id, session);

    if (lead.stage === 'Converted') {
      throw new Error('ERR_CRM_LEAD_ALREADY_CONVERTED');
    }

    // Branch scoping on original branch
    const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
      session.userId as any,
      session.activeBranchId as any,
    );
    if (
      allowedBranchIds.length > 0 &&
      !allowedBranchIds.includes(lead.branchId as any)
    ) {
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

    await leadService.updateLead(
      parsed.id,
      updatePayload,
      undefined,
      session.userId,
    );

    // If stage changed, apply stage transition
    if (parsed.stage !== lead.stage) {
      if (parsed.stage === 'Lost') {
        await leadService.closeLeadLost(
          parsed.id,
          {
            lostReasonCode: parsed.lostReasonCode || '',
            lostReasonNotes: parsed.lostReasonNotes || '',
          },
          session.userId,
        );
      } else {
        await leadService.updateStage(
          parsed.id,
          {
            newStage: parsed.stage,
            version: lead.version + 1, // updateLead incremented database version by 1
          },
          session.userId,
        );
      }
    }

    revalidatePath('/leads');
    return { success: true, data: { id: parsed.id } };
  } catch (error: any) {
    console.error('updateLeadAction error details:', error);
    return buildCrmActionFailure(error);
  }
}

export async function convertLeadAction(
  leadId: string,
  targetBatchId: string | null | undefined,
  documents: any[],
  profileUpdates?: {
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    nationality?: string;
    nationalId?: string;
    gender?: string;
  },
  discountCode?: string,
  manualDiscountAmount?: number,
) {
  try {
    // Enforce lead conversion permission
    const session = await assertPermission('lead.convert');

    // Enforce counselor scoping check
    const lead = await assertCounselorLeadScope(leadId, session);

    // Enforce branch scope check
    await assertBranchScope(lead.branchId);

    const actorId = await getActorId();
    const { leadConversionOrchestrator, leadService } = await import('../../lib/runtime');

    // Apply profile updates if provided
    if (profileUpdates) {
      // Enforce lead update permission
      await assertPermission('lead.update');

      const updatePayload: any = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: profileUpdates.email ?? lead.email,
        phone: profileUpdates.phone ?? lead.phone,
        nationality: profileUpdates.nationality ?? lead.nationality,
        nationalId: profileUpdates.nationalId ?? lead.nationalId,
        dateOfBirth: profileUpdates.dateOfBirth ? new Date(profileUpdates.dateOfBirth) : (lead.person?.dateOfBirth ? new Date(lead.person.dateOfBirth) : undefined),
        version: lead.version,
        branchId: lead.branchId,
        source: lead.source,
      };

      await leadService.updateLead(
        leadId,
        updatePayload,
        undefined,
        session.userId,
      );

      // Direct prisma update for gender on the linked Person record
      if (profileUpdates.gender) {
        await prisma.person.update({
          where: { id: lead.personId },
          data: { gender: profileUpdates.gender },
        });
      }
    }

    // Map string URLs to DocumentCaptureInput structure
    const mappedDocs = documents.map((docOrUrl: any, index: number) => {
      if (docOrUrl && typeof docOrUrl === 'object' && docOrUrl.documentType) {
        return docOrUrl;
      }
      const url = String(docOrUrl);
      const isFirst = index === 0;
      const fileName =
        url.split('/').pop() ||
        (isFirst ? 'civil_id_scan' : 'secondary_document');
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

    const result = await leadConversionOrchestrator.convertLeadToAdmission(
      leadId,
      targetBatchId,
      mappedDocs,
      discountCode,
      manualDiscountAmount,
      actorId,
    );

    // If targetBatchId is selected, update the Admission's remarks field
    if (targetBatchId) {
      const targetBatch = await prisma.batch.findUnique({
        where: { id: targetBatchId },
        select: {
          batchCode: true,
          course: { select: { nameEnglish: true } },
        },
      });
      if (targetBatch) {
        await prisma.admission.update({
          where: { id: result.admissionId },
          data: {
            remarks: `Target batch selected during conversion: ${targetBatch.batchCode} (${targetBatch.course.nameEnglish})`,
          },
        });
      }
    }

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

    if (lead.stage === 'Converted') {
      throw new Error('ERR_CRM_LEAD_ALREADY_CONVERTED');
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
  version?: number,
) {
  try {
    const session = await assertPermission('lead.update');

    // Counselor & Branch Scope Check
    const lead = await assertCounselorLeadScope(leadId, session);

    if (lead.stage === 'Converted') {
      throw new Error('ERR_CRM_LEAD_ALREADY_CONVERTED');
    }

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
        session.userId,
      );
    } else {
      await leadService.updateStage(
        leadId,
        {
          newStage: stage as any,
          version: version || 1,
        },
        session.userId,
      );
    }

    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (error: any) {
    return buildCrmActionFailure(error, 'stage');
  }
}

export async function getUpcomingBatchesAction(courseId: string, branchId: string) {
  try {
    await assertPermission('lead.read');

    const batches = await prisma.batch.findMany({
      where: {
        courseId,
        branchId,
        status: { in: ['Draft', 'OpenForEnrollment'] },
        isWalkIn: false,
      },
      select: {
        id: true,
        batchCode: true,
        batchNameEnglish: true,
        startDate: true,
        currentEnrollmentCount: true,
        capacity: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return { success: true, data: batches };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch batches' };
  }
}

export async function saveLeadProfileWizardAction(
  leadId: string,
  profileUpdates: {
    email: string;
    phone: string;
    dateOfBirth: string;
    nationality: string;
    nationalId: string;
    gender: string;
  },
) {
  try {
    const session = await assertPermission('lead.update');
    const lead = await assertCounselorLeadScope(leadId, session);
    await assertBranchScope(lead.branchId);

    const { leadService } = await import('../../lib/runtime');

    const updatePayload: any = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: profileUpdates.email,
      phone: profileUpdates.phone,
      nationality: profileUpdates.nationality,
      nationalId: profileUpdates.nationalId,
      dateOfBirth: new Date(profileUpdates.dateOfBirth),
      version: lead.version,
      branchId: lead.branchId,
      source: lead.source,
    };

    await leadService.updateLead(
      leadId,
      updatePayload,
      undefined,
      session.userId,
    );

    // Direct prisma update for gender on the linked Person record
    await prisma.person.update({
      where: { id: lead.personId },
      data: { gender: profileUpdates.gender },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save profile updates' };
  }
}

export async function lookupStudentProfileAction(query: {
  email?: string;
  phone?: string;
  nationalId?: string;
}) {
  try {
    await assertPermission('lead.read');

    const profile = await prisma.studentProfile.findFirst({
      where: {
        isDeleted: false,
        OR: [
          query.email ? { person: { email: query.email } } : undefined,
          query.phone ? { person: { mobile: query.phone } } : undefined,
          query.nationalId ? { person: { nationalId: query.nationalId } } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        person: true,
        admissions: {
          where: { isDeleted: false },
          orderBy: { admissionDate: 'desc' },
        },
      },
    });

    if (!profile) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: profile.id,
        studentNumber: profile.studentNumber,
        status: profile.status,
        person: {
          firstName: profile.person.firstName,
          lastName: profile.person.lastName,
          email: profile.person.email,
          phone: profile.person.mobile,
          dateOfBirth: profile.person.dateOfBirth?.toISOString(),
          nationality: profile.person.nationality,
          nationalId: profile.person.nationalId,
          gender: profile.person.gender,
        },
        admissions: profile.admissions.map(adm => ({
          id: adm.id,
          admissionNumber: adm.admissionNumber,
          admissionStatus: adm.admissionStatus,
          admissionDate: adm.admissionDate.toISOString(),
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to lookup student profile' };
  }
}

export async function resolveCoursePricingAction(params: {
  courseId: string;
  branchId: string;
  batchId: string;
  discountCode?: string;
  manualDiscountAmount?: number;
}) {
  try {
    await assertPermission('lead.read');
    
    const { coursePricingService } = await import('@/lib/runtime');
    const pricingService = coursePricingService;
    
    const pricing = await pricingService.resolveCoursePricing({
      courseId: params.courseId,
      customerType: 'Individual',
      branchId: params.branchId,
      batchId: params.batchId,
      asOfDate: new Date(),
    });

    const basePrice = pricing.basePrice;
    const taxPercentage = pricing.taxPercentage;
    const taxAmount = (basePrice * taxPercentage) / 100;
    const totalPrice = pricing.totalPrice; // basePrice + taxAmount
    
    let resolvedDiscount = (pricing.applicableDiscounts || []).reduce(
      (sum: number, d: any) => {
        if (d?.discountMode === 'Percentage') {
          return sum + (basePrice * Number(d.discountValue || 0)) / 100;
        }
        return sum + Number(d?.discountValue || 0);
      },
      0,
    );

    // Support manual discount override
    if (params.manualDiscountAmount) {
      resolvedDiscount += params.manualDiscountAmount;
    }

    const finalAmount = Math.max(0, totalPrice - resolvedDiscount);

    return {
      success: true,
      data: {
        basePrice,
        taxPercentage,
        taxAmount,
        totalPrice,
        discountAmount: resolvedDiscount,
        finalAmount,
        pricingSource: pricing.pricingSource || 'GlobalDefault',
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to resolve pricing' };
  }
}

