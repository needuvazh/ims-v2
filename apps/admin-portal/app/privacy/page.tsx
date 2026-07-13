import { LegalPageShell } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Privacy Policy',
  description:
    'Privacy policy for Al-Saud Training Institute enquiries, course registrations, certificate verification, and public website use in Oman.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="How Al-Saud Training Institute handles public website enquiries, course registration information, and certificate verification data."
    >
      <p>
        Al-Saud Training Institute collects only the information needed to
        respond to enquiries, process registrations, and support training
        delivery for individuals, corporate teams, and certificate holders.
      </p>
      <p>
        Contact requests, course interest, and booking details are handled
        through the institute&apos;s public contact channels.
      </p>
      <h2>Information we collect</h2>
      <p>
        Public website forms and direct contact links may collect your name,
        phone number, email address, preferred course, company name, message,
        and any details you choose to provide so the admissions or training
        team can respond accurately.
      </p>
      <p>
        Certificate verification may require a certificate number or
        verification code. The verification service is intended to confirm
        credential status and does not require visitors to submit unrelated
        personal information.
      </p>
      <h2>How we use information</h2>
      <ul>
        <li>Responding to course, pricing, schedule, and corporate training enquiries.</li>
        <li>Preparing registration, attendance, assessment, and certificate support.</li>
        <li>Helping learners and employers verify issued training certificates.</li>
        <li>Maintaining operational, safety, and training quality records.</li>
      </ul>
      <h2>Sharing and retention</h2>
      <p>
        Information is used for institute operations and is shared only with
        staff or service providers who need it to support training delivery,
        communications, records, or secure website operation. Records may be
        retained where required for training, finance, certificate history,
        legal, or audit purposes.
      </p>
      <h2>Contact</h2>
      <p>
        To ask about privacy, correction of contact details, or certificate
        verification information, contact Al-Saud Training Institute at +968
        9658 9150 or contactus@alsaud-intl.com.
      </p>
    </LegalPageShell>
  );
}
