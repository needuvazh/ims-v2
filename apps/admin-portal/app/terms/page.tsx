import { LegalPageShell } from '../_components/public-site';
import { buildPublicMetadata } from '../_components/public-metadata';

export const metadata = buildPublicMetadata({
  title: 'Terms of Use',
  description:
    'Terms of use for Al-Saud Training Institute public course information, enquiries, certificate verification, and website access.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Use"
      description="Terms for using Al-Saud Training Institute public course information, contact channels, and certificate verification tools."
    >
      <p>
        By using this site, you agree to use the public information for lawful
        enquiry and course access purposes only.
      </p>
      <p>
        Course dates, pricing, and availability may change based on attendee
        count and delivery location.
      </p>
      <h2>Public course information</h2>
      <p>
        Course descriptions, outcomes, prerequisites, and training summaries
        are provided for general guidance. Final eligibility, duration,
        scheduling, fees, assessment requirements, and certificate conditions
        are confirmed by the institute during enquiry or registration.
      </p>
      <h2>Bookings and corporate training</h2>
      <p>
        Individuals and organizations may contact the institute to request
        dates, pricing, group delivery, or customized training. A booking is
        not confirmed until the institute accepts the request and communicates
        the applicable registration, attendance, payment, and safety
        requirements.
      </p>
      <h2>Certificate verification</h2>
      <p>
        The certificate verification tool is provided to help learners,
        employers, and authorized reviewers check credential status. Users must
        not misuse verification codes, scrape certificate information, or
        present a certificate status in a misleading way.
      </p>
      <h2>Website use</h2>
      <ul>
        <li>Do not attempt unauthorized access to the IMS portal or protected systems.</li>
        <li>Do not submit false, misleading, abusive, or unlawful information.</li>
        <li>Do not copy public content in a way that misrepresents institute services.</li>
        <li>Do not interfere with website availability, security, or verification workflows.</li>
      </ul>
      <h2>Contact</h2>
      <p>
        For questions about these terms, course access, or certificate
        verification, contact Al-Saud Training Institute at +968 9658 9150 or
        contactus@alsaud-intl.com.
      </p>
    </LegalPageShell>
  );
}
