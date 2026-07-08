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
  SubmitBulkResultsCommandHandler,
  PrismaResultRepository,
  PrismaExamRepository,
  BulkResultSubmitSchema,
} from '@ims/exam-result-completion';
import {
  examResultErrorResponse,
  examResultProblemJson,
} from '../../../exams/error-response';

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'result.create', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const payload = await request.json();

          const parsed = BulkResultSubmitSchema.safeParse(payload);
          if (!parsed.success) {
            return examResultProblemJson(
              400,
              'Invalid request body',
              'Bulk submit details are invalid.',
              'BULK_RESULT_SUBMIT_VALIDATION_FAILED',
              parsed.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'body',
                message: issue.message,
              })),
            );
          }

          const resultRepository = new PrismaResultRepository(prisma);
          const examRepository = new PrismaExamRepository(prisma);
          const handler = new SubmitBulkResultsCommandHandler(
            resultRepository,
            examRepository,
          );

          const count = await handler.execute({
            ...parsed.data,
            userId: session.userId,
          });

          const response = NextResponse.json(
            { success: true, data: { processedCount: count } },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/results/bulk/submit',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.results.bulk.submit.failed', {
            status: 'failed',
            error: error as Error,
          });
          return examResultErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/results/bulk/submit' },
  );
}
