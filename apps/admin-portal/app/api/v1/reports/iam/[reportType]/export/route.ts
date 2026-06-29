import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { permissions } from '@ims/shared-auth';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

const exportSchema = z.object({
  format: z.enum(['CSV', 'XLSX', 'PDF']).default('CSV'),
  filters: z.record(z.any()).default({}),
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
  return NextResponse.json({ type: 'https://ims.local/problems/report-export', title, status, detail, errorCode, invalidFields }, { status });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    const reportType = params.reportType;
    const requiredPermission = reportPermissions[reportType];
    if (!requiredPermission) {
      return problemJson(404, 'Report not found', 'Requested report is not supported.', 'IAM-SYS-001');
    }

    let payload: unknown;
    try { payload = await request.json(); } catch { payload = {}; }
    const parsed = exportSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Export request is invalid.', 'IAM-VAL-REPORT-EXPORT-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission(requiredPermission);
      const { exportJobRepository } = await import('../../../../../../lib/runtime');
      const job = await exportJobRepository.create({
        id: crypto.randomUUID() as Uuid,
        reportType,
        requestedBy: session.userId,
        branchId: session.activeBranchId,
        filters: parsed.data.filters,
        format: parsed.data.format,
        status: 'Pending',
        fileUrl: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = NextResponse.json({ data: { job } }, { status: 202 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: `/api/v1/reports/iam/${reportType}/export`, method: request.method, status: 'success' });
      logger.info('api.reports.export.succeeded', { status: 'success', reportType, exportJobId: job.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Report export failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Report export failed', error.message, error.code.toUpperCase());
      logger.error('api.reports.export.failed', { status: 'failed', error: error as Error, reportType });
      return problemJson(500, 'Report export failed', 'Unable to create export at this time.', 'IAM-REPORT-EXPORT-FAILED');
    }
  });
}
