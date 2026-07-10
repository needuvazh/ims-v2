import { NextResponse } from 'next/server';
import { withPermission, withAuth, errorHandler } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { z } from 'zod';
import { prisma } from '@ims/database';
import { Prisma } from '@prisma/client';

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
  effectiveEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

function problemJson(
  status: number,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status },
  );
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemJson(
      400,
      'Request body must be valid JSON.',
      'CRS-VAL-PRICING-INVALID_JSON',
    );
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
      })),
    );
  }

  const isGlobal = !parsed.data.branchId && !parsed.data.batchId;
  const requiredPermission = isGlobal
    ? 'course.catalog.create'
    : 'course.pricing.override';

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, requiredPermission, async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { coursePricingService } =
            await import('../../../../../../lib/runtime');

          const pricingInput = {
            ...parsed.data,
            courseId: id,
          };

          const result = await coursePricingService.createPricingRule(
            pricingInput,
            session.userId,
          );

          const response = NextResponse.json(
            {
              success: true,
              data: result,
            },
            { status: 201 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/courses/[id]/pricing',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.courses.pricing.create.failed', {
            status: 'failed',
            error: error as Error,
          });
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
            messageEn =
              'Effective end date must be after effective start date.';
          } else if (msg.includes('ERR_CRS_TAX_EXEMPTION_METADATA_REQUIRED')) {
            status = 400;
            code = 'ERR_CRS_TAX_EXEMPTION_METADATA_REQUIRED';
            messageEn =
              'Tax-exemption reason and code are required when isTaxExempt is true.';
          } else if (msg.includes('ERR_CRS_MULTIPLE_ACTIVE_PRICING')) {
            status = 422;
            code = 'ERR_CRS_MULTIPLE_ACTIVE_PRICING';
            messageEn =
              'Overlapping active pricing rule already exists for this combination.';
          }

          return NextResponse.json(
            {
              success: false,
              errorCode: code,
              messageEnglish: messageEn,
              statusCode: status,
            },
            { status },
          );
        }
      }),
    { route: '/api/v1/courses/[id]/pricing' },
  );
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'course.catalog.view', async () => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const params = new URL(request.url).searchParams;
          const branchId = params.get('branchId') || undefined;
          const status = params.get('status') || undefined;
          const q = params.get('q') || '';

          const page = parseInt(params.get('page') || '1', 10);
          const limit = parseInt(params.get('limit') || '10', 10);
          const skip = (page - 1) * limit;

          const sortBy = params.get('sortBy') || 'effectiveStartDate';
          const sortOrder =
            (params.get('sortOrder') as 'asc' | 'desc') || 'desc';

          const where: Prisma.CoursePricingWhereInput = {
            courseId: id,
            isDeleted: false,
            branchId: branchId === undefined ? undefined : branchId || null,
            status: (status as any) || undefined,
          };

          if (q) {
            where.OR = [
              { customerType: { contains: q, mode: 'insensitive' } },
              { batchType: { contains: q, mode: 'insensitive' } },
            ];
          }

          const total = await prisma.coursePricing.count({ where });

          const records = await prisma.coursePricing.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limit,
          });

          const response = NextResponse.json(
            {
              success: true,
              data: records,
              total,
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/courses/[id]/pricing',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.courses.pricing.list.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_SYSTEM',
              messageEnglish: (error as Error).message,
              statusCode: 500,
            },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/courses/[id]/pricing' },
  );
}

const pricingPatchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['disable']),
});

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problemJson(
      400,
      'Request body must be valid JSON.',
      'CRS-VAL-PRICING-INVALID_JSON',
    );
  }

  const parsed = pricingPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return problemJson(
      400,
      'Pricing patch parameters are invalid.',
      'CRS-VAL-PRICING-INVALID_PATCH_BODY',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    );
  }

  return withRouteObservability(
    request.headers,
    async () => {
      try {
        const context = await withAuth(request);
        const { session } = context;

        // Retrieve pricing rule to check if it's a global default or a branch override
        const record = await prisma.coursePricing.findFirst({
          where: { id: parsed.data.id, isDeleted: false },
        });

        if (!record) {
          return problemJson(
            404,
            'Pricing override not found.',
            'ERR_CRS_PRICING_NOT_FOUND',
          );
        }

        const isGlobal = !record.branchId && !record.batchId;
        const requiredPermission = isGlobal
          ? 'course.catalog.update'
          : 'course.pricing.override';

        const { authorizationGuard } = await import('../../../../../../lib/runtime');
        await authorizationGuard.verifyPermission(
          session.userId,
          requiredPermission,
          session.activeBranchId ?? null,
        );

        const { coursePricingService } = await import('../../../../../../lib/runtime');

        if (parsed.data.action === 'disable') {
          const result = await coursePricingService.disablePricingRule(
            parsed.data.id,
            session.userId,
          );
          const response = NextResponse.json(
            {
              success: true,
              data: result,
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(
            response.headers,
            request.headers,
            {
              route: '/api/v1/courses/[id]/pricing',
              method: request.method,
              status: 'success',
            },
          );

          return response;
        }

        return problemJson(
          400,
          'Unsupported patch action.',
          'CRS-VAL-PRICING-UNSUPPORTED_ACTION',
        );
      } catch (error) {
        const logger = createStructuredLogger(
          getCurrentRequestContext() ?? {},
        );
        logger.error('api.courses.pricing.patch.failed', {
          status: 'failed',
          error: error as Error,
        });

        const msg = (error as Error).message;
        if (msg.includes('ERR_CRS_PRICING_NOT_FOUND')) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_CRS_PRICING_NOT_FOUND',
              messageEnglish: 'Pricing override not found.',
              statusCode: 404,
            },
            { status: 404 },
          );
        }

        return errorHandler(error, {
          title: 'Error updating pricing',
          detail: msg,
          errorCode: 'ERR_SYSTEM',
        });
      }
    },
    { route: '/api/v1/courses/[id]/pricing' },
  );
}
