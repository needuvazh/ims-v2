'use client';

import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react';

import { PublicShell, SectionHeading, SimpleCTA, SplitHero, careerCards } from '../_components/public-site';

export default function CareersPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Careers"
        title={
          <>
            Join the
            <br />
            training team.
          </>
        }
        description="Use the careers page to list open roles or direct applicants to the institute's contact desk."
        image="/alsaud/hero.jpg"
        imageAlt="Careers"
        primaryHref="/contact-us"
        primaryLabel="Apply now"
        secondaryHref="/contact-us"
        secondaryLabel="Ask a question"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Open roles" title="A clean recruitment landing section" description="The reference site includes careers in the footer navigation, so this route keeps a branded hiring entry point." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {careerCards.map((role) => (
            <div key={role.title} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <BriefcaseBusiness className="h-5 w-5 text-[#b75c16]" />
              <h3 className="mt-5 text-xl font-black text-zinc-950">{role.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{role.description}</p>
              <div className="mt-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                <CheckCircle2 className="h-4 w-4" />
                Enquiries welcome
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Interested in joining the institute?" description="Send your CV and tell the team which role fits your experience." href="/contact-us" label="Contact HR" />
      </section>
    </PublicShell>
  );
}
