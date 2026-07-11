import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../../lib/observability';
import { prisma } from '@ims/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'certificate.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const certificate = await prisma.certificate.findUnique({
            where: { id },
            include: {
              enrollment: true,
            },
          });

          if (!certificate) {
            return NextResponse.json(
              { success: false, messageEnglish: 'Certificate not found' },
              { status: 404 },
            );
          }

          // Check user branch access containment
          const userBranches = await prisma.userBranchAccess.findMany({
            where: { userId: session.userId },
            select: { branchId: true },
          });
          const branchIds = userBranches.map((ub) => ub.branchId);

          if (branchIds.length > 0 && !branchIds.includes(certificate.enrollment.branchId)) {
            return NextResponse.json(
              {
                success: false,
                messageEnglish: 'Access denied to this certificate branch',
              },
              { status: 403 },
            );
          }

          // Fetch from Vercel Blob using token
          const token = process.env.BLOB_READ_WRITE_TOKEN;
          const blobResponse = await fetch(certificate.certificateUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!blobResponse.ok) {
            throw new Error('Failed to fetch certificate file from storage');
          }

          const response = new NextResponse(blobResponse.body, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${certificate.certificateNumber}.pdf"`,
            },
          });

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/certificates/[id]/download',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.certificates.download.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            { success: false, messageEnglish: (error as Error).message },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/certificates/[id]/download' },
  );
}
