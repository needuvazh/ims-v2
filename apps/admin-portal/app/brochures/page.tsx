'use client';

import { FileText, Sparkles } from 'lucide-react';

import { PublicShell, SectionHeading, SimpleCTA, SplitHero, brochureCards } from '../_components/public-site';

export default function BrochuresPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Brochures"
        title={
          <>
            Download-ready
            <br />
            public resources.
          </>
        }
        description="Keep a public brochures page for institute profiles, course catalogues, and corporate briefs."
        image="/alsaud/hero.jpg"
        imageAlt="Brochures"
        primaryHref="/contact-us"
        primaryLabel="Request files"
        secondaryHref="/courses"
        secondaryLabel="View courses"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Resources" title="Three simple brochure tiles" description="The live site does not publish brochure files, so this page keeps the section as a branded contact gateway." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {brochureCards.map((item) => (
            <div key={item.title} className="rounded-[2rem] border border-border-light bg-white p-6 shadow-card">
              <FileText className="h-5 w-5 text-accent-700" />
              <h3 className="mt-5 text-xl font-black text-neutral-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-600">{item.description}</p>
              <button type="button" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-accent-700 transition-colors hover:text-primary-700">
                {item.action}
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Need a brochure by email?" description="Send the team a message and request the institute profile or course details pack." href="/contact-us" label="Request by email" />
      </section>
    </PublicShell>
  );
}
