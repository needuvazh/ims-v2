import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { QualifyInquirySchema } from '@ims/crm-leads';

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

  if (msg.includes('ERR_CRM_INQUIRY_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRM_INQUIRY_NOT_FOUND';
    messageEn = 'Inquiry record not found.';
    messageAr = 'لم يتم العثور على سجل الاستفسار.';
  } else if (msg.includes('ERR_CRM_INQUIRY_ALREADY_QUALIFIED')) {
    status = 422;
    code = 'ERR_CRM_INQUIRY_ALREADY_QUALIFIED';
    messageEn = 'Inquiry has already been promoted.';
    messageAr = 'تم تحويل هذا الاستفسار بالفعل إلى مهتم.';
  } else if (msg.includes('ERR_CRM_COUNSELOR_INACTIVE')) {
    status = 422;
    code = 'ERR_CRM_COUNSELOR_INACTIVE';
    messageEn = 'Assigned counselor is inactive or unauthorized for this branch.';
    messageAr = 'الموظف المسؤول غير نشط أو غير مصرح له بالعمل في هذا الفرع.';
  } else if (msg.includes('ERR_CRM_BRANCH_SCOPE_VIOLATION')) {
    status = 403;
    code = 'ERR_CRM_BRANCH_SCOPE_VIOLATION';
    messageEn = 'You are not authorized to access lead data in this branch.';
    messageAr = 'غير مصرح لك بالوصول إلى بيانات المهتمين في هذا الفرع.';
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
  const { id: inquiryId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.qualify', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRM-VAL-QUALIFY-INVALID_JSON');
    }

    const parsed = QualifyInquirySchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Qualification details are invalid.',
        'CRM-VAL-QUALIFY-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { branchScopeResolver, inquiryService } = await import('../../../../../../lib/runtime');
      
      const inquiry = await inquiryService.getInquiryById(inquiryId);
      if (!inquiry) {
        throw new Error('ERR_CRM_INQUIRY_NOT_FOUND');
      }

      // Enforce branch scope checking
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(inquiry.branchId as any)) {
        throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
      }

      const result = await inquiryService.promoteToLead(inquiryId, parsed.data, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/inquiries/[id]/qualify',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.inquiries.qualify.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/inquiries/[id]/qualify' });
}
