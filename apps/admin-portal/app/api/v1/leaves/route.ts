import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, errorHandler } from '../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
} from '../../../lib/observability';
import { leaveManagementService, branchScopeResolver } from '../../../lib/runtime';
import { CreateLeaveRequestSchema } from '@ims/leave-management';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  personId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  date: z.coerce.date().optional(),
});

function success(
  data: Record<string, unknown> | Array<unknown>,
  request: Request,
  route: string,
  status = 200,
) {
  const response = NextResponse.json({ success: true, ...data }, { status });
  applyObservabilityResponseHeaders(response.headers, request.headers, {
    route,
    method: request.method,
    status: 'success',
  });
  return response;
}

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () => {
      try {
        const { session } = await withAuth(request);
        const params = new URL(request.url).searchParams;
        const parsedQuery = listQuerySchema.parse({
          page: params.get('page') ?? undefined,
          pageSize: params.get('pageSize') ?? undefined,
          personId: params.get('personId') ?? undefined,
          branchId: params.get('branchId') ?? undefined,
          status: params.get('status') ?? undefined,
          date: params.get('date') ?? undefined,
        });

        const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
          session.userId as any,
          session.activeBranchId as any,
        );

        const authContext = {
          actorId: session.userId,
          branchId: session.activeBranchId,
          permissions: session.permissions,
          allowedBranchIds,
        };

        const result = await leaveManagementService.listLeaveRequests(
          {
            personId: parsedQuery.personId,
            branchId: parsedQuery.branchId ?? session.activeBranchId ?? undefined,
            status: parsedQuery.status,
            date: parsedQuery.date,
          },
          { page: parsedQuery.page, pageSize: parsedQuery.pageSize },
          authContext,
        );

        return success(
          { items: result.items, total: result.total },
          request,
          '/api/v1/leaves',
        );
      } catch (error) {
        return errorHandler(error, {
          title: 'Failed to list leave requests',
          detail: 'Failed to list leave requests due to an internal or request error.',
          errorCode: 'LEAVE-LIST-FAILED',
        });
      }
    },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () => {
      try {
        const { session } = await withAuth(request);
        const payload = await request.json();
        const parsedInput = CreateLeaveRequestSchema.parse(payload);

        const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
          session.userId as any,
          session.activeBranchId as any,
        );

        const authContext = {
          actorId: session.userId,
          branchId: session.activeBranchId,
          permissions: session.permissions,
          allowedBranchIds,
        };

        const result = await leaveManagementService.applyLeave(parsedInput, authContext);
        return success({ leave: result as any }, request, '/api/v1/leaves', 201);
      } catch (error) {
        return errorHandler(error, {
          title: 'Failed to apply leave',
          detail: 'Failed to apply leave due to validation, authorization or database error.',
          errorCode: 'LEAVE-APPLY-FAILED',
        });
      }
    },
  );
}
