import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission, withAuth } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import { hasPermission } from '@ims/shared-auth';
import { createUuid } from '@ims/shared-kernel';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().default(''),
  branchId: z.string().uuid().optional(),
  admissionStatus: z.string().trim().optional(),
  studentStatus: z.string().trim().optional(),
  sortBy: z
    .enum(['studentNumber', 'fullName', 'status', 'joinedAt', 'branch'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const createStudentSchema = z.object({
  branchId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  mobile: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(255).optional().nullable(),
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
});

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'student.read', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const params = new URL(request.url).searchParams;
          const parsed = querySchema.safeParse({
            page: params.get('page') ?? undefined,
            limit: params.get('limit') ?? undefined,
            search: params.get('search') ?? undefined,
            branchId: params.get('branchId') ?? undefined,
            admissionStatus: params.get('admissionStatus') ?? undefined,
            studentStatus: params.get('studentStatus') ?? undefined,
            sortBy: params.get('sortBy') ?? undefined,
            sortOrder: params.get('sortOrder') ?? undefined,
          });

          if (!parsed.success) {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'ERR_VAL_FAILED',
                messageEnglish: 'Invalid query parameters.',
                statusCode: 400,
              },
              { status: 400 },
            );
          }

          const { branchScopeResolver, studentQueryService } =
            await import('../../../../lib/runtime');

          // Resolve branch scope for active user
          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              createUuid(session.userId),
              session.activeBranchId
                ? createUuid(session.activeBranchId)
                : null,
            );

          const result = await studentQueryService.searchBranchScopedStudents(
            parsed.data.search,
            allowedBranches as string[],
            {
              page: parsed.data.page,
              limit: parsed.data.limit,
              branchId: parsed.data.branchId,
              admissionStatus: parsed.data.admissionStatus,
              studentStatus: parsed.data.studentStatus,
              sortBy: parsed.data.sortBy,
              sortOrder: parsed.data.sortOrder,
            },
          );

          const response = NextResponse.json(
            {
              success: true,
              data: {
                students: result.items,
                pagination: {
                  total: result.total,
                  page: parsed.data.page,
                  limit: parsed.data.limit,
                  pages: Math.ceil(result.total / parsed.data.limit),
                },
              },
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/students',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.students.list.failed', {
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
      }),
    { route: '/api/v1/students' },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const { session } = await withAuth(request);
        if (
          !hasPermission(session, 'student.create') &&
          !hasPermission(session, 'student.write')
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_PERMISSION_DENIED',
              messageEnglish: 'Missing student.create permission.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        const payload = await request.json();
        const parsed = createStudentSchema.safeParse(payload);
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
          await import('../../../../lib/runtime');
        const allowedBranches =
          await branchScopeResolver.resolveAllowedBranches(
            createUuid(session.userId),
            session.activeBranchId ? createUuid(session.activeBranchId) : null,
          );
        if (
          !allowedBranches.some((branchId) => branchId === parsed.data.branchId)
        ) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_AUTH_BRANCH_SCOPE_DENIED',
              messageEnglish: 'Target branch is outside your allowed scope.',
              statusCode: 403,
            },
            { status: 403 },
          );
        }

        const identityConflict = await prisma.person.findFirst({
          where: {
            OR: [
              { mobile: parsed.data.mobile, isDeleted: false },
              ...(parsed.data.email
                ? [{ email: parsed.data.email, isDeleted: false }]
                : []),
              ...(parsed.data.nationalId
                ? [{ nationalId: parsed.data.nationalId, isDeleted: false }]
                : []),
              ...(parsed.data.passportNumber
                ? [
                    {
                      passportNumber: parsed.data.passportNumber,
                      isDeleted: false,
                    },
                  ]
                : []),
              ...(parsed.data.visaNumber
                ? [{ visaNumber: parsed.data.visaNumber, isDeleted: false }]
                : []),
            ],
          },
          select: { id: true },
        });

        if (identityConflict) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STU_IDENTITY_CONFLICT',
              messageEnglish:
                'A matching person already exists. Please use duplicate resolution or admission linkage.',
              statusCode: 409,
            },
            { status: 409 },
          );
        }

        const seqResult = await prisma.$queryRawUnsafe<{ nextval: string }[]>(
          "SELECT nextval('student_number_seq')::text as nextval",
        );
        const seq =
          seqResult[0]?.nextval ??
          Math.floor(Math.random() * 100000).toString();
        const studentNumber = `STU-2026-${seq.padStart(5, '0')}`;

        const created = await prisma.$transaction(async (tx) => {
          const person = await tx.person.create({
            data: {
              firstName: parsed.data.firstName,
              lastName: parsed.data.lastName,
              mobile: parsed.data.mobile,
              email: parsed.data.email || null,
              nationalId: parsed.data.nationalId || null,
              passportNumber: parsed.data.passportNumber || null,
              visaNumber: parsed.data.visaNumber || null,
              nationality: parsed.data.nationality || null,
              dateOfBirth: parsed.data.dateOfBirth
                ? new Date(parsed.data.dateOfBirth)
                : null,
              gender: parsed.data.gender || null,
              createdBy: session.userId,
              updatedBy: session.userId,
            },
          });

          const student = await tx.studentProfile.create({
            data: {
              personId: person.id,
              studentNumber,
              branchId: parsed.data.branchId,
              studentStatus: 'Active',
              joinedAt: new Date(),
              creationSource: 'DirectRegistration',
              remarks: parsed.data.remarks || null,
              status: 'Active',
              createdBy: session.userId,
              updatedBy: session.userId,
            },
          });

          await tx.studentStatusHistory.create({
            data: {
              studentProfileId: student.id,
              branchId: parsed.data.branchId,
              oldStatus: 'Pending',
              newStatus: 'Active',
              changeReason: 'Direct registration default activation',
              effectiveStartDate: new Date(),
              requestedBy: session.userId,
              status: 'Active',
              createdBy: session.userId,
              updatedBy: session.userId,
            },
          });

          await tx.auditLog.create({
            data: {
              action: 'StudentCreated',
              entityType: 'StudentProfile',
              entityId: student.id,
              performedBy: session.userId,
              branchId: parsed.data.branchId,
              performedAt: new Date(),
              module: 'AdmissionsEnrollment',
              newValue: {
                studentNumber,
                status: 'Active',
                creationSource: 'DirectRegistration',
              },
            },
          });

          return { person, student };
        });

        const response = NextResponse.json(
          {
            success: true,
            data: {
              studentId: created.student.id,
              studentNumber: created.student.studentNumber,
              personId: created.person.id,
              branchId: parsed.data.branchId,
            },
          },
          { status: 201 },
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/students',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.students.create.failed', {
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
    { route: '/api/v1/students' },
  );
}
