import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { prisma } from '@ims/database';
import { schedulingCalendarService } from '../../../../../../lib/runtime';
import { batchErrorResponse } from '../../../route';

const availabilityQuerySchema = z.object({
  sessionDate: z.string().datetime().or(z.string().date()),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

function problemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: batchId } = await params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'course.catalog.view', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        const { searchParams } = new URL(request.url);
        const query = {
          sessionDate: searchParams.get('sessionDate'),
          startTime: searchParams.get('startTime'),
          endTime: searchParams.get('endTime'),
        };

        const parsed = availabilityQuerySchema.safeParse(query);
        if (!parsed.success) {
          return problemJson(
            400,
            'Invalid request query',
            'Classroom availability check parameters are invalid.',
            'CRS-VAL-BATCHES-INVALID_QUERY',
            parsed.error.issues.map((issue) => ({
              field: issue.path.join('.') || 'query',
              message: issue.message,
            })),
          );
        }

        try {
          const batch = await prisma.batch.findUnique({
            where: { id: batchId, isDeleted: false },
            select: { branchId: true },
          });

          if (!batch) {
            return problemJson(
              404,
              'Batch not found',
              'The specified batch does not exist.',
              'CRS-BATCH-NOT-FOUND',
            );
          }

          // Enforce branch scope authorization
          const hasAccess = await prisma.userBranchAccess.findFirst({
            where: {
              userId: session.userId,
              branchId: batch.branchId,
              status: 'Active',
            },
          });
          const isAuthorized = !!hasAccess;

          const isSuperAdmin =
            session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');

          if (!isSuperAdmin && !isAuthorized) {
            return problemJson(
              403,
              'Access denied',
              'You do not have permission to access data in this branch.',
              'ERR_IAM_INSUFFICIENT_PERMISSIONS',
            );
          }

          // Resolve branch calendar & instituteId
          const branch = await prisma.branch.findUnique({
            where: { id: batch.branchId },
            select: { instituteId: true },
          });
          if (!branch) {
            return problemJson(
              500,
              'Branch configuration error',
              'The branch is not linked to an institute.',
              'CRS-BRANCH-INSTITUTE-MISSING',
            );
          }

          const classrooms = await prisma.classroom.findMany({
            where: { branchId: batch.branchId, isDeleted: false, status: 'Active' },
            select: { id: true, classroomName: true, capacity: true },
            orderBy: { classroomName: 'asc' },
          });

          const results = [];
          for (const classroom of classrooms) {
            const validation = await schedulingCalendarService.validateSession({
              branchId: batch.branchId,
              instituteId: branch.instituteId,
              scheduledDate: new Date(parsed.data.sessionDate),
              startTime: parsed.data.startTime,
              endTime: parsed.data.endTime,
              classroomId: classroom.id,
              batchId,
            });

            results.push({
              id: classroom.id,
              classroomName: classroom.classroomName,
              capacity: classroom.capacity,
              available: validation.isValid,
              conflicts: validation.conflicts.map((c) => ({
                type: c.type,
                message: c.message,
              })),
            });
          }

          const response = NextResponse.json(
            {
              success: true,
              classrooms: results,
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/batches/[id]/classrooms/availability',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.batches.classroom-availability.failed', {
            status: 'failed',
            error: error as Error,
          });
          return batchErrorResponse(error as Error);
        }
      }),
    { route: '/api/v1/batches/[id]/classrooms/availability' },
  );
}
