import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';
import { z } from 'zod';

const resolveQuerySchema = z.object({
  customerType: z.enum(['Individual', 'Corporate', 'WalkIn']),
  branchId: z.string().uuid().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  batchType: z.string().optional(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function problemJson(status: number, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status }
  );
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = resolveQuerySchema.safeParse({
        customerType: params.get('customerType') ?? undefined,
        branchId: params.get('branchId') ?? undefined,
        batchId: params.get('batchId') ?? undefined,
        batchType: params.get('batchType') ?? undefined,
        asOfDate: params.get('asOfDate') ?? undefined,
      });

      if (!parsed.success) {
        return problemJson(
          400,
          'Parameters for pricing resolution are invalid.',
          'CRS-VAL-PRICING-RESOLVE-INVALID',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message,
          }))
        );
      }

      const { coursePricingService } = await import('../../../../../../../lib/runtime');

      const result = await coursePricingService.resolveCoursePricing({
        courseId: id,
        branchId: parsed.data.branchId,
        batchId: parsed.data.batchId,
        customerType: parsed.data.customerType,
        batchType: parsed.data.batchType,
        asOfDate: parsed.data.asOfDate,
      });

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/pricing/resolve',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.pricing.resolve.failed', { status: 'failed', error: error as Error });
      const msg = (error as Error).message;
      let status = 500;
      let code = 'ERR_SYSTEM';
      let messageEn = 'An unexpected error occurred.';

      if (msg.includes('ERR_CRS_PRICING_NOT_FOUND')) {
        status = 404;
        code = 'ERR_CRS_PRICING_NOT_FOUND';
        messageEn = 'Active pricing rule not found for the specified conditions.';
      }

      return NextResponse.json(
        {
          success: false,
          errorCode: code,
          messageEnglish: messageEn,
          statusCode: status,
        },
        { status }
      );
    }
  }), { route: '/api/v1/courses/[id]/pricing/resolve' });
}
