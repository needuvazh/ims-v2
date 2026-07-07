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
  GenerateReplacementCertificateSchema
} from '@ims/certificates';
import { certificateErrorResponse, certificateProblemJson } from '../../../error-response';

export async function POST(request: Request, { params }: { params: { requestId: string } }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'certificate.create', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: any;
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }

      payload.reissueRequestId = params.requestId;

      const parsed = GenerateReplacementCertificateSchema.safeParse(payload);
      if (!parsed.success) {
        return certificateProblemJson(
          400,
          'Invalid request body',
          'Replacement certificate generation command is invalid.',
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
        const certificateId = await service.generateReplacement(parsed.data, session.userId);

        const response = NextResponse.json({ success: true, data: { id: certificateId } }, { status: 201 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/certificates/reissue/${params.requestId}/replacement`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.certificates.reissue.replacement.failed', { status: 'failed', error: error as Error });
        return certificateErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/certificates/reissue/[requestId]/replacement' });
}
