import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';

const querySchema = z.object({
  query: z.string().trim().min(1, 'Query parameter is required'),
  branchId: z.string().uuid('Branch ID must be a valid UUID'),
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'admission.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        query: params.get('query') ?? undefined,
        branchId: params.get('branchId') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'ERR_VAL_FAILED',
            messageEnglish: 'Query parameter and a valid branchId are required.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const { branchScopeResolver, studentQueryService } = await import('../../../../lib/runtime');

      const targetBranchId = parsed.data.branchId;
      if (!targetBranchId) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      // Verify branch assignment scope
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );
      if (!allowedBranches.includes(targetBranchId as any)) {
        throw new Error('ERR_AUTH_BRANCH_DENIED');
      }

      const canRevealSensitive = session.permissions.includes('student.reveal_pii') || session.permissions.includes('student.identity.unmasked.read');

      const result = await studentQueryService.globalPersonLookup(
        parsed.data.query,
        targetBranchId,
        { revealSensitive: canRevealSensitive }
      );

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/person/lookup',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.person.lookup.failed', { status: 'failed', error: error as Error });
      
      let status = 500;
      let code = 'ERR_PERSON_INTERNAL_ERROR';

      if ((error as Error).message === 'ERR_AUTH_BRANCH_DENIED') {
        status = 403;
        code = 'ERR_AUTH_BRANCH_DENIED';
      }

      return NextResponse.json(
        {
          success: false,
          errorCode: code,
          messageEnglish: (error as Error).message,
          statusCode: status,
        },
        { status }
      );
    }
  }), { route: '/api/v1/person/lookup' });
}
