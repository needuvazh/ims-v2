import { NextResponse } from 'next/server';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const accessTokenCookieName = 'ims_access_token';
const refreshTokenCookieName = 'ims_refresh_token';

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(accessTokenCookieName);
  response.cookies.delete(refreshTokenCookieName);
  response.cookies.delete(sessionCookieName);
}

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-logout',
      title,
      status,
      detail,
      errorCode,
    },
    { status },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const cookieValue = request.headers.get('cookie')?.match(new RegExp(`${sessionCookieName}=([^;]+)`))?.[1];
      const session = await decodeSession(cookieValue);

      if (session) {
        const { authService } = await import('../../../../lib/runtime');
        await authService.logout(session.accessTokenJti);
      }

      const response = new NextResponse(null, { status: 204 });
      clearAuthCookies(response);
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/logout',
        method: request.method,
        status: 'success',
      });

      logger.info('api.auth.logout.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Logout failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Logout failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.logout.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Logout failed', 'Unable to sign out at this time.', 'IAM-AUTH-LOGOUT-FAILED');
    }
  }, { route: '/api/v1/auth/logout' });
}
