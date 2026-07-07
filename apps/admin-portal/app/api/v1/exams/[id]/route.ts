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
  GetExamDetailQueryHandler,
  UpdateExamCommandHandler,
  PrismaExamRepository,
  PrismaResultRepository,
} from '@ims/exam-result-completion';
import { examResultErrorResponse } from '../error-response';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'exam.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;

        const examRepository = new PrismaExamRepository(prisma);
        const resultRepository = new PrismaResultRepository(prisma);
        const handler = new GetExamDetailQueryHandler(examRepository, resultRepository);

        const result = await handler.execute({ examId: id });

        if (!result) {
          return NextResponse.json(
            { success: false, errorCode: 'EXAM_NOT_FOUND', messageEnglish: 'Exam not found.', statusCode: 404 },
            { status: 404 },
          );
        }

        const response = NextResponse.json({ success: true, data: result }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/exams/${id}`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.exams.detail.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/exams/[id]' });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'exam.update', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;
        const payload = await request.json();

        const examRepository = new PrismaExamRepository(prisma);
        const handler = new UpdateExamCommandHandler(examRepository);

        await handler.execute({
          examId: id,
          ...payload,
          examDate: payload.examDate ? new Date(payload.examDate) : undefined,
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/exams/${id}`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.exams.update.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/exams/[id]' });
}
