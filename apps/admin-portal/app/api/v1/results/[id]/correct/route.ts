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
  CorrectResultCommandHandler,
  PrismaResultRepository,
  PrismaExamRepository,
  CorrectResultSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from '../../../exams/error-response';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'result.correct', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;
        const payload = await request.json();

        const parsed = CorrectResultSchema.safeParse(payload);
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Correction details are invalid.',
            'RESULT_CORRECTION_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        const resultRepository = new PrismaResultRepository(prisma);
        const examRepository = new PrismaExamRepository(prisma);
        const handler = new CorrectResultCommandHandler(resultRepository, examRepository);

        await handler.execute({
          resultId: id,
          ...parsed.data,
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id, status: 'Corrected' } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/results/${id}/correct`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.results.correct.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/results/[id]/correct' });
}
