import { put } from '@vercel/blob';

/**
 * Generates a minimal but valid PDF for a certificate and uploads it to
 * Vercel Blob storage. Returns the public blob URL so that it can be
 * persisted on the Certificate record and served from anywhere (including
 * Vercel's read-only serverless runtime where the local filesystem is not
 * writable).
 *
 * The PDF content is a lightweight hand-crafted PDF-1.4 document – no
 * external PDF library dependency required. Replace with a proper template
 * renderer (e.g. react-pdf / puppeteer) when a production design is ready.
 */
export async function savePdfToBlob(
  certNumber: string,
  studentNumber: string,
  verificationCode: string,
): Promise<string> {
  const pdfContent = buildMinimalPdf(certNumber, studentNumber, verificationCode);

  const blob = await put(
    `certificates/${certNumber}.pdf`,
    Buffer.from(pdfContent, 'utf-8'),
    {
      access: 'public',
      contentType: 'application/pdf',
      // Allow overwrite so that a replacement certificate with the same
      // number can be re-generated without a conflict error.
      allowOverwrite: true,
    },
  );

  return blob.url;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildMinimalPdf(
  certNumber: string,
  studentNumber: string,
  verificationCode: string,
): string {
  return `%PDF-1.4
%
1 0 obj
<< /Title (Certificate of Completion) /Author (ASTI) /Creator (IMS-V2) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595.275 841.889] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
5 0 obj
<< /Length 150 >>
stream
BT
/F1 24 Tf
70 700 Td
(AL SAUD TRAINING INSTITUTE) Tj
/F1 18 Tf
0 -40 Td
(Certificate of Completion: ${certNumber}) Tj
0 -30 Td
(Student ID: ${studentNumber}) Tj
0 -30 Td
(Verification Code: ${verificationCode}) Tj
0 -45 Td
(This is an authentic ASTI digital credential.) Tj
ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f 
0000000015 00000 n 
0000000104 00000 n 
0000000154 00000 n 
0000000213 00000 n 
0000000346 00000 n 
0000000546 00000 n 
trailer
<< /Size 7 /Root 2 0 R >>
startxref
620
%%EOF`;
}
