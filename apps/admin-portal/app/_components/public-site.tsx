'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

export type SiteLink = {
  label: string;
  href: string;
};

export type CourseCard = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  duration: string;
  price: string;
  points: string[];
};

export type StatCard = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const contactInfo = {
  phone: '+968 9658 9150',
  phoneHref: 'tel:+96896589150',
  email: 'contactus@alsaud-intl.com',
  emailHref: 'mailto:contactus@alsaud-intl.com',
  address: 'MUSCAT, AZAIBA NORTH, AL ANWAR STREET, BUILDING NO. 648.',
  tagline: 'Empowering future operators with hands-on training in heavy machinery and crane operation',
};

export const mainNavigation: SiteLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/courses' },
  { label: 'Training Facilities', href: '/training-facilities' },
  { label: 'Upcoming Events', href: '/events' },
  { label: 'Brochures', href: '/brochures' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact-us' },
  { label: 'IELTS Booking', href: '/ielts/register' },
];

export const quickLinks: SiteLink[] = [
  { label: 'About Al-Saud Training Institute', href: '/about' },
  { label: 'Training Courses', href: '/courses' },
  { label: 'Training Facilities', href: '/training-facilities' },
  { label: 'Contact Us', href: '/contact-us' },
  { label: 'IMS Login', href: '/login' },
];

export const stats: StatCard[] = [
  { value: '25k+', label: 'Students Trained', icon: Users },
  { value: '150+', label: 'Success Partners', icon: ShieldCheck },
  { value: '80+', label: 'Global Programs', icon: BookOpen },
  { value: '20+', label: 'Years Experience', icon: Award },
];

export const strengths = [
  {
    title: 'Extensive Expertise',
    description: 'Years of practical instruction across forklift, crane, EWP, and heavy machinery disciplines.',
    icon: ShieldCheck,
  },
  {
    title: 'Comprehensive Course Library',
    description: 'A focused catalogue built around workplace safety, operator competence, and certification.',
    icon: ClipboardList,
  },
  {
    title: 'Industry-Recognized Certification',
    description: 'Training outcomes aligned with employer expectations, compliance requirements, and job readiness.',
    icon: Award,
  },
];

export const facilityCards = [
  {
    title: 'Modern Classrooms',
    description: 'Comfortable learning spaces for theory, induction, and assessment preparation.',
    icon: Building2,
  },
  {
    title: 'Hands-on Practice Areas',
    description: 'Practical training environments for operator drills, demonstrations, and evaluations.',
    icon: GraduationCap,
  },
  {
    title: 'Safety Support',
    description: 'A training approach centered on safe operation, compliance, and confident decision-making.',
    icon: ShieldCheck,
  },
];

export const eventCards = [
  {
    title: 'Open Training Intake',
    detail: 'Monthly onboarding for new operators and upskilling candidates.',
    meta: 'Rolling admissions',
  },
  {
    title: 'Corporate Team Briefing',
    detail: 'Custom training planning for companies and workforce groups.',
    meta: 'By appointment',
  },
  {
    title: 'Certification Clinic',
    detail: 'Focused sessions for assessment support and renewal guidance.',
    meta: 'Scheduled sessions',
  },
];

export const brochureCards = [
  {
    title: 'Institute Profile',
    description: 'A concise overview of the institute, capabilities, and training philosophy.',
    action: 'Request copy',
  },
  {
    title: 'Course Catalogue',
    description: 'Course summaries for forklift, crane, and elevated work platform training.',
    action: 'View courses',
  },
  {
    title: 'Corporate Training Note',
    description: 'A briefing for organizations seeking group delivery or custom pathways.',
    action: 'Contact team',
  },
];

export const careerCards = [
  {
    title: 'Training Coordinator',
    description: 'Coordinate schedules, learner communication, and training logistics.',
  },
  {
    title: 'Safety Assessor',
    description: 'Support practical assessments and ensure operator readiness.',
  },
  {
    title: 'Client Relations Executive',
    description: 'Handle enquiries, corporate accounts, and course guidance.',
  },
];

export const courseCatalog: CourseCard[] = [
  {
    slug: 'forklift-operator-training',
    title: 'Forklift Operator Training',
    summary: 'Learn to operate forklifts safely, efficiently, and in line with workplace expectations.',
    image: '/alsaud/courses/forklift-operator.jpg',
    imageAlt: 'Forklift operator training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Covering driver theory and safety rules',
      'Pre-vehicle checks, stacking, and de-stacking',
      'Loading, unloading, parking, and storage',
    ],
  },
  {
    slug: 'forklift-operator-training-course',
    title: 'Forklift Endorsement Course',
    summary: 'Gain the legal and practical knowledge needed for safe forklift operation on a road.',
    image: '/alsaud/courses/forklift-endorsement.jpg',
    imageAlt: 'Forklift endorsement training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Driving procedures and general considerations',
      'Environmental factors and legal requirements',
      'Safe parking, storage, and operating checks',
    ],
  },
  {
    slug: 'truck-mounted-crane',
    title: 'Truck Mounted Crane',
    summary: 'Training for safe truck loader crane operation, load handling, and transport preparation.',
    image: '/alsaud/courses/truck-mounted-crane.jpg',
    imageAlt: 'Truck mounted crane training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Sling, lift, move, and place regular loads',
      'Lift planning and hazard control',
      'Daily and weekly operator maintenance',
    ],
  },
  {
    slug: 'overhead-gantry-crane-operation',
    title: 'Overhead Gantry Crane Operation',
    summary: 'Practical and theory-based instruction for radio remote or pendant-controlled cranes.',
    image: '/alsaud/courses/overhead-gantry.jpg',
    imageAlt: 'Overhead gantry crane training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Components, equipment, and attachments',
      'Travel, unload, and place loads safely',
      'Observed lifts and operator maintenance',
    ],
  },
  {
    slug: 'elevated-work-platforms-2',
    title: 'Elevated Work Platforms',
    summary: 'Training for scissor lifts, boom lifts, and safe elevated work platform practice.',
    image: '/alsaud/courses/elevated-work-platforms.jpg',
    imageAlt: 'Elevated work platform training',
    duration: 'Course Details + Practical Testing',
    price: 'Please enquire',
    points: [
      'Access worksite and prepare the equipment',
      'Use scissor, truck-mounted, self-propelled, and trailer-mounted lifts',
      'Practical assessment on the day',
    ],
  },
  {
    slug: 'other-courses-available',
    title: 'Other Courses Available',
    summary: 'Specialised crane, health and safety, and custom courses tailored to organizational needs.',
    image: '/alsaud/courses/other-courses.jpg',
    imageAlt: 'Additional professional courses',
    duration: 'Custom delivery',
    price: 'Please enquire',
    points: [
      'Mini crawler crane and cab-controlled crane training',
      'Health and safety unit standards',
      'Customized course delivery on request',
    ],
  },
];

export function getCourse(slug: string) {
  return courseCatalog.find((course) => course.slug === slug) ?? courseCatalog[0];
}

function BrandMark() {
  return <Image src="/alsaud/logo.png" alt="Al-Saud Training Institute" width={156} height={52} className="h-11 w-auto" priority />;
}

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fbf8f3] text-zinc-900">
      <div className="border-b border-black/5 bg-white/80 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={contactInfo.phoneHref} className="inline-flex items-center gap-2 transition-colors hover:text-[#c96a22]">
              <Phone className="h-3.5 w-3.5" />
              {contactInfo.phone}
            </a>
            <a href={contactInfo.emailHref} className="inline-flex items-center gap-2 transition-colors hover:text-[#c96a22]">
              <Mail className="h-3.5 w-3.5" />
              {contactInfo.email}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-700 transition-colors hover:border-[#c96a22] hover:text-[#c96a22]">
              IMS Login
            </Link>
            <span className="hidden sm:inline text-[10px] tracking-[0.24em] text-zinc-400">Arabic</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {mainNavigation.map((item) => {
              const active = item.href !== '/' && pathname.startsWith(item.href);
              const homeActive = item.href === '/' && pathname === '/';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-semibold transition-colors hover:text-[#c96a22] ${active || homeActive ? 'text-[#c96a22]' : 'text-zinc-600'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/contact-us" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5">
              Book Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 lg:hidden"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-t border-black/5 bg-white px-4 py-4 lg:hidden"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-2">
                {mainNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-[#c96a22]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link href="/contact-us" onClick={() => setMobileOpen(false)} className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white">
                  Book Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-black/5 bg-zinc-950 text-zinc-300">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
          <div className="space-y-6">
            <BrandMark />
            <p className="max-w-md text-sm leading-7 text-zinc-400">{contactInfo.tagline}</p>
            <div className="space-y-3 text-sm text-zinc-400">
              <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-[#d18a43]" /> {contactInfo.address}</p>
              <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-[#d18a43]" /> {contactInfo.phone}</p>
              <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#d18a43]" /> {contactInfo.email}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.32em] text-white">Quick Links</h3>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.32em] text-white">Our Courses</h3>
            <div className="mt-6 flex flex-col gap-3 text-sm">
              {courseCatalog.map((course) => (
                <Link key={course.slug} href={`/${course.slug}`} className="transition-colors hover:text-white">
                  {course.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 py-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© 2026 Al-Saud Training Institute. All rights reserved.</p>
            <div className="flex flex-wrap gap-5">
              <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors hover:text-white">Terms of Use</Link>
              <Link href="/sitemap" className="transition-colors hover:text-white">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function SplitHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  stats: heroStats = stats,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image: string;
  imageAlt: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  stats?: StatCard[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-black/5 bg-[linear-gradient(180deg,#fffaf3_0%,#fbf8f3_100%)]">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(201,106,34,0.10),transparent_56%)] lg:block" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9b08a] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.32em] text-[#b75c16]">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <div className="max-w-3xl space-y-6">
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">{title}</h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-600">{description}</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href={primaryHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-7 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5">
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={secondaryHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.22em] text-zinc-700 transition-colors hover:border-[#d18a43] hover:text-[#b75c16]">
              {secondaryLabel}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <div className="mb-3 inline-flex rounded-2xl bg-[#fff2e4] p-3 text-[#b75c16]"><Icon className="h-5 w-5" /></div>
                  <p className="text-3xl font-black tracking-tight text-zinc-950">{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2.5rem] border border-black/5 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
              <Image src={image} alt={imageAlt} fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/35 via-transparent to-transparent" />
            </div>
          </div>
          <div className="absolute -bottom-6 left-4 rounded-[1.75rem] border border-black/5 bg-white px-5 py-4 shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Central office</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">Azaiba North, Muscat</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#b75c16]">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">{title}</h2>
      {description ? <p className="text-base leading-7 text-zinc-600">{description}</p> : null}
    </div>
  );
}

export function StatStrip() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_16px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex rounded-2xl bg-[#fff2e4] p-3 text-[#b75c16]"><Icon className="h-5 w-5" /></div>
              <p className="mt-4 text-3xl font-black text-zinc-950">{item.value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CourseGrid({ courses }: { courses: CourseCard[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <motion.article
          key={course.slug}
          whileHover={{ y: -6 }}
          className="group overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src={course.image} alt={course.imageAlt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b75c16]">{course.duration}</p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-950">{course.title}</h3>
              </div>
              <span className="rounded-full bg-[#fff2e4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#b75c16]">{course.price}</span>
            </div>
            <p className="text-sm leading-7 text-zinc-600">{course.summary}</p>
            <ul className="space-y-2 text-sm text-zinc-700">
              {course.points.map((point) => (
                <li key={point} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c96a22]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link href={`/${course.slug}`} className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-[#b75c16] transition-colors hover:text-zinc-950">
              Read more
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export function ContactBlock() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <Phone className="h-5 w-5 text-[#b75c16]" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Phone</p>
        <a href={contactInfo.phoneHref} className="mt-2 block text-lg font-black text-zinc-950">{contactInfo.phone}</a>
      </div>
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <Mail className="h-5 w-5 text-[#b75c16]" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Email</p>
        <a href={contactInfo.emailHref} className="mt-2 block text-lg font-black text-zinc-950">{contactInfo.email}</a>
      </div>
      <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <MapPin className="h-5 w-5 text-[#b75c16]" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Address</p>
        <p className="mt-2 text-lg font-black text-zinc-950">Muscat, Azaiba North</p>
      </div>
    </div>
  );
}

export function SectionCardGrid({
  items,
}: {
  items: Array<{ title: string; description: string; icon: LucideIcon }>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <div className="inline-flex rounded-2xl bg-[#fff2e4] p-3 text-[#b75c16]"><Icon className="h-5 w-5" /></div>
            <h3 className="mt-5 text-xl font-black text-zinc-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-7 text-zinc-700">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c96a22]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DetailPanel({ title, subtitle, bullets }: { title: string; subtitle?: string; bullets: string[] }) {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b75c16]">{subtitle ?? 'Course details'}</p>
      <h3 className="mt-3 text-2xl font-black tracking-tight text-zinc-950">{title}</h3>
      <div className="mt-5">
        <BulletList items={bullets} />
      </div>
    </div>
  );
}

export function SimpleCTA({ title, description, href, label }: { title: string; description: string; href: string; label: string }) {
  return (
    <div className="rounded-[2.5rem] bg-zinc-950 px-8 py-10 text-white shadow-[0_20px_50px_rgba(15,23,42,0.2)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#e4b07d]">Contact desk</p>
      <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h3>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">{description}</p>
      <Link href={href} className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-950 transition-transform hover:-translate-y-0.5">
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function CourseDetailPage({ slug }: { slug: string }) {
  const course = getCourse(slug);

  return (
    <PublicShell>
      <SplitHero
        eyebrow="Course detail"
        title={course.title}
        description={course.summary}
        image={course.image}
        imageAlt={course.imageAlt}
        primaryHref="/contact-us"
        primaryLabel="Book Now"
        secondaryHref="/courses"
        secondaryLabel="Back to Courses"
        stats={[
          { value: 'Hands-on', label: 'Practical focus', icon: GraduationCap },
          { value: 'Safety-first', label: 'Training method', icon: ShieldCheck },
          { value: 'Certified', label: 'Outcome', icon: Award },
          { value: 'Please enquire', label: 'Price', icon: FileText },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <DetailPanel title="What this course covers" bullets={course.points} />
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b75c16]">Course summary</p>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                {course.summary} Please enquire about pricing, dates, and group delivery options. The institute tailors delivery based on attendee count and location.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#fff7ef] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Duration</p>
                  <p className="mt-2 text-lg font-black text-zinc-950">{course.duration}</p>
                </div>
                <div className="rounded-2xl bg-[#fff7ef] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Price</p>
                  <p className="mt-2 text-lg font-black text-zinc-950">{course.price}</p>
                </div>
              </div>
            </div>
            <SimpleCTA
              title="Ready to enroll a batch?"
              description="Call or message the admissions desk to confirm dates, attendee count, and delivery requirements."
              href="/contact-us"
              label="Contact admissions"
            />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

export function LegalPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#b75c16]">Legal</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600">{description}</p>
          <div className="prose prose-zinc mt-10 max-w-none prose-headings:font-black prose-p:leading-7 prose-li:leading-7">{children}</div>
        </div>
      </section>
    </PublicShell>
  );
}
