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
  CloseExamCommandHandler,
  PrismaExamRepository,
} from '@ims/exam-result-completion';
import { examResultErrorResponse } from '../../error-response';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'exam.update', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;

        const examRepository = new PrismaExamRepository(prisma);
        const handler = new CloseExamCommandHandler(examRepository);

        await handler.execute({ examId: id, userId: session.userId });

        const response = NextResponse.json({ success: true, data: { id, status: 'Closed' } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/exams/${id}/close`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.exams.close.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/exams/[id]/close' });
}
