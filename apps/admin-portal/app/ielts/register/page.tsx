'use client';

import { CheckCircle2, ClipboardList } from 'lucide-react';

import { PublicShell, SectionCardGrid, SectionHeading, SimpleCTA, SplitHero } from '../../_components/public-site';

const ieltsSteps = [
  {
    title: 'Register your interest',
    description: 'Use the contact form or phone line to request an IELTS booking slot.',
    icon: ClipboardList,
  },
  {
    title: 'Confirm the schedule',
    description: 'The team will confirm available dates, seat count, and registration details.',
    icon: CheckCircle2,
  },
  {
    title: 'Attend the session',
    description: 'A clean booking page can direct candidates to the relevant testing pathway.',
    icon: CheckCircle2,
  },
];

export default function IeltsRegisterPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="IELTS booking"
        title={
          <>
            Register for
            <br />
            IELTS support.
          </>
        }
        description="The reference site links to an IELTS booking screen. This version keeps the route live with a lightweight registration journey."
        image="/alsaud/hero.jpg"
        imageAlt="IELTS booking"
        primaryHref="/contact-us"
        primaryLabel="Request a slot"
        secondaryHref="/courses"
        secondaryLabel="See courses"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Steps" title="A simple public flow" />
        <div className="mt-10">
          <SectionCardGrid items={ieltsSteps} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Need the fastest response?" description="Use the main contact page and tell the team you are requesting IELTS support." href="/contact-us" label="Open contact page" />
      </section>
    </PublicShell>
  );
}
