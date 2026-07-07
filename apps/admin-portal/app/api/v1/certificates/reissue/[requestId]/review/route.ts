import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../../lib/observability';
import {
  ReissueService,
  PrismaAuditAdapter,
  PrismaNumberingAdapter,
  PrismaEnrollmentReadAdapter,
  ReviewReissueRequestSchema
} from '@ims/certificates';
import { certificateErrorResponse, certificateProblemJson } from '../../../error-response';

export async function POST(request: Request, { params }: { params: { requestId: string } }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'certificate.reissue', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: any;
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }

      payload.requestId = params.requestId;

      const parsed = ReviewReissueRequestSchema.safeParse(payload);
      if (!parsed.success) {
        return certificateProblemJson(
          400,
          'Invalid request body',
          'Reissue review command is invalid.',
          'CERTIFICATE_VALIDATION_FAILED',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          })),
        );
      }

      try {
        const auditPort = new PrismaAuditAdapter();
        const numberingPort = new PrismaNumberingAdapter();
        const enrollmentReadPort = new PrismaEnrollmentReadAdapter();

        const service = new ReissueService(auditPort, numberingPort, enrollmentReadPort);
        await service.reviewRequest(parsed.data, session.userId);

        const response = NextResponse.json({ success: true }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/certificates/reissue/${params.requestId}/review`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.certificates.reissue.review.failed', { status: 'failed', error: error as Error });
        return certificateErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/certificates/reissue/[requestId]/review' });
}
