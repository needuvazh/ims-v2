import { NextResponse } from 'next/server';
import { z } from 'zod';
import { encodeSession, sessionCookieName } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

const switchBranchSchema = z.object({
  branchId: z.string().uuid(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/auth-switch-branch',
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

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-SWITCH-INVALID_JSON');
    }

    const parsed = switchBranchSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Branch ID is required.',
        'IAM-VAL-SWITCH-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const { getSession } = await import('../../../../lib/auth-guard');
      const session = await getSession();
      const { branchAccessService } = await import('../../../../lib/runtime');

      await branchAccessService.switchActiveBranch(session.accessTokenJti, parsed.data.branchId as Uuid, session.userId);

      const updatedSession = {
        ...session,
        activeBranchId: parsed.data.branchId as Uuid,
        lastActivityAt: Date.now(),
      };

      const response = NextResponse.json(
        {
          data: {
            session: redactSession(updatedSession),
          },
        },
        { status: 200 },
      );

      response.cookies.set(sessionCookieName, await encodeSession(updatedSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.max(0, Math.floor((updatedSession.expiresAt - Date.now()) / 1000)),
      });

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/auth/switch-branch',
        method: request.method,
        status: 'success',
      });

      logger.info('api.auth.switchBranch.succeeded', { status: 'success', branchId: parsed.data.branchId });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'Branch switch failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : 400;
        return problemJson(status, 'Branch switch failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.auth.switchBranch.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Branch switch failed', 'Unable to switch branch at this time.', 'IAM-AUTH-SWITCH-FAILED');
    }
  }, { route: '/api/v1/auth/switch-branch' });
}
