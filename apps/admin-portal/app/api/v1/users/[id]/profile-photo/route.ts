import { NextResponse } from 'next/server';
import { withAuth } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

export async function POST(
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

        // Security check: must be target user or have iam.user.update permission
        if (session.userId !== userId) {
          const { authorizationGuard } = await import(
            '../../../../../../lib/runtime'
          );
          await authorizationGuard.verifyPermission(
            session.userId,
            'iam.user.update',
            session.activeBranchId ?? null,
          );
        }

        const { prisma } = await import('../../../../../../lib/runtime');

        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || user.isDeleted) {
          return NextResponse.json(
            { success: false, messageEnglish: 'User profile not found' },
            { status: 404 },
          );
        }

        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return NextResponse.json(
            {
              success: false,
              messageEnglish: 'Content-Type must be multipart/form-data',
            },
            { status: 400 },
          );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
          return NextResponse.json(
            { success: false, messageEnglish: 'file is required' },
            { status: 400 },
          );
        }

        const { put } = await import('@vercel/blob');
        const token = process.env.BLOB_READ_WRITE_TOKEN;

        const pathname = `users/${user.personId}/profile-photo/${file.name}`;
        const blobResult = await put(pathname, file, {
          access: 'private',
          token,
          allowOverwrite: true,
        });

        await prisma.$transaction(async (tx) => {
          await tx.person.update({
            where: { id: user.personId },
            data: { photoUrl: blobResult.url },
          });

          await tx.auditLog.create({
            data: {
              module: 'iam',
              action: 'UserProfilePhotoUploaded',
              performedBy: session.userId,
              performedAt: new Date(),
              entityType: 'Person',
              entityId: user.personId,
              newValue: { photoUrl: blobResult.url },
            },
          });
        });

        const response = NextResponse.json(
          { success: true, photoUrl: blobResult.url },
          { status: 200 },
        );
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/users/[id]/profile-photo',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.users.profile-photo.failed', {
          status: 'failed',
          error: error as Error,
        });
        return NextResponse.json(
          { success: false, messageEnglish: (error as Error).message },
          { status: 500 },
        );
      }
    },
    { route: '/api/v1/users/[id]/profile-photo' },
  );
}
