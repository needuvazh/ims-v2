import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  createStructuredLogger,
  getCurrentRequestContext,
  withRouteObservability,
} from '../../../../../lib/observability';

const querySchema = z.object({
  query: z.string().trim().min(1, 'Query parameter is required'),
  pageSize: z.coerce.number().int().positive().max(20).default(8),
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'iam.user.read', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const params = new URL(request.url).searchParams;
        const parsed = querySchema.safeParse({
          query: params.get('query') ?? undefined,
          pageSize: params.get('pageSize') ?? undefined,
        });

        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'IAM-VAL-USER-SEARCH-INVALID_QUERY',
              messageEnglish: parsed.error.issues[0]?.message ?? 'Invalid search query.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const { userService } = await import('../../../../../lib/runtime');
        const searchResult = await userService.searchUsers(
          { search: parsed.data.query },
          1,
          parsed.data.pageSize,
          {
            actorId: session.userId,
            actorPermissions: session.permissions,
            activeBranchId: session.activeBranchId,
          },
        );

        const items = await Promise.all(
          searchResult.items.map(async (user) => {
            const profile = await userService.getUser(user.id, {
              actorId: session.userId,
              actorPermissions: session.permissions,
              activeBranchId: session.activeBranchId,
            });

            return {
              userId: profile.id,
              personId: profile.personId,
              username: profile.username,
              fullName: profile.fullName,
              email: profile.email,
              mobile: profile.phone,
              status: profile.status,
              defaultBranchId: profile.defaultBranchId,
              branchIds: profile.branchIds,
              dataScopes: profile.dataScopes,
            };
          }),
        );

        const response = NextResponse.json(
          {
            success: true,
            data: {
              items,
              total: searchResult.total,
            },
          },
          { status: 200 },
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/iam/users/search',
          method: request.method,
          status: 'success',
        });

        logger.info('api.iam.users.search.succeeded', { status: 'success' });
        return response;
      } catch (error) {
        logger.error('api.iam.users.search.failed', { status: 'failed', error: error as Error });
        return NextResponse.json(
          {
            success: false,
            errorCode: 'IAM-USERS-SEARCH-FAILED',
            messageEnglish: 'Unable to search IAM users at this time.',
            statusCode: 500,
          },
          { status: 500 },
        );
      }
    }),
  );
}
