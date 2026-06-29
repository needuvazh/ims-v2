import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/session-terminate', title, status, detail, errorCode }, { status });
}

export async function DELETE(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      const session = await assertPermission('iam.session.terminate');
      const { sessionService } = await import('../../../../../lib/runtime');
      await sessionService.terminateSession(params.sessionId, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = new NextResponse(null, { status: 204 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/sessions/:sessionId', method: request.method, status: 'success' });
      logger.info('api.sessions.terminate.succeeded', { status: 'success', sessionId: params.sessionId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Session termination failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Session termination failed', error.message, error.code.toUpperCase());
      logger.error('api.sessions.terminate.failed', { status: 'failed', error: error as Error, sessionId: params.sessionId });
      return problemJson(500, 'Session termination failed', 'Unable to terminate session at this time.', 'IAM-SESSION-TERMINATE-FAILED');
    }
  }, { route: '/api/v1/sessions/:sessionId' });
}
