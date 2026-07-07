import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { prisma } from '@ims/database';
import crypto from 'crypto';

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const { searchParams } = new URL(request.url);
    const targetEntity = searchParams.get('targetEntity');
    const branchId = searchParams.get('branchId');
    const courseId = searchParams.get('courseId') || undefined;

    if (targetEntity && branchId) {
      return withPermission(request, 'document.view', async () => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const requirements = await prisma.documentRequirement.findMany({
            where: {
              targetEntity: targetEntity as any,
              status: 'Active',
              OR: [
                { branchId: null, courseId: null },
                { branchId: branchId, courseId: null },
                { branchId: null, courseId: courseId },
                { branchId: branchId, courseId: courseId },
              ],
            },
            orderBy: {
              isMandatory: 'desc',
            },
          });

          return NextResponse.json({ success: true, data: requirements });
        } catch (err: any) {
          logger.error('Failed to query document requirements', { error: err.message });
          return NextResponse.json(
            { success: false, messageEnglish: 'Internal server error query requirements' },
            { status: 500 }
          );
        }
      });
    }

    return withPermission(request, 'document.requirement.manage', async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
      try {
        const requirements = await prisma.documentRequirement.findMany({
          include: {
            branch: { select: { branchName: true } },
            course: { select: { nameEnglish: true } },
          },
          orderBy: { targetEntity: 'asc' },
        });
        return NextResponse.json({ success: true, data: requirements });
      } catch (err: any) {
        logger.error('Failed to list document requirements master', { error: err.message });
        return NextResponse.json(
          { success: false, messageEnglish: 'Failed to list document requirements' },
          { status: 500 }
        );
      }
    });
  });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'document.requirement.manage', async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
      try {
        const payload = await request.json();
        const { targetEntity, documentType, isMandatory, branchId, courseId } = payload;

        if (!targetEntity || !documentType) {
          return NextResponse.json(
            { success: false, messageEnglish: 'targetEntity and documentType are required' },
            { status: 400 }
          );
        }

        const req = await prisma.documentRequirement.create({
          data: {
            id: crypto.randomUUID(),
            targetEntity,
            documentType,
            isMandatory: !!isMandatory,
            branchId: branchId || null,
            courseId: courseId || null,
            status: 'Active',
            effectiveStartDate: new Date(),
          },
        });

        return NextResponse.json({ success: true, data: req }, { status: 201 });
      } catch (err: any) {
        logger.error('Failed to create document requirement', { error: err.message });
        return NextResponse.json(
          { success: false, messageEnglish: err.message || 'Internal server error' },
          { status: 500 }
        );
      }
    })
  );
}
