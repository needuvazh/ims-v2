'use client';

import { CalendarDays, Clock } from 'lucide-react';

import { PublicShell, SectionHeading, SimpleCTA, SplitHero, eventCards } from '../_components/public-site';

export default function EventsPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Upcoming events"
        title={
          <>
            Public sessions,
            <br />
            open intakes.
          </>
        }
        description="Use the events page to show batch openings, corporate briefings, or certification clinics."
        image="/alsaud/hero.jpg"
        imageAlt="Upcoming events"
        primaryHref="/contact-us"
        primaryLabel="Ask for dates"
        secondaryHref="/courses"
        secondaryLabel="Browse courses"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Calendar" title="A light-weight public schedule" description="The reference site includes an events navigation item, so this page keeps a clear on-brand placeholder calendar." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {eventCards.map((event) => (
            <div key={event.title} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <CalendarDays className="h-5 w-5 text-[#b75c16]" />
              <h3 className="mt-5 text-xl font-black text-zinc-950">{event.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{event.detail}</p>
              <div className="mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                <Clock className="h-4 w-4" />
                {event.meta}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Need a private group schedule?" description="The admissions team can create a course timetable for your company or site team." href="/contact-us" label="Request a schedule" />
      </section>
    </PublicShell>
  );
}
