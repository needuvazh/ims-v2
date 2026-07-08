import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';

/**
 * POST /api/v1/students/merge
 *
 * Merges two StudentProfiles (source → survivor) in a single atomic
 * transaction. All linked Admissions, Enrollments, Leads, and Documents
 * are remapped to the survivor. The source profile and its underlying
 * Person record are soft-deleted.
 *
 * Authorization: requires `student.merge` permission (Branch Manager level).
 * If both profiles have active portal User accounts the merge is blocked
 * with ERR_STU_MERGE_USER_CONFLICT — IAM alignment must be done manually first.
 *
 * Permission: student.merge
 */
const bodySchema = z.object({
  survivorStudentProfileId: z
    .string()
    .uuid('survivorStudentProfileId must be a UUID.'),
  sourceStudentProfileId: z
    .string()
    .uuid('sourceStudentProfileId must be a UUID.'),
  mergeReason: z
    .string()
    .min(10, 'mergeReason must be at least 10 characters.')
    .max(500),
});

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'student.merge', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_BODY_MISSING',
              messageEnglish: 'Request body is required.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_FAILED',
              messageEnglish:
                parsed.error.issues[0]?.message ?? 'Validation failed.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        try {
          const { studentMergeService } =
            await import('../../../../../lib/runtime');

          const result = await studentMergeService.mergeProfiles({
            survivorStudentProfileId: parsed.data.survivorStudentProfileId,
            sourceStudentProfileId: parsed.data.sourceStudentProfileId,
            mergeReason: parsed.data.mergeReason,
            mergedBy: session.userId,
          });

          logger.info('api.students.merge.success', { status: 'success' });

          return NextResponse.json(
            { success: true, data: result },
            { status: 200 },
          );
        } catch (error) {
          const msg = (error as Error).message;

          if (msg === 'ERR_STU_MERGE_USER_CONFLICT') {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'ERR_STU_MERGE_USER_CONFLICT',
                messageEnglish:
                  'Both profiles have active portal accounts. Resolve the IAM conflict manually before merging.',
                statusCode: 409,
              },
              { status: 409 },
            );
          }

          if (msg === 'ERR_STU_MERGE_SELF_FORBIDDEN') {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'ERR_STU_MERGE_SELF_FORBIDDEN',
                messageEnglish:
                  'Survivor and source profiles cannot be the same.',
                statusCode: 422,
              },
              { status: 422 },
            );
          }

          if (msg.startsWith('ERR_STU_MERGE_')) {
            return NextResponse.json(
              {
                success: false,
                errorCode: msg,
                messageEnglish: msg,
                statusCode: 404,
              },
              { status: 404 },
            );
          }

          logger.error('api.students.merge.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STUDENT_INTERNAL_ERROR',
              messageEnglish: msg,
              statusCode: 500,
            },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/students/merge' },
  );
}
