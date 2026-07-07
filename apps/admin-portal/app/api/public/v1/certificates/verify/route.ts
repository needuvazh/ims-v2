import { NextResponse } from 'next/server';
import { withRateLimit } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { VerificationService, PublicVerificationInputSchema } from '@ims/certificates';

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    // Rate Limit: 10 requests per minute per IP for verification
    const rateLimit = withRateLimit(request, 10, 60_000, '/api/public/v1/certificates/verify');
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_JSON', messageEnglish: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }

    const parsed = PublicVerificationInputSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'VALIDATION_FAILED',
          messageEnglish: 'Verification code is required.',
          invalidFields: parsed.error.issues.map(issue => ({
            field: issue.path.join('.') || 'body',
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    try {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
      const service = new VerificationService();
      const result = await service.verify(parsed.data, clientIp);

      const response = NextResponse.json({ success: true, data: result }, { status: 200 });

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/public/v1/certificates/verify',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.public.certificates.verify.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        { success: false, errorCode: 'INTERNAL_ERROR', messageEnglish: 'An unexpected error occurred.' },
        { status: 500 }
      );
    }
  }, { route: '/api/public/v1/certificates/verify' });
}
