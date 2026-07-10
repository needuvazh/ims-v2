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
              studentProfile: {
                include: {
                  branch: true,
                },
              },
              course: true,
            },
          });

          if (!admission || admission.isDeleted || !admission.studentProfile) {
            throw new Error('ERR_ADMISSION_NOT_FOUND');
          }

          // Verify branch permission scope
          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              session.userId,
              session.activeBranchId ?? null,
            );
          if (!allowedBranches.includes(admission.studentProfile.branchId as Uuid)) {
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

          // Load ASTI logo from local filesystem
          let logoImgData: string | null = null;
          try {
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            const logoPath = path.join(process.cwd(), 'public/alsaud/logo.png');
            const logoBuffer = await fs.readFile(logoPath);
            const logoBase64 = logoBuffer.toString('base64');
            logoImgData = `data:image/png;base64,${logoBase64}`;
          } catch (logoErr) {
            logger.error('Failed to read ASTI logo', { error: logoErr as Error });
          }

          // Fetch student photoUrl if exists
          let photoImgData: string | null = null;
          if (admission.person.photoUrl) {
            try {
              const token = process.env.BLOB_READ_WRITE_TOKEN;
              const fetchResult = await fetch(admission.person.photoUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (fetchResult.ok) {
                const arrayBuffer = await fetchResult.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const contentType = fetchResult.headers.get('content-type') || 'image/jpeg';
                photoImgData = `data:${contentType};base64,${base64}`;
              }
            } catch (photoErr) {
              logger.error('Failed to fetch student photoUrl for PDF ID card', {
                error: photoErr as Error,
              });
            }
          }

          // 2. Draw Dark Indigo Background
          doc.setFillColor(30, 27, 75); // #1e1b4b
          doc.rect(0, 0, 85.6, 54, 'F');

          // 3. Draw Header Title, Logo and Subtitle
          let textX = 6;
          if (logoImgData) {
            doc.addImage(logoImgData, 'PNG', 6, 4, 6, 6);
            textX = 14;
          }

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('AL SAUD TRAINING INST.', textX, 8);

          doc.setTextColor(199, 210, 254); // indigo-200
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.text('ASTI Institute Management System', textX, 11);

          // 4. Draw Emerald "ACTIVE" Badge
          doc.setFillColor(16, 185, 129); // emerald-500
          doc.rect(68, 5, 12, 4, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(4);
          doc.setFont('helvetica', 'bold');
          doc.text('ACTIVE', 71, 7.8);

          // 5. Draw Photo or Placeholder on Left
          if (photoImgData) {
            const format = admission.person.photoUrl?.endsWith('.png') ? 'PNG' : 'JPEG';
            doc.addImage(photoImgData, format, 6, 16, 16, 20);
          } else {
            doc.setFillColor(67, 56, 202); // indigo-700
            doc.rect(6, 16, 16, 20, 'F');
            doc.setDrawColor(99, 102, 241); // indigo-500
            doc.rect(6, 16, 16, 20, 'D');

            doc.setTextColor(199, 210, 254);
            doc.setFontSize(5);
            doc.setFont('helvetica', 'bold');
            doc.text('PHOTO', 10, 27);
          }

          // 6. Draw Student details on Right
          const fullName =
            `${admission.person.firstName} ${admission.person.lastName}`
              .trim()
              .toUpperCase();
          const studentNumber = admission.studentProfile.studentNumber;
          const cardId = admission.studentProfile.idCardNumber || studentNumber;
          const courseName = admission.course?.nameEnglish || 'N/A';
          const branchName = admission.studentProfile.branch?.branchName || 'N/A';

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

          // 8. Draw Back Side of ID Card on Page 2
          doc.addPage([85.6, 54], 'landscape');

          // Draw Dark Indigo Background
          doc.setFillColor(15, 23, 42); // slate-900 / bg-indigo-950 equivalent
          doc.rect(0, 0, 85.6, 54, 'F');

          // Draw T&C Header Line
          doc.setDrawColor(30, 41, 59); // slate-800
          doc.line(6, 12, 80, 12);

          doc.setTextColor(199, 210, 254); // indigo-200
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.text('TERMS & CONDITIONS', 6, 10);
          doc.setFont('helvetica', 'normal');
          doc.text('ASTI-STU-V2', 68, 10);

          // Draw T&C Lines
          doc.setTextColor(224, 231, 255); // indigo-100
          doc.setFontSize(4.2);
          doc.text('1. This card is the property of Al Saud Training Institute (ASTI) and is non-transferable.', 6, 17);
          doc.text('2. Cardholder must present this card upon request by institute authorities.', 6, 22);
          doc.text('3. If lost or damaged, contact the administration office immediately for a reissue.', 6, 27);

          // Divider Line before footer
          doc.setDrawColor(30, 41, 59); // slate-800
          doc.line(6, 32, 80, 32);

          // Footer Text
          doc.setTextColor(165, 180, 252); // indigo-300
          doc.setFontSize(4.2);
          doc.text('ASTI Dubai Campus', 6, 37);
          doc.text('Tel: +971 4 123 4567 | info@asti.ae', 6, 41);

          // Registrar Signature Placeholder
          doc.setDrawColor(79, 70, 229); // indigo-600
          doc.line(60, 37, 80, 37);
          doc.setTextColor(199, 210, 254);
          doc.setFontSize(3.8);
          doc.text('Registrar', 66, 40);

          // Mock Barcode
          doc.setFillColor(255, 255, 255); // White background box for barcode
          doc.rect(6, 44, 74, 5, 'F');

          // Draw lines of varying spacing and thicknesses to simulate barcode
          doc.setFillColor(0, 0, 0); // Black lines
          const barcodePattern = [
            1, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1,
            1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2,
          ];
          let currentX = 8;
          for (const width of barcodePattern) {
            doc.rect(currentX, 45, width * 0.4, 3, 'F');
            currentX += (width + 1.5) * 0.5;
          }

          // 9. Generate buffer and return
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
