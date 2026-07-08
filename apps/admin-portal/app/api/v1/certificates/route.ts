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
  GenerateCertificateService,
  PrismaEnrollmentReadAdapter,
  PrismaCompletionReadAdapter,
  PrismaFinanceValidationAdapter,
  PrismaNumberingAdapter,
  PrismaAuditAdapter,
  GenerateCertificateCommandSchema,
} from '@ims/certificates';
import {
  certificateErrorResponse,
  certificateProblemJson,
} from './error-response';

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'certificate.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const params = new URL(request.url).searchParams;
          const status = params.get('status') || undefined;
          const studentProfileId = params.get('studentProfileId') || undefined;
          const page = parseInt(params.get('page') || '1', 10);
          const pageSize = parseInt(params.get('pageSize') || '20', 10);

          const where: any = {};
          if (status) {
            where.certificateStatus = status;
          }
          if (studentProfileId) {
            where.studentProfileId = studentProfileId;
          }

          // Branch Manager branch-scoping logic
          const userBranches = await prisma.userBranchAccess.findMany({
            where: { userId: session.userId },
            select: { branchId: true },
          });
          const branchIds = userBranches.map((ub) => ub.branchId);

          if (branchIds.length > 0) {
            where.enrollment = {
              branchId: { in: branchIds },
            };
          }

          const certificates = await prisma.certificate.findMany({
            where,
            include: {
              enrollment: {
                include: {
                  course: true,
                  batch: true,
                  studentProfile: {
                    include: {
                      person: true,
                    },
                  },
                },
              },
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
          });

          const total = await prisma.certificate.count({ where });

          const response = NextResponse.json(
            {
              success: true,
              data: {
                certificates,
                total,
                page,
                pageSize,
              },
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/certificates',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.certificates.list.failed', {
            status: 'failed',
            error: error as Error,
          });
          return certificateErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/certificates' },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'certificate.create', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return certificateProblemJson(
            400,
            'Invalid request body',
            'Request body must be valid JSON.',
            'CERTIFICATE_INVALID_JSON',
          );
        }

        const parsed = GenerateCertificateCommandSchema.safeParse(payload);
        if (!parsed.success) {
          return certificateProblemJson(
            400,
            'Invalid request body',
            'Certificate details are invalid.',
            'CERTIFICATE_VALIDATION_FAILED',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'body',
              message: issue.message,
            })),
          );
        }

        try {
          const enrollmentReadPort = new PrismaEnrollmentReadAdapter();
          const completionReadPort = new PrismaCompletionReadAdapter();
          const financeValidationPort = new PrismaFinanceValidationAdapter();
          const numberingPort = new PrismaNumberingAdapter();
          const auditPort = new PrismaAuditAdapter();

          const service = new GenerateCertificateService(
            enrollmentReadPort,
            completionReadPort,
            financeValidationPort,
            numberingPort,
            auditPort,
          );

          const certificateId = await service.execute(
            parsed.data,
            session.userId,
          );

          const response = NextResponse.json(
            { success: true, data: { id: certificateId } },
            { status: 201 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/certificates',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.certificates.generate.failed', {
            status: 'failed',
            error: error as Error,
          });
          return certificateErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/certificates' },
  );
}
