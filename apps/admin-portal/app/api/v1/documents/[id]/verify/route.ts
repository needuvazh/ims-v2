import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { prisma } from '@ims/database';
import { DocumentsService, VerificationOutcomeEnum } from '@ims/documents';
import { documentErrorResponse, documentProblemJson } from '../../error-response';
import { z } from 'zod';

const VerifyPayloadSchema = z.object({
  outcome: VerificationOutcomeEnum,
  remarks: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return documentProblemJson(400, 'Invalid JSON', 'Body must be valid JSON.', 'DOC_INVALID_JSON');
  }

  const parsed = VerifyPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return documentProblemJson(
      400,
      'Validation Failed',
      'Invalid verification details.',
      'DOC_VALIDATION_FAILED',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }))
    );
  }

  const { outcome, remarks } = parsed.data;
  
  // Decide target permission
  const requiredPermission = outcome === 'Verified' ? 'document.verify.approve' : 'document.verify.reject';

  return withRouteObservability(request.headers, async () =>
    withPermission(request, requiredPermission, async ({ session }) => {
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

        // 2. Perform verification decision
        await prisma.$transaction(async (tx) => {
          await service.applyVerificationDecision(id, outcome, remarks, session.userId, tx);
        });

        const response = NextResponse.json({ success: true }, { status: 200 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/documents/[id]/verify',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.documents.verify.failed', { status: 'failed', error: error as Error });
        return documentErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/documents/[id]/verify' });
}
