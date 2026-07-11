'use server';

import { notFound } from 'next/navigation';
import { assertPermission } from '../../../lib/auth-guard';
import { CertificateService } from '@ims/certificates';
import { CertificatePage } from '../_components/certificate-page';
import { PrintCertificateButton } from '../_components/print-certificate-button';

export default async function CertificatePreviewPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  await assertPermission('certificate.view');
  const { certificateId } = await params;

  const service = new CertificateService();
  try {
    const viewModel = await service.getViewModel(certificateId);
    return (
      <div className="min-h-screen bg-slate-100 p-2 sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Certificate Preview</h1>
            <p className="text-sm text-slate-500">
              Print-ready layout for browser printing and PDF export.
            </p>
          </div>
          <PrintCertificateButton />
        </div>
        <CertificatePage viewModel={viewModel} />
      </div>
    );
  } catch {
    notFound();
  }
}
