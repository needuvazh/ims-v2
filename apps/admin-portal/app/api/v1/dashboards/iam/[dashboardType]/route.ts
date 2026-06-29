import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { permissions } from '@ims/shared-auth';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

const dashboardPermissions: Record<string, string> = {
  security: permissions.dashboard.security,
  admin: permissions.dashboard.admin,
  ceo: permissions.dashboard.ceo,
  compliance: permissions.dashboard.compliance,
};

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/dashboard', title, status, detail, errorCode }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    const dashboardType = params.dashboardType;
    const requiredPermission = dashboardPermissions[dashboardType];
    if (!requiredPermission) {
      return problemJson(404, 'Dashboard not found', 'Requested dashboard is not supported.', 'IAM-SYS-001');
    }

    try {
      const session = await assertPermission(requiredPermission);
      const { userService, roleService, permissionService, loginHistoryQueryService, auditQueryService, sessionRepository } = await import('../../../../../lib/runtime');

      const users = await userService.searchUsers({}, 1, 1000, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const roles = await roleService.listRoles(1, 1000, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const permissionsList = await permissionService.searchPermissions(undefined, undefined, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const audit = await auditQueryService.listAuditLogs({ module: 'iam' }, 1, 1, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const loginHistory = await loginHistoryQueryService.listSecurityLoginHistory({ branchId: session.activeBranchId ?? undefined }, 1, 1, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });

      let activeSessions = 0;
      for (const user of users.items.slice(0, 50)) {
        const userSessions = await sessionRepository.listActiveForUser(user.id);
        activeSessions += userSessions.length;
      }

      const data =
        dashboardType === 'security'
          ? {
              loginSuccesses: loginHistory.total,
              lockedAccounts: users.items.filter((user) => user.status === 'Locked').length,
              permissionDenials: audit.total,
              activeSessions,
            }
          : dashboardType === 'admin'
            ? {
                totalUsers: users.total,
                activeUsers: users.items.filter((user) => user.status === 'Active').length,
                totalRoles: roles.total,
                totalPermissions: permissionsList.length,
              }
            : dashboardType === 'ceo'
              ? {
                  totalUsers: users.total,
                  totalRoles: roles.total,
                  auditEvents: audit.total,
                }
              : {
                  auditEvents: audit.total,
                  failedLogins: loginHistory.total,
                };

      const response = NextResponse.json({ data }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: `/api/v1/dashboards/iam/${dashboardType}`, method: request.method, status: 'success' });
      logger.info('api.dashboards.get.succeeded', { status: 'success', dashboardType });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Dashboard failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Dashboard failed', error.message, error.code.toUpperCase());
      logger.error('api.dashboards.get.failed', { status: 'failed', error: error as Error, dashboardType });
      return problemJson(500, 'Dashboard failed', 'Unable to load the dashboard at this time.', 'IAM-DASHBOARD-FAILED');
    }
  });
}
