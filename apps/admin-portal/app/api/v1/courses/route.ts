import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import { CreateCourseSchema } from '@ims/course-catalog';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  categoryId: z.string().uuid().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
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

export function courseCatalogErrorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_CRS_INTERNAL_ERROR';
  let messageEn = 'An unexpected error occurred.';
  let messageAr = 'حدث خطأ غير متوقع.';

  if (msg.includes('ERR_CRS_DUPLICATE_CODE')) {
    status = 422;
    code = 'ERR_CRS_DUPLICATE_CODE';
    messageEn = 'A course with this code already exists.';
    messageAr = 'يوجد دورة بهذا الرمز بالفعل.';
  } else if (msg.includes('ERR_CRS_DUPLICATE_NAME')) {
    status = 422;
    code = 'ERR_CRS_DUPLICATE_NAME';
    messageEn = 'A course with this name already exists in this department.';
    messageAr = 'يوجد دورة بهذا الاسم في هذا القسم بالفعل.';
  } else if (msg.includes('ERR_CRS_INVALID_CODE_FORMAT')) {
    status = 400;
    code = 'ERR_CRS_INVALID_CODE_FORMAT';
    messageEn = 'Course code must be uppercase alphanumeric and between 3 to 20 characters.';
    messageAr = 'يجب أن يكون رمز الدورة بحروف وأرقام إنجليزية كبيرة بين 3 و 20 حرفاً.';
  } else if (msg.includes('ERR_CRS_INVALID_DATE_RANGE')) {
    status = 400;
    code = 'ERR_CRS_INVALID_DATE_RANGE';
    messageEn = 'Effective end date must be after effective start date.';
    messageAr = 'تاريخ الانتهاء الفعلي يجب أن يكون بعد تاريخ البدء الفعلي.';
  } else if (msg.includes('ERR_CRS_CYCLIC_CATEGORY')) {
    status = 400;
    code = 'ERR_CRS_CYCLIC_CATEGORY';
    messageEn = 'Cyclic parent-child hierarchy detected in categories.';
    messageAr = 'تم اكتشاف حلقة دائرية في تدرج الفئات.';
  } else if (msg.includes('ERR_CRS_ACTIVE_COURSE_LOCKED')) {
    status = 422;
    code = 'ERR_CRS_ACTIVE_COURSE_LOCKED';
    messageEn = 'Classification or duration cannot be changed on a published course with active batches.';
    messageAr = 'لا يمكن تعديل التصنيف أو المدة لدورة منشورة بها دفعات نشطة.';
  } else if (msg.includes('ERR_CRS_MISSING_PRICING_OR_RULES')) {
    status = 422;
    code = 'ERR_CRS_MISSING_PRICING_OR_RULES';
    messageEn = 'A course must have at least one active pricing rule and one active completion rule configured to be published.';
    messageAr = 'يجب تكوين قاعدة تسعير وقاعدة إكمال نشطة واحدة على الأقل لنشر الدورة.';
  } else if (msg.includes('ERR_CRS_ACTIVE_BATCHES_EXIST')) {
    status = 422;
    code = 'ERR_CRS_ACTIVE_BATCHES_EXIST';
    messageEn = 'Cannot archive course with active batches in OpenForEnrollment or InProgress status.';
    messageAr = 'لا يمكن أرشفة الدورة بسبب وجود دفعات نشطة.';
  } else if (msg.includes('ERR_CRS_INVALID_ARABIC_SCRIPT')) {
    status = 400;
    code = 'ERR_CRS_INVALID_ARABIC_SCRIPT';
    messageEn = 'Arabic name or description must contain only Arabic characters.';
    messageAr = 'يجب أن يحتوي الاسم أو الوصف العربي على أحرف عربية فقط.';
  } else if (msg.includes('ERR_CRS_CATEGORY_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRS_CATEGORY_NOT_FOUND';
    messageEn = 'Course category not found.';
    messageAr = 'لم يتم العثور على فئة الدورة.';
  } else if (msg.includes('ERR_CRS_COURSE_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRS_COURSE_NOT_FOUND';
    messageEn = 'Course not found.';
    messageAr = 'لم يتم العثور على الدورة.';
  }

  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      messageEnglish: messageEn,
      messageArabic: messageAr,
      statusCode: status,
    },
    { status }
  );
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        page: params.get('page') ?? undefined,
        limit: params.get('limit') ?? undefined,
        categoryId: params.get('categoryId') ?? undefined,
        status: params.get('status') ?? undefined,
        search: params.get('search') ?? undefined,
      });

      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid query parameters',
          'One or more query parameters are invalid.',
          'CRS-VAL-COURSES-INVALID_QUERY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message,
          }))
        );
      }

      const { courseService } = await import('../../../../lib/runtime');
      
      const result = await courseService.findAll(
        {
          categoryId: parsed.data.categoryId,
          status: parsed.data.status,
          search: parsed.data.search,
        },
        {
          page: parsed.data.page,
          limit: parsed.data.limit,
        }
      );

      const response = NextResponse.json(
        {
          success: true,
          data: {
            courses: result.items,
            pagination: {
              total: result.total,
              page: parsed.data.page,
              limit: parsed.data.limit,
              pages: Math.ceil(result.total / parsed.data.limit),
            },
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.list.failed', { status: 'failed', error: error as Error });
      return courseCatalogErrorResponse(error as Error);
    }
  }), { route: '/api/v1/courses' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRS-VAL-COURSES-INVALID_JSON');
    }

    const parsed = CreateCourseSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Course details are invalid.',
        'CRS-VAL-COURSES-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { courseService } = await import('../../../../lib/runtime');

      const result = await courseService.createCourse(parsed.data, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.create.failed', { status: 'failed', error: error as Error });
      return courseCatalogErrorResponse(error as Error);
    }
  }), { route: '/api/v1/courses' });
}
