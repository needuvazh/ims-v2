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
  CreateExamCommandHandler,
  SearchExamsQueryHandler,
  PrismaExamRepository,
  PrismaEnrollmentReader,
  CreateExamSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from './error-response';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'exam.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const params = new URL(request.url).searchParams;
        const batchId = params.get('batchId') || undefined;
        const courseId = params.get('courseId') || undefined;
        const status = params.get('status') as any || undefined;
        const page = parseInt(params.get('page') || '1', 10);
        const pageSize = parseInt(params.get('pageSize') || '20', 10);

        const examRepository = new PrismaExamRepository(prisma);
        const handler = new SearchExamsQueryHandler(examRepository);

        const result = await handler.execute({
          batchId,
          courseId,
          status,
          page,
          pageSize,
        });

        const response = NextResponse.json({ success: true, data: result }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/exams',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.exams.list.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/exams' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'exam.create', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return examResultProblemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'EXAM_INVALID_JSON');
      }

      const parsed = CreateExamSchema.safeParse(payload);
      if (!parsed.success) {
        return examResultProblemJson(
          400,
          'Invalid request body',
          'Exam details are invalid.',
          'EXAM_VALIDATION_FAILED',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          })),
        );
      }

      try {
        const examRepository = new PrismaExamRepository(prisma);
        const enrollmentReader = new PrismaEnrollmentReader(prisma);
        const handler = new CreateExamCommandHandler(examRepository, enrollmentReader);

        const examId = await handler.execute({
          ...parsed.data,
          examDate: new Date(parsed.data.examDate),
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id: examId } }, { status: 201 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/exams',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.exams.create.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/exams' });
}
