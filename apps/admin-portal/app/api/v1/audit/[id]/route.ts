import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/audit-detail', title, status, detail, errorCode }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.audit.read');
      const { auditQueryService } = await import('../../../../../lib/runtime');
      const log = await auditQueryService.getAuditLogById(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { audit: log } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/audit/:id', method: request.method, status: 'success' });
      logger.info('api.audit.get.succeeded', { status: 'success', auditId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Audit detail failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Audit detail failed', error.message, error.code.toUpperCase());
      logger.error('api.audit.get.failed', { status: 'failed', error: error as Error, auditId: params.id });
      return problemJson(500, 'Audit detail failed', 'Unable to load audit entry at this time.', 'IAM-AUDIT-GET-FAILED');
    }
  }, { route: '/api/v1/audit/:id' });
}
