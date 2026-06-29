import { NextResponse } from 'next/server';
import { decodeSession, sessionCookieName, type Session } from '@ims/shared-auth';
import { JwtService, getDevelopmentKeyPair, type TokenPayload } from '@ims/shared-auth/jwt';
import { createRequestContext, type RequestContext } from '@ims/observability';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import { IamError, createIamError } from '@ims/identity-access';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type AuthenticatedRequestContext = {
  session: Session;
  tokenPayload: TokenPayload;
  requestContext: RequestContext;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();
let rateLimitSweepAt = 0;

function getCookieValue(headerValue: string | null, name: string): string | null {
  if (!headerValue) return null;
  const match = headerValue
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function getPublicKey(): string {
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (publicKey) return publicKey;

  return getDevelopmentKeyPair().publicKey;
}

function getClientIp(headers: Headers): string | null {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? null;
}

function getDeviceFingerprint(headers: Headers): string {
  return [
    headers.get('user-agent') ?? '',
    headers.get('sec-ch-ua') ?? '',
    headers.get('accept-language') ?? '',
  ].join('|');
}

function sweepRateLimitBuckets(now: number): void {
  if (now < rateLimitSweepAt) return;
  rateLimitSweepAt = now + 60_000;

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function buildRateLimitKey(request: Request, scope: string): string {
  const headers = request.headers;
  const ip = getClientIp(headers) ?? 'unknown-ip';
  const fingerprint = getDeviceFingerprint(headers) || 'unknown-device';
  return `${scope}:${ip}:${fingerprint}`;
}

export function withCorrelation(source: Headers, overrides: Partial<RequestContext> = {}): {
  requestContext: RequestContext;
  responseHeaders: Headers;
} {
  const requestContext = createRequestContext(source, overrides);
  const responseHeaders = new Headers();
  responseHeaders.set('x-correlation-id', requestContext.requestId);
  responseHeaders.set('x-request-id', requestContext.requestId);
  if (requestContext.traceId) {
    responseHeaders.set('x-trace-id', requestContext.traceId);
  }
  return { requestContext, responseHeaders };
}

export async function withAuth(request: Request): Promise<AuthenticatedRequestContext> {
  const headers = request.headers;
  const authHeader = headers.get('authorization');
  const cookieHeader = headers.get('cookie');
  const accessToken =
    (authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null) ??
    getCookieValue(cookieHeader, 'ims_access_token');

  if (!accessToken) {
    throw createIamError('IAM-AUTH-002');
  }

  const tokenPayload = await JwtService.verifyAccessToken(accessToken, getPublicKey());
  const { sessionRepository } = await import('./runtime');
  const session = await sessionRepository.findByAccessTokenJti(tokenPayload.jti ?? '');

  if (!session || session.status !== 'Active' || session.userId !== tokenPayload.userId) {
    throw createIamError('IAM-AUTH-002');
  }

  const decodedSession = await decodeSession(cookieHeader && getCookieValue(cookieHeader, sessionCookieName));
  const requestContext = createRequestContext(headers, {
    userId: tokenPayload.userId,
    branchId: decodedSession?.activeBranchId ?? tokenPayload.activeBranchId ?? null,
    route: request.url,
    method: request.method,
  });

  return {
    session: decodedSession ?? ({
      userId: tokenPayload.userId as Uuid,
      displayName: tokenPayload.email,
      roles: [],
      permissions: tokenPayload.permissions ?? [],
      dataScopes: [],
      activeBranchId: tokenPayload.activeBranchId as Uuid | null,
      accessTokenJti: tokenPayload.jti ?? '',
      hashedRefreshToken: session.hashedRefreshToken,
      lastActivityAt: session.lastActivityAt.getTime(),
      status: session.status,
      expiresAt: session.expiresAt.getTime(),
    } satisfies Session),
    tokenPayload,
    requestContext,
  };
}

export async function withPermission<T>(
  request: Request,
  permissionCode: string,
  work: (context: AuthenticatedRequestContext) => Promise<T> | T,
): Promise<T> {
  const context = await withAuth(request);
  const { authorizationGuard } = await import('./runtime');
  await authorizationGuard.verifyPermission(context.session.userId, permissionCode, context.session.activeBranchId ?? null);
  return work(context);
}

export async function withBranchScope<T>(
  request: Request,
  branchId: string | null,
  work: (context: AuthenticatedRequestContext) => Promise<T> | T,
): Promise<T> {
  const context = await withAuth(request);
  const { branchScopeResolver } = await import('./runtime');
   const allowedBranches = (await branchScopeResolver.resolveAllowedBranches(context.session.userId, context.session.activeBranchId ?? null)) as string[];

  if (branchId && !allowedBranches.includes(branchId)) {
    throw createIamError('IAM-AUTHZ-002');
  }

  return work(context);
}

export function withRateLimit(request: Request, limit: number, windowMs: number, scope = request.url): { allowed: boolean; response?: NextResponse } {
  const now = Date.now();
  sweepRateLimitBuckets(now);

  const key = buildRateLimitKey(request, scope);
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const response = NextResponse.json(
      {
        type: 'https://ims.local/problems/rate-limit',
        title: 'Too many requests',
        status: 429,
        detail: 'Request rate limit exceeded. Please try again later.',
        errorCode: 'IAM-SYS-001',
      },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
    return { allowed: false, response };
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);
  return { allowed: true };
}

export function errorHandler(
  error: unknown,
  fallback: { title: string; detail: string; errorCode: string },
  correlationId: string | null = null,
) {
  if (error instanceof IamError) {
    return NextResponse.json(
      {
        type: 'https://ims.local/problems/iam',
        title: fallback.title,
        status: error.statusCode,
        detail: error.messageEn,
        errorCode: error.errorCode,
        correlationId,
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof DomainError) {
    return NextResponse.json(
      {
        type: 'https://ims.local/problems/iam',
        title: fallback.title,
        status: 400,
        detail: error.message,
        errorCode: error.code.toUpperCase(),
        correlationId,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
      {
        type: 'https://ims.local/problems/iam',
        title: fallback.title,
        status: 500,
        detail: fallback.detail,
        errorCode: fallback.errorCode,
        correlationId,
      },
      { status: 500 },
    );
  }
