import * as fs from 'fs';
import * as path from 'path';

export function saveLocalMockPdf(certNumber: string, studentNumber: string, verificationCode: string): string {
  // Dynamically find workspace root to support all executing directories (e.g. root, apps, packages)
  let baseDir = process.cwd();
  while (baseDir && baseDir !== '/' && !fs.existsSync(path.join(baseDir, 'apps/admin-portal'))) {
    const parent = path.dirname(baseDir);
    if (parent === baseDir) break;
    baseDir = parent;
  }
  
  const publicDir = path.join(baseDir, 'apps/admin-portal/public/certificates');

  try {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const pdfContent = `%PDF-1.4
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

    fs.writeFileSync(path.join(publicDir, `${certNumber}.pdf`), pdfContent);
    return `/certificates/${certNumber}.pdf`;
  } catch (err) {
    console.error('Failed to write local certificate PDF:', err);
    return `/certificates/${certNumber}.pdf`; // Fallback relative path
  }
}
