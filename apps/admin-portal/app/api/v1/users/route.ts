import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError, type Uuid } from '@ims/shared-kernel';
import { IamError, createUserCommandSchema } from '@ims/identity-access';
import { withPermission } from '../../../lib/api-middleware';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PendingActivation', 'Active', 'Locked', 'Suspended', 'Archived']).optional(),
  userType: z.string().optional(),
  branchId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      type: 'https://ims.local/problems/users-list',
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

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'iam.user.read', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        page: params.get('page') ?? undefined,
        pageSize: params.get('pageSize') ?? undefined,
        status: params.get('status') ?? undefined,
        userType: params.get('userType') ?? undefined,
        branchId: params.get('branchId') ?? undefined,
        roleId: params.get('roleId') ?? undefined,
        search: params.get('search') ?? undefined,
      });

      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid query parameters',
          'One or more query parameters are invalid.',
          'IAM-VAL-USERS-INVALID_QUERY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message,
          })),
        );
      }

      if (parsed.data.branchId) {
        const { branchScopeResolver } = await import('../../../lib/runtime');
        const allowedBranches = await branchScopeResolver.resolveAllowedBranches(session.userId, session.activeBranchId ?? null);
        if (!allowedBranches.includes(parsed.data.branchId as Uuid)) {
          throw new DomainError('forbidden', 'Access denied: you are not authorized to access this branch.');
        }
      }

      const { userService } = await import('../../../lib/runtime');
      const result = await userService.searchUsers(
        {
          status: parsed.data.status,
          userType: parsed.data.userType,
          branchId: parsed.data.branchId,
          roleId: parsed.data.roleId,
          search: parsed.data.search,
        },
        parsed.data.page,
        parsed.data.pageSize,
        {
          actorId: session.userId,
          actorPermissions: ['iam.user.read'],
          activeBranchId: session.activeBranchId,
        },
      );

      const response = NextResponse.json(
        {
          data: {
            items: result.items.map(mapUser),
            total: result.total,
            page: parsed.data.page,
            pageSize: parsed.data.pageSize,
          },
        },
        { status: 200 },
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/users',
        method: request.method,
        status: 'success',
      });

      logger.info('api.users.list.succeeded', { status: 'success', page: parsed.data.page, pageSize: parsed.data.pageSize });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'User list failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : 400;
        return problemJson(status, 'User list failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.users.list.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'User list failed', 'Unable to load users at this time.', 'IAM-USERS-LIST-FAILED');
    }
  }), { route: '/api/v1/users' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'iam.user.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-USERS-INVALID_JSON');
    }

    const parsed = createUserCommandSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'User details are invalid.',
        'IAM-VAL-USERS-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }

    try {
      const { userService } = await import('../../../lib/runtime');
      const user = await userService.createUser(parsed.data, {
        actorId: session.userId,
        actorPermissions: ['iam.user.create'],
        activeBranchId: session.activeBranchId,
      });

      const response = NextResponse.json(
        {
          data: {
            user: mapUser(user),
          },
        },
        { status: 201 },
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/users',
        method: request.method,
        status: 'success',
      });

      logger.info('api.users.create.succeeded', { status: 'success', userId: user.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) {
        return problemJson(error.statusCode, 'User create failed', error.messageEn, error.errorCode);
      }

      if (error instanceof DomainError) {
        const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : 400;
        return problemJson(status, 'User create failed', error.message, error.code.toUpperCase());
      }

      logger.error('api.users.create.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'User create failed', 'Unable to create the user at this time.', 'IAM-USERS-CREATE-FAILED');
    }
  }), { route: '/api/v1/users' });
}
