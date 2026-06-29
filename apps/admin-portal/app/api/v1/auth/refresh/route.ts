import { NextResponse } from 'next/server';
import { encodeSession, decodeSession, sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';
import { withRateLimit } from '../../../../lib/api-middleware';

const accessTokenCookieName = 'ims_access_token';
const refreshTokenCookieName = 'ims_refresh_token';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-refresh',
      title,
      status,
      detail,
      errorCode,
    },
    { status },
  );
}

function redactSession(session: {
  userId: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  dataScopes: Array<{ scopeType: string; branchId: string | null; departmentId: string | null; assignedOnly: boolean }>;
  activeBranchId: string | null;
  lastActivityAt: number;
  status: 'Active' | 'Revoked' | 'Expired';
  expiresAt: number;
}) {
  return session;
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const rateLimit = withRateLimit(request, 60, 60_000, '/api/v1/auth/refresh');
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }
    const cookieHeader = request.headers.get('cookie');
    const refreshToken = request.headers.get('x-refresh-token') ?? undefined;

    const cookieRefreshToken = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${refreshTokenCookieName}=`))
      ?.slice(refreshTokenCookieName.length + 1);

    const token = refreshToken ?? cookieRefreshToken;
    if (!token) {
      return problemJson(401, 'Refresh failed', 'Refresh token is required.', 'IAM-AUTH-REFRESH-MISSING_TOKEN');
    }

    try {
      const { authService } = await import('../../../../lib/runtime');
      const session = await decodeSession(request.headers.get('cookie')?.match(new RegExp(`${sessionCookieName}=([^;]+)`))?.[1]);
      const result = await authService.refresh(token, request.headers.get('user-agent'), request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip'));

      const response = NextResponse.json(
        {
          data: {
            session: redactSession({
              userId: session?.userId ?? '',
              displayName: session?.displayName ?? '',
              roles: session?.roles ?? [],
              permissions: session?.permissions ?? [],
              dataScopes: session?.dataScopes ?? [],
              activeBranchId: session?.activeBranchId ?? null,
              lastActivityAt: Date.now(),
              status: 'Active',
              expiresAt: session?.expiresAt ?? Date.now(),
            }),
          },
        },
        { status: 200 },
      );

      response.cookies.set(accessTokenCookieName, result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60,
      });

      response.cookies.set(refreshTokenCookieName, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      if (session) {
        const refreshedSession = {
          ...session,
          lastActivityAt: Date.now(),
        };
        response.cookies.set(sessionCookieName, await encodeSession(refreshedSession), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: Math.max(0, Math.floor((refreshedSession.expiresAt - Date.now()) / 1000)),
        });
      }

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/refresh',
        method: request.method,
        status: 'success',
      });

      logger.info('api.auth.refresh.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Refresh failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Refresh failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.refresh.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Refresh failed', 'Unable to refresh the session at this time.', 'IAM-AUTH-REFRESH-FAILED');
    }
  }, { route: '/api/v1/auth/refresh' });
}
