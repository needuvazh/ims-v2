import { NextResponse } from 'next/server';
import { withAuth } from '../../../../../lib/api-middleware';
import { hasPermission } from '@ims/shared-auth';

export async function GET(request: Request) {
  try {
    const { session } = await withAuth(request);
    if (!hasPermission(session, 'student.portal.self.read')) {
      return NextResponse.json(
        { success: false, errorCode: 'ERR_AUTH_FORBIDDEN', messageEnglish: 'Access denied.', statusCode: 403 },
        { status: 403 }
      );
    }

    const { prisma } = await import('../../../../../lib/runtime');
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { personId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'ERR_STU_PROFILE_NOT_FOUND', messageEnglish: 'Student profile not found.', statusCode: 404 },
        { status: 404 }
      );
    }

    const profile = await prisma.studentProfile.findFirst({
      where: { personId: user.personId, isDeleted: false },
      include: {
        person: true,
        branch: true,
        idCardHistory: {
          where: { isDeleted: false },
          orderBy: { eventDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, errorCode: 'ERR_STU_PROFILE_NOT_FOUND', messageEnglish: 'Student profile not found.', statusCode: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        studentNumber: profile.studentNumber,
        branchName: profile.branch.branchName,
        status: profile.status,
        idCardIssued: profile.idCardIssued,
        idCardNumber: profile.idCardNumber,
        firstName: profile.person.firstName,
        lastName: profile.person.lastName,
        mobile: profile.person.mobile,
        email: profile.person.email,
        idCardHistory: profile.idCardHistory.map((entry) => ({
          id: entry.id,
          eventType: entry.eventType,
          newIdCardNumber: entry.newIdCardNumber,
          eventDate: entry.eventDate,
          reason: entry.reason,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, errorCode: 'ERR_STUDENT_INTERNAL_ERROR', messageEnglish: (error as Error).message, statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, errorCode: 'ERR_AUTH_FORBIDDEN', messageEnglish: 'Student portal profile is read-only.', statusCode: 403 },
    { status: 403 }
  );
}
