'use client';

import { ShieldCheck, Target, Users } from 'lucide-react';

import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SectionCardGrid,
  StatStrip,
  strengths,
} from '../_components/public-site';

const values = [
  {
    title: 'Academic Excellence',
    description: 'The curriculum is designed to keep instruction practical, relevant, and easy to apply on site.',
    icon: Target,
  },
  {
    title: 'Industry Alignment',
    description: 'Courses are structured around workplace safety, compliance, and operator competence.',
    icon: ShieldCheck,
  },
  {
    title: 'Learner Focus',
    description: 'Students and corporate teams receive direct support from enquiry through certification.',
    icon: Users,
  },
];

export default function AboutPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="About us"
        title={
          <>
            Hands-on training,
            <br />
            practical outcomes.
          </>
        }
        description="Al-Saud Training Institute delivers training for heavy machinery, crane operation, elevated work platforms, and safety-focused professional development."
        image="/alsaud/hero.jpg"
        imageAlt="Al-Saud Training Institute about"
        primaryHref="/courses"
        primaryLabel="Our Courses"
        secondaryHref="/contact-us"
        secondaryLabel="Talk to us"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="space-y-8 rounded-[2.5rem] border border-border-light bg-white p-8 shadow-card">
            <SectionHeading eyebrow="Our story" title="Built for operator capability" description="The institute focuses on the knowledge and practical confidence required for safe work in high-risk industrial environments." />
            <p className="text-sm leading-7 text-neutral-600">
              The site copy reflects the client&apos;s existing public messaging: hands-on training, industry-recognized certification, and tailored delivery for individuals or teams.
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-border-light bg-white p-6 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-700">Mission</p>
              <p className="mt-3 text-sm leading-7 text-neutral-600">To deliver practical training solutions that bridge workplace requirements and learner readiness.</p>
            </div>
            <div className="rounded-[2rem] border border-border-light bg-white p-6 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent-700">Vision</p>
              <p className="mt-3 text-sm leading-7 text-neutral-600">To be the preferred vocational partner for operator training and certification in Oman.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <StatStrip />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Core values" title="What guides delivery" />
        <div className="mt-10">
          <SectionCardGrid items={values} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Why choose us" title="The public-facing promise" description="The site highlights practical training, accreditation, flexible delivery, and support for individuals and employers." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {strengths.map((item) => (
            <div key={item.title} className="rounded-[2rem] border border-border-light bg-white p-6 shadow-card">
              <item.icon className="h-5 w-5 text-accent-700" />
              <h3 className="mt-5 text-xl font-black text-neutral-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
