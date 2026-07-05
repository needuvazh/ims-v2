import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';

const querySchema = z.object({
  email: z.string().trim().email().optional(),
  mobile: z.string().trim().min(7).max(20).optional(),
}).refine((value) => Boolean(value.email || value.mobile), {
  message: 'Email or mobile is required.',
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'lead.create', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        email: params.get('email') ?? undefined,
        mobile: params.get('mobile') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'CRM-VAL-LEAD-STUDENT-LOOKUP',
            messageEnglish: parsed.error.issues[0]?.message ?? 'Invalid lookup parameters.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const { studentQueryService } = await import('../../../../../lib/runtime');
      const lookups = [parsed.data.email, parsed.data.mobile].filter((value): value is string => Boolean(value));

      let matchedResult: any = null;
      for (const lookup of lookups) {
        const result = await studentQueryService.globalPersonLookup(lookup, null, { revealSensitive: false });
        if (result.studentProfileId) {
          matchedResult = result;
          break;
        }
      }

      const response = NextResponse.json(
        {
          success: true,
          data: matchedResult ?? {
            personFound: false,
            personId: null,
            firstNameMasked: null,
            lastNameMasked: null,
            maskedMobile: null,
            maskedEmail: null,
            maskedNationalId: null,
            studentProfileId: null,
            studentNumber: null,
            branchInfo: [],
            preflight: null,
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/crm/leads/student-lookup',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.crm.leads.student-lookup.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ERR_CRM_INTERNAL_ERROR',
          messageEnglish: (error as Error).message,
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  }), { route: '/api/v1/crm/leads/student-lookup' });
}
