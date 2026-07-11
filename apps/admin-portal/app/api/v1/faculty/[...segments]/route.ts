import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError, createUuid } from '@ims/shared-kernel';
import { withAuth, errorHandler } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
} from '../../../../lib/observability';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().min(1).optional(),
  branchId: z.string().uuid().optional(),
  trainerType: z.enum(['FullTime', 'PartTime', 'Freelance']).optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended']).optional(),
  specialization: z.string().trim().min(1).optional(),
  effectiveOn: z.coerce.date().optional(),
  courseId: z.string().uuid().optional(),
  reportCode: z.string().trim().min(1).optional(),
  kind: z.enum(['Batch', 'Session', 'All']).optional(),
  targetDate: z.coerce.date().optional(),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  sessionId: z.string().uuid().optional(),
});

const trainerUpsertSchema = z.object({
  personId: z.string().uuid(),
  branchId: z.string().uuid(),
  trainerCode: z.string().trim().min(3).max(50),
  trainerType: z.enum(['FullTime', 'PartTime', 'Freelance']),
  specialization: z.string().trim().min(3).max(500),
  qualificationSummary: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Suspended']),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  version: z.coerce.number().int().optional(),
});
const trainerUpdateSchema = trainerUpsertSchema.partial().extend({
  version: z.coerce.number().int(),
});

const statusTransitionSchema = z.object({
  toStatus: z.enum(['Active', 'Inactive', 'Suspended']),
  effectiveAt: z.coerce.date(),
  reason: z.string().trim().min(1).max(500),
  version: z.coerce.number().int(),
});

const qualificationSchema = z.object({
  qualificationName: z.string().trim().min(2).max(200),
  institution: z.string().trim().min(2).max(200),
  yearCompleted: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  documentId: z.string().uuid().optional().nullable(),
  status: z.enum(['Active', 'Inactive']),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  version: z.coerce.number().int().optional(),
});

const availabilitySchema = z.object({
  branchId: z.string().uuid(),
  dayOfWeek: z.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]).optional(),
  daysOfWeek: z.array(
    z.enum([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ])
  ).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  status: z.enum(['Active', 'Inactive']),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  version: z.coerce.number().int().optional(),
});

const authorizationSchema = z.object({
  courseId: z.string().uuid().optional(),
  courseIds: z.array(z.string().uuid()).optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended', 'Expired']),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  reason: z.string().trim().max(4000).optional().nullable(),
  version: z.coerce.number().int().optional(),
});

const compensationSchema = z.object({
  batchId: z.string().uuid().optional().nullable(),
  sessionId: z.string().uuid().optional().nullable(),
  paymentBasis: z.enum(['PerHour', 'PerSession', 'PerStudent', 'Fixed']),
  amount: z.string().trim().min(1),
  currency: z.string().trim().min(3).max(10),
  status: z.enum(['Active', 'Inactive']),
  remarks: z.string().trim().max(4000).optional().nullable(),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional().nullable(),
  version: z.coerce.number().int().optional(),
});

function problem(
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

async function readPayload(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json();
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }

  return request
    .json()
    .catch(async () =>
      Object.fromEntries((await request.formData()).entries()),
    );
}

function parseQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  return listQuerySchema.parse({
    page: params.get('page') ?? undefined,
    pageSize: params.get('pageSize') ?? undefined,
    q: params.get('q') ?? undefined,
    branchId: params.get('branchId') ?? undefined,
    trainerType: params.get('trainerType') ?? undefined,
    status: params.get('status') ?? undefined,
    specialization: params.get('specialization') ?? undefined,
    effectiveOn: params.get('effectiveOn') ?? undefined,
    courseId: params.get('courseId') ?? undefined,
    reportCode: params.get('reportCode') ?? undefined,
    kind: params.get('kind') ?? undefined,
    targetDate: params.get('targetDate') ?? undefined,
    startTime: params.get('startTime') ?? undefined,
    endTime: params.get('endTime') ?? undefined,
  });
}

async function ensureBranchAccess(
  session: { userId: string; activeBranchId: string | null },
  branchId: string,
) {
  const { branchScopeResolver } = await import('../../../../lib/runtime');
  const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
    createUuid(session.userId),
    session.activeBranchId ? createUuid(session.activeBranchId) : null,
  );
  if (!allowedBranches.includes(branchId as any)) {
    throw new DomainError(
      'branch_scope_violation',
      'Access denied: branch is outside allowed scope.',
    );
  }
}

async function requirePermission(
  session: {
    userId: string;
    activeBranchId: string | null;
    permissions: string[];
  },
  permission: string,
) {
  const { authorizationGuard } = await import('../../../../lib/runtime');
  await authorizationGuard.verifyPermission(
    createUuid(session.userId),
    permission,
    session.activeBranchId ? createUuid(session.activeBranchId) : null,
  );
}

async function buildTrainerAuthContext(session: {
  userId: string;
  activeBranchId: string | null;
  permissions: string[];
}) {
  const { branchScopeResolver } = await import('../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    createUuid(session.userId),
    session.activeBranchId ? createUuid(session.activeBranchId) : null,
  );
  return {
    actorId: session.userId,
    branchId: session.activeBranchId,
    permissions: session.permissions,
    allowedBranchIds,
  };
}

function success(
  data: Record<string, unknown>,
  request: Request,
  route: string,
  status = 200,
) {
  const response = NextResponse.json({ success: true, data }, { status });
  applyObservabilityResponseHeaders(response.headers, request.headers, {
    route,
    method: request.method,
    status: 'success',
  });
  return response;
}

async function handleTrainerCollection(
  request: Request,
  session: {
    userId: string;
    activeBranchId: string | null;
    permissions: string[];
  },
) {
  const { trainerManagementService } = await import('../../../../lib/runtime');
  const authContext = await buildTrainerAuthContext(session);
  if (request.method === 'GET') {
    await requirePermission(session, 'trainer.read');
    const query = parseQuery(request);
    const result = await trainerManagementService.listTrainers(
      {
        q: query.q,
        branchId: query.branchId,
        trainerType: query.trainerType,
        status: query.status,
        specialization: query.specialization,
        effectiveOn: query.effectiveOn,
        courseId: query.courseId,
      },
      { page: query.page, pageSize: query.pageSize },
      authContext,
    );
    return success(
      {
        items: result.items,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      },
      request,
      '/api/v1/faculty/trainers',
    );
  }

  if (request.method === 'POST') {
    await requirePermission(session, 'trainer.create');
    const payload = trainerUpsertSchema.parse(await readPayload(request));
    await ensureBranchAccess(session, payload.branchId);
    const trainer = await trainerManagementService.createTrainerProfile(
      payload,
      authContext,
    );
    return success({ trainer }, request, '/api/v1/faculty/trainers', 201);
  }

  return problem(
    405,
    'Method not allowed',
    'Unsupported method for trainer collection.',
    'FACULTY-405',
  );
}

async function handleTrainerResource(
  request: Request,
  session: {
    userId: string;
    activeBranchId: string | null;
    permissions: string[];
  },
  trainerId: string,
  tail: string[],
) {
  const { trainerManagementService } = await import('../../../../lib/runtime');
  const authContext = await buildTrainerAuthContext(session);
  if (tail.length === 0) {
    if (request.method === 'GET') {
      await requirePermission(session, 'trainer.read');
      const trainer = await trainerManagementService.getTrainer(
        trainerId,
        authContext,
      );
      return success(
        { trainer },
        request,
        `/api/v1/faculty/trainers/${trainerId}`,
      );
    }

    if (request.method === 'PATCH' || request.method === 'POST') {
      const payload = trainerUpdateSchema.parse(await readPayload(request));
      await requirePermission(session, 'trainer.update');
      if (payload.branchId) {
        await ensureBranchAccess(session, payload.branchId);
      }
      const trainer = await trainerManagementService.updateTrainerProfile(
        trainerId,
        payload,
        authContext,
      );
      return success(
        { trainer },
        request,
        `/api/v1/faculty/trainers/${trainerId}`,
      );
    }
  }

  if (tail[0] === 'status' && request.method === 'POST') {
    const payload = statusTransitionSchema.parse(await readPayload(request));
    await requirePermission(session, 'trainer.status.manage');
    const trainer = await trainerManagementService.transitionTrainerStatus(
      trainerId,
      payload,
      authContext,
    );
    return success(
      { trainer },
      request,
      `/api/v1/faculty/trainers/${trainerId}/status`,
    );
  }

  if (tail[0] === 'qualifications') {
    if (request.method === 'GET') {
      await requirePermission(session, 'trainer.qualification.read');
      const query = parseQuery(request);
      const result = await trainerManagementService.listQualifications(
        trainerId,
        { page: query.page, pageSize: query.pageSize },
        authContext,
      );
      return success(
        { items: result.items, total: result.total },
        request,
        `/api/v1/faculty/trainers/${trainerId}/qualifications`,
      );
    }
    if (request.method === 'POST') {
      await requirePermission(session, 'trainer.qualification.manage');
      const payload = qualificationSchema.parse(await readPayload(request));
      const qualification = await trainerManagementService.createQualification(
        trainerId,
        payload,
        authContext,
      );
      return success(
        { qualification },
        request,
        `/api/v1/faculty/trainers/${trainerId}/qualifications`,
        201,
      );
    }
    if (tail.length === 2 && request.method === 'PATCH') {
      await requirePermission(session, 'trainer.qualification.manage');
      const payload = qualificationSchema
        .partial()
        .extend({ version: z.coerce.number().int() })
        .parse(await readPayload(request));
      const qualification = await trainerManagementService.updateQualification(
        trainerId,
        tail[1],
        payload,
        authContext,
      );
      return success(
        { qualification },
        request,
        `/api/v1/faculty/trainers/${trainerId}/qualifications/${tail[1]}`,
      );
    }
  }

  if (tail[0] === 'availability') {
    if (request.method === 'GET') {
      await requirePermission(session, 'trainer.availability.read');
      const query = parseQuery(request);
      const result = await trainerManagementService.listAvailability(
        trainerId,
        { page: query.page, pageSize: query.pageSize },
        authContext,
      );
      return success(
        { items: result.items, total: result.total },
        request,
        `/api/v1/faculty/trainers/${trainerId}/availability`,
      );
    }
    if (request.method === 'POST') {
      await requirePermission(session, 'trainer.availability.manage');
      const payload = availabilitySchema.parse(await readPayload(request));
      await ensureBranchAccess(session, payload.branchId);

      const days = payload.daysOfWeek && payload.daysOfWeek.length > 0
        ? payload.daysOfWeek
        : payload.dayOfWeek
          ? [payload.dayOfWeek]
          : [];

      if (days.length === 0) {
        throw new DomainError('invalid_value', 'At least one day of week must be selected.');
      }

      const results = [];
      for (const day of days) {
        const availability = await trainerManagementService.createAvailability(
          trainerId,
          {
            branchId: payload.branchId,
            dayOfWeek: day,
            startTime: payload.startTime,
            endTime: payload.endTime,
            status: payload.status,
            effectiveStartDate: payload.effectiveStartDate,
            effectiveEndDate: payload.effectiveEndDate,
          },
          authContext,
        );
        results.push(availability);
      }

      return success(
        { availability: results[0], availabilities: results },
        request,
        `/api/v1/faculty/trainers/${trainerId}/availability`,
        201,
      );
    }
    if (tail.length === 2 && request.method === 'PATCH') {
      await requirePermission(session, 'trainer.availability.manage');
      const payload = availabilitySchema
        .partial()
        .extend({ version: z.coerce.number().int() })
        .parse(await readPayload(request));
      if (payload.branchId) {
        await ensureBranchAccess(session, payload.branchId);
      }
      const availability = await trainerManagementService.updateAvailability(
        trainerId,
        tail[1],
        payload,
        authContext,
      );
      return success(
        { availability },
        request,
        `/api/v1/faculty/trainers/${trainerId}/availability/${tail[1]}`,
      );
    }
    if (tail.length === 2 && request.method === 'DELETE') {
      await requirePermission(session, 'trainer.availability.manage');
      const payload = z
        .object({
          reason: z.string().trim().min(1),
          version: z.coerce.number().int(),
        })
        .parse(await readPayload(request));
      await trainerManagementService.deleteAvailability(
        trainerId,
        tail[1],
        payload.reason,
        payload.version,
        authContext,
      );
      return success(
        { deleted: true },
        request,
        `/api/v1/faculty/trainers/${trainerId}/availability/${tail[1]}`,
      );
    }
  }

  if (tail[0] === 'authorizations') {
    if (request.method === 'GET') {
      await requirePermission(session, 'trainer.authorization.read');
      const query = parseQuery(request);
      const result = await trainerManagementService.listAuthorizations(
        trainerId,
        { page: query.page, pageSize: query.pageSize },
        authContext,
      );
      return success(
        { items: result.items, total: result.total },
        request,
        `/api/v1/faculty/trainers/${trainerId}/authorizations`,
      );
    }
    if (request.method === 'POST') {
      await requirePermission(session, 'trainer.authorization.manage');
      const payload = authorizationSchema.parse(await readPayload(request));

      const courses = payload.courseIds && payload.courseIds.length > 0
        ? payload.courseIds
        : payload.courseId
          ? [payload.courseId]
          : [];

      if (courses.length === 0) {
        throw new DomainError('invalid_value', 'At least one course must be selected.');
      }

      const results = [];
      for (const id of courses) {
        const authorization = await trainerManagementService.createAuthorization(
          trainerId,
          {
            courseId: id,
            status: payload.status,
            effectiveStartDate: payload.effectiveStartDate,
            effectiveEndDate: payload.effectiveEndDate,
            reason: payload.reason,
          },
          authContext,
        );
        results.push(authorization);
      }

      return success(
        { authorization: results[0], authorizations: results },
        request,
        `/api/v1/faculty/trainers/${trainerId}/authorizations`,
        201,
      );
    }
    if (tail.length === 2 && request.method === 'PATCH') {
      await requirePermission(session, 'trainer.authorization.manage');
      const payload = authorizationSchema
        .partial()
        .extend({ version: z.coerce.number().int() })
        .parse(await readPayload(request));
      const authorization =
        await trainerManagementService.transitionAuthorization(
          trainerId,
          tail[1],
          {
            toStatus: payload.status ?? 'Active',
            effectiveAt: payload.effectiveStartDate ?? new Date(),
            reason: payload.reason ?? '',
            version: payload.version,
          },
          authContext,
        );
      return success(
        { authorization },
        request,
        `/api/v1/faculty/trainers/${trainerId}/authorizations/${tail[1]}`,
      );
    }
  }

  if (tail[0] === 'compensation') {
    if (request.method === 'GET') {
      await requirePermission(session, 'trainer.compensation.read');
      const query = parseQuery(request);
      if (query.startTime && query.endTime) {
        const rate = await trainerManagementService.resolveCompensationRate(
          {
            trainerId,
            paymentBasis: 'PerHour',
            effectiveOn: query.targetDate ?? new Date(),
          },
          authContext,
        );
        return success(
          { rate },
          request,
          `/api/v1/faculty/trainers/${trainerId}/compensation`,
        );
      }
      const result = await trainerManagementService.listCompensationRates(
        trainerId,
        { page: query.page, pageSize: query.pageSize },
        authContext,
      );
      return success(
        { items: result.items, total: result.total },
        request,
        `/api/v1/faculty/trainers/${trainerId}/compensation`,
      );
    }
    if (request.method === 'POST') {
      await requirePermission(session, 'trainer.compensation.manage');
      const payload = compensationSchema.parse(await readPayload(request));
      const compensation =
        await trainerManagementService.createCompensationRate(
          trainerId,
          payload,
          authContext,
        );
      return success(
        { compensation },
        request,
        `/api/v1/faculty/trainers/${trainerId}/compensation`,
        201,
      );
    }
  }

  if (tail[0] === 'assignments' && request.method === 'GET') {
    await requirePermission(session, 'trainer.read');
    const query = parseQuery(request);
    const result = await trainerManagementService.listAssignmentReferences(
      trainerId,
      { page: query.page, pageSize: query.pageSize, kind: query.kind },
      authContext,
    );
    return success(
      { items: result.items, total: result.total },
      request,
      `/api/v1/faculty/trainers/${trainerId}/assignments`,
    );
  }

  if (tail[0] === 'audit-history' && request.method === 'GET') {
    await requirePermission(session, 'trainer.audit.read');
    const query = parseQuery(request);
    const result = await trainerManagementService.listAuditHistory(
      trainerId,
      { page: query.page, pageSize: query.pageSize },
      authContext,
    );
    return success(
      { items: result.items, total: result.total },
      request,
      `/api/v1/faculty/trainers/${trainerId}/audit-history`,
    );
  }

  return problem(
    404,
    'Not found',
    'The requested trainer resource was not found.',
    'FACULTY-404',
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  return withRouteObservability(
    request.headers,
    async () => {
      try {
        const { session } = await withAuth(request);
        const segments = (await params).segments ?? [];

        if (segments.length === 1 && segments[0] === 'eligible-trainers') {
          await requirePermission(session, 'trainer.eligibility.read');
          const query = parseQuery(request);
          const { trainerManagementService } =
            await import('../../../../lib/runtime');
          const authContext = await buildTrainerAuthContext(session);
          const result = await trainerManagementService.findEligibleTrainers(
            {
              courseId: query.courseId ?? '',
              branchId: query.branchId ?? session.activeBranchId ?? '',
              targetDate: query.targetDate ?? new Date(),
              startTime: query.startTime,
              endTime: query.endTime,
              trainerType: query.trainerType,
              q: query.q,
              sessionId: query.sessionId,
            },
            { page: query.page, pageSize: query.pageSize },
            authContext,
          );
          return success(
            { items: result.items, total: result.total },
            request,
            '/api/v1/faculty/eligible-trainers',
          );
        }

        if (segments.length === 1 && segments[0] === 'reports') {
          await requirePermission(session, 'trainer.report.view');
          const query = parseQuery(request);
          const { trainerManagementService } =
            await import('../../../../lib/runtime');
          const authContext = await buildTrainerAuthContext(session);
          const result = await trainerManagementService.listReports(
            query.reportCode ?? 'trainer.roster',
            {
              branchId: query.branchId,
              trainerType: query.trainerType,
              status: query.status,
            },
            { page: query.page, pageSize: query.pageSize },
            authContext,
          );
          return success(
            { items: result.items, total: result.total },
            request,
            '/api/v1/faculty/reports',
          );
        }

        if (segments[0] === 'trainers' && segments.length === 1) {
          return handleTrainerCollection(request, session);
        }

        if (segments[0] === 'trainers' && segments.length >= 2) {
          return handleTrainerResource(
            request,
            session,
            segments[1],
            segments.slice(2),
          );
        }

        return problem(
          404,
          'Not found',
          'The requested faculty endpoint was not found.',
          'FACULTY-404',
        );
      } catch (error) {
        if (error instanceof DomainError) {
          const status =
            error.code === 'unauthorized'
              ? 401
              : error.code === 'forbidden' ||
                  error.code === 'branch_scope_violation'
                ? 403
                : error.code === 'not_found'
                  ? 404
                  : error.code === 'conflict'
                    ? 409
                    : error.code === 'precondition_failed'
                      ? 412
                      : 400;
          return problem(
            status,
            'Faculty request failed',
            error.message,
            error.code.toUpperCase(),
          );
        }
        return errorHandler(error, {
          title: 'Faculty request failed',
          detail: 'Unable to process the faculty request at this time.',
          errorCode: 'FACULTY-500',
        });
      }
    },
    { route: '/api/v1/faculty' },
  );
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  return GET(request, ctx);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  return GET(request, ctx);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  return GET(request, ctx);
}
