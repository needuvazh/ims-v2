import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { hasPermission } from '@ims/shared-auth';
import { createUuid } from '@ims/shared-kernel';

const updateStudentSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    nationalId: z.string().trim().max(50).optional().nullable(),
    passportNumber: z.string().trim().max(50).optional().nullable(),
    visaNumber: z.string().trim().max(50).optional().nullable(),
    nationality: z.string().trim().max(50).optional().nullable(),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    gender: z.string().trim().max(20).optional().nullable(),
    remarks: z.string().trim().max(1000).optional().nullable(),
    version: z.number().int().positive().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided.',
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { id: studentId } = await context.params;
        const { session } = await withAuth(request);
        if (
          !hasPermission(session, 'student.update') &&
          !hasPermission(session, 'student.write')
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_PERMISSION_DENIED',
              messageEnglish: 'Missing student.update permission.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        const body = await request.json();
        const parsed = updateStudentSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_FAILED',
              messageEnglish:
                parsed.error.issues[0]?.message || 'Invalid payload.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const { branchScopeResolver, prisma } =
          await import('../../../../../lib/runtime');
        const student = await prisma.studentProfile.findUnique({
          where: { id: studentId },
          include: { person: true },
        });

        if (!student || student.isDeleted) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STU_NOT_FOUND',
              messageEnglish: 'Student not found.',
              statusCode: 404,
            },
            { status: 404 },
          );
        }

        const allowedBranches =
          await branchScopeResolver.resolveAllowedBranches(
            createUuid(session.userId),
            session.activeBranchId ? createUuid(session.activeBranchId) : null,
          );
        if (
          !allowedBranches.some((branchId) => branchId === student.branchId)
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_BRANCH_SCOPE_DENIED',
              messageEnglish: 'Student is outside your allowed branch scope.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        if (
          parsed.data.version !== undefined &&
          parsed.data.version !== student.version
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STU_CONCURRENCY_CONFLICT',
              messageEnglish:
                'The student profile was updated by another user. Please reload and try again.',
              statusCode: 409,
            },
            { status: 409 },
          );
        }

        const updated = await prisma.$transaction(async (tx) => {
          const person = await tx.person.update({
            where: { id: student.personId },
            data: {
              ...(parsed.data.firstName !== undefined
                ? { firstName: parsed.data.firstName }
                : {}),
              ...(parsed.data.lastName !== undefined
                ? { lastName: parsed.data.lastName }
                : {}),
              ...(parsed.data.nationalId !== undefined
                ? { nationalId: parsed.data.nationalId }
                : {}),
              ...(parsed.data.passportNumber !== undefined
                ? { passportNumber: parsed.data.passportNumber }
                : {}),
              ...(parsed.data.visaNumber !== undefined
                ? { visaNumber: parsed.data.visaNumber }
                : {}),
              ...(parsed.data.nationality !== undefined
                ? { nationality: parsed.data.nationality }
                : {}),
              ...(parsed.data.dateOfBirth !== undefined
                ? {
                    dateOfBirth: parsed.data.dateOfBirth
                      ? new Date(parsed.data.dateOfBirth)
                      : null,
                  }
                : {}),
              ...(parsed.data.gender !== undefined
                ? { gender: parsed.data.gender }
                : {}),
              updatedBy: session.userId,
              version: { increment: 1 },
            },
          });

          const profile = await tx.studentProfile.update({
            where: { id: student.id },
            data: {
              ...(parsed.data.remarks !== undefined
                ? { remarks: parsed.data.remarks }
                : {}),
              updatedBy: session.userId,
              version: { increment: 1 },
            },
          });

          return { person, profile };
        });

        const response = NextResponse.json(
          {
            success: true,
            data: {
              studentId: updated.profile.id,
              studentNumber: updated.profile.studentNumber,
              updatedAt: updated.profile.updatedAt,
            },
          },
          { status: 200 },
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/students/[id]',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.students.update.failed', {
          status: 'failed',
          error: error as Error,
        });
        return NextResponse.json(
          {
            success: false,
            errorCode: 'ERR_STUDENT_INTERNAL_ERROR',
            messageEnglish: (error as Error).message,
            statusCode: 500,
          },
          { status: 500 },
        );
      }
    },
    { route: '/api/v1/students/[id]' },
  );
}
