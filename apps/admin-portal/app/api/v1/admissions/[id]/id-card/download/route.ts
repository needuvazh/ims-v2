import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ADMISSION_INTERNAL_ERROR';

  if (msg.includes('ERR_ADMISSION_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ADMISSION_NOT_FOUND';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  } else if (msg.includes('ERR_ADMISSION_NOT_APPROVED')) {
    status = 422;
    code = 'ERR_ADMISSION_NOT_APPROVED';
  }

  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      messageEnglish: msg,
      statusCode: status,
    },
    { status },
  );
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id: admissionId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'admission.read', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { prisma, branchScopeResolver } =
            await import('../../../../../../../lib/runtime');
          const { jsPDF } = await import('jspdf');

          const admission = await prisma.admission.findUnique({
            where: { id: admissionId },
            include: {
              person: true,
              studentProfile: true,
              branch: true,
              course: true,
            },
          });

          if (!admission || admission.isDeleted) {
            throw new Error('ERR_ADMISSION_NOT_FOUND');
          }

          // Verify branch permission scope
          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              session.userId,
              session.activeBranchId ?? null,
            );
          if (!allowedBranches.includes(admission.branchId as Uuid)) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          if (admission.admissionStatus !== 'Approved') {
            throw new Error('ERR_ADMISSION_NOT_APPROVED');
          }

          // 1. Initialize CR80 ID Card dimensions (85.6mm x 54mm)
          const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [85.6, 54],
          });

          // 2. Draw Dark Indigo Background
          doc.setFillColor(30, 27, 75); // #1e1b4b
          doc.rect(0, 0, 85.6, 54, 'F');

          // 3. Draw Header Title and Subtitle
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('AL SAUD TRAINING INST.', 6, 8);

          doc.setTextColor(199, 210, 254); // indigo-200
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.text('ASTI Institute Management System', 6, 11);

          // 4. Draw Emerald "ACTIVE" Badge
          doc.setFillColor(16, 185, 129); // emerald-500
          doc.rect(68, 5, 12, 4, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(4);
          doc.setFont('helvetica', 'bold');
          doc.text('ACTIVE', 71, 7.8);

          // 5. Draw Photo Placeholder on Left
          doc.setFillColor(67, 56, 202); // indigo-700
          doc.rect(6, 16, 16, 20, 'F');
          doc.setDrawColor(99, 102, 241); // indigo-500
          doc.rect(6, 16, 16, 20, 'D');

          doc.setTextColor(199, 210, 254);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.text('PHOTO', 10, 27);

          // 6. Draw Student details on Right
          const fullName =
            `${admission.person.firstName} ${admission.person.lastName}`
              .trim()
              .toUpperCase();
          const studentNumber = admission.studentProfile.studentNumber;
          const cardId = admission.studentProfile.idCardNumber || studentNumber;
          const courseName = admission.course?.nameEnglish || 'N/A';
          const branchName = admission.branch?.branchName || 'N/A';

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);

          // Handle potential name overflow
          const truncatedName =
            fullName.length > 20 ? fullName.substring(0, 17) + '...' : fullName;
          doc.text(truncatedName, 26, 21);

          doc.setTextColor(199, 210, 254);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.text(`ID: ${cardId}`, 26, 26);

          doc.setFontSize(5);
          doc.text(
            `Course: ${courseName.length > 28 ? courseName.substring(0, 25) + '...' : courseName}`,
            26,
            31,
          );
          doc.text(`Branch: ${branchName}`, 26, 35);

          // 7. Footer divider and VALID UNTIL
          doc.setDrawColor(79, 70, 229); // indigo-600
          doc.line(6, 42, 80, 42);

          doc.setTextColor(199, 210, 254);
          doc.setFontSize(4.5);
          doc.text('VALID UNTIL: DEC 2026', 6, 46);
          doc.text('ASTI-STU-CARD', 65, 46);

          // 8. Generate buffer and return
          const pdfOutput = doc.output('arraybuffer');
          const buffer = Buffer.from(pdfOutput);

          const response = new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="id-card-${studentNumber}.pdf"`,
            },
          });

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/admissions/[id]/id-card/download',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.admissions.idcard.download.failed', {
            status: 'failed',
            error: error as Error,
          });
          return errorResponse(error as Error);
        }
      }),
    { route: '/api/v1/admissions/[id]/id-card/download' },
  );
}
