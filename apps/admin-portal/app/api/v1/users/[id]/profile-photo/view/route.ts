import { NextResponse } from 'next/server';
import { withAuth } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: userId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { session } = await withAuth(request);

        // Security check: must be target user or have iam.user.read permission
        if (session.userId !== userId) {
          const { authorizationGuard } = await import(
            '../../../../../../../lib/runtime'
          );
          await authorizationGuard.verifyPermission(
            session.userId,
            'iam.user.read',
            session.activeBranchId ?? null,
          );
        }

        const { prisma } = await import('../../../../../../../lib/runtime');

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { person: { select: { photoUrl: true } } },
        });

        if (!user || !user.person.photoUrl) {
          return NextResponse.json(
            { success: false, messageEnglish: 'Photo not found' },
            { status: 404 },
          );
        }

        // Fetch from Vercel Blob using token
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const blobResponse = await fetch(user.person.photoUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!blobResponse.ok) {
          throw new Error('Failed to fetch file from storage');
        }

        const response = new NextResponse(blobResponse.body, {
          headers: {
            'Content-Type':
              blobResponse.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000',
          },
        });

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/users/[id]/profile-photo/view',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.users.profile-photo.view.failed', {
          status: 'failed',
          error: error as Error,
        });
        return NextResponse.json(
          { success: false, messageEnglish: (error as Error).message },
          { status: 500 },
        );
      }
    },
    { route: '/api/v1/users/[id]/profile-photo/view' },
  );
}
