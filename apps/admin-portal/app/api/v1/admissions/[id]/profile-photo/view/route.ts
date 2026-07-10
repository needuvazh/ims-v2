import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: admissionId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'admission.read', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { prisma } = await import('../../../../../../lib/runtime');

          const admission = await prisma.admission.findUnique({
            where: { id: admissionId },
            select: { person: { select: { photoUrl: true } } },
          });

          if (!admission || !admission.person.photoUrl) {
            return NextResponse.json(
              { success: false, messageEnglish: 'Photo not found' },
              { status: 404 },
            );
          }

          // Fetch from Vercel Blob using token
          const token = process.env.BLOB_READ_WRITE_TOKEN;
          const blobResponse = await fetch(admission.person.photoUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!blobResponse.ok) {
            throw new Error('Failed to fetch file from storage');
          }

          const response = new NextResponse(blobResponse.body, {
            headers: {
              'Content-Type': blobResponse.headers.get('content-type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000',
            },
          });

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/admissions/[id]/profile-photo/view',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.admissions.profile-photo.view.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            { success: false, messageEnglish: (error as Error).message },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/admissions/[id]/profile-photo/view' },
  );
}
