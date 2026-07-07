import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../../lib/observability';
import { prisma } from '@ims/database';
import {
  CancelExamCommandHandler,
  PrismaExamRepository,
  CancelExamSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from '../../error-response';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'exam.update', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;
        const payload = await request.json();

        const parsed = CancelExamSchema.safeParse(payload);
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Cancel details are invalid.',
            'EXAM_CANCEL_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        const examRepository = new PrismaExamRepository(prisma);
        const handler = new CancelExamCommandHandler(examRepository);

        await handler.execute({
          examId: id,
          reason: parsed.data.reason,
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id, status: 'Cancelled' } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/exams/${id}/cancel`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.exams.cancel.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/exams/[id]/cancel' });
}
