'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SectionCardGrid,
  CourseGrid,
  ContactBlock,
  SimpleCTA,
  facilityCards,
  eventCards,
  courseCatalog,
  contactInfo,
} from './_components/public-site';

const homeFeatures = [
  {
    title: 'Hands-on training',
    description: 'Practical operator-focused delivery for forklifts, cranes, and elevated work platforms.',
    icon: GraduationCap,
  },
  {
    title: 'Safety-led instruction',
    description: 'Every course is shaped around safe operation, legal awareness, and confident workplace practice.',
    icon: ShieldCheck,
  },
  {
    title: 'Corporate delivery',
    description: 'Flexible group training and custom scheduling for companies and project teams.',
    icon: Users,
  },
];

export default function HomePage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Al-Saud Training Institute"
        title={
          <>
            Redefining
            <br />
            Professional Growth.
          </>
        }
        description="Building a future-ready workforce for Oman through hands-on training in heavy machinery, crane operation, and practical certification pathways."
        image="/alsaud/hero.jpg"
        imageAlt="Al-Saud Training Institute"
        primaryHref="/courses"
        primaryLabel="Browse Courses"
        secondaryHref="/about"
        secondaryLabel="About Us"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why choose us"
          title="Focused training built for real workplaces"
          description="The institute combines practical instruction, safety standards, and career-ready outcomes for operators and organizations."
        />
        <div className="mt-10">
          <SectionCardGrid items={homeFeatures} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Our courses"
            title="Latest training programs"
            description="Core programs cover forklift operation, crane work, elevated platforms, and customized professional courses."
          />
          <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-[#b75c16] transition-colors hover:text-zinc-950">
            View full directory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10">
          <CourseGrid courses={courseCatalog} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Training facilities"
          title="Practical spaces that support real learning"
          description="Dedicated rooms and practical areas help learners build confidence before assessment and deployment."
        />
        <div className="mt-10">
          <SectionCardGrid items={facilityCards} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Upcoming events"
          title="A simple public calendar"
          description="Use the public site to surface open intakes, corporate briefings, and scheduled assessment clinics."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {eventCards.map((event) => (
            <div key={event.title} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <CalendarDays className="h-5 w-5 text-[#b75c16]" />
              <h3 className="mt-5 text-xl font-black text-zinc-950">{event.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{event.detail}</p>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{event.meta}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Need a course recommendation or a group booking?"
          description={`Reach the admissions team at ${contactInfo.phone} or ${contactInfo.email} for dates, pricing, and delivery options.`}
          href="/contact-us"
          label="Contact us"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ContactBlock />
      </section>
    </PublicShell>
  );
}
