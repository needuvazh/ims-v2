import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { createUuid } from '@ims/shared-kernel';
import { AttendanceError } from '@ims/attendance';
import {
  attendanceCorrectionRequestSchema,
  attendanceCorrectionReviewSchema,
  attendanceReportFilterSchema,
  bulkMarkAttendanceSchema,
  listAttendanceSessionsSchema,
  openAttendanceSessionSchema,
  reopenAttendanceSessionSchema,
  submitAttendanceSessionSchema,
} from '@ims/attendance';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { attendanceQueryService, attendanceService, branchScopeResolver } from '../../../../../lib/runtime';

const sessionIdSchema = z.object({ sessionId: z.string().uuid() });
const correctionIdSchema = z.object({ correctionId: z.string().uuid() });

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
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

async function resolveAllowedBranchIds(session: { userId: string; activeBranchId: string | null }) {
  const allowed = await branchScopeResolver.resolveAllowedBranches(createUuid(session.userId), session.activeBranchId ? createUuid(session.activeBranchId) : null);
  return allowed.map((value) => String(value));
}

function toAttendanceContext(session: { userId: string; activeBranchId: string | null }, request: Request, allowedBranchIds: string[]) {
  return {
    actorId: session.userId,
    branchId: session.activeBranchId,
    allowedBranchIds,
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip'),
  };
}

function mapAttendanceError(error: unknown, fallbackTitle: string, fallbackCode: string) {
  if (error instanceof AttendanceError) {
    return problemJson(error.statusCode, fallbackTitle, error.message, error.code);
  }
  if (error instanceof DomainError) {
    const status = error.code === 'forbidden' ? 403 : error.code === 'unauthorized' ? 401 : 400;
    return problemJson(status, fallbackTitle, error.message, error.code.toUpperCase());
  }
  return problemJson(500, fallbackTitle, 'Unable to process attendance request at this time.', fallbackCode);
}

async function readJsonBody<T>(request: Request, schema: z.ZodType<T>) {
  const body = await request.json();
  return schema.parse(body);
}

export async function GET(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'attendance.session.read', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
      const { segments } = await context.params;
      const [resource, id, action] = segments;

      try {
        const allowedBranchIds = await resolveAllowedBranchIds(session);

        if (resource === 'sessions') {
          const parsed = listAttendanceSessionsSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
          const branchIds = parsed.branchId ? [parsed.branchId] : allowedBranchIds;
          if (parsed.branchId && !allowedBranchIds.includes(parsed.branchId)) {
            return problemJson(403, 'Attendance list failed', 'Access denied: branch scoping violation.', 'ERR_ATT_SESSION_BRANCH_FORBIDDEN');
          }
          const result = await attendanceQueryService.listSessions({
            branchIds,
            batchId: null,
            sessionId: id ?? null,
            attendanceDateFrom: parsed.attendanceDateFrom ? new Date(`${parsed.attendanceDateFrom}T00:00:00+04:00`) : null,
            attendanceDateTo: parsed.attendanceDateTo ? new Date(`${parsed.attendanceDateTo}T23:59:59+04:00`) : null,
            status: parsed.status ?? null,
            page: parsed.page,
            pageSize: parsed.pageSize,
          });

          const response = NextResponse.json({ success: true, data: result }, { status: 200 });
          applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/attendance/sessions', method: request.method, status: 'success' });
          return response;
        }

        if (resource === 'reports') {
          const parsed = attendanceReportFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
          const branchIds = parsed.branchId ? [parsed.branchId] : allowedBranchIds;
          if (parsed.branchId && !branchIds.includes(parsed.branchId)) {
            return problemJson(403, 'Attendance report failed', 'Access denied: branch scoping violation.', 'ERR_ATT_SESSION_BRANCH_FORBIDDEN');
          }

          const reportType = id ?? 'student-summary';
          if (reportType === 'student-summary') {
            if (!parsed.enrollmentId) return problemJson(400, 'Attendance report failed', 'enrollmentId is required.', 'ERR_ATT_INVALID_REPORT_FILTER');
            const summary = await attendanceQueryService.enrollmentSummary(parsed.enrollmentId, toAttendanceContext(session, request, allowedBranchIds));
            return NextResponse.json({ success: true, data: summary }, { status: 200 });
          }

          if (reportType === 'batch-summary') {
            if (!parsed.batchId) return problemJson(400, 'Attendance report failed', 'batchId is required.', 'ERR_ATT_INVALID_REPORT_FILTER');
            const summary = await attendanceQueryService.batchSummary(parsed.batchId, branchIds);
            return NextResponse.json({ success: true, data: summary }, { status: 200 });
          }

          if (reportType === 'low-attendance') {
            if (!parsed.branchId && branchIds.length === 0) {
              return problemJson(400, 'Attendance report failed', 'branchId is required.', 'ERR_ATT_INVALID_REPORT_FILTER');
            }
            const summary = await attendanceQueryService.branchSummary(parsed.branchId ?? branchIds[0], branchIds);
            return NextResponse.json({ success: true, data: summary }, { status: 200 });
          }

          if (reportType === 'trainer-workload') {
            const searchParams = new URL(request.url).searchParams;
            const page = Number(searchParams.get('page') ?? '1');
            const pageSize = Number(searchParams.get('pageSize') ?? '20');
            const result = await attendanceQueryService.trainerWorkload(branchIds, page, pageSize);
            return NextResponse.json({ success: true, data: result }, { status: 200 });
          }

          return problemJson(404, 'Attendance report failed', 'Requested report was not found.', 'ERR_ATT_REPORT_NOT_FOUND');
        }

        if (resource === 'corrections') {
          const result = await attendanceService.detectLowAttendance(allowedBranchIds[0], toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        }

        return problemJson(404, 'Attendance resource not found', 'Requested attendance resource was not found.', 'ERR_ATT_RESOURCE_NOT_FOUND');
      } catch (error) {
        logger.error('api.attendance.get.failed', { status: 'failed', error: error as Error });
        return mapAttendanceError(error, 'Attendance request failed', 'ERR_ATT_INTERNAL_ERROR');
      }
    }),
    { route: '/api/v1/attendance/[...segments]' },
  );
}

export async function POST(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  return withRouteObservability(request.headers, async () => {
    const { segments } = await context.params;
    const [resource, id, action] = segments;

    if (resource === 'sessions' && !id) {
      return withPermission(request, 'attendance.session.open', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const parsed = openAttendanceSessionSchema.parse(await request.json());
          const result = await attendanceService.openSession(parsed, toAttendanceContext(session, request, allowedBranchIds));
          const response = NextResponse.json({ success: true, data: result }, { status: 201 });
          applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/attendance/sessions', method: request.method, status: 'success' });
          return response;
        } catch (error) {
          logger.error('api.attendance.sessions.open.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance session opening failed', 'ERR_ATT_SESSION_OPEN_FAILED');
        }
      });
    }

    if (resource === 'sessions' && id && action === 'roster') {
      return withPermission(request, 'attendance.session.open', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const result = await attendanceService.generateRoster(id, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.sessions.roster.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance roster generation failed', 'ERR_ATT_ROSTER_FAILED');
        }
      });
    }

    if (resource === 'sessions' && id && action === 'mark') {
      return withPermission(request, 'attendance.record.mark', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const parsed = bulkMarkAttendanceSchema.parse(await request.json());
          const result = await attendanceService.saveDraft(id, parsed, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.sessions.mark.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance marking failed', 'ERR_ATT_MARK_FAILED');
        }
      });
    }

    if (resource === 'sessions' && id && action === 'submit') {
      return withPermission(request, 'attendance.session.submit', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const parsed = submitAttendanceSessionSchema.parse(await request.json().catch(() => ({})));
          const result = await attendanceService.submit(id, parsed, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.sessions.submit.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance submit failed', 'ERR_ATT_SUBMIT_FAILED');
        }
      });
    }

    if (resource === 'sessions' && id && action === 'lock') {
      return withPermission(request, 'attendance.session.lock', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const result = await attendanceService.lock(id, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.sessions.lock.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance lock failed', 'ERR_ATT_LOCK_FAILED');
        }
      });
    }

    if (resource === 'sessions' && id && action === 'reopen') {
      return withPermission(request, 'attendance.session.reopen', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const parsed = reopenAttendanceSessionSchema.parse(await request.json());
          const result = await attendanceService.reopen(id, parsed, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.sessions.reopen.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance reopen failed', 'ERR_ATT_REOPEN_FAILED');
        }
      });
    }

    if (resource === 'corrections' && !id) {
      return withPermission(request, 'attendance.correction.request', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const parsed = attendanceCorrectionRequestSchema.parse(await request.json());
          const result = await attendanceService.requestCorrection(parsed, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 201 });
        } catch (error) {
          logger.error('api.attendance.corrections.request.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance correction request failed', 'ERR_ATT_CORRECTION_REQUEST_FAILED');
        }
      });
    }

    if (resource === 'corrections' && id && action === 'approve') {
      return withPermission(request, 'attendance.correction.approve', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const result = await attendanceService.approveCorrection(id, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.corrections.approve.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance correction approval failed', 'ERR_ATT_CORRECTION_APPROVE_FAILED');
        }
      });
    }

    if (resource === 'corrections' && id && action === 'reject') {
      return withPermission(request, 'attendance.correction.reject', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const parsed = attendanceCorrectionReviewSchema.parse(await request.json().catch(() => ({})));
          const result = await attendanceService.rejectCorrection(id, parsed.reason ?? null, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.corrections.reject.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance correction rejection failed', 'ERR_ATT_CORRECTION_REJECT_FAILED');
        }
      });
    }

    if (resource === 'corrections' && id && action === 'cancel') {
      return withPermission(request, 'attendance.correction.request', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        try {
          const allowedBranchIds = await resolveAllowedBranchIds(session);
          const result = await attendanceService.cancelCorrection(id, toAttendanceContext(session, request, allowedBranchIds));
          return NextResponse.json({ success: true, data: result }, { status: 200 });
        } catch (error) {
          logger.error('api.attendance.corrections.cancel.failed', { status: 'failed', error: error as Error });
          return mapAttendanceError(error, 'Attendance correction cancellation failed', 'ERR_ATT_CORRECTION_CANCEL_FAILED');
        }
      });
    }

    return problemJson(404, 'Attendance route not found', 'Requested attendance route was not found.', 'ERR_ATT_ROUTE_NOT_FOUND');
  }, { route: '/api/v1/attendance/[...segments]' });
}
