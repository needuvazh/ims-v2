import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/login-history', title, status, detail, errorCode, invalidFields }, { status });
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
        branchId: params.get('branchId') ?? undefined,
        status: params.get('status') ?? undefined,
        startDate: params.get('startDate') ?? undefined,
        endDate: params.get('endDate') ?? undefined,
      });
      if (!parsed.success) {
        return problemJson(400, 'Invalid query parameters', 'One or more query parameters are invalid.', 'IAM-VAL-LOGIN-HISTORY-INVALID_QUERY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message })));
      }

      const { loginHistoryQueryService } = await import('../../../../../lib/runtime');
      const result = await loginHistoryQueryService.listSecurityLoginHistory(
        {
          branchId: parsed.data.branchId,
          status: parsed.data.status,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        },
        parsed.data.page,
        parsed.data.pageSize,
        { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId },
      );

      const response = NextResponse.json({ data: result }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/security/login-history', method: request.method, status: 'success' });
      logger.info('api.security.loginHistory.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Login history failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Login history failed', error.message, error.code.toUpperCase());
      logger.error('api.security.loginHistory.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Login history failed', 'Unable to load login history at this time.', 'IAM-LOGIN-HISTORY-FAILED');
    }
  }, { route: '/api/v1/security/login-history' });
}
