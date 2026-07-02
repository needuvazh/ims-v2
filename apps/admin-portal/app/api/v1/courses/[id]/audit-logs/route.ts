import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { z } from 'zod';
import { prisma } from '@ims/database';

const auditQuerySchema = z.object({
  entityType: z.enum(['CoursePricing', 'CourseDiscount', 'CourseCompletionRule']),
  entityId: z.string().uuid(),
});

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { searchParams } = new URL(request.url);
      const parsed = auditQuerySchema.safeParse({
        entityType: searchParams.get('entityType'),
        entityId: searchParams.get('entityId'),
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'CRS-VAL-AUDIT-INVALID',
            messageEnglish: 'Query parameters entityType and entityId are invalid.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const logs = await prisma.auditLog.findMany({
        where: {
          entityId: parsed.data.entityId,
          entityType: parsed.data.entityType,
        },
        orderBy: { performedAt: 'desc' },
      });

      const performerIds = logs.map((l) => l.performedBy).filter(Boolean) as string[];
      const users = await prisma.user.findMany({
        where: { id: { in: performerIds } },
        include: {
          person: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      const formatted = logs.map((log) => {
        const user = log.performedBy ? userMap.get(log.performedBy) : null;
        const name = user?.person ? `${user.person.firstName} ${user.person.lastName}` : 'System / Unknown';
        return {
          id: log.id,
          action: log.action,
          performedBy: name,
          performedAt: log.performedAt,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          oldValue: log.oldValue,
          newValue: log.newValue,
        };
      });

      return NextResponse.json({ success: true, data: formatted });
    } catch (err: any) {
      logger.error(`Error fetching audit logs for courseId ${id}`, { error: err.message });
      return NextResponse.json(
        {
          success: false,
          errorCode: 'CRS-ERR-AUDIT-FETCH',
          messageEnglish: 'Internal error fetching audit logs.',
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  }));
}
