'use client';

import { Mail, MapPin, Phone, Send } from 'lucide-react';

import {
  ContactBlock,
  PublicShell,
  SectionHeading,
  SimpleCTA,
  SplitHero,
  contactInfo,
} from '../_components/public-site';

export default function ContactPage() {
  return (
    <PublicShell>
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
        <SimpleCTA
          title="Need the fastest response?"
          description="Call our admissions desk directly for immediate course confirmation, dates, and group pricing."
          href={contactInfo.phoneHref}
          label="Call Admissions"
        />
      </section>
    </PublicShell>
  );
}
