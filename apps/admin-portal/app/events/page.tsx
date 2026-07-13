import { CalendarDays, Clock } from 'lucide-react';
import {
  PublicShell,
  SectionHeading,
  SimpleCTA,
  SplitHero,
} from '../_components/public-site';
import { eventCards } from '../_components/public-site-data';
import { PublicStatStrip } from '../_components/public-content';
import { buildPublicMetadata } from '../_components/public-metadata';
import Link from 'next/link';
import { courseCatalog } from '../_components/public-site-data';

export const metadata = buildPublicMetadata({
  title: 'Upcoming Training Events',
  description:
    'View upcoming training intakes, certification clinics, and corporate session dates at Al-Saud Training Institute.',
  path: '/events',
});

export default function EventsPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Upcoming events"
        title={
          <>
            Public Sessions &
            <br />
            <span className="text-gradient-orange">Open Intakes.</span>
          </>
        }
        description="View our upcoming safety seminars, open course registration dates, and corporate certification intakes in Muscat."
        image="/alsaud/hero.jpg"
        imageAlt="Upcoming events"
        primaryHref="/contact-us"
        primaryLabel="Inquire about Dates"
        secondaryHref="/courses"
        secondaryLabel="Browse Courses"
        showStats={false}
      />

      {/* ─── STAT STRIP (pulls up over hero on desktop) ───── */}
      <section className="mx-auto max-w-7xl px-4 -mt-12 sm:px-6 lg:px-8 relative z-10">
        <PublicStatStrip />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Calendar"
          title="Upcoming Training Intakes"
          description="Secure your seat in one of our open public intake dates. Registration closes 48 hours prior to start."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {eventCards.map((event) => (
            <div
              key={event.title}
              className="group rounded-[2rem] border border-neutral-100 bg-white p-7 shadow-sm transition-all hover:border-orange-100 hover:shadow-xl hover:shadow-orange-600/5 hover:-translate-y-1 duration-300"
            >
              <div className="inline-flex rounded-xl bg-orange-500/10 p-3.5 text-orange-600 ring-1 ring-orange-500/20 mb-5">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-neutral-900">
                {event.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {event.detail}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 border-t border-neutral-100 pt-5">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>{event.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Related routes"
          title="Events usually lead into these course pages"
          description="Use the course pages below to compare duration, focus, and the practical outcomes before you book."
        />
        <div className="mt-10 flex flex-wrap gap-3">
          {courseCatalog.slice(0, 4).map((course) => (
            <Link
              key={course.slug}
              href={`/${course.slug}`}
              className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-orange-200 hover:text-orange-700"
            >
              {course.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Need a private group schedule?"
          description="Our admissions team can customize a course timetable for your company’s fleet or site team."
          href="/contact-us"
          label="Request a Schedule"
        />
      </section>
    </PublicShell>
  );
}
