'use client';

import { CheckCircle2 } from 'lucide-react';

import { PublicShell, SectionCardGrid, SectionHeading, SimpleCTA, SplitHero, facilityCards } from '../_components/public-site';

const facilityNotes = [
  'Classrooms for theory and induction sessions',
  'Practical areas for operator drills and assessments',
  'Safety-focused delivery with clear guidance and supervision',
];

export default function FacilitiesPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Training facilities"
        title={
          <>
            Spaces designed
            <br />
            for practice.
          </>
        }
        description="The public site can showcase facilities, classrooms, and practical training support that back the course offerings."
        image="/alsaud/hero.jpg"
        imageAlt="Training facilities"
        primaryHref="/courses"
        primaryLabel="See courses"
        secondaryHref="/contact-us"
        secondaryLabel="Plan a visit"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Facilities" title="A concise public overview" description="A lightweight section that matches the version-one structure without inventing operational details." />
        <div className="mt-10">
          <SectionCardGrid items={facilityCards} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-border-light bg-white p-7 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-700">What learners see</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-neutral-700">
              {facilityNotes.map((note) => (
                <li key={note} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />{note}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-primary-950 p-7 text-white shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-300">Facility note</p>
            <h3 className="mt-4 text-2xl font-black">Designed for classroom and practical delivery</h3>
            <p className="mt-4 text-sm leading-7 text-neutral-300">This page is intentionally simple and aligned with the public navigation used in the reference build.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Want a site visit or group booking?" description="Use the contact page to arrange a visit, confirm requirements, or request a proposal." href="/contact-us" label="Contact us" />
      </section>
    </PublicShell>
  );
}
