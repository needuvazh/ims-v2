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

const discountPostSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  discountType: z.enum(['Individual', 'Corporate', 'EarlyBird']),
  discountMode: z.enum(['Percentage', 'FixedAmount']),
  discountValue: z.number().positive(),
  requiresApproval: z.boolean().optional(),
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
    return problemJson(400, 'Request body must be valid JSON.', 'CRS-VAL-DISCOUNTS-INVALID_JSON');
  }

  const parsed = discountPostSchema.safeParse(payload);
  if (!parsed.success) {
    return problemJson(
      400,
      'Discount details are invalid.',
      'CRS-VAL-DISCOUNTS-INVALID_BODY',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }))
    );
  }

  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { courseDiscountService } = await import('../../../../../../lib/runtime');

      const discountInput = {
        ...parsed.data,
        courseId: id,
      };

      const result = await courseDiscountService.createDiscount(discountInput, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/[id]/discounts',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.discounts.create.failed', { status: 'failed', error: error as Error });
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
      } else if (msg.includes('ERR_CRS_MULTIPLE_ACTIVE_DISCOUNTS')) {
        status = 422;
        code = 'ERR_CRS_MULTIPLE_ACTIVE_DISCOUNTS';
        messageEn = 'Overlapping active discount already exists for this combination.';
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
  }), { route: '/api/v1/courses/[id]/discounts' });
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

      const records = await prisma.courseDiscount.findMany({
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
        route: '/api/v1/courses/[id]/discounts',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.discounts.list.failed', { status: 'failed', error: error as Error });
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
  }), { route: '/api/v1/courses/[id]/discounts' });
}
