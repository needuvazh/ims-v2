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
  RecordResultCommandHandler,
  SearchResultsQueryHandler,
  PrismaResultRepository,
  PrismaExamRepository,
  PrismaEnrollmentReader,
  RecordResultSchema,
} from '@ims/exam-result-completion';
import {
  examResultErrorResponse,
  examResultProblemJson,
} from '../exams/error-response';

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'result.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const params = new URL(request.url).searchParams;
          const examId = params.get('examId') || undefined;
          const enrollmentId = params.get('enrollmentId') || undefined;
          const status = (params.get('status') as any) || undefined;
          const page = parseInt(params.get('page') || '1', 10);
          const pageSize = parseInt(params.get('pageSize') || '20', 10);

          const resultRepository = new PrismaResultRepository(prisma);
          const handler = new SearchResultsQueryHandler(resultRepository);

          const result = await handler.execute({
            examId,
            enrollmentId,
            status,
            page,
            pageSize,
          });

          const response = NextResponse.json(
            { success: true, data: result },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/results',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.results.list.failed', {
            status: 'failed',
            error: error as Error,
          });
          return examResultErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/results' },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'result.create', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Request body must be valid JSON.',
            'RESULT_INVALID_JSON',
          );
        }

        const parsed = RecordResultSchema.safeParse(payload);
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Result details are invalid.',
            'RESULT_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        try {
          const resultRepository = new PrismaResultRepository(prisma);
          const examRepository = new PrismaExamRepository(prisma);
          const enrollmentReader = new PrismaEnrollmentReader(prisma);
          const handler = new RecordResultCommandHandler(
            resultRepository,
            examRepository,
            enrollmentReader,
          );

          const resultId = await handler.execute({
            ...parsed.data,
            userId: session.userId,
          });

          const response = NextResponse.json(
            { success: true, data: { id: resultId } },
            { status: 201 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/results',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.results.create.failed', {
            status: 'failed',
            error: error as Error,
          });
          return examResultErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/results' },
  );
}
