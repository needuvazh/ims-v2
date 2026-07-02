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

      const body = await request.json();
      const { documentType, fileKey } = body;

      if (!documentType || !fileKey) {
        return NextResponse.json({ success: false, messageEnglish: 'documentType and fileKey are required' }, { status: 400 });
      }

      const documentsService = new DocumentsService(prisma);
      
      await prisma.$transaction(async (tx) => {
        await documentsService.registerDocuments(
          admission.personId,
          'Person',
          admission.branchId,
          [{
            documentType,
            fileKey,
            fileName: fileKey.split('/').pop() || 'document.pdf',
            fileType: 'application/pdf',
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
