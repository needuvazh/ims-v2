import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { LogFollowUpOutcomeSchema } from '@ims/crm-leads';
import type { Uuid } from '@ims/shared-kernel';

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
    messageEn = 'Follow-up or lead record not found.';
    messageAr = 'لم يتم العثور على سجل المهتم أو المتابعة.';
  } else if (msg.includes('ERR_CRM_BRANCH_SCOPE_VIOLATION')) {
    status = 403;
    code = 'ERR_CRM_BRANCH_SCOPE_VIOLATION';
    messageEn = 'You are not authorized to access lead data in this branch.';
    messageAr = 'غير مصرح لك بالوصول إلى بيانات المهتمين في هذا الفرع.';
  } else if (msg.includes('ERR_CRM_PAST_FOLLOWUP_DATE')) {
    status = 422;
    code = 'ERR_CRM_PAST_FOLLOWUP_DATE';
    messageEn = 'Next follow-up scheduled time must be set in the future (current time + 5 minutes).';
    messageAr = 'تاريخ المتابعة التالية المجدولة يجب أن يكون في المستقبل (٥ دقائق كحد أدنى).';
  } else if (msg.includes('Outcome notes must be at least 15 characters long')) {
    status = 422;
    code = 'ERR_CRM_LOST_REASON_REQUIRED'; // mapping custom text errors
    messageEn = 'Outcome notes must be at least 15 characters long.';
    messageAr = 'ملاحظات النتيجة يجب أن تكون ١٥ حرف كحد أدنى.';
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

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: followUpId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'followup.update', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRM-VAL-OUTCOME-INVALID_JSON');
    }

    const parsed = LogFollowUpOutcomeSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Outcome details are invalid.',
        'CRM-VAL-OUTCOME-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { branchScopeResolver, followUpService, leadService } = await import('../../../../../../lib/runtime');
      
      const followUp = await followUpService.getFollowUpById(followUpId);
      if (!followUp) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      // Check lead branch scope
      const lead = await leadService.getLeadById(followUp.leadId);
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
        throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
      }

      const result = await followUpService.recordOutcome(followUpId, parsed.data, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads/follow-ups/[id]',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.follow-ups.outcome.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/leads/follow-ups/[id]' });
}
