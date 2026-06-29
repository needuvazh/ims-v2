import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/user-sessions', title, status, detail, errorCode }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.session.read');
      const { sessionService } = await import('../../../../../../lib/runtime');
      const sessions = await sessionService.listUserSessions(params.id, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });
      const response = NextResponse.json({ data: { items: sessions } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/sessions', method: request.method, status: 'success' });
      logger.info('api.users.sessions.list.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Session list failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Session list failed', error.message, error.code.toUpperCase());
      logger.error('api.users.sessions.list.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'Session list failed', 'Unable to load sessions at this time.', 'IAM-USER-SESSIONS-FAILED');
    }
  }, { route: '/api/v1/users/:id/sessions' });
}

export async function DELETE(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.session.terminate');
      const { sessionService } = await import('../../../../../../lib/runtime');
      await sessionService.terminateAllUserSessions(params.id, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });
      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/users/:id/sessions', method: request.method, status: 'success' });
      logger.info('api.users.sessions.terminateAll.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Terminate all sessions failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Terminate all sessions failed', error.message, error.code.toUpperCase());
      logger.error('api.users.sessions.terminateAll.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'Terminate all sessions failed', 'Unable to terminate sessions at this time.', 'IAM-USER-SESSIONS-TERMINATE-FAILED');
    }
  }, { route: '/api/v1/users/:id/sessions' });
}
