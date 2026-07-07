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
  ReevaluateCompletionCommandHandler,
  EvaluateCompletionCommandHandler,
  PrismaCourseCompletionRepository,
  PrismaCourseCompletionRuleReader,
  PrismaAttendanceEvidenceReader,
  PrismaFinanceValidationReader,
  PrismaEnrollmentReader,
  PrismaExamEvidenceReader,
  ReevaluateCompletionSchema,
} from '@ims/exam-result-completion';
import { examResultErrorResponse, examResultProblemJson } from '../../../exams/error-response';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'completion.evaluate', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id } = await params;
        const payload = await request.json();

        const parsed = ReevaluateCompletionSchema.safeParse({ completionId: id, ...payload });
        if (!parsed.success) {
          return examResultProblemJson(
            400,
            'Invalid request body',
            'Reevaluation details are invalid.',
            'COMPLETION_REEVALUATION_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        const completion = await prisma.courseCompletion.findUnique({
          where: { id, isDeleted: false },
        });

        if (!completion) {
          return examResultProblemJson(
            404,
            'Completion not found',
            `Completion ${id} not found`,
            'COMPLETION_NOT_FOUND'
          );
        }

        const completionRepository = new PrismaCourseCompletionRepository(prisma);

        // 1. If Approved, first transition to ReevaluationRequired status
        if (completion.completionStatus === 'Approved') {
          const reevalHandler = new ReevaluateCompletionCommandHandler(completionRepository);
          await reevalHandler.execute({ completionId: id, userId: session.userId });
        }

        // 2. If it is now in ReevaluationRequired, Pending, or EvidenceIncomplete status, run the full evaluation engine
        const evaluatableStatuses = ['ReevaluationRequired', 'Pending', 'EvidenceIncomplete'];
        const currentStatus = completion.completionStatus === 'Approved' ? 'ReevaluationRequired' : completion.completionStatus;

        let finalStatus: string = currentStatus;

        if (evaluatableStatuses.includes(currentStatus)) {
          const ruleReader = new PrismaCourseCompletionRuleReader(prisma);
          const attendanceReader = new PrismaAttendanceEvidenceReader(prisma);
          const financeReader = new PrismaFinanceValidationReader(prisma);
          const enrollmentReader = new PrismaEnrollmentReader(prisma);
          const examEvidenceReader = new PrismaExamEvidenceReader(prisma);

          const evalHandler = new EvaluateCompletionCommandHandler(
            completionRepository,
            ruleReader,
            attendanceReader,
            financeReader,
            enrollmentReader,
            examEvidenceReader
          );

          await evalHandler.execute({
            enrollmentId: completion.enrollmentId,
            userId: session.userId,
          });

          const updatedRecord = await prisma.courseCompletion.findUnique({
            where: { id, isDeleted: false },
            select: { completionStatus: true },
          });
          if (updatedRecord) {
            finalStatus = updatedRecord.completionStatus;
          }
        } else if (completion.completionStatus !== 'Approved') {
          // If status is not approved and not one of the evaluatable ones, throw invalid state error
          return examResultProblemJson(
            400,
            'Invalid state for reevaluation',
            `Completion status ${completion.completionStatus} cannot be reevaluated directly.`,
            'COMPLETION_INVALID_STATE'
          );
        }

        const response = NextResponse.json({ success: true, data: { id, status: finalStatus } }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/completions/${id}/reevaluate`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.completions.reevaluate.failed', { status: 'failed', error: error as Error });
        return examResultErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/completions/[id]/reevaluate' });
}
