import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { TransitionLeadStageSchema } from '@ims/crm-leads';
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
  } else if (msg.includes('ERR_CRM_INVALID_STAGE_TRANSITION')) {
    status = 422;
    code = 'ERR_CRM_INVALID_STAGE_TRANSITION';
    messageEn = 'Forbidden stage transition. Pipeline rules violated.';
    messageAr = 'تغيير غير مسموح به في مرحلة المتابعة.';
  } else if (msg.includes('ERR_CRM_CONCURRENCY_VIOLATION')) {
    status = 409;
    code = 'ERR_CRM_CONCURRENCY_VIOLATION';
    messageEn = 'The record has been updated by another counselor. Please refresh.';
    messageAr = 'تم تحديث السجل بواسطة مستخدم آخر. يرجى التحديث.';
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
  const { id: leadId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.update', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRM-VAL-STAGE-INVALID_JSON');
    }

    const parsed = TransitionLeadStageSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Stage transition details are invalid.',
        'CRM-VAL-STAGE-INVALID_BODY',
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

      // Branch Scoping check
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(lead.branchId as Uuid)) {
        throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
      }

      // Counselor update scope
      const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
      if (!hasGlobalRead && lead.counselorId !== session.userId) {
        throw new Error('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
      }

      await leadService.updateStage(leadId, parsed.data, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: {
            leadId,
            newStage: parsed.data.newStage,
            updatedAt: new Date(),
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads/[id]/stage',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.stage.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/leads/[id]/stage' });
}
