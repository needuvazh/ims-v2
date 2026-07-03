import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { createUuid } from '@ims/shared-kernel';

/**
 * POST /api/v1/students/claim-profile
 *
 * Claims an existing cross-branch StudentProfile into the counsellor's branch
 * by verifying the OTP the student received. On success it creates a new
 * Admission record linking the existing StudentProfile to this branch.
 *
 * Business rules:
 *  - OTP must be valid and not expired (5 min window).
 *  - The target StudentProfile must not already have an active admission
 *    at the claiming branch.
 *  - The new Admission is created with status "Approved" because the
 *    counsellor has verified identity via OTP.
 *
 * Permission: student.create
 */
const bodySchema = z.object({
  existingPersonId: z.string().uuid(),
  existingStudentProfileId: z.string().uuid(),
  branchId: z.string().uuid(),
  otpCode: z.string().length(6, 'OTP must be exactly 6 digits.'),
});

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'student.create', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, errorCode: 'ERR_VAL_BODY_MISSING', messageEnglish: 'Request body is required.', statusCode: 400 },
          { status: 400 }
        );
      }

      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, errorCode: 'ERR_VAL_FAILED', messageEnglish: parsed.error.issues[0]?.message ?? 'Validation failed.', statusCode: 400 },
          { status: 400 }
        );
      }

      try {
        const { otpService, admissionService, branchScopeResolver, prisma } = await import('../../../../../lib/runtime');

        const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
          createUuid(session.userId),
          session.activeBranchId ? createUuid(session.activeBranchId) : null
        );
        if (!allowedBranches.some((branchId) => branchId === parsed.data.branchId)) {
          return NextResponse.json(
            { success: false, errorCode: 'ERR_AUTH_BRANCH_SCOPE_DENIED', messageEnglish: 'Target branch is outside your allowed scope.', statusCode: 403 },
            { status: 403 }
          );
        }

        // 1. Verify OTP
        const valid = await otpService.verifyOtp(parsed.data.existingPersonId, parsed.data.otpCode);
        if (!valid) {
          return NextResponse.json(
            { success: false, errorCode: 'ERR_STU_OTP_INVALID', messageEnglish: 'The OTP is invalid or has expired. Please request a new code.', statusCode: 422 },
            { status: 422 }
          );
        }

        // 2. Guard: profile must exist
        const profile = await prisma.studentProfile.findUnique({
          where: { id: parsed.data.existingStudentProfileId },
        });
        if (!profile || profile.isDeleted) {
          return NextResponse.json(
            { success: false, errorCode: 'ERR_STU_PROFILE_NOT_FOUND', messageEnglish: 'Student profile not found.', statusCode: 404 },
            { status: 404 }
          );
        }

        // 3. Guard: no active admission at this branch already
        const existingAdmission = await prisma.admission.count({
          where: {
            studentProfileId: parsed.data.existingStudentProfileId,
            branchId: parsed.data.branchId,
            isDeleted: false,
            admissionStatus: { in: ['Draft', 'Submitted', 'Approved'] },
          },
        });
        if (existingAdmission > 0) {
          return NextResponse.json(
            { success: false, errorCode: 'ERR_ADM_ACTIVE_ADMISSION_EXISTS', messageEnglish: 'This student already has an active admission at the target branch.', statusCode: 409 },
            { status: 409 }
          );
        }

        const admission = await admissionService.createAdmissionDraftDirect(
          {
            studentProfileId: parsed.data.existingStudentProfileId,
            courseId: null,
            leadId: null,
          },
          parsed.data.branchId,
          session.userId,
          prisma
        );

        logger.info('api.students.claim-profile.success', { status: 'success' });

        return NextResponse.json(
          { success: true, data: { admissionId: admission.admissionId } },
          { status: 201 }
        );
      } catch (error) {
        logger.error('api.students.claim-profile.failed', { status: 'failed', error: error as Error });
        return NextResponse.json(
          { success: false, errorCode: 'ERR_STUDENT_INTERNAL_ERROR', messageEnglish: (error as Error).message, statusCode: 500 },
          { status: 500 }
        );
      }
    }),
    { route: '/api/v1/students/claim-profile' }
  );
}
