import { NextResponse } from 'next/server';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import { CreateCategorySchema } from '@ims/course-catalog';
import { courseCatalogErrorResponse } from '../route';

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

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.view', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const { categoryService } = await import('../../../../lib/runtime');
      
      const result = await categoryService.listCategories();

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/categories',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.categories.list.failed', { status: 'failed', error: error as Error });
      return courseCatalogErrorResponse(error as Error);
    }
  }), { route: '/api/v1/courses/categories' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'course.catalog.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson(400, 'Invalid request body', 'Request body must be valid JSON.', 'CRS-VAL-CATEGORIES-INVALID_JSON');
    }

    const parsed = CreateCategorySchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        400,
        'Invalid request body',
        'Category details are invalid.',
        'CRS-VAL-CATEGORIES-INVALID_BODY',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        }))
      );
    }

    try {
      const { categoryService } = await import('../../../../lib/runtime');

      const result = await categoryService.createCategory(parsed.data, session.userId);

      const response = NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 201 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/courses/categories',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.courses.categories.create.failed', { status: 'failed', error: error as Error });
      return courseCatalogErrorResponse(error as Error);
    }
  }), { route: '/api/v1/courses/categories' });
}
