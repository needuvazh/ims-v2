import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { z } from 'zod';
import { prisma } from '@ims/database';

const pricingPostSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  customerType: z.enum(['Individual', 'Corporate', 'WalkIn']),
  batchType: z.string().min(1),
  currency: z.literal('OMR').default('OMR'),
  basePrice: z.number().positive(),
  taxPercentage: z.number().nonnegative().optional(),
  isTaxExempt: z.boolean().optional(),
  taxExemptionReason: z.string().nullable().optional(),
  taxExemptionCode: z.string().nullable().optional(),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
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

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemJson(400, 'Request body must be valid JSON.', 'CRS-VAL-PRICING-INVALID_JSON');
  }

  const parsed = pricingPostSchema.safeParse(payload);
  if (!parsed.success) {
    return problemJson(
      400,
      'Pricing details are invalid.',
      'CRS-VAL-PRICING-INVALID_BODY',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }))
    );
  }

  const isGlobal = !parsed.data.branchId && !parsed.data.batchId;
  const requiredPermission = isGlobal ? 'course.catalog.create' : 'course.pricing.override';

  return withRouteObservability(request.headers, async () => withPermission(request, requiredPermission, async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { coursePricingService } = await import('../../../../../../lib/runtime');

      const pricingInput = {
        ...parsed.data,
        courseId: id,
      };

      const result = await coursePricingService.createPricingRule(pricingInput, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/pricing',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.pricing.create.failed', { status: 'failed', error: error as Error });
      const msg = (error as Error).message;
      let status = 500;
      let code = 'ERR_SYSTEM';
      let messageEn = 'An unexpected error occurred.';

      if (msg.includes('ERR_CRS_COURSE_NOT_FOUND')) {
        status = 404;
        code = 'ERR_CRS_COURSE_NOT_FOUND';
        messageEn = 'Course not found.';
      } else if (msg.includes('ERR_CRS_INVALID_DATE_RANGE')) {
        status = 400;
        code = 'ERR_CRS_INVALID_DATE_RANGE';
        messageEn = 'Effective end date must be after effective start date.';
      } else if (msg.includes('ERR_CRS_TAX_EXEMPTION_METADATA_REQUIRED')) {
        status = 400;
        code = 'ERR_CRS_TAX_EXEMPTION_METADATA_REQUIRED';
        messageEn = 'Tax-exemption reason and code are required when isTaxExempt is true.';
      } else if (msg.includes('ERR_CRS_MULTIPLE_ACTIVE_PRICING')) {
        status = 422;
        code = 'ERR_CRS_MULTIPLE_ACTIVE_PRICING';
        messageEn = 'Overlapping active pricing rule already exists for this combination.';
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
  }), { route: '/api/v1/courses/[id]/pricing' });
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const branchId = params.get('branchId') || undefined;
      const batchId = params.get('batchId') || undefined;
      const status = params.get('status') || undefined;

      const records = await prisma.coursePricing.findMany({
        where: {
          courseId: id,
          branchId: branchId === undefined ? undefined : (branchId || null),
          batchId: batchId === undefined ? undefined : (batchId || null),
          status: status as any || undefined,
          isDeleted: false,
        },
        orderBy: { effectiveStartDate: 'desc' },
      });

      const response = NextResponse.json(
        {
          success: true,
          data: records,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/pricing',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.pricing.list.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ERR_SYSTEM',
          messageEnglish: (error as Error).message,
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  }), { route: '/api/v1/courses/[id]/pricing' });
}
