import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import type { UserListFilters } from '@ims/identity-access';
import { permissions } from '@ims/shared-auth';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
});

const reportPermissions: Record<string, string> = {
  'user-directory': permissions.report.iam.user,
  'user-access': permissions.report.iam.userAccess,
  'login-history': permissions.report.iam.loginHistory,
  'failed-logins': permissions.report.iam.loginHistory,
  'locked-accounts': permissions.report.iam.security,
  'password-resets': permissions.report.iam.security,
  roles: permissions.report.iam.role,
  'permission-matrix': permissions.report.iam.permission,
  'branch-access': permissions.report.iam.branch,
  'privileged-users': permissions.report.iam.privileged,
  'security-events': permissions.report.iam.security,
  'permission-changes': permissions.report.iam.permission,
  sessions: permissions.report.iam.session,
  'audit-trail': permissions.iam.audit.read,
};

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/report', title, status, detail, errorCode, invalidFields }, { status });
}

function getReportPermission(reportType: string): string | null {
  return reportPermissions[reportType] ?? null;
}

function isPrivilegedRole(roleCode: string): boolean {
  return ['Admin', 'Owner', 'Management', 'CEO'].includes(roleCode);
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    const reportType = params.reportType;
    const requiredPermission = getReportPermission(reportType);
    if (!requiredPermission) {
      return problemJson(404, 'Report not found', 'Requested report is not supported.', 'IAM-SYS-001');
    }

    try {
      const session = await assertPermission(requiredPermission);
      const paramsObj = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        page: paramsObj.get('page') ?? undefined,
        pageSize: paramsObj.get('pageSize') ?? undefined,
        branchId: paramsObj.get('branchId') ?? undefined,
        status: paramsObj.get('status') ?? undefined,
      });

      if (!parsed.success) {
        return problemJson(400, 'Invalid query parameters', 'One or more query parameters are invalid.', 'IAM-VAL-REPORT-INVALID_QUERY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message })));
      }

      const { userService, roleService, permissionService, branchAccessService, sessionService, auditQueryService, loginHistoryQueryService } = await import('../../../../../lib/runtime');

      let data: unknown = { items: [], total: 0 };
      if (reportType === 'user-directory') {
        const filters: UserListFilters = { branchId: parsed.data.branchId, status: parsed.data.status as UserListFilters['status'] };
        data = await userService.searchUsers(filters, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else if (reportType === 'user-access' || reportType === 'branch-access') {
        const filters: UserListFilters = { branchId: parsed.data.branchId, status: parsed.data.status as UserListFilters['status'] };
        const users = await userService.searchUsers(filters, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
        const items = [] as Array<Record<string, unknown>>;
        for (const user of users.items) {
          const branches = await branchAccessService.getUserBranchAccess(user.id, {
            actorId: session.userId,
            actorPermissions: session.permissions,
            activeBranchId: session.activeBranchId,
          });
          items.push({ user, branches });
        }
        data = { items, total: users.total };
      } else if (reportType === 'login-history' || reportType === 'failed-logins') {
        data = await loginHistoryQueryService.listSecurityLoginHistory(
          { branchId: parsed.data.branchId, status: reportType === 'failed-logins' ? 'Failure' : parsed.data.status },
          parsed.data.page,
          parsed.data.pageSize,
          { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId },
        );
      } else if (reportType === 'locked-accounts') {
        data = await userService.searchUsers({ branchId: parsed.data.branchId, status: 'Locked' }, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else if (reportType === 'password-resets') {
        data = await auditQueryService.listAuditLogs({ action: 'iam.user.password-reset-requested', branchId: parsed.data.branchId }, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else if (reportType === 'roles') {
        data = await roleService.listRoles(parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else if (reportType === 'permission-matrix') {
        const items = await permissionService.searchPermissions(parsed.data.status, undefined, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
        data = { items, total: items.length };
      } else if (reportType === 'privileged-users') {
        const filters: UserListFilters = { branchId: parsed.data.branchId, status: parsed.data.status as UserListFilters['status'] };
        const users = await userService.searchUsers(filters, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
        const items = [] as Array<Record<string, unknown>>;
        for (const user of users.items) {
          const roles = await userService.listRolesForUser(user.id);
          if (roles.some((role) => isPrivilegedRole(role.roleCode))) {
            items.push({ user, roles });
          }
        }
        data = { items, total: items.length };
      } else if (reportType === 'security-events') {
        data = await auditQueryService.listAuditLogs({ branchId: parsed.data.branchId, module: 'iam' }, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else if (reportType === 'permission-changes') {
        data = await auditQueryService.listAuditLogs({ branchId: parsed.data.branchId, module: 'iam', entityType: 'Permission' }, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else if (reportType === 'sessions') {
        const filters: UserListFilters = { branchId: parsed.data.branchId, status: parsed.data.status as UserListFilters['status'] };
        const users = await userService.searchUsers(filters, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
        const items = [] as Array<Record<string, unknown>>;
        for (const user of users.items) {
          const sessions = await sessionService.listUserSessions(user.id, {
            actorId: session.userId,
            actorPermissions: session.permissions,
            activeBranchId: session.activeBranchId,
          });
          items.push({ user, sessions });
        }
        data = { items, total: items.length };
      } else if (reportType === 'audit-trail') {
        data = await auditQueryService.listAuditLogs({ branchId: parsed.data.branchId, module: 'iam' }, parsed.data.page, parsed.data.pageSize, {
          actorId: session.userId,
          actorPermissions: session.permissions,
          activeBranchId: session.activeBranchId,
        });
      } else {
        return problemJson(404, 'Report not found', 'Requested report is not supported.', 'IAM-SYS-001');
      }

      const response = NextResponse.json({ data }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: `/api/v1/reports/iam/${reportType}`, method: request.method, status: 'success' });
      logger.info('api.reports.get.succeeded', { status: 'success', reportType });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Report failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Report failed', error.message, error.code.toUpperCase());
      logger.error('api.reports.get.failed', { status: 'failed', error: error as Error, reportType });
      return problemJson(500, 'Report failed', 'Unable to load the report at this time.', 'IAM-REPORT-FAILED');
    }
  });
}
