'use client';

import { Mail, MapPin, Phone, Send } from 'lucide-react';

import { ContactBlock, PublicShell, SectionHeading, SimpleCTA, SplitHero, contactInfo } from '../_components/public-site';

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
        <SectionHeading eyebrow="Contact details" title="The key public information is always visible" />
        <div className="mt-10">
          <ContactBlock />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <SectionHeading eyebrow="Visit us" title="Azaiba North, Al Anwar Street" description="Muscat, Oman. The office line and email are surfaced prominently in the site header and footer." />
            <div className="mt-8 space-y-4 text-sm text-zinc-600">
              <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-[#b75c16]" /> {contactInfo.phone}</p>
              <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#b75c16]" /> {contactInfo.email}</p>
              <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-[#b75c16]" /> {contactInfo.address}</p>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-black/5 bg-zinc-950 p-8 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#e4b07d]">Send us a message</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" placeholder="Full name" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500" placeholder="Phone number" />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 sm:col-span-2" placeholder="Email address" />
              <textarea className="min-h-40 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 sm:col-span-2" placeholder="How can we help?" />
            </div>
            <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-950">
              Send message
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Need the fastest response?" description="Call the office directly for course dates, pricing, and group enquiries." href={contactInfo.phoneHref} label="Call admissions" />
      </section>
    </PublicShell>
  );
}
