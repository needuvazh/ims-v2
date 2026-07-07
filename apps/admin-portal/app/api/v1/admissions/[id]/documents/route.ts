import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { DocumentsService } from '@ims/documents';
import type { Uuid } from '@ims/shared-kernel';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: admissionId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'admission.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { prisma, branchScopeResolver } = await import('../../../../../../lib/runtime');
      
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId }
      });

      if (!admission) {
        return NextResponse.json({ success: false, messageEnglish: 'Admission not found' }, { status: 404 });
      }

      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(admission.branchId as Uuid)) {
        return NextResponse.json({ success: false, messageEnglish: 'Access Denied' }, { status: 403 });
      }

      const contentType = request.headers.get('content-type') || '';
      let documentType: string;
      let fileKey: string;
      let fileName = 'document.pdf';
      let fileType = 'application/pdf';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        documentType = formData.get('documentType') as string;

        if (!file || !documentType) {
          return NextResponse.json({ success: false, messageEnglish: 'file and documentType are required' }, { status: 400 });
        }

        const { put } = await import('@vercel/blob');
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        
        // Structure the pathname: students/${personId}/documents/${documentType}/${fileName}
        const pathname = `students/${admission.personId}/documents/${documentType}/${file.name}`;
        const blobResult = await put(pathname, file, {
          access: 'private',
          token,
          allowOverwrite: true,
        });

        fileKey = blobResult.url;
        fileName = file.name;
        fileType = file.type || 'application/pdf';
      } else {
        const body = await request.json();
        documentType = body.documentType;
        fileKey = body.fileKey;

        if (!documentType || !fileKey) {
          return NextResponse.json({ success: false, messageEnglish: 'documentType and fileKey are required' }, { status: 400 });
        }
        fileName = fileKey.split('/').pop() || 'document.pdf';
      }

      const documentsService = new DocumentsService(prisma);
      
      await prisma.$transaction(async (tx) => {
        await documentsService.registerDocuments(
          admission.personId,
          'Person',
          admission.branchId,
          [{
            documentType: documentType as any,
            fileKey,
            fileName,
            fileType,
          }],
          tx,
          session.userId
        );
      });

      const response = NextResponse.json({ success: true }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/admissions/[id]/documents',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.admissions.documents.register.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        { success: false, messageEnglish: (error as Error).message },
        { status: 500 }
      );
    }
  }), { route: '/api/v1/admissions/[id]/documents' });
}
