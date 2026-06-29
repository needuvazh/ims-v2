import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

const archiveSchema = z.object({ reason: z.string().trim().min(1).optional() });

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-archive', title, status, detail, errorCode, invalidFields }, { status });
}

export async function POST(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    let payload: unknown = {};
    try { payload = await request.json(); } catch {}
    const parsed = archiveSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Archive reason is invalid.', 'IAM-VAL-USER-ARCHIVE-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.user.archive');
      const { userService } = await import('../../../../../../lib/runtime');
      await userService.archiveUser(params.id, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { archived: true } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/archive', method: request.method, status: 'success' });
      logger.info('api.users.archive.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'User archive failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'User archive failed', error.message, error.code.toUpperCase());
      logger.error('api.users.archive.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User archive failed', 'Unable to archive user at this time.', 'IAM-USER-ARCHIVE-FAILED');
    }
  }, { route: '/api/v1/users/:id/archive' });
}
