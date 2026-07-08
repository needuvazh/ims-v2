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
  CoordinatorReviewCommandHandler,
  PrismaCourseCompletionRepository,
  CoordinatorReviewSchema,
} from '@ims/exam-result-completion';
import {
  examResultErrorResponse,
  examResultProblemJson,
} from '../../../exams/error-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(
        request,
        'completion.coordinator-review',
        async ({ session }) => {
          const logger = createStructuredLogger(
            getCurrentRequestContext() ?? {},
          );

          try {
            const { id } = await params;
            const payload = await request.json();

            const parsed = CoordinatorReviewSchema.safeParse(payload);
            if (!parsed.success) {
              return examResultProblemJson(
                400,
                'Invalid request body',
                'Review details are invalid.',
                'COMPLETION_REVIEW_VALIDATION_FAILED',
                parsed.error.issues.map((issue) => ({
                  field: issue.path.join('.') || 'body',
                  message: issue.message,
                })),
              );
            }

            const completionRepository = new PrismaCourseCompletionRepository(
              prisma,
            );
            const handler = new CoordinatorReviewCommandHandler(
              completionRepository,
            );

            await handler.execute({
              completionId: id,
              ...parsed.data,
              userId: session.userId,
            });

            const response = NextResponse.json(
              { success: true, data: { id } },
              { status: 200 },
            );
            applyObservabilityResponseHeaders(
              response.headers,
              request.headers,
              {
                route: `/api/v1/completions/${id}/coordinator-review`,
                method: request.method,
                status: 'success',
              },
            );
            return response;
          } catch (error) {
            logger.error('api.completions.coordinator-review.failed', {
              status: 'failed',
              error: error as Error,
            });
            return examResultErrorResponse(error as Error);
          }
        },
      ),
    { route: '/api/v1/completions/[id]/coordinator-review' },
  );
}
