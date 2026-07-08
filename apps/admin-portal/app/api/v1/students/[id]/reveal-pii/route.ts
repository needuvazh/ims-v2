import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { createUuid } from '@ims/shared-kernel';
import { prisma } from '@ims/database';
import { randomUUID } from 'crypto';
import { hasPermission } from '@ims/shared-auth';

const RevealRequestSchema = z.object({
  field: z.enum(['email', 'phone', 'nationalId']),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters long'),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: studentId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { session } = await withAuth(request);
        if (
          !hasPermission(session, 'student.read') ||
          (!hasPermission(session, 'student.reveal_pii') &&
            !hasPermission(session, 'student.identity.unmasked.read'))
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_PERMISSION_DENIED',
              messageEnglish:
                'Missing student.identity.unmasked.read permission.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        const body = await request.json();
        const parsed = RevealRequestSchema.safeParse(body);

        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_FAILED',
              messageEnglish:
                'Invalid reveal parameters. Reason must be at least 5 chars.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const { branchScopeResolver } =
          await import('../../../../../../lib/runtime');

        const allowedBranches =
          await branchScopeResolver.resolveAllowedBranches(
            createUuid(session.userId),
            session.activeBranchId ? createUuid(session.activeBranchId) : null,
          );

        // Retrieve student with person details
        const student = await prisma.studentProfile.findUnique({
          where: { id: studentId },
          include: { person: true },
        });

        if (!student || student.isDeleted) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STUDENT_NOT_FOUND',
              messageEnglish: 'Student record not found.',
              statusCode: 404,
            },
            { status: 404 },
          );
        }

        if (
          !allowedBranches.some((branchId) => branchId === student.branchId)
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_BRANCH_DENIED',
              messageEnglish:
                'Student record is outside your allowed branch scope.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        let value = '';
        if (parsed.data.field === 'email') {
          value = student.person.email || '';
        } else if (parsed.data.field === 'phone') {
          value = student.person.mobile || '';
        } else if (parsed.data.field === 'nationalId') {
          value = student.person.nationalId || '';
        }

        // Write compliant Audit Log entry
        await prisma.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'AdmissionsEnrollment',
            performedBy: session.userId,
            performedAt: new Date(),
            entityType: 'StudentProfile',
            entityId: studentId,
            action: 'RevealPII',
            reason: parsed.data.reason,
            newValue: { field: parsed.data.field }, // log field only, not unmasked value
            branchId: student.branchId,
          },
        });

        const response = NextResponse.json(
          {
            success: true,
            data: {
              studentProfileId: studentId,
              field: parsed.data.field,
              value,
              revealedAt: new Date(),
            },
          },
          { status: 200 },
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/students/[id]/reveal-pii',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.students.reveal-pii.failed', {
          status: 'failed',
          error: error as Error,
        });

        let status = 500;
        let code = 'ERR_STUDENT_INTERNAL_ERROR';

        if ((error as Error).message === 'ERR_AUTH_BRANCH_DENIED') {
          status = 403;
          code = 'ERR_AUTH_BRANCH_DENIED';
        } else if ((error as Error).message === 'ERR_STU_PROFILE_INACTIVE') {
          status = 422;
          code = 'ERR_STU_PROFILE_INACTIVE';
        } else if (
          (error as Error).message === 'ERR_STUDENT_PROFILE_NOT_FOUND' ||
          (error as Error).message === 'ERR_STUDENT_NOT_FOUND'
        ) {
          status = 404;
          code = 'ERR_STUDENT_PROFILE_NOT_FOUND';
        }

        return NextResponse.json(
          {
            success: false,
            errorCode: code,
            messageEnglish: (error as Error).message,
            statusCode: status,
          },
          { status },
        );
      }
    },
    { route: '/api/v1/students/[id]/reveal-pii' },
  );
}
