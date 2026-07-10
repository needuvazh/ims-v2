import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
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
  const { id: admissionId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'admission.create', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { prisma, branchScopeResolver } =
            await import('../../../../../../lib/runtime');

          const admission = await prisma.admission.findUnique({
            where: { id: admissionId },
            include: { studentProfile: true },
          });

          if (!admission || !admission.studentProfile) {
            return NextResponse.json(
              { success: false, messageEnglish: 'Admission not found' },
              { status: 404 },
            );
          }

          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              session.userId,
              session.activeBranchId ?? null,
            );
          if (!allowedBranches.includes(admission.studentProfile.branchId as Uuid)) {
            return NextResponse.json(
              { success: false, messageEnglish: 'Access Denied' },
              { status: 403 },
            );
          }

          const contentType = request.headers.get('content-type') || '';
          if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json(
              { success: false, messageEnglish: 'Content-Type must be multipart/form-data' },
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

          const pathname = `students/${admission.personId}/profile-photo/${file.name}`;
          const blobResult = await put(pathname, file, {
            access: 'private',
            token,
            allowOverwrite: true,
          });

          await prisma.$transaction(async (tx) => {
            await tx.person.update({
              where: { id: admission.personId },
              data: { photoUrl: blobResult.url },
            });

            await tx.auditLog.create({
              data: {
                module: 'AdmissionsEnrollment',
                action: 'StudentProfilePhotoUploaded',
                performedBy: session.userId,
                performedAt: new Date(),
                entityType: 'Person',
                entityId: admission.personId,
                branchId: admission.studentProfile.branchId,
                newValue: { photoUrl: blobResult.url },
              },
            });
          });

          const response = NextResponse.json(
            { success: true, photoUrl: blobResult.url },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/admissions/[id]/profile-photo',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.admissions.profile-photo.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            { success: false, messageEnglish: (error as Error).message },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/admissions/[id]/profile-photo' },
  );
}
