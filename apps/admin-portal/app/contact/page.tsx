import { Mail, MapPin, Phone, Send } from 'lucide-react';

import {
  ContactBlock,
  PublicShell,
  SectionHeading,
  SimpleCTA,
  FAQAccordion,
  FAQStructuredData,
  SplitHero,
} from '../_components/public-site';
import { contactInfo, courseCatalog } from '../_components/public-site-data';
import Link from 'next/link';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const contactFaqItems = [
  {
    question: 'What are your office hours?',
    answer:
      'We are open Saturday to Thursday, 8:00 AM to 5:00 PM, for admissions and course enquiries.',
  },
  {
    question: 'How fast can I get a response?',
    answer:
      'Phone calls are usually the fastest way to get course dates, batch pricing, and schedule confirmation.',
  },
  {
    question: 'Can you handle group bookings?',
    answer:
      'Yes, we can arrange group training, company delivery, and custom intake planning for teams.',
  },
  {
    question: 'Do you offer course recommendations?',
    answer:
      'Yes, the admissions team can recommend the best course based on your experience level and job role.',
  },
];

export default function ContactPage() {
  return (
    <PublicShell>
      <FAQStructuredData items={contactFaqItems} />
      <SplitHero
        eyebrow="Contact"
        title={
          <>
            Talk to the
            <br />
            admissions team.
          </>
        }
        description="Call, email, or visit the institute to ask about training dates, group pricing, and course recommendations."
        image="/alsaud/hero.jpg"
        imageAlt="Contact Al-Saud Training Institute"
        primaryHref={`mailto:${contactInfo.email}`}
        primaryLabel="Email us"
        secondaryHref={contactInfo.phoneHref}
        secondaryLabel="Call now"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Contact details"
          title="Connect with our Admissions Office"
        />
        <div className="mt-10">
          <ContactBlock />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2.5rem] border border-neutral-100 bg-white p-8 shadow-sm">
            <SectionHeading
              eyebrow="Visit us"
              title="Muscat Headquarters"
              description="Our office line and support emails are open Saturday to Thursday for candidate registrations and enquiries."
            />
            <div className="mt-8 space-y-5 text-sm text-neutral-600">
              <a href={contactInfo.phoneHref} className="flex items-center gap-3 hover:text-orange-600 transition-colors">
                <Phone className="h-4.5 w-4.5 text-orange-600" />{' '}
                {contactInfo.phone}
              </a>
              <a href={contactInfo.emailHref} className="flex items-center gap-3 hover:text-orange-600 transition-colors">
                <Mail className="h-4.5 w-4.5 text-orange-600" /> {contactInfo.email}
              </a>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4.5 w-4.5 text-orange-600 shrink-0" />{' '}
                {contactInfo.address}
              </p>
              <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                Office hours: Saturday to Thursday, 8:00 AM to 5:00 PM
              </p>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-[#031a27] to-[#0b4565] p-8 text-white shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-orange-400">
              Send us a message
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold">Have a quick question?</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-orange-500/50 transition-colors"
                placeholder="Full name"
              />
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-orange-500/50 transition-colors"
                placeholder="Phone number"
              />
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-orange-500/50 transition-colors sm:col-span-2"
                placeholder="Email address"
              />
              <textarea
                className="min-h-40 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-orange-500/50 transition-colors sm:col-span-2"
                placeholder="How can we help? (Specify course, schedule, or group size)"
              />
            </div>
            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-xs font-bold uppercase tracking-[0.22em] text-[#031a27] hover:bg-neutral-100 hover:shadow-lg transition-all"
            >
              Send message
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Quick links"
          title="Choose a course before you call"
          description="If you already know the category you need, jump straight to the relevant public course page and then return here for pricing and scheduling."
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
          title="Need the fastest response?"
          description="Call our admissions desk directly for immediate course confirmation, dates, and group pricing."
          href={contactInfo.phoneHref}
          label="Call Admissions"
        />
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Common contact questions"
          description="Useful answers before you call or send a message."
          align="center"
        />
        <div className="mt-10">
          <FAQAccordion items={contactFaqItems} />
        </div>
      </section>
    </PublicShell>
  );
}
