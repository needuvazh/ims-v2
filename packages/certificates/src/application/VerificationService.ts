import { prisma } from '@ims/database';
import { DomainError, ErrorCodes } from '../domain/errors';
import {
  PublicVerificationInput,
  PublicVerificationInputSchema,
} from '../domain/validators';

export interface VerificationResult {
  status: 'VALID' | 'REVOKED' | 'REPLACED' | 'INVALID';
  certificateNumber?: string;
  studentDisplayName?: string;
  studentNumber?: string;
  courseCode?: string;
  courseName?: string;
  issuedDate?: Date;
  language?: string;
  revocationReason?: string;
  revokedAt?: Date;
  photoUrl?: string;
  email?: string;
  mobile?: string;
  nationalId?: string;
  passportNumber?: string;
  nationality?: string;
  gender?: string;
  dateOfBirth?: Date;
  batchCode?: string;
  batchName?: string;
  certificateUrl?: string;
}

export class VerificationService {
  async verify(
    input: PublicVerificationInput,
    clientIp?: string,
  ): Promise<VerificationResult> {
    const validated = PublicVerificationInputSchema.parse(input);

    // Query certificate by verification code
    const certificate = await prisma.certificate.findUnique({
      where: { verificationCode: validated.verificationCode },
      include: {
        studentProfile: {
          include: {
            person: true,
          },
        },
        course: true,
        batch: true,
      },
    });

    if (!certificate || certificate.certificateStatus === 'Generated') {
      return { status: 'INVALID' };
    }

    const displayName = `${certificate.studentProfile.person.firstName} ${certificate.studentProfile.person.lastName}`;
    const courseName =
      certificate.language === 'ar'
        ? certificate.course.nameArabic
        : certificate.course.nameEnglish;

    const batchName =
      certificate.language === 'ar'
        ? certificate.batch.batchNameArabic
        : certificate.batch.batchNameEnglish;

    let resultStatus: 'VALID' | 'REVOKED' | 'REPLACED' = 'VALID';
    if (certificate.certificateStatus === 'Revoked') {
      resultStatus = 'REVOKED';
    } else if (certificate.certificateStatus === 'Replaced') {
      resultStatus = 'REPLACED';
    }

    // Record verification attempt in database
    await prisma.certificateVerification.create({
      data: {
        certificateId: certificate.id,
        verificationCode: validated.verificationCode,
        verifiedByIp: clientIp || null,
        verificationStatus: resultStatus,
      },
    });

    return {
      status: resultStatus,
      certificateNumber: certificate.certificateNumber,
      studentDisplayName: displayName,
      studentNumber: certificate.studentProfile.studentNumber,
      courseCode: certificate.course.courseCode,
      courseName,
      issuedDate: certificate.issuedDate || undefined,
      language: certificate.language,
      revocationReason: certificate.revocationReason || undefined,
      revokedAt: certificate.revokedAt || undefined,
      photoUrl: certificate.studentProfile.person.photoUrl || undefined,
      email: certificate.studentProfile.person.email || undefined,
      mobile: certificate.studentProfile.person.mobile || undefined,
      nationalId: certificate.studentProfile.person.nationalId || undefined,
      passportNumber: certificate.studentProfile.person.passportNumber || undefined,
      nationality: certificate.studentProfile.person.nationality || undefined,
      gender: certificate.studentProfile.person.gender || undefined,
      dateOfBirth: certificate.studentProfile.person.dateOfBirth || undefined,
      batchCode: certificate.batch.batchCode,
      batchName,
      certificateUrl: certificate.certificateUrl || undefined,
    };
  }
}
