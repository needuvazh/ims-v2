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
  FinalApproveCompletionCommandHandler,
  PrismaCourseCompletionRepository,
  FinalApprovalSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from '../../../exams/error-response';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'completion.final-approve', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;
        const payload = await request.json();

        const parsed = FinalApprovalSchema.safeParse(payload);
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Approval details are invalid.',
            'COMPLETION_FINAL_APPROVAL_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        const completionRepository = new PrismaCourseCompletionRepository(prisma);
        const handler = new FinalApproveCompletionCommandHandler(completionRepository);

        await handler.execute({
          completionId: id,
          ...parsed.data,
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/completions/${id}/final-approve`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.completions.final-approve.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/completions/[id]/final-approve' });
}
