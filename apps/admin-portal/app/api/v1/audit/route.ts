import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  performerId: z.string().optional(),
  branchId: z.string().uuid().optional(),
  module: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/audit', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    try {
      const session = await assertPermission('iam.audit.read');
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        page: params.get('page') ?? undefined,
        pageSize: params.get('pageSize') ?? undefined,
        entityType: params.get('entityType') ?? undefined,
        entityId: params.get('entityId') ?? undefined,
        action: params.get('action') ?? undefined,
        performerId: params.get('performerId') ?? undefined,
        branchId: params.get('branchId') ?? undefined,
        module: params.get('module') ?? undefined,
        startDate: params.get('startDate') ?? undefined,
        endDate: params.get('endDate') ?? undefined,
      });
      if (!parsed.success) {
        return problemJson(400, 'Invalid query parameters', 'One or more query parameters are invalid.', 'IAM-VAL-AUDIT-INVALID_QUERY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message })));
      }

      const { auditQueryService } = await import('../../../../lib/runtime');
      const result = await auditQueryService.listAuditLogs(
        {
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
          action: parsed.data.action,
          performerId: parsed.data.performerId,
          branchId: parsed.data.branchId,
          module: parsed.data.module,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        },
        parsed.data.page,
        parsed.data.pageSize,
        { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId },
      );

      const response = NextResponse.json({ data: result }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/audit', method: request.method, status: 'success' });
      logger.info('api.audit.list.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Audit list failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) {
        const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : 400;
        return problemJson(status, 'Audit list failed', error.message, error.code.toUpperCase());
      }
      logger.error('api.audit.list.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Audit list failed', 'Unable to load audit logs at this time.', 'IAM-AUDIT-LIST-FAILED');
    }
  }, { route: '/api/v1/audit' });
}
