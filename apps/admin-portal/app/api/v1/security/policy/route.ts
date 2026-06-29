import { NextResponse } from 'next/server';
import { DomainError } from '@ims/shared-kernel';
import { IamError, updateSecurityPolicyCommandSchema } from '@ims/identity-access';
import { assertPermission } from '../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/security-policy', title, status, detail, errorCode }, { status });
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    try {
      const session = await assertPermission('iam.security-policy.read');
      const { securityPolicyService } = await import('../../../../lib/runtime');
      const policy = await securityPolicyService.getSecurityPolicy({ actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { policy } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/security/policy', method: request.method, status: 'success' });
      logger.info('api.security.policy.get.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Security policy failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Security policy failed', error.message, error.code.toUpperCase());
      logger.error('api.security.policy.get.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Security policy failed', 'Unable to load the security policy at this time.', 'IAM-SECURITY-POLICY-FAILED');
    }
  }, { route: '/api/v1/security/policy' });
}

export async function PUT(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    let payload: unknown;
    try { payload = await request.json(); } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'IAM-VAL-SECURITY-INVALID_JSON');
    }

    const parsed = updateSecurityPolicyCommandSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Security policy details are invalid.', 'IAM-VAL-SECURITY-INVALID_BODY');
    }

    try {
      const session = await assertPermission('iam.security-policy.update');
      const { securityPolicyService } = await import('../../../../lib/runtime');
      const policy = await securityPolicyService.updateSecurityPolicy(parsed.data, { actorId: session.userId, actorPermissions: session.permissions, activeBranchId: session.activeBranchId });
      const response = NextResponse.json({ data: { policy } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/security/policy', method: request.method, status: 'success' });
      logger.info('api.security.policy.update.succeeded', { status: 'success' });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Security policy update failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Security policy update failed', error.message, error.code.toUpperCase());
      logger.error('api.security.policy.update.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Security policy update failed', 'Unable to update the security policy at this time.', 'IAM-SECURITY-POLICY-UPDATE-FAILED');
    }
  }, { route: '/api/v1/security/policy' });
}
