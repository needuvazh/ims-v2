import { NextResponse } from 'next/server';
import { withPermission } from '../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../lib/observability';
import { prisma } from '@ims/database';
import {
  GetCompletionDetailQueryHandler,
  PrismaCourseCompletionRepository,
  PrismaCompletionApprovalRepository,
} from '@ims/exam-result-completion';
import { examResultErrorResponse } from '../../exams/error-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'completion.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { id } = await params;

          const completionRepository = new PrismaCourseCompletionRepository(
            prisma,
          );
          const approvalRepository = new PrismaCompletionApprovalRepository(
            prisma,
          );
          const handler = new GetCompletionDetailQueryHandler(
            completionRepository,
            approvalRepository,
          );

          const result = await handler.execute({ completionId: id });

          if (!result) {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'COMPLETION_NOT_FOUND',
                messageEnglish: 'Completion not found.',
                statusCode: 404,
              },
              { status: 404 },
            );
          }

          const response = NextResponse.json(
            { success: true, data: result },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: `/api/v1/completions/${id}`,
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.completions.detail.failed', {
            status: 'failed',
            error: error as Error,
          });
          return examResultErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/completions/[id]' },
  );
}
