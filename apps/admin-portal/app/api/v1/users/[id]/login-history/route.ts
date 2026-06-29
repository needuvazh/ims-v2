import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-login-history', title, status, detail, errorCode, invalidFields }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.user.read');
      const searchParams = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({ page: searchParams.get('page') ?? undefined, pageSize: searchParams.get('pageSize') ?? undefined });
      if (!parsed.success) {
        return problemJson(400, 'Invalid query parameters', 'One or more query parameters are invalid.', 'IAM-VAL-LOGIN-HISTORY-INVALID_QUERY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message })));
      }

      const { loginHistoryQueryService } = await import('../../../../../../lib/runtime');
      const result = await loginHistoryQueryService.listUserLoginHistory(
        params.id,
        parsed.data.page,
        parsed.data.pageSize,
        { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId },
      );

      const response = NextResponse.json({ data: result }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/login-history', method: request.method, status: 'success' });
      logger.info('api.users.loginHistory.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'User login history failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'User login history failed', error.message, error.code.toUpperCase());
      logger.error('api.users.loginHistory.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User login history failed', 'Unable to load user login history at this time.', 'IAM-USER-LOGIN-HISTORY-FAILED');
    }
  }, { route: '/api/v1/users/:id/login-history' });
}
