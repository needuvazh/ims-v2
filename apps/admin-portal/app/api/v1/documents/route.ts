import { NextResponse } from 'next/server';
import { withPermission } from '../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
  applyObservabilityResponseHeaders,
} from '../../../../lib/observability';
import { prisma } from '@ims/database';
import { DocumentsService, OwnerTypeEnum, DocumentCaptureSchema } from '@ims/documents';
import { documentErrorResponse, documentProblemJson } from './error-response';
import { z } from 'zod';

const RegisterPayloadSchema = z.object({
  ownerId: z.string(),
  ownerType: OwnerTypeEnum,
  branchId: z.string().uuid(),
  inputs: z.array(DocumentCaptureSchema),
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const params = new URL(request.url).searchParams;
        const ownerId = params.get('ownerId') || undefined;
        const ownerTypeRaw = params.get('ownerType') || undefined;

        // Resolve user branches for containment checks
        const userBranches = await prisma.userBranchAccess.findMany({
          where: { userId: session.userId },
          select: { branchId: true },
        });
        const branchIds = userBranches.map((ub) => ub.branchId);

        if (branchIds.length === 0) {
          return NextResponse.json({ success: true, data: { documents: [], total: 0 } });
        }

        const where: any = {
          branchId: { in: branchIds },
          isDeleted: false,
        };

        if (ownerId && ownerTypeRaw) {
          const parsedOwnerType = OwnerTypeEnum.safeParse(ownerTypeRaw);
          if (parsedOwnerType.success) {
            where.owners = {
              some: {
                ownerId: ownerId,
                ownerType: parsedOwnerType.data,
              },
            };
          }
        }

        const documents = await prisma.document.findMany({
          where,
          include: {
            owners: true,
            verifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const response = NextResponse.json(
          {
            success: true,
            data: {
              documents,
              total: documents.length,
            },
          },
          { status: 200 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/documents',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.documents.list.failed', { status: 'failed', error: error as Error });
        return documentErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/documents' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.create', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return documentProblemJson(400, 'Invalid JSON', 'Body must be valid JSON.', 'DOC_INVALID_JSON');
      }

      const parsed = RegisterPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return documentProblemJson(
          400,
          'Validation Failed',
          'Invalid registration payload.',
          'DOC_VALIDATION_FAILED',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      const { ownerId, ownerType, branchId, inputs } = parsed.data;

      // Verify branch containment: Is the user authorized for the target branch?
      const branchAccess = await prisma.userBranchAccess.findFirst({
        where: {
          userId: session.userId,
          branchId: branchId,
        },
      });

      if (!branchAccess) {
        return documentProblemJson(
          403,
          'Access Denied',
          'User is not authorized for this branch.',
          'DOC_BRANCH_SCOPE_DENIED'
        );
      }

      try {
        const service = new DocumentsService(prisma);

        // Run registration inside a transaction
        await prisma.$transaction(async (tx) => {
          await service.registerDocuments(ownerId, ownerType, branchId, inputs, tx, session.userId);
        });

        const response = NextResponse.json({ success: true }, { status: 201 });
        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/documents',
          method: request.method,
          status: 'success',
        });
        return response;
      } catch (error) {
        logger.error('api.documents.register.failed', { status: 'failed', error: error as Error });
        return documentErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/documents' });
}
