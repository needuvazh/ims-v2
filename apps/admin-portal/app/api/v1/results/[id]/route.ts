import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../lib/observability';
import { prisma } from '@ims/database';
import {
  GetResultDetailQueryHandler,
  PrismaResultRepository,
  PrismaExamRepository,
} from '@ims/exam-result-completion';
import { examResultErrorResponse } from '../../exams/error-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'result.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { id } = await params;

          const resultRepository = new PrismaResultRepository(prisma);
          const examRepository = new PrismaExamRepository(prisma);
          const handler = new GetResultDetailQueryHandler(
            resultRepository,
            examRepository,
          );

          const result = await handler.execute({ resultId: id });

          if (!result) {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'RESULT_NOT_FOUND',
                messageEnglish: 'Result not found.',
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
            route: `/api/v1/results/${id}`,
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.results.detail.failed', {
            status: 'failed',
            error: error as Error,
          });
          return examResultErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/results/[id]' },
  );
}
