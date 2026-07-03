import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';

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
        const { otpService, prisma } = await import('../../../../../lib/runtime');

        // 1. Verify OTP
        const valid = await otpService.verifyOtp(parsed.data.existingPersonId, parsed.data.otpCode);
        if (!valid) {
          return NextResponse.json(
            { success: false, errorCode: 'ERR_OTP_INVALID_OR_EXPIRED', messageEnglish: 'The OTP is invalid or has expired. Please request a new code.', statusCode: 422 },
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

        // 4. Create the cross-branch Admission record
        const seqResult = await prisma.$queryRawUnsafe<{ nextval: string }[]>(
          "SELECT nextval('admission_number_seq')::text as nextval"
        );
        const seq = seqResult[0]?.nextval ?? Math.floor(Math.random() * 100000).toString();
        const admissionNumber = `ADM-2026-${seq.padStart(5, '0')}`;

        const admission = await prisma.admission.create({
          data: {
            admissionNumber,
            personId: parsed.data.existingPersonId,
            studentProfileId: parsed.data.existingStudentProfileId,
            branchId: parsed.data.branchId,
            admissionStatus: 'Approved',
            approvedAt: new Date(),
            createdBy: session.userId,
            updatedBy: session.userId,
          },
        });

        // 5. Audit log
        await prisma.auditLog.create({
          data: {
            action: 'StudentProfileClaimed',
            entityType: 'Admission',
            entityId: admission.id,
            performedBy: session.userId,
            branchId: parsed.data.branchId,
            performedAt: new Date(),
            module: 'AdmissionsEnrollment',
            newValue: {
              admissionNumber,
              existingPersonId: parsed.data.existingPersonId,
              existingStudentProfileId: parsed.data.existingStudentProfileId,
              claimedByBranchId: parsed.data.branchId,
            },
          },
        });

        logger.info('api.students.claim-profile.success', { status: 'success' });

        return NextResponse.json(
          { success: true, data: { admissionId: admission.id, admissionNumber } },
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
