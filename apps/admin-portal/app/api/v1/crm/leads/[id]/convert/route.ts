import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { ConvertLeadSchema } from '@ims/crm-leads';
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
  } else if (msg.includes('ERR_CRM_WON_PRECONDITIONS_MISSED')) {
    status = 422;
    code = 'ERR_CRM_WON_PRECONDITIONS_MISSED';
    messageEn = 'Cannot mark lead Won. Missing email, valid birthdate, or civil ID scan document links.';
    messageAr = 'لا يمكن تحويل المهتم لرابح. البريد الإلكتروني، تاريخ الميلاد، أو وثيقة البطاقة الشخصية ناقصة.';
  } else if (msg.includes('ERR_CRM_INVALID_STAGE_TRANSITION')) {
    status = 422;
    code = 'ERR_CRM_INVALID_STAGE_TRANSITION';
    messageEn = 'Forbidden stage transition. Pipeline rules violated.';
    messageAr = 'تغيير غير مسموح به في مرحلة المتابعة.';
  } else if (msg.includes('A student with this email or phone already exists')) {
    status = 409;
    code = 'ERR_CRM_DUPLICATE_STUDENT';
    messageEn = msg;
    messageAr = 'يوجد طالب بالفعل بهذا البريد الإلكتروني أو الهاتف.';
  } else if (msg.includes('ERR_ADM_ACTIVE_ADMISSION_EXISTS')) {
    status = 409;
    code = 'ERR_ADM_ACTIVE_ADMISSION_EXISTS';
    messageEn = 'An active admission already exists for this student in this branch.';
    messageAr = 'يوجد طلب قبول نشط بالفعل لهذا الطالب في هذا الفرع.';
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
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.convert', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRM-VAL-CONVERT-INVALID_JSON');
    }

    const parsed = ConvertLeadSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Lead conversion details are invalid.',
        'CRM-VAL-CONVERT-INVALID_BODY',
        parsed.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { branchScopeResolver, leadConversionOrchestrator, leadService } = await import('../../../../../../lib/runtime');
      
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

      // Call conversion orchestrator
      const admissionResult = await leadConversionOrchestrator.convertLeadToAdmission(
        leadId,
        parsed.data.documents,
        session.userId
      );

      const response = NextResponse.json(
        {
          success: true,
          data: {
            leadId,
            leadStage: 'Converted',
            admissionId: admissionResult.admissionId,
            studentProfileId: admissionResult.studentProfileId,
            studentId: admissionResult.studentProfileId,
            convertedAt: new Date(),
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads/[id]/convert',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.convert.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/leads/[id]/convert' });
}
