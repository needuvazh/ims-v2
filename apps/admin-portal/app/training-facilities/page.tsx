'use client';

import { CheckCircle2, ShieldAlert, GraduationCap, Building2 } from 'lucide-react';
import {
  PublicShell,
  SectionHeading,
  SimpleCTA,
  SplitHero,
} from '../_components/public-site';

const facilityFeatures = [
  {
    title: 'Modern Classrooms',
    description:
      'Fully equipped lecture rooms for theoretical safety instruction, regulatory briefings, and assessment preparation.',
    icon: Building2,
  },
  {
    title: 'Practical Yards',
    description:
      'Spacious, dedicated maneuver yards for hands-on crane operations, forklift drills, and heavy machinery training.',
    icon: GraduationCap,
  },
  {
    title: 'Safety Audited Zone',
    description:
      'A highly controlled learning environment prioritizing risk management, PPE compliance, and zero-accident policies.',
    icon: ShieldAlert,
  },
];

const facilityNotes = [
  'Multimedia classrooms for theory and safety induction sessions.',
  'Dedicated, spacious yards for practical machine operation and load testing.',
  'Accredited test areas built for NPORS and OPAL evaluation protocols.',
  'Complete range of safety gear, safety briefings, and expert trainer supervision.',
];

export default function FacilitiesPage() {
  return (
    <PublicShell>
      {/* ─── HERO SECTION ─────────────────────────────────── */}
      <SplitHero
        eyebrow="Our facilities"
        title={
          <>
            Spaces Built for
            <br />
            <span className="text-gradient-orange">Operator Success.</span>
          </>
        }
        description="Located in Azaiba, Muscat, ASTI provides fully audited classrooms and training yards designed for safe, realistic hands-on machinery operation."
        image="/alsaud/hero.jpg"
        imageAlt="Al-Saud Training Institute Muscat facility"
        primaryHref="/courses"
        primaryLabel="See Courses"
        secondaryHref="/contact-us"
        secondaryLabel="Plan a Visit"
        showStats={false}
      />

      {/* ─── FEATURES GRID ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Training environments"
          title="Equipped for safety and practice"
          description="We maintain dedicated spaces that bridge theoretical regulations and practical machine operation."
        />
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {facilityFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-[2rem] border border-neutral-100 bg-white p-8 shadow-sm hover:shadow-xl hover:shadow-orange-600/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="mb-6 inline-flex rounded-2xl bg-orange-500/10 p-4 text-orange-600 ring-1 ring-orange-500/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-4 leading-relaxed text-sm text-neutral-600">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── DETAILED EXPERIENCE ─── Light neutral bg ──────── */}
      <section className="bg-neutral-50 border-y border-neutral-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2.5rem] border border-neutral-100 bg-white p-8 md:p-10 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
                What learners experience
              </p>
              <h3 className="mt-4 font-display text-2xl font-bold text-neutral-900">
                A structured path to competence
              </h3>
              <ul className="mt-8 space-y-4 text-sm leading-relaxed text-neutral-600">
                {facilityNotes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-orange-600" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="rounded-[2.5rem] border border-neutral-100 bg-gradient-to-br from-[#031a27] to-[#0b4565] p-8 md:p-10 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-400">
                Muscat HQ Facility
              </p>
              <h3 className="mt-4 font-display text-2xl font-bold leading-tight">
                Designed for classroom and practical delivery
              </h3>
              <p className="mt-6 text-sm leading-relaxed text-neutral-300">
                Our Azaiba facility serves as the headquarters for both our classroom theory courses 
                and corporate operations. Rigorous equipment safety inspections and accredited testing zones 
                ensure every candidate learns in a professional environment that mirror industrial sites.
              </p>
              <div className="mt-8 border-t border-white/10 pt-6 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">NPORS Certified Site</span>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400">OPAL Approved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Want a site visit or corporate group booking?"
          description="Arrange a tour of our training facilities in Azaiba, Muscat, or coordinate safety compliance details for your staff."
          href="/contact-us"
          label="Contact Us"
        />
      </section>
    </PublicShell>
  );
}
