import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: admissionId, docId } = await props.params;
  return withRouteObservability(request.headers, async () => withPermission(request, 'admission.approve', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { prisma, branchScopeResolver } = await import('../../../../../../../lib/runtime');
      
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

      // Check if document exists and is owned by the learner
      const document = await prisma.document.findUnique({
        where: { id: docId },
        include: {
          owners: {
            where: {
              ownerId: admission.personId,
              ownerType: 'Person',
            },
          },
        },
      });

      if (!document || document.isDeleted || document.owners.length === 0) {
        return NextResponse.json({ success: false, messageEnglish: 'Document not found or access denied' }, { status: 404 });
      }

      const body = await request.json();
      const { outcome, remarks } = body;

      if (!outcome || !['Verified', 'Rejected'].includes(outcome)) {
        return NextResponse.json({ success: false, messageEnglish: 'Valid outcome (Verified or Rejected) is required' }, { status: 400 });
      }

      // Create a verification record
      await prisma.documentVerification.create({
        data: {
          documentId: docId,
          outcome: outcome as any,
          verifiedBy: session.userId,
          verifiedAt: new Date(),
          remarks: remarks || null,
          createdBy: session.userId,
        },
      });

      const response = NextResponse.json({ success: true }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/admissions/[id]/documents/[docId]/verify',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.admissions.documents.verify.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        { success: false, messageEnglish: (error as Error).message },
        { status: 500 }
      );
    }
  }), { route: '/api/v1/admissions/[id]/documents/[docId]/verify' });
}
