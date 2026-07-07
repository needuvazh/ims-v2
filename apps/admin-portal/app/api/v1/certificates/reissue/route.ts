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
  ReissueService,
  PrismaAuditAdapter,
  PrismaNumberingAdapter,
  PrismaEnrollmentReadAdapter,
  SubmitReissueRequestSchema
} from '@ims/certificates';
import { certificateErrorResponse, certificateProblemJson } from '../error-response';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'certificate.reissue', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const params = new URL(request.url).searchParams;
        const status = params.get('status') || undefined;
        const page = parseInt(params.get('page') || '1', 10);
        const pageSize = parseInt(params.get('pageSize') || '20', 10);

        const where: any = {};
        if (status) {
          where.status = status;
        }

        const reissueRequests = await prisma.certificateReissueRequest.findMany({
          where,
          include: {
            certificate: {
              include: {
                enrollment: {
                  include: {
                    course: true,
                    studentProfile: {
                      include: {
                        person: true
                      }
                    }
                  }
                }
              }
            },
            requestedByUser: true
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.certificateReissueRequest.count({ where });

        const response = NextResponse.json({
          success: true,
          data: {
            reissueRequests,
            total,
            page,
            pageSize
          }
        }, { status: 200 });

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/certificates/reissue',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.certificates.reissue.list.failed', { status: 'failed', error: error as Error });
        return certificateErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/certificates/reissue' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'certificate.reissue', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return certificateProblemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CERTIFICATE_INVALID_JSON');
      }

      const parsed = SubmitReissueRequestSchema.safeParse(payload);
      if (!parsed.success) {
        return certificateProblemJson(
          400,
          'Invalid request body',
          'Reissue request details are invalid.',
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
        const requestId = await service.submitRequest(parsed.data, session.userId);

        const response = NextResponse.json({ success: true, data: { id: requestId } }, { status: 201 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/certificates/reissue',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.certificates.reissue.create.failed', { status: 'failed', error: error as Error });
        return certificateErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/certificates/reissue' });
}
