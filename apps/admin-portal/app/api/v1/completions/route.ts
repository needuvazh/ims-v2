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
  EvaluateCompletionCommandHandler,
  SearchCompletionsQueryHandler,
  PrismaCourseCompletionRepository,
  PrismaCourseCompletionRuleReader,
  PrismaAttendanceEvidenceReader,
  PrismaFinanceValidationReader,
  PrismaEnrollmentReader,
  EvaluateCompletionSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from '../exams/error-response';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'completion.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const params = new URL(request.url).searchParams;
        const enrollmentId = params.get('enrollmentId') || undefined;
        const status = params.get('status') as any || undefined;
        const page = parseInt(params.get('page') || '1', 10);
        const pageSize = parseInt(params.get('pageSize') || '20', 10);

        const completionRepository = new PrismaCourseCompletionRepository(prisma);
        const handler = new SearchCompletionsQueryHandler(completionRepository);

        const result = await handler.execute({ enrollmentId, status, page, pageSize });

        const response = NextResponse.json({ success: true, data: result }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/completions',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.completions.list.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/completions' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'completion.evaluate', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const payload = await request.json();

        const parsed = EvaluateCompletionSchema.safeParse(payload);
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Evaluation details are invalid.',
            'COMPLETION_EVALUATION_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        const completionRepository = new PrismaCourseCompletionRepository(prisma);
        const ruleReader = new PrismaCourseCompletionRuleReader(prisma);
        const attendanceReader = new PrismaAttendanceEvidenceReader(prisma);
        const financeReader = new PrismaFinanceValidationReader(prisma);
        const enrollmentReader = new PrismaEnrollmentReader(prisma);
        const handler = new EvaluateCompletionCommandHandler(
          completionRepository,
          ruleReader,
          attendanceReader,
          financeReader,
          enrollmentReader,
        );

        const completionId = await handler.execute({
          ...parsed.data,
          userId: session.userId,
        });

        const response = NextResponse.json({ success: true, data: { id: completionId } }, { status: 201 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/completions/evaluate',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.completions.evaluate.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/completions/evaluate' });
}
