'use server';

import { revalidatePath } from 'next/cache';
import { assertPermission, getSession } from '../../lib/auth-guard';
import {
  GenerateCertificateService,
  IssueCertificateService,
  ReissueService,
  RevocationService,
  PrismaEnrollmentReadAdapter,
  PrismaCompletionReadAdapter,
  PrismaFinanceValidationAdapter,
  PrismaNumberingAdapter,
  PrismaAuditAdapter,
  PrismaNotificationAdapter,
  GenerateCertificateCommandSchema,
  IssueCertificateCommandSchema,
  SubmitReissueRequestSchema,
  ReviewReissueRequestSchema,
  GenerateReplacementCertificateSchema,
  RevokeCertificateSchema,
} from '@ims/certificates';

function buildCertificateActionFailure(error: any) {
  if (error instanceof Error) {
    return {
      success: false as const,
      error: error.message,
      code: (error as any).code || 'CERTIFICATE_ACTION_FAILED',
    };
  }
  return {
    success: false as const,
    error: 'An unknown error occurred',
    code: 'UNKNOWN_SYSTEM_ERROR',
  };
}

export async function generateCertificateAction(data: any) {
  try {
    await assertPermission('certificate.create');
    const session = await getSession();

    const validated = GenerateCertificateCommandSchema.parse(data);

    const enrollmentReadPort = new PrismaEnrollmentReadAdapter();
    const completionReadPort = new PrismaCompletionReadAdapter();
    const financeValidationPort = new PrismaFinanceValidationAdapter();
    const numberingPort = new PrismaNumberingAdapter();
    const auditPort = new PrismaAuditAdapter();

    const service = new GenerateCertificateService(
      enrollmentReadPort,
      completionReadPort,
      financeValidationPort,
      numberingPort,
      auditPort
    );

    const certificateId = await service.execute(validated, session.userId);

    revalidatePath('/certificates');
    return { success: true as const, data: { id: certificateId } };
  } catch (error: any) {
    return buildCertificateActionFailure(error);
  }
}

export async function issueCertificateAction(data: any) {
  try {
    await assertPermission('certificate.issue');
    const session = await getSession();

    const validated = IssueCertificateCommandSchema.parse(data);

    const auditPort = new PrismaAuditAdapter();
    const notificationPort = new PrismaNotificationAdapter();

    const service = new IssueCertificateService(auditPort, notificationPort);
    await service.execute(validated, session.userId);

    revalidatePath('/certificates');
    return { success: true as const };
  } catch (error: any) {
    return buildCertificateActionFailure(error);
  }
}

export async function submitReissueRequestAction(data: any) {
  try {
    await assertPermission('certificate.reissue');
    const session = await getSession();

    const validated = SubmitReissueRequestSchema.parse(data);

    const auditPort = new PrismaAuditAdapter();
    const numberingPort = new PrismaNumberingAdapter();
    const enrollmentReadPort = new PrismaEnrollmentReadAdapter();

    const service = new ReissueService(auditPort, numberingPort, enrollmentReadPort);
    const requestId = await service.submitRequest(validated, session.userId);

    revalidatePath('/certificates/reissue');
    return { success: true as const, data: { id: requestId } };
  } catch (error: any) {
    return buildCertificateActionFailure(error);
  }
}

export async function reviewReissueRequestAction(data: any) {
  try {
    await assertPermission('certificate.reissue');
    const session = await getSession();

    const validated = ReviewReissueRequestSchema.parse(data);

    const auditPort = new PrismaAuditAdapter();
    const numberingPort = new PrismaNumberingAdapter();
    const enrollmentReadPort = new PrismaEnrollmentReadAdapter();

    const service = new ReissueService(auditPort, numberingPort, enrollmentReadPort);
    await service.reviewRequest(validated, session.userId);

    revalidatePath('/certificates/reissue');
    return { success: true as const };
  } catch (error: any) {
    return buildCertificateActionFailure(error);
  }
}

export async function generateReplacementCertificateAction(data: any) {
  try {
    await assertPermission('certificate.create');
    const session = await getSession();

    const validated = GenerateReplacementCertificateSchema.parse(data);

    const auditPort = new PrismaAuditAdapter();
    const numberingPort = new PrismaNumberingAdapter();
    const enrollmentReadPort = new PrismaEnrollmentReadAdapter();

    const service = new ReissueService(auditPort, numberingPort, enrollmentReadPort);
    const certificateId = await service.generateReplacement(validated, session.userId);

    revalidatePath('/certificates');
    revalidatePath('/certificates/reissue');
    return { success: true as const, data: { id: certificateId } };
  } catch (error: any) {
    return buildCertificateActionFailure(error);
  }
}

export async function revokeCertificateAction(data: any) {
  try {
    await assertPermission('certificate.revoke');
    const session = await getSession();

    const validated = RevokeCertificateSchema.parse(data);

    const auditPort = new PrismaAuditAdapter();
    const service = new RevocationService(auditPort);
    await service.execute(validated, session.userId);

    revalidatePath('/certificates');
    return { success: true as const };
  } catch (error: any) {
    return buildCertificateActionFailure(error);
  }
}
