import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../lib/observability';
import {
  RevocationService,
  PrismaAuditAdapter,
  RevokeCertificateSchema
} from '@ims/certificates';
import { certificateErrorResponse, certificateProblemJson } from '../../error-response';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'certificate.revoke', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: any;
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }

      payload.certificateId = params.id;

      const parsed = RevokeCertificateSchema.safeParse(payload);
      if (!parsed.success) {
        return certificateProblemJson(
          400,
          'Invalid request body',
          'Certificate revoke command is invalid.',
          'CERTIFICATE_VALIDATION_FAILED',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          })),
        );
      }

      try {
        const auditPort = new PrismaAuditAdapter();
        const service = new RevocationService(auditPort);
        await service.execute(parsed.data, session.userId);

        const response = NextResponse.json({ success: true }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: `/api/v1/certificates/${params.id}/revoke`,
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.certificates.revoke.failed', { status: 'failed', error: error as Error });
        return certificateErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/certificates/[id]/revoke' });
}
