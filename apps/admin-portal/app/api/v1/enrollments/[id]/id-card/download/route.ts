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
  let code = 'ERR_ENR_INTERNAL_ERROR';

  if (msg.includes('ERR_ENROLLMENT_NOT_FOUND')) {
    status = 404;
    code = 'ERR_ENROLLMENT_NOT_FOUND';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  } else if (msg.includes('ERR_ENROLLMENT_NOT_CONFIRMED')) {
    status = 422;
    code = 'ERR_ENROLLMENT_NOT_CONFIRMED';
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
  const { id: enrollmentId } = await props.params;
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'enrollment.read', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { prisma, branchScopeResolver } =
            await import('../../../../../../../lib/runtime');
          const { jsPDF } = await import('jspdf');
          const bwipjs = await import('bwip-js');
          const QRCode = await import('qrcode');

          const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
              studentProfile: {
                include: {
                  person: true,
                  branch: true,
                },
              },
              course: true,
              batch: true,
            },
          });

          if (!enrollment || enrollment.isDeleted) {
            throw new Error('ERR_ENROLLMENT_NOT_FOUND');
          }

          // Verify branch permission scope
          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              session.userId,
              session.activeBranchId ?? null,
            );
          if (!allowedBranches.includes(enrollment.branchId as Uuid)) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          if (enrollment.enrollmentStatus !== 'Confirmed') {
            throw new Error('ERR_ENROLLMENT_NOT_CONFIRMED');
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
            logger.error('Failed to read ASTI logo for enrollment card', { error: logoErr as Error });
          }

          // Fetch student photoUrl if exists
          let photoImgData: string | null = null;
          const person = enrollment.studentProfile.person;
          if (person.photoUrl) {
            try {
              const token = process.env.BLOB_READ_WRITE_TOKEN;
              const fetchResult = await fetch(person.photoUrl, {
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
              logger.error('Failed to fetch student photoUrl for enrollment card', {
                error: photoErr as Error,
              });
            }
          }

          // Render barcode buffer using bwip-js
          let barcodeImgData: string | null = null;
          try {
            const barcodeBuffer = await new Promise<Buffer>((resolve, reject) => {
              bwipjs.toBuffer(
                {
                  bcid: 'code128',
                  text: enrollment.enrollmentNumber,
                  scale: 3,
                  height: 10,
                  includetext: false,
                },
                (err, png) => {
                  if (err) reject(err);
                  else resolve(png);
                },
              );
            });
            barcodeImgData = `data:image/png;base64,${barcodeBuffer.toString('base64')}`;
          } catch (barcodeErr) {
            logger.error('Failed to generate Code 128 barcode', { error: barcodeErr as Error });
          }

          // Render QR code buffer using qrcode package
          let qrImgData: string | null = null;
          try {
            const verificationUrl = `https://verify.asti.ae/enrollment/${enrollment.enrollmentNumber}`;
            const qrBuffer = await QRCode.toBuffer(verificationUrl, {
              errorCorrectionLevel: 'M',
              type: 'png',
              margin: 1,
              width: 150,
            });
            qrImgData = `data:image/png;base64,${qrBuffer.toString('base64')}`;
          } catch (qrErr) {
            logger.error('Failed to generate QR code', { error: qrErr as Error });
          }

          // 2. Draw Teal-900 Background for Front Side
          doc.setFillColor(13, 78, 74); // #134e4a
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

          doc.setTextColor(204, 251, 241); // teal-100
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.text('ASTI Institute Management System', textX, 11);

          // 4. Draw Emerald "ENROLLED" Badge
          doc.setFillColor(16, 185, 129); // emerald-500
          doc.rect(65, 5, 15, 4, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(4);
          doc.setFont('helvetica', 'bold');
          doc.text('ENROLLED', 68.5, 7.8);

          // 5. Draw Photo or Placeholder on Left
          if (photoImgData) {
            const format = person.photoUrl?.endsWith('.png') ? 'PNG' : 'JPEG';
            doc.addImage(photoImgData, format, 6, 16, 16, 20);
          } else {
            doc.setFillColor(13, 78, 74); // teal-900 fallback fill
            doc.rect(6, 16, 16, 20, 'F');
            doc.setDrawColor(15, 118, 110); // teal-700
            doc.rect(6, 16, 16, 20, 'D');

            doc.setTextColor(204, 251, 241); // teal-100
            doc.setFontSize(5);
            doc.setFont('helvetica', 'bold');
            doc.text('PHOTO', 10, 27);
          }

          // 6. Draw Student details on Right
          const fullName = `${person.firstName} ${person.lastName}`.trim().toUpperCase();
          const enrollmentNumber = enrollment.enrollmentNumber;
          const courseName = enrollment.course.nameEnglish || 'N/A';
          const branchName = enrollment.studentProfile.branch?.branchName || 'N/A';
          const batchCode = enrollment.batch?.batchCode || 'WAITLIST';

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);

          // Handle potential name overflow
          const truncatedName = fullName.length > 20 ? fullName.substring(0, 17) + '...' : fullName;
          doc.text(truncatedName, 26, 21);

          doc.setTextColor(204, 251, 241); // teal-100
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.text(`ID: ${enrollmentNumber}`, 26, 26);

          doc.setFontSize(5);
          const truncatedCourse = courseName.length > 28 ? courseName.substring(0, 25) + '...' : courseName;
          doc.text(`Course: ${truncatedCourse}`, 26, 31);
          doc.text(`Batch: ${batchCode} | Branch: ${branchName}`, 26, 35);

          // 7. Footer divider and VALID UNTIL
          doc.setDrawColor(15, 118, 110); // teal-700
          doc.line(6, 41, 80, 41);

          // Resolve validity date
          let validityDateStr = 'DEC 2026';
          if (enrollment.batch?.endDate) {
            const endDate = new Date(enrollment.batch.endDate);
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            validityDateStr = `${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
          } else {
            const fallbackDate = new Date(enrollment.updatedAt || enrollment.createdAt);
            fallbackDate.setMonth(fallbackDate.getMonth() + 12);
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            validityDateStr = `${months[fallbackDate.getMonth()]} ${fallbackDate.getFullYear()}`;
          }

          doc.setTextColor(204, 251, 241);
          doc.setFontSize(4.5);
          doc.text(`VALID UNTIL: ${validityDateStr}`, 6, 45);
          doc.text('ASTI-ENR-CARD', 62, 45);

          // Render barcode image
          if (barcodeImgData) {
            doc.setFillColor(255, 255, 255); // white box wrapper
            doc.rect(6, 46.5, 74, 6, 'F');
            doc.addImage(barcodeImgData, 'PNG', 7, 47, 72, 5);
          }

          // 8. Draw Back Side of ID Card on Page 2
          doc.addPage([85.6, 54], 'landscape');

          // Draw Slate-900 Background
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
          doc.text('ASTI-ENR-V1', 68, 10);

          // Draw T&C Lines
          doc.setTextColor(224, 231, 255); // indigo-100
          doc.setFontSize(4.2);
          doc.text('1. This card is issued for the enrolled course only and is non-transferable.', 6, 17);
          doc.text('2. Cardholder must present this card upon request by institute authorities.', 6, 22);
          doc.text('3. If lost, damaged, or withdrawn, this card becomes void immediately.', 6, 27);
          doc.text('4. For batch changes or re-enrollment, contact the administration office.', 6, 32);

          // Divider Line before footer
          doc.setDrawColor(30, 41, 59); // slate-800
          doc.line(6, 35, 80, 35);

          // Footer Text
          doc.setTextColor(165, 180, 252); // indigo-300
          doc.setFontSize(4.2);
          doc.text('ASTI Dubai Campus', 6, 39);
          doc.text('Tel: +971 4 123 4567 | info@asti.ae', 6, 43);

          // Registrar Signature Placeholder
          doc.setDrawColor(79, 70, 229); // indigo-600
          doc.line(60, 39, 80, 39);
          doc.setTextColor(199, 210, 254);
          doc.setFontSize(3.8);
          doc.text('Registrar', 66, 42);

          // Add QR Code at the top-right
          if (qrImgData) {
            doc.setFillColor(255, 255, 255);
            doc.rect(60, 14, 20, 20, 'F');
            doc.addImage(qrImgData, 'PNG', 60.5, 14.5, 19, 19);
            doc.setTextColor(165, 180, 252);
            doc.setFontSize(3.5);
            doc.text('verify.asti.ae', 64, 34);
          }

          // 9. Generate buffer and return
          const pdfOutput = doc.output('arraybuffer');
          const buffer = Buffer.from(pdfOutput);

          const response = new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="course-card-${enrollmentNumber}.pdf"`,
            },
          });

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/enrollments/[id]/id-card/download',
            method: request.method,
            status: 'success',
          });

          logger.info('api.enrollments.idcard.download.success', {
            entityId: enrollmentId,
            entityType: 'Enrollment',
            action: 'download',
            userId: session.userId,
            branchId: enrollment.branchId,
          });

          return response;
        } catch (error) {
          logger.error('api.enrollments.idcard.download.failed', {
            entityId: enrollmentId,
            entityType: 'Enrollment',
            action: 'download',
            userId: session.userId,
            status: 'failed',
            error: error as Error,
          });
          return errorResponse(error as Error);
        }
      }),
    { route: '/api/v1/enrollments/[id]/id-card/download' },
  );
}
