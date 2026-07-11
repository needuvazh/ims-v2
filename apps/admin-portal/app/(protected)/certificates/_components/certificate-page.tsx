import Image from 'next/image';
import { CertificateViewModel } from '@ims/certificates';

interface CertificatePageProps {
  viewModel: CertificateViewModel;
}

const LABEL_TEXT_STYLE =
  'font-semibold tracking-[0.01em] text-[#5d6882] whitespace-nowrap';
const VALUE_TEXT_STYLE = 'font-medium leading-tight text-[#2c2938]';

export function CertificatePage({ viewModel }: CertificatePageProps) {
  return (
    <CertificatePrintLayout>
      <div className="relative mx-auto aspect-[1548/2209] w-full max-w-[210mm] overflow-hidden bg-white shadow-sm print:shadow-none">
        <Image
          src="/images/certificate/certificate-approved-template.jpeg"
          alt="Approved ASTI certificate template"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 794px"
          className="object-contain"
        />

        <CertificateNumberOverlay
          certificateNumber={viewModel.certificateNumber}
        />

        <CertificateDetailsOverlay viewModel={viewModel} />
      </div>
    </CertificatePrintLayout>
  );
}

function CertificatePrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-2 py-4 print:bg-white print:px-0 print:py-0 sm:px-4">
      <div className="mx-auto w-full max-w-[210mm] print:max-w-none">
        {children}
      </div>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            background: white !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function CertificateNumberOverlay({
  certificateNumber,
}: {
  certificateNumber: string;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute left-[5.2%] top-[21.05%] h-[3.65%] w-[53.5%] bg-white"
      />
      <div className="absolute left-[6.1%] top-[21.65%] text-[clamp(13px,1.7vw,18px)] font-normal tracking-[0.01em] text-[#61677f]">
        Certificate No. {certificateNumber}
      </div>
    </>
  );
}

function CertificateDetailsOverlay({
  viewModel,
}: {
  viewModel: CertificateViewModel;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute left-[4.75%] top-[31.5%] h-[33.9%] w-[73%] bg-white"
      />

      <div className="absolute left-[6.45%] top-[34.1%] w-[66.3%]">
        <div className="grid grid-cols-[34%_1fr] gap-y-[clamp(18px,2vw,28px)] text-[clamp(14px,1.8vw,18px)]">
          <CertificateDetailRow
            label="Candidate Name:"
            value={viewModel.candidateName}
            valueClassName="uppercase text-[clamp(22px,2.75vw,28px)]"
          />

          <CertificateDetailRow
            label="Company Name:"
            value={viewModel.companyName}
            valueClassName="uppercase text-[clamp(22px,2.75vw,28px)]"
          />

          <CertificateDetailRow
            label="Course Title:"
            value={viewModel.courseTitle}
            valueClassName="uppercase text-[clamp(22px,2.75vw,28px)]"
          />

          <CertificateDetailRow
            label="Course Type:"
            value={viewModel.courseType}
            valueClassName="uppercase text-[clamp(22px,2.75vw,28px)]"
          />

          <div className={LABEL_TEXT_STYLE}>Course Date</div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[clamp(18px,2.55vw,26px)] text-[#2c2938]">
            <span className={VALUE_TEXT_STYLE}>{viewModel.courseStartDate}</span>
            <span className={`${LABEL_TEXT_STYLE} text-[clamp(15px,1.85vw,19px)]`}>
              To:
            </span>
            <span className={VALUE_TEXT_STYLE}>{viewModel.courseEndDate}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function CertificateDetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <>
      <div className={`${LABEL_TEXT_STYLE} text-[clamp(15px,1.85vw,19px)]`}>
        {label}
      </div>
      <div
        className={`${VALUE_TEXT_STYLE} break-words text-[clamp(18px,2.55vw,26px)] ${valueClassName ?? ''}`}
      >
        {value}
      </div>
    </>
  );
}
