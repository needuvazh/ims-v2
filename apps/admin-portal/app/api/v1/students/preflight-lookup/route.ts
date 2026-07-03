import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';

/**
 * POST /api/v1/students/preflight-lookup
 *
 * Performs a global lookup by email or mobile to detect existing profiles
 * before a new student registration is submitted. Returns masked PII.
 *
 * Permission: student.create
 */
const bodySchema = z.object({
  email: z.string().email().optional(),
  mobile: z.string().min(7).max(20).optional(),
}).refine((d) => d.email || d.mobile, {
  message: 'At least one of email or mobile is required.',
});

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'student.create', async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, errorCode: 'ERR_VAL_BODY_MISSING', messageEnglish: 'Request body is required.', statusCode: 400 },
          { status: 400 }
        );
      }

      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, errorCode: 'ERR_VAL_FAILED', messageEnglish: parsed.error.issues[0]?.message ?? 'Validation failed.', statusCode: 400 },
          { status: 400 }
        );
      }

      try {
        const { studentQueryService } = await import('../../../../../lib/runtime');
        // globalPersonLookup accepts a single query string (email OR mobile)
        const query = parsed.data.email ?? parsed.data.mobile ?? '';
        const result = await studentQueryService.globalPersonLookup(query, '');

        return NextResponse.json({ success: true, data: result }, { status: 200 });
      } catch (error) {
        logger.error('api.students.preflight-lookup.failed', { status: 'failed', error: error as Error });
        return NextResponse.json(
          { success: false, errorCode: 'ERR_STUDENT_INTERNAL_ERROR', messageEnglish: (error as Error).message, statusCode: 500 },
          { status: 500 }
        );
      }
    }),
    { route: '/api/v1/students/preflight-lookup' }
  );
}
