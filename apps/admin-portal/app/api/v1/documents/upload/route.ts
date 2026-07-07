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

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.create', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return NextResponse.json(
            { success: false, messageEnglish: 'Content-Type must be multipart/form-data' },
            { status: 400 }
          );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const ownerId = formData.get('ownerId') as string;
        const documentType = formData.get('documentType') as string;
        const branchId = formData.get('branchId') as string;

        if (!file || !ownerId || !documentType || !branchId) {
          return NextResponse.json(
            { success: false, messageEnglish: 'file, ownerId, documentType, and branchId are required' },
            { status: 400 }
          );
        }

        const { put } = await import('@vercel/blob');
        const token = process.env.BLOB_READ_WRITE_TOKEN;

        // Strict unified path structure: students/${ownerId}/documents/${documentType}/${filename}
        const pathname = `students/${ownerId}/documents/${documentType}/${file.name}`;

        const blobResult = await put(pathname, file, {
          access: 'private',
          token,
          allowOverwrite: true,
        });

        // Persist document immediately in database
        const documentsService = new DocumentsService(prisma);
        let docId = '';
        await prisma.$transaction(async (tx) => {
          await documentsService.registerDocuments(
            ownerId,
            'Person',
            branchId,
            [{
              documentType: documentType as any,
              fileKey: blobResult.url,
              fileName: file.name,
              fileType: file.type || 'application/pdf',
            }],
            tx,
            session.userId
          );

          const doc = await tx.document.findFirst({
            where: {
              fileKey: blobResult.url,
              isDeleted: false,
            },
            select: { id: true },
          });
          if (doc) {
            docId = doc.id;
          }
        });

        const response = NextResponse.json({
          success: true,
          data: {
            id: docId,
            url: blobResult.url,
            fileName: file.name,
            fileType: file.type || 'application/pdf',
          }
        }, { status: 200 });

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/documents/upload',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.documents.upload.failed', { status: 'failed', error: error as Error });
        return NextResponse.json(
          { success: false, messageEnglish: (error as Error).message },
          { status: 500 }
        );
      }
    })
  , { route: '/api/v1/documents/upload' });
}
