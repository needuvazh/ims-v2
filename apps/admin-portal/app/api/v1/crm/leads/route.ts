import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Uuid } from '@ims/shared-kernel';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import { CreateLeadSchema, maskEmail, maskPhone, LeadStageEnum } from '@ims/crm-leads';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  branchId: z.string().uuid().optional(),
  stage: LeadStageEnum.optional(),
  counselorId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

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

  if (msg.includes('ERR_CRM_DUPLICATE_LEAD_DETECTED')) {
    status = 422;
    code = 'ERR_CRM_DUPLICATE_LEAD_DETECTED';
    messageEn = 'A lead with this mobile number or email already exists.';
    messageAr = 'يوجد بالفعل ملف مهتم بهذا الرقم أو البريد الإلكتروني.';
  } else if (msg.includes('ERR_CRM_BRANCH_SCOPE_VIOLATION')) {
    status = 403;
    code = 'ERR_CRM_BRANCH_SCOPE_VIOLATION';
    messageEn = 'You are not authorized to access lead data in this branch.';
    messageAr = 'غير مصرح لك بالوصول إلى بيانات المهتمين في هذا الفرع.';
  } else if (msg.includes('ERR_CRM_LEAD_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRM_LEAD_NOT_FOUND';
    messageEn = 'Lead record not found.';
    messageAr = 'لم يتم العثور على سجل المهتم.';
  } else if (msg.includes('ERR_CRM_COUNSELOR_INACTIVE')) {
    status = 422;
    code = 'ERR_CRM_COUNSELOR_INACTIVE';
    messageEn = 'Assigned counselor is inactive or unauthorized for this branch.';
    messageAr = 'الموظف المسؤول غير نشط أو غير مصرح له بالعمل في هذا الفرع.';
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

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.read', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        page: params.get('page') ?? undefined,
        limit: params.get('limit') ?? undefined,
        branchId: params.get('branchId') ?? undefined,
        stage: params.get('stage') ?? undefined,
        counselorId: params.get('counselorId') ?? undefined,
        search: params.get('search') ?? undefined,
      });

      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid query parameters',
          'One or more query parameters are invalid.',
          'CRM-VAL-LEADS-INVALID_QUERY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message,
          }))
        );
      }

      const { branchScopeResolver, leadService } = await import('../../../../lib/runtime');
      
      // Resolve branch scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );

      if (parsed.data.branchId && !allowedBranches.includes(parsed.data.branchId as Uuid)) {
        throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
      }

      // Counselor scoping: if not global read-all permission, override counselorId parameter to force active user
      const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
      const counselorId = hasGlobalRead ? parsed.data.counselorId : session.userId;

      const result = await leadService.findAll(
        {
          branchId: parsed.data.branchId,
          branchIds: allowedBranches,
          stage: parsed.data.stage,
          counselorId,
          search: parsed.data.search,
        },
        {
          page: parsed.data.page,
          limit: parsed.data.limit,
        }
      );

      // Mask PII by default in list view
      const maskedLeads = result.items.map((lead: any) => ({
        ...lead,
        phone: maskPhone(lead.phone),
        email: maskEmail(lead.email),
      }));

      const response = NextResponse.json(
        {
          success: true,
          data: {
            leads: maskedLeads,
            pagination: {
              total: result.total,
              page: parsed.data.page,
              limit: parsed.data.limit,
              pages: Math.ceil(result.total / parsed.data.limit),
            },
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.list.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/leads' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRM-VAL-LEADS-INVALID_JSON');
    }

    const parsed = CreateLeadSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Lead details are invalid.',
        'CRM-VAL-LEADS-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { branchScopeResolver, leadService } = await import('../../../../lib/runtime');

      // Verify branch assignment scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(parsed.data.branchId as Uuid)) {
        throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
      }

      const result = await leadService.createLead(parsed.data, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: {
            leadId: result.id,
            leadNumber: result.leadNumber,
            stage: result.stage,
            createdAt: result.createdAt,
          },
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.create.failed', { status: 'failed', error: error as Error });
      return crmErrorResponse(error as Error);
    }
  }), { route: '/api/v1/crm/leads' });
}
