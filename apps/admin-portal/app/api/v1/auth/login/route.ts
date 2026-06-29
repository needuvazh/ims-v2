import { NextResponse } from 'next/server';
import { z } from 'zod';
import { encodeSession, sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';
import { withRateLimit } from '../../../../lib/api-middleware';

const accessTokenCookieName = 'ims_access_token';
const refreshTokenCookieName = 'ims_refresh_token';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-login',
      title,
      status,
      detail,
      errorCode,
      invalidFields,
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

function redactUser(user: {
  id: string;
  username: string;
  email: string;
  userType: string;
  status: string;
  defaultBranchId: string | null;
  preferredLanguage: string;
}) {
  return user;
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const rateLimit = withRateLimit(request, 50, 60_000, '/api/v1/auth/login');
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-LOGIN-INVALID_JSON');
    }

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Email and password are required.',
        'IAM-VAL-LOGIN-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const { authService } = await import('../../../../lib/runtime');
      const result = await authService.login(
        parsed.data.email,
        parsed.data.password,
        parsed.data.rememberMe,
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip'),
        request.headers.get('user-agent'),
      );

      const sessionToken = await encodeSession(result.session);

      const response = NextResponse.json(
        {
          data: {
            user: redactUser({
              id: result.user.id,
              username: result.user.username,
              email: result.user.email,
              userType: result.user.userType,
              status: result.user.status,
              defaultBranchId: result.user.defaultBranchId,
              preferredLanguage: result.user.preferredLanguage,
            }),
            session: redactSession({
              userId: result.session.userId,
              displayName: result.session.displayName,
              roles: result.session.roles,
              permissions: result.session.permissions,
              dataScopes: result.session.dataScopes,
              activeBranchId: result.session.activeBranchId,
              lastActivityAt: result.session.lastActivityAt,
              status: result.session.status,
              expiresAt: result.session.expiresAt,
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
        maxAge: Math.max(0, Math.floor((result.session.expiresAt - Date.now()) / 1000)),
      });

      response.cookies.set(sessionCookieName, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.max(0, Math.floor((result.session.expiresAt - Date.now()) / 1000)),
      });

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/login',
        method: request.method,
        status: 'success',
      });

      logger.info('api.auth.login.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Authentication failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'Authentication failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.login.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Authentication failed', 'Unable to sign in at this time.', 'IAM-AUTH-LOGIN-FAILED');
    }
  }, { route: '/api/v1/auth/login' });
}
