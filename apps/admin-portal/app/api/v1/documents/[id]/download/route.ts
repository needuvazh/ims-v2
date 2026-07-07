import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { prisma } from '@ims/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
      const { id } = await params;

      try {
        const document = await prisma.document.findUnique({
          where: { id, isDeleted: false },
        });

        if (!document) {
          return NextResponse.json({ success: false, messageEnglish: 'Document not found' }, { status: 404 });
        }

        // Check user branch access containment
        const userBranches = await prisma.userBranchAccess.findMany({
          where: { userId: session.userId },
          select: { branchId: true },
        });
        const branchIds = userBranches.map((ub) => ub.branchId);

        if (!branchIds.includes(document.branchId)) {
          return NextResponse.json(
            { success: false, messageEnglish: 'Access denied to this document branch' },
            { status: 403 }
          );
        }

        // Fetch from Vercel Blob using token
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const blobResponse = await fetch(document.fileKey, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!blobResponse.ok) {
          throw new Error('Failed to fetch file from storage');
        }

        return new NextResponse(blobResponse.body, {
          headers: {
            'Content-Type': document.fileType || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${document.fileName}"`,
          },
        });
      } catch (error) {
        logger.error('api.documents.download.failed', { status: 'failed', error: error as Error });
        return NextResponse.json(
          { success: false, messageEnglish: (error as Error).message },
          { status: 500 }
        );
      }
    })
  , { route: '/api/v1/documents/[id]/download' });
}
