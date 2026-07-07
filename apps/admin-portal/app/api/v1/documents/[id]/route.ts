import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { prisma } from '@ims/database';
import { DocumentsService } from '@ims/documents';
import { documentErrorResponse, documentProblemJson } from '../error-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const service = new DocumentsService(prisma);

        // 1. Verify branch containment
        const hasAccess = await service.verifyDocumentAccess(session.userId, id);
        if (!hasAccess) {
          // Deny access with a 404 to hide document existence if user has no branch access
          return documentProblemJson(
            404,
            'Not Found',
            'Document not found or access denied.',
            'DOC_NOT_FOUND'
          );
        }

        const document = await prisma.document.findUnique({
          where: { id, isDeleted: false },
          include: {
            owners: true,
            verifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!document) {
          return documentProblemJson(
            404,
            'Not Found',
            'Document not found.',
            'DOC_NOT_FOUND'
          );
        }


        const response = NextResponse.json({ success: true, data: document }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/documents/[id]',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.documents.get.failed', { status: 'failed', error: error as Error });
        return documentErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/documents/[id]' });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.retire', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const service = new DocumentsService(prisma);

        // 1. Verify branch containment
        const hasAccess = await service.verifyDocumentAccess(session.userId, id);
        if (!hasAccess) {
          return documentProblemJson(
            404,
            'Not Found',
            'Document not found or access denied.',
            'DOC_NOT_FOUND'
          );
        }

        // 2. Retrieve file details for Vercel Blob deletion
        const docRecord = await prisma.document.findUnique({
          where: { id },
        });

        if (docRecord && docRecord.fileKey.startsWith('http')) {
          try {
            const { del } = await import('@vercel/blob');
            await del(docRecord.fileKey, {
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
          } catch (blobErr) {
            // Log Vercel Blob deletion failure but proceed with soft-deletion
            logger.warn('api.documents.delete.vercel_blob_failed', { error: blobErr as Error });
          }
        }

        // 3. Perform soft delete
        await prisma.$transaction(async (tx) => {
          await service.retireDocument(id, session.userId, tx);
        });

        const response = NextResponse.json({ success: true }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/documents/[id]',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.documents.delete.failed', { status: 'failed', error: error as Error });
        return documentErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/documents/[id]' });
}
