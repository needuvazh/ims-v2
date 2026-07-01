import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { RevealPiiSchema } from '@ims/crm-leads';
import { createUuid } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { randomUUID } from 'crypto';

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status }
  );
}

function crmErrorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_CRM_INTERNAL_ERROR';
  let messageEn = 'An unexpected error occurred.';
  let messageAr = 'حدث خطأ غير متوقع.';

  if (msg.includes('ERR_CRM_LEAD_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRM_LEAD_NOT_FOUND';
    messageEn = 'Lead record not found.';
    messageAr = 'لم يتم العثور على سجل المهتم.';
  } else if (msg.includes('ERR_CRM_BRANCH_SCOPE_VIOLATION')) {
    status = 403;
    code = 'ERR_CRM_BRANCH_SCOPE_VIOLATION';
    messageEn = 'You are not authorized to access lead data in this branch.';
    messageAr = 'غير مصرح لك بالوصول إلى بيانات المهتمين في هذا الفرع.';
  } else if (msg.includes('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION')) {
    status = 403;
    code = 'ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION';
    messageEn = 'You are not authorized to access leads assigned to other counselors.';
    messageAr = 'غير مصرح لك بالوصول إلى المهتمين المسندين لموظفين آخرين.';
  }

  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      messageEnglish: messageEn,
      messageArabic: messageAr,
      statusCode: status,
    },
    { status }
  );
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.reveal_pii', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRM-VAL-REVEAL-INVALID_JSON');
    }

    const parsed = RevealPiiSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Reveal request details are invalid.',
        'CRM-VAL-REVEAL-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { branchScopeResolver, leadService } = await import('../../../../../../lib/runtime');
      
      const lead = await leadService.getLeadById(leadId);
      if (!lead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      // Branch check
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(lead.branchId as Uuid)) {
        throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
      }

      // Counselor check
      const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
      if (!hasGlobalRead && lead.counselorId !== session.userId) {
        throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
      }

      // Resolve unmasked value
      let value = '';
      if (parsed.data.field === 'email') {
        value = lead.email || '';
      } else if (parsed.data.field === 'phone') {
        value = lead.phone || '';
      } else if (parsed.data.field === 'nationalId') {
        value = lead.person?.nationalId || '';
      }

      // Write compliant Audit Log entry (zero-PII storage: never store the unmasked value itself)
      await prisma.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: session.userId,
          performedAt: new Date(),
          entityType: 'Lead',
          entityId: leadId,
          action: 'RevealPII',
          reason: parsed.data.reason,
          newValue: { field: parsed.data.field }, // log field only, not unmasked value
          branchId: lead.branchId,
        },
      });

      const response = NextResponse.json(
        {
          success: true,
          data: {
            leadId,
            field: parsed.data.field,
            value,
            revealedAt: new Date(),
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads/[id]/reveal-pii',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.reveal-pii.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/leads/[id]/reveal-pii' });
}
