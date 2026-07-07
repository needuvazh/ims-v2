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
  RecommendCompletionCommandHandler,
  PrismaCourseCompletionRepository,
  PrismaTrainerAssignmentReader,
  TrainerRecommendationSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from '../../../exams/error-response';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'completion.recommend', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;
        const payload = await request.json();

        const parsed = TrainerRecommendationSchema.safeParse(payload);
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Recommendation details are invalid.',
            'COMPLETION_RECOMMENDATION_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        const completionRepository = new PrismaCourseCompletionRepository(prisma);
        const trainerReader = new PrismaTrainerAssignmentReader(prisma);
        const handler = new RecommendCompletionCommandHandler(completionRepository, trainerReader);

        await handler.execute({
          completionId: id,
          trainerId: session.userId,
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id, status: 'AwaitingCoordinatorReview' } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/completions/${id}/recommend`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.completions.recommend.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/completions/[id]/recommend' });
}
