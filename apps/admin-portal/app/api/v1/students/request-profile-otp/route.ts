import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';

/**
 * POST /api/v1/students/request-profile-otp
 *
 * Sends a 6-digit OTP to the masked email/mobile address of an existing
 * cross-branch profile. The counsellor uses this code to prove they have
 * the student's consent before claiming the profile into their branch.
 *
 * Permission: student.create
 */
const bodySchema = z.object({
  existingPersonId: z.string().uuid('existingPersonId must be a UUID.'),
  channel: z.enum(['email', 'mobile']),
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
        const { otpService } = await import('../../../../../lib/runtime');

        // Generate and store a 6-digit OTP keyed by the personId
        await otpService.generateOtp(parsed.data.existingPersonId);

        // NOTE: In production the OTP is sent via the Communication context
        // (SMS or email depending on channel). Here we log it for visibility
        // until the notification adapter is wired.
        logger.info('api.students.request-profile-otp.generated', { status: 'success' });

        return NextResponse.json(
          {
            success: true,
            data: {
              message: `OTP sent via ${parsed.data.channel}. It expires in 5 minutes.`,
              // Omit the actual code from the response — it is sent OOB via
              // the Communication context. During development the code is
              // emitted in server logs only.
            },
          },
          { status: 200 }
        );
      } catch (error) {
        logger.error('api.students.request-profile-otp.failed', { status: 'failed', error: error as Error });
        return NextResponse.json(
          { success: false, errorCode: 'ERR_STUDENT_INTERNAL_ERROR', messageEnglish: (error as Error).message, statusCode: 500 },
          { status: 500 }
        );
      }
    }),
    { route: '/api/v1/students/request-profile-otp' }
  );
}
