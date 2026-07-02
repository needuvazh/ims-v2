import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import { batchService, branchScopeResolver } from '../../../../lib/runtime';
import { prisma } from '@ims/database';

const createBatchSchema = z.object({
  courseId: z.string().uuid(),
  branchId: z.string().uuid(),
  classroomId: z.string().uuid().nullable().optional(),
  batchCode: z.string().trim().toUpperCase().min(3).max(20),
  batchNameEnglish: z.string().trim().min(3).max(150),
  batchNameArabic: z.string().trim().min(3).max(150),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  capacity: z.number().int().positive(),
  waitingListEnabled: z.boolean().default(true),
  allowOverbooking: z.boolean().default(false),
  isWalkIn: z.boolean().default(false),
  corporateAccountId: z.string().uuid().nullable().optional(),
});

function problemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>
) {
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

export function batchErrorResponse(error: Error) {
  const msg = error.message;
  const errCode = (error as any).code || '';
  let status = 500;
  let code = 'ERR_CRS_INTERNAL_ERROR';
  let messageEn = 'An unexpected error occurred.';
  let messageAr = 'حدث خطأ غير متوقع.';

  if (errCode === 'ERR_CRS_DUPLICATE_BATCH_CODE' || msg.includes('ERR_CRS_DUPLICATE_BATCH_CODE')) {
    status = 422;
    code = 'ERR_CRS_DUPLICATE_BATCH_CODE';
    messageEn = 'A batch with this code already exists.';
    messageAr = 'يوجد دفعة بهذا الرمز بالفعل.';
  } else if (errCode === 'ERR_CRS_INVALID_DATE_RANGE' || msg.includes('ERR_CRS_INVALID_DATE_RANGE')) {
    status = 400;
    code = 'ERR_CRS_INVALID_DATE_RANGE';
    messageEn = msg;
    messageAr = 'نطاق التاريخ غير صالح.';
  } else if (errCode === 'ERR_CRS_BATCH_NO_TRAINER' || msg.includes('ERR_CRS_BATCH_NO_TRAINER')) {
    status = 422;
    code = 'ERR_CRS_BATCH_NO_TRAINER';
    messageEn = 'An open batch requires at least one Primary Trainer.';
    messageAr = 'تتطلب الدفعة المفتوحة مدرباً رئيسياً واحداً على الأقل.';
  } else if (errCode === 'ERR_CRS_BATCH_FULL' || msg.includes('ERR_CRS_BATCH_FULL')) {
    status = 422;
    code = 'ERR_CRS_BATCH_FULL';
    messageEn = 'Batch capacity limit has been reached.';
    messageAr = 'تم الوصول إلى الحد الأقصى لسعة الدفعة.';
  } else if (errCode === 'ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED' || msg.includes('ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED')) {
    status = 422;
    code = 'ERR_CRS_PRIMARY_TRAINER_ALREADY_ASSIGNED';
    messageEn = 'A primary trainer is already assigned for this range.';
    messageAr = 'تم تعيين مدرب رئيسي بالفعل لهذا النطاق.';
  } else if (errCode === 'ERR_CRS_TRAINER_SCHEDULE_CONFLICT' || msg.includes('ERR_CRS_TRAINER_SCHEDULE_CONFLICT')) {
    status = 422;
    code = 'ERR_CRS_TRAINER_SCHEDULE_CONFLICT';
    messageEn = msg;
    messageAr = 'هنالك تعارض في جدول المدرب.';
  } else if (errCode === 'ERR_CRS_INVALID_STATE_TRANSITION' || msg.includes('ERR_CRS_INVALID_STATE_TRANSITION')) {
    status = 400;
    code = 'ERR_CRS_INVALID_STATE_TRANSITION';
    messageEn = msg;
    messageAr = 'انتقال الحالة هذا غير صالح.';
  } else if (errCode === 'ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED' || msg.includes('ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED')) {
    status = 422;
    code = 'ERR_CRS_WALKIN_COMPLETION_NOT_ALLOWED';
    messageEn = 'This course does not allow walk-in completions.';
    messageAr = 'هذه الدورة لا تسمح بإكمال المسار السريع.';
  } else if (errCode === 'ERR_CRS_COURSE_NOT_PUBLISHED' || msg.includes('ERR_CRS_COURSE_NOT_PUBLISHED')) {
    status = 422;
    code = 'ERR_CRS_COURSE_NOT_PUBLISHED';
    messageEn = 'A batch can only be created/updated for active published courses.';
    messageAr = 'يمكن إنشاء أو تحديث الدفعة فقط للدورات النشطة والمنشورة.';
  } else if (errCode === 'ERR_IAM_INSUFFICIENT_PERMISSIONS' || msg.includes('ERR_IAM_INSUFFICIENT_PERMISSIONS')) {
    status = 403;
    code = 'ERR_IAM_INSUFFICIENT_PERMISSIONS';
    messageEn = 'Access denied: insufficient branch permissions.';
    messageAr = 'تم رفض الوصول: صلاحيات الفرع غير كافية.';
  } else if (errCode === 'ERR_CRS_CLASSROOM_NOT_FOUND' || msg.includes('ERR_CRS_CLASSROOM_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRS_CLASSROOM_NOT_FOUND';
    messageEn = 'Classroom not found or inactive.';
    messageAr = 'الفصل الدراسي غير موجود أو غير نشط.';
  } else if (errCode === 'ERR_CRS_INVALID_CORPORATE_ACCOUNT' || msg.includes('ERR_CRS_INVALID_CORPORATE_ACCOUNT')) {
    status = 422;
    code = 'ERR_CRS_INVALID_CORPORATE_ACCOUNT';
    messageEn = 'Corporate client account is invalid or inactive.';
    messageAr = 'حساب العميل من الشركات غير صالح أو غير نشط.';
  } else if (errCode === 'ERR_CRS_BATCH_NOT_FOUND' || msg.includes('ERR_CRS_BATCH_NOT_FOUND')) {
    status = 404;
    code = 'ERR_CRS_BATCH_NOT_FOUND';
    messageEn = 'Batch not found.';
    messageAr = 'لم يتم العثور على الدفعة.';
  } else if (errCode === 'ERR_CRS_CONCURRENCY_VIOLATION' || msg.includes('ERR_CRS_CONCURRENCY_VIOLATION')) {
    status = 409;
    code = 'ERR_CRS_CONCURRENCY_VIOLATION';
    messageEn = 'Conflict: The record has been modified by another process.';
    messageAr = 'تعارض: تم تعديل السجل من قبل عملية أخرى.';
  }

  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      messageEnglish: messageEn,
      messageArabic: messageAr,
      statusCode: status,
      conflicts: (error as any).conflicts,
    },
    { status }
  );
}

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'course.catalog.view', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
        const params = new URL(request.url).searchParams;
        const branchFilter = params.get('branchId') || undefined;
        const statusFilter = params.get('status') || undefined;
        const courseFilter = params.get('courseId') || undefined;

        // Scoping check
        const userRoles = await prisma.userRole.findMany({
          where: { userId: session.userId },
          include: { role: true },
        });
        const isSuperAdmin = userRoles.some(
          (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
        );

        let finalBranchId = branchFilter;
        if (!isSuperAdmin) {
          const allowed = (await branchScopeResolver.resolveAllowedBranches(
            session.userId,
            session.activeBranchId
          )) as string[];
          if (branchFilter) {
            if (!allowed.includes(branchFilter)) {
              return problemJson(
                403,
                'Forbidden',
                'Access denied: branch scoping violation.',
                'ERR_IAM_INSUFFICIENT_PERMISSIONS'
              );
            }
          } else {
            // Default list to session's active branch
            finalBranchId = session.activeBranchId || undefined;
          }
        }

        const batches = await batchService.batchRepository.findAll({
          branchId: finalBranchId,
          courseId: courseFilter,
          status: statusFilter,
        });

        const response = NextResponse.json(
          {
            success: true,
            data: { batches },
          },
          { status: 200 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.list.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'batch.delivery.create', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return problemJson(
          400,
          'Invalid request body',
          'Request body must be valid JSON.',
          'CRS-VAL-BATCHES-INVALID_JSON'
        );
      }

      const parsed = createBatchSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Batch details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
        const result = await batchService.createBatch(
          {
            ...parsed.data,
            startDate: new Date(parsed.data.startDate),
            endDate: new Date(parsed.data.endDate),
          },
          session.userId
        );

        const response = NextResponse.json(
          {
            success: true,
            data: result,
          },
          { status: 201 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.create.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches' });
}
