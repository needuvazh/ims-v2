import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { prisma } from '@ims/database';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.requirement.manage', async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
      try {
        const payload = await request.json();
        const {
          targetEntity,
          documentType,
          isMandatory,
          branchId,
          courseId,
          status,
        } = payload;

        if (!targetEntity || !documentType) {
          return NextResponse.json(
            {
              success: false,
              messageEnglish: 'targetEntity and documentType are required',
            },
            { status: 400 },
          );
        }

        const updated = await prisma.documentRequirement.update({
          where: { id },
          data: {
            targetEntity,
            documentType,
            isMandatory: !!isMandatory,
            branchId: branchId || null,
            courseId: courseId || null,
            status: status || 'Active',
          },
        });

        return NextResponse.json({ success: true, data: updated });
      } catch (err: any) {
        logger.error('Failed to update document requirement', {
          error: err.message,
        });
        return NextResponse.json(
          {
            success: false,
            messageEnglish: err.message || 'Internal server error',
          },
          { status: 500 },
        );
      }
    }),
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.requirement.manage', async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
      try {
        await prisma.documentRequirement.delete({
          where: { id },
        });

        return NextResponse.json({ success: true });
      } catch (err: any) {
        logger.error('Failed to delete document requirement', {
          error: err.message,
        });
        return NextResponse.json(
          {
            success: false,
            messageEnglish: err.message || 'Internal server error',
          },
          { status: 500 },
        );
      }
    }),
  );
}
