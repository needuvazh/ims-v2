import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError, updateUserCommandSchema } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/user-detail',
      title,
      status,
      detail,
      errorCode,
      invalidFields,
    },
    { status },
  );
}

function mapUser(user: {
  id: string;
  username: string;
  email: string;
  userType: string;
  status: string;
  defaultBranchId: string | null;
  preferredLanguage: string;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    userType: user.userType,
    status: user.status,
    defaultBranchId: user.defaultBranchId,
    preferredLanguage: user.preferredLanguage,
    effectiveStartDate: user.effectiveStartDate,
    effectiveEndDate: user.effectiveEndDate,
  };
}

const updateUserBodySchema = updateUserCommandSchema;

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;

    try {
      const session = await assertPermission('iam.user.read');
      const { userService } = await import('../../../../../lib/runtime');
      const user = await userService.getUserById(params.id, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json(
        {
          data: {
            user: mapUser(user),
          },
        },
        { status: 200 },
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/users/:id',
        method: request.method,
        status: 'success',
      });

      logger.info('api.users.get.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'User detail failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'User detail failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.users.get.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User detail failed', 'Unable to load the user at this time.', 'IAM-USERS-GET-FAILED');
    }
  }, { route: '/api/v1/users/:id' });
}

export async function PUT(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-USER-UPDATE-INVALID_JSON');
    }

    const parsed = updateUserBodySchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'User update data is invalid.',
        'IAM-VAL-USER-UPDATE-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const session = await assertPermission('iam.user.update');
      const { userService } = await import('../../../../../lib/runtime');

      await userService.getUserById(params.id, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const user = await userService.updateUser(params.id, parsed.data, {
        actorId: session.userId,
        actorPermissions: session.permissions,
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json(
        {
          data: {
            user: mapUser(user),
          },
        },
        { status: 200 },
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/users/:id',
        method: request.method,
        status: 'success',
      });

      logger.info('api.users.update.succeeded', { status: 'success', userId: params.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'User update failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        return problemJson(400, 'User update failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.users.update.failed', { status: 'failed', error: error as Error, userId: params.id });
      return problemJson(500, 'User update failed', 'Unable to update the user at this time.', 'IAM-USERS-UPDATE-FAILED');
    }
  }, { route: '/api/v1/users/:id' });
}
