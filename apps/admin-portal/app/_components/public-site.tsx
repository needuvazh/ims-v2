'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
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

import {
  type SiteLink,
  type CourseCard,
  contactInfo,
  mainNavigation,
  quickLinks,
  eventCards,
  brochureCards,
  careerCards,
  courseCatalog,
} from './public-site-data';

export {
  type SiteLink,
  type CourseCard,
  contactInfo,
  mainNavigation,
  quickLinks,
  eventCards,
  brochureCards,
  careerCards,
  courseCatalog,
};

export const iconMap = {
  users: Users,
  shield: ShieldCheck,
  book: BookOpen,
  award: Award,
  clock: Clock,
  mapPin: MapPin,
  calendar: CalendarDays,
  graduation: GraduationCap,
};

export type StatCard = {
  value: string;
  label: string;
  icon: any;
};

export const stats: StatCard[] = [
  { value: '25k+', label: 'Students Trained', icon: Users },
  { value: '150+', label: 'Success Partners', icon: ShieldCheck },
  { value: '80+', label: 'Global Programs', icon: BookOpen },
  { value: '20+', label: 'Years Experience', icon: Award },
];

export const strengths = [
  {
    title: 'Extensive Expertise',
    description:
      'Years of practical instruction across forklift, crane, EWP, and heavy machinery disciplines.',
    icon: ShieldCheck,
  },
  {
    title: 'Comprehensive Course Library',
    description:
      'A focused catalogue built around workplace safety, operator competence, and certification.',
    icon: ClipboardList,
  },
  {
    title: 'Industry-Recognized Certification',
    description:
      'Training outcomes aligned with employer expectations, compliance requirements, and job readiness.',
    icon: Award,
  },
];

export const facilityCards = [
  {
    title: 'Modern Classrooms',
    description:
      'Comfortable learning spaces for theory, induction, and assessment preparation.',
    icon: Building2,
  },
  {
    title: 'Hands-on Practice Areas',
    description:
      'Practical training environments for operator drills, demonstrations, and evaluations.',
    icon: GraduationCap,
  },
  {
    title: 'Safety Support',
    description:
      'A training approach centered on safe operation, compliance, and confident decision-making.',
    icon: ShieldCheck,
  },
];

export function getCourse(slug: string) {
  return (
    courseCatalog.find((course) => course.slug === slug) ?? courseCatalog[0]
  );
}

function BrandMark({ invert = false, size = 'md' }: { invert?: boolean; size?: 'sm' | 'md' }) {
  const heightClass = size === 'sm' ? 'h-8' : 'h-10';
  return (
    <Image
      src={invert ? '/alsaud/logo-white.png' : '/alsaud/logo.png'}
      alt="Al-Saud Training Institute"
      width={556}
      height={184}
      className={`${heightClass} w-auto object-contain transition-all duration-300`}
      priority
    />
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollY / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-50 text-neutral-900 font-sans selection:bg-orange-500/30 selection:text-white">
      {/* Top Bar */}
      <div className="bg-[#031a27] border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href={contactInfo.phoneHref}
              className="inline-flex items-center gap-2 transition-colors hover:text-orange-400"
            >
              <Phone className="h-3.5 w-3.5" />
              {contactInfo.phone}
            </a>
            <a
              href={contactInfo.emailHref}
              className="inline-flex items-center gap-2 transition-colors hover:text-orange-400"
            >
              <Mail className="h-3.5 w-3.5" />
              {contactInfo.email}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-[9px] tracking-[0.25em] text-neutral-500">
              العربية
            </span>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[9px] font-bold tracking-[0.2em] text-white transition-all hover:bg-white/10 hover:border-white/30"
            >
              IMS Login
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 z-[100] h-[3px] bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 transition-all duration-100" style={{ width: `${scrollProgress}%` }} />

      {/* Main Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xl border-b border-neutral-200/80 shadow-md shadow-neutral-100/40 py-3'
            : 'bg-white py-5 border-b border-neutral-100'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <BrandMark invert={false} size={scrolled ? 'sm' : 'md'} />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {mainNavigation.map((item) => {
              const active =
                item.href !== '/' && pathname.startsWith(item.href);
              const homeActive = item.href === '/' && pathname === '/';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-[12px] font-bold uppercase tracking-[0.1em] transition-colors hover:text-orange-600 ${
                    active || homeActive
                      ? 'text-orange-600'
                      : 'text-neutral-600'
                  }`}
                >
                  {item.label}
                  {(active || homeActive) && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-orange-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex shrink-0">
            <Link
              href="/contact-us"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-orange-600/25 transition-all hover:-translate-y-0.5 hover:shadow-orange-600/40"
            >
              Book Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 lg:hidden hover:bg-neutral-200 transition-colors"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-neutral-100 bg-white lg:hidden"
            >
              <div className="mx-auto flex flex-col px-4 py-6">
                {mainNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="border-b border-neutral-100/60 py-4 text-sm font-bold uppercase tracking-[0.1em] text-neutral-600 transition-colors hover:text-orange-600"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/contact-us"
                  onClick={() => setMobileOpen(false)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-orange-600/20"
                >
                  Book Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main>{children}</main>

      <footer className="relative bg-[#031a27] text-neutral-300 pt-20 pb-10 border-t border-white/5 overflow-hidden">
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div className="space-y-8">
            <BrandMark invert />
            <p className="max-w-md text-sm leading-relaxed text-neutral-400">
              {contactInfo.tagline}
            </p>
            <div className="space-y-4 text-sm text-neutral-400">
              <p className="flex items-start gap-4">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-orange-400" />{' '}
                {contactInfo.address}
              </p>
              <a href={contactInfo.phoneHref} className="flex items-center gap-4 transition-colors hover:text-orange-400">
                <Phone className="h-4 w-4 shrink-0 text-orange-400" />{' '}
                {contactInfo.phone}
              </a>
              <a href={contactInfo.emailHref} className="flex items-center gap-4 transition-colors hover:text-orange-400">
                <Mail className="h-4 w-4 shrink-0 text-orange-400" />{' '}
                {contactInfo.email}
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              Quick Links
            </h3>
            <div className="mt-8 flex flex-col gap-4 text-sm font-medium">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-neutral-400 transition-colors hover:text-orange-400"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              Our Courses
            </h3>
            <div className="mt-8 flex flex-col gap-4 text-sm font-medium">
              {courseCatalog.slice(0, 5).map((course) => (
                <Link
                  key={course.slug}
                  href={`/${course.slug}`}
                  className="text-neutral-400 transition-colors hover:text-orange-400"
                >
                  {course.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Accreditation logos strip in footer */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 shrink-0">
              Accredited by
            </p>
            <div className="flex flex-wrap items-center gap-8 opacity-60 hover:opacity-90 transition-opacity">
              <Image src="/alsaud/partners/npors-logo.png" alt="NPORS" width={120} height={40} className="h-8 w-auto object-contain brightness-0 invert" />
              <Image src="/alsaud/partners/ministries-logo.png" alt="Ministry of Higher Education" width={80} height={80} className="h-10 w-auto object-contain brightness-0 invert" />
              <Image src="/alsaud/partners/provider-logo.png" alt="OPAL Provider" width={80} height={80} className="h-10 w-auto object-contain brightness-0 invert" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10 pt-8 border-t border-white/10">
          <div className="flex flex-col gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Al-Saud Training Institute. All
              rights reserved.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link
                href="/privacy"
                className="transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="transition-colors hover:text-white"
              >
                Terms of Use
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function HeroSection({
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
  showStats = true,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image: string;
  imageAlt?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  stats?: StatCard[];
  showStats?: boolean;
}) {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-[#0b4565] py-hero-py">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={imageAlt ?? 'Hero background'}
          fill
          className="object-cover opacity-25"
          priority
        />
        {/* Layered gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#031a27] via-[#0b4565]/80 to-[#0b4565]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#031a27] via-transparent to-transparent" />
        {/* Orange ambient glow */}
        <div className="absolute top-1/3 right-1/4 h-[700px] w-[700px] rounded-full bg-orange-600/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-sky-600/10 blur-[100px]" />
        {/* Dot grid texture */}
        <div className="absolute inset-0 dot-grid-light opacity-40" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300 backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
          <span className="mx-2 h-3 w-px bg-orange-400/40" />
          <span className="text-orange-400/70">Est. 2003 · Muscat, Oman</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-5xl font-display text-hero-title font-bold leading-[1.08] tracking-tight text-white"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-300/90"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.15em] text-white shadow-xl shadow-orange-600/30 transition-all hover:-translate-y-1 hover:shadow-orange-500/50"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center gap-3 rounded-full border border-white/25 bg-white/8 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-md transition-all hover:bg-white/15 hover:border-white/40"
          >
            {secondaryLabel}
          </Link>
        </motion.div>

        {/* Mobile stats — always visible */}
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 grid grid-cols-2 gap-3 w-full max-w-sm sm:grid-cols-4 sm:max-w-2xl lg:hidden"
          >
            {heroStats.map((item) => {
              const Icon =
                typeof item.icon === 'string'
                  ? iconMap[item.icon as keyof typeof iconMap] || Users
                  : item.icon;
              return (
                <div key={item.label} className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-orange-400 mb-2" />
                  <p className="font-display text-2xl font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-400 text-center">{item.label}</p>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Floating Stats Bar — desktop only, overlaps next section */}
      {showStats && (
        <div className="absolute bottom-0 left-0 right-0 z-20 hidden translate-y-1/2 lg:block">
          <div className="mx-auto max-w-5xl px-8">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-4 gap-px overflow-hidden rounded-[2rem] border border-white/15 bg-white/8 shadow-2xl shadow-black/60 backdrop-blur-2xl"
            >
              {heroStats.map((item) => {
                const Icon =
                  typeof item.icon === 'string'
                    ? iconMap[item.icon as keyof typeof iconMap] || Users
                    : item.icon;
                return (
                  <div
                    key={item.label}
                    className="group relative flex flex-col items-center justify-center overflow-hidden bg-[#031a27]/85 px-6 py-8 transition-all hover:bg-[#0b4565]/90"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <Icon className="mb-3 h-7 w-7 text-orange-400" />
                    <p className="font-display text-3xl font-bold text-white">
                      {item.value}
                    </p>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
    </section>
  );
}

// SplitHero is maintained for backward compatibility in other pages if needed,
// but mapped directly to HeroSection for simplicity.
export const SplitHero = HeroSection;

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  light?: boolean;
}) {
  return (
    <div
      className={`max-w-3xl space-y-5 ${align === 'center' ? 'mx-auto text-center' : ''}`}
    >
      <div
        className={`inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] ${light ? 'text-accent-400' : 'text-accent-600'}`}
      >
        <span
          className={`h-px w-8 ${light ? 'bg-accent-400/50' : 'bg-accent-600/50'}`}
        />
        {eyebrow}
        {align === 'center' && (
          <span
            className={`h-px w-8 ${light ? 'bg-accent-400/50' : 'bg-accent-600/50'}`}
          />
        )}
      </div>
      <h2
        className={`font-display text-section-title font-bold tracking-tight ${light ? 'text-white' : 'text-neutral-900'}`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-lg leading-relaxed ${light ? 'text-neutral-300' : 'text-neutral-600'}`}
        >
          {description}
        </p>
      )}
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
            <div
              key={item.label}
              className="group rounded-[2rem] border border-border-light bg-white p-6 shadow-sm transition-all hover:border-border-accent hover:shadow-xl hover:shadow-accent-600/5"
            >
              <div className="inline-flex rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 p-4 text-accent-600 ring-1 ring-accent-600/10">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-5 font-display text-4xl font-bold text-neutral-900">
                {item.value}
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CourseGrid({ courses }: { courses: CourseCard[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <motion.article
          key={course.slug}
          whileHover={{ y: -8 }}
          className="group flex flex-col overflow-hidden rounded-[2rem] border border-border-light bg-white shadow-sm transition-all hover:border-border-strong hover:shadow-2xl hover:shadow-primary-950/5"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={course.image}
              alt={course.imageAlt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Link
                href={`/${course.slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md hover:bg-white/30"
              >
                View Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex flex-1 flex-col p-card-p">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
                {course.duration}
              </p>
              <span className="rounded-full bg-muted-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600">
                {course.price}
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-neutral-900">
              {course.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 line-clamp-2">
              {course.summary}
            </p>
            <div className="mt-auto pt-6">
              <ul className="space-y-2 text-sm text-neutral-600">
                {course.points.slice(0, 2).map((point) => (
                  <li key={point} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                    <span className="line-clamp-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export function ContactBlock() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {[
        {
          icon: Phone,
          title: 'Phone',
          value: contactInfo.phone,
          href: contactInfo.phoneHref,
        },
        {
          icon: Mail,
          title: 'Email',
          value: contactInfo.email,
          href: contactInfo.emailHref,
        },
        {
          icon: MapPin,
          title: 'Address',
          value: 'Muscat, Azaiba North',
          href: '#',
        },
      ].map((item) => (
        <a
          key={item.title}
          href={item.href}
          className="group flex flex-col items-center rounded-[2rem] border border-border-light bg-white p-8 text-center transition-all hover:border-border-accent hover:shadow-xl hover:shadow-accent-600/5"
        >
          <div className="rounded-full bg-brand-50 p-4 text-accent-600 ring-1 ring-border-light transition-all group-hover:bg-accent-50 group-hover:ring-accent-600/20">
            <item.icon className="h-6 w-6" />
          </div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            {item.title}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-neutral-900">
            {item.value}
          </p>
        </a>
      ))}
    </div>
  );
}

export function SectionCardGrid({
  items,
}: {
  items: Array<{ title: string; description: string; icon: LucideIcon }>;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.title}
            whileHover={{ y: -8 }}
            className="group relative overflow-hidden rounded-[2rem] border border-border-light bg-white p-card-p shadow-sm transition-all hover:border-border-accent hover:shadow-xl hover:shadow-accent-600/5"
          >
            <div className="absolute right-0 top-0 -mr-4 -mt-4 pointer-events-none text-[120px] font-black text-surface-200 opacity-50 transition-transform duration-500 group-hover:scale-110">
              0{idx + 1}
            </div>
            <div className="relative z-10">
              <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 p-4 text-accent-600 ring-1 ring-accent-600/10">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-600">
                {item.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function SectionCardGridByName({
  items,
}: {
  items: Array<{ title: string; description: string; iconName: string }>;
}) {
  const iconMap: Record<string, LucideIcon> = {
    GraduationCap,
    ShieldCheck,
    Users,
    Building2,
    Award,
    BookOpen,
    ClipboardList,
    MapPin,
    Phone,
    Mail,
    CalendarDays,
    CheckCircle2,
    Sparkles,
    FileText,
  };

  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, idx) => {
        const Icon = iconMap[item.iconName] ?? GraduationCap;
        return (
          <motion.div
            key={item.title}
            whileHover={{ y: -8 }}
            className="group relative overflow-hidden rounded-[2rem] border border-border-light bg-white p-card-p shadow-sm transition-all hover:border-border-accent hover:shadow-xl hover:shadow-accent-600/5"
          >
            <div className="absolute right-0 top-0 -mr-4 -mt-4 pointer-events-none text-[120px] font-black text-surface-200 opacity-50 transition-transform duration-500 group-hover:scale-110">
              0{idx + 1}
            </div>
            <div className="relative z-10">
              <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 p-4 text-accent-600 ring-1 ring-accent-600/10">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-600">
                {item.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-relaxed text-neutral-700">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DetailPanel({
  title,
  subtitle,
  bullets,
}: {
  title: string;
  subtitle?: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-[2.5rem] border border-border-light bg-white p-card-p shadow-xl shadow-primary-950/5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
        {subtitle ?? 'Course details'}
      </p>
      <h3 className="mt-4 font-display text-3xl font-bold tracking-tight text-neutral-900">
        {title}
      </h3>
      <div className="mt-6">
        <BulletList items={bullets} />
      </div>
    </div>
  );
}

export function SimpleCTA({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-[#031a27] px-6 sm:px-12 py-16 sm:py-20 text-center shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12),transparent_60%)]" />
      <div className="absolute top-0 right-0 h-[300px] w-[300px] translate-x-1/3 -translate-y-1/3 rounded-full bg-gradient-to-br from-orange-600/10 to-orange-500/10 blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400">
          Take the next step
        </p>
        <h3 className="mt-6 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
          {title}
        </h3>
        <p className="mt-6 text-base sm:text-lg leading-relaxed text-neutral-300">
          {description}
        </p>
        <Link
          href={href}
          className="mt-10 inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-[13px] font-bold uppercase tracking-[0.15em] text-[#031a27] transition-all hover:-translate-y-1 hover:bg-neutral-100 hover:shadow-xl hover:shadow-black/10"
        >
          {label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function CourseDetailPage({ slug }: { slug: string }) {
  const course = getCourse(slug);

  return (
    <PublicShell>
      <HeroSection
        eyebrow="Course detail"
        title={course.title}
        description={course.summary}
        image={course.image}
        primaryHref="/contact-us"
        primaryLabel="Book Now"
        secondaryHref="/courses"
        secondaryLabel="Back to Courses"
        stats={[
          { value: 'Hands-on', label: 'Practical focus', icon: GraduationCap },
          {
            value: 'Safety-first',
            label: 'Training method',
            icon: ShieldCheck,
          },
          { value: 'Certified', label: 'Outcome', icon: Award },
          { value: 'Please enquire', label: 'Price', icon: FileText },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:pt-48">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <DetailPanel
            title="What this course covers"
            bullets={course.points}
          />
          <div className="space-y-8">
            <div className="rounded-[2.5rem] border border-border-light bg-white p-8 shadow-xl shadow-primary-950/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
                Course summary
              </p>
              <p className="mt-4 leading-relaxed text-neutral-600">
                {course.summary} Please enquire about pricing, dates, and group
                delivery options. The institute tailors delivery based on
                attendee count and location.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted-50 p-5 ring-1 ring-border-light">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    Duration
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-neutral-900">
                    {course.duration}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted-50 p-5 ring-1 ring-border-light">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    Price
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-neutral-900">
                    {course.price}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Ready to enroll a batch?"
          description="Call or message the admissions desk to confirm dates, attendee count, and delivery requirements."
          href="/contact-us"
          label="Contact admissions"
        />
      </section>
    </PublicShell>
  );
}

export function LegalPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-[3rem] border border-border-light bg-white p-8 shadow-2xl shadow-primary-950/5 sm:p-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-600">
            Legal Information
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-neutral-900">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-neutral-600">
            {description}
          </p>
          <div className="prose prose-slate mt-12 max-w-none prose-headings:font-display prose-headings:font-bold prose-p:leading-relaxed prose-li:leading-relaxed">
            {children}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

export function FAQAccordion({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <FAQItem key={idx} question={item.question} answer={item.answer} />
      ))}
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border-light bg-white overflow-hidden transition-all hover:border-border-accent">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-lg font-bold text-neutral-900 pr-4">
          {question}
        </span>
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-accent-600 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm leading-relaxed text-neutral-600">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TestimonialGrid({
  testimonials,
}: {
  testimonials: Array<{ quote: string; author: string; role: string }>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((t, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="group relative rounded-[2rem] border border-neutral-100 bg-white p-7 shadow-sm hover:shadow-xl hover:shadow-orange-600/5 hover:-translate-y-1 transition-all duration-300"
        >
          {/* Decorative quote mark */}
          <div className="absolute top-6 right-7 font-display text-7xl font-black text-orange-100 leading-none pointer-events-none select-none">
            &ldquo;
          </div>
          {/* Stars */}
          <div className="flex gap-1 mb-5">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="relative text-sm leading-relaxed text-neutral-700">
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="mt-6 flex items-center gap-3 pt-5 border-t border-neutral-100">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold text-base shadow-md shadow-orange-400/20">
              {t.author.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">{t.author}</p>
              <p className="text-xs text-neutral-500">{t.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function DarkFacilitiesSection() {
  return (
    <section className="relative overflow-hidden bg-[#0b4565] py-16 sm:py-24">
      {/* Background texture */}
      <div className="absolute inset-0 dot-grid-light opacity-25" />
      <div className="absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/3 rounded-full bg-orange-600/10 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Training facilities"
          title="Practical spaces that support real learning"
          description="Dedicated rooms and practical areas help learners build confidence before assessment and deployment."
          light
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {facilityCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20"
              >
                <div className="absolute right-0 top-0 -mr-3 -mt-3 text-[70px] sm:text-[100px] font-black text-white/5 leading-none pointer-events-none">
                  0{idx + 1}
                </div>
                <div className="mb-6 inline-flex rounded-2xl bg-orange-500/15 p-4 text-orange-400 ring-1 ring-orange-400/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-300/80">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AccreditationStrip() {
  const partners = [
    { src: '/alsaud/partners/npors-logo.png', alt: 'NPORS Accreditation', label: 'NPORS Accredited' },
    { src: '/alsaud/partners/ministries-logo.png', alt: 'Ministry of Higher Education Research & Innovation', label: 'Ministry Recognized' },
    { src: '/alsaud/partners/provider-logo.png', alt: 'OPAL Approved Provider', label: 'OPAL Provider' },
  ];

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-neutral-100 bg-gradient-to-br from-white to-neutral-50 px-8 py-10 shadow-sm">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="relative flex flex-col items-center gap-8 md:flex-row md:justify-between md:gap-12">
        <div className="shrink-0 text-center md:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-600">Accredited & Recognized</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-neutral-900">Trusted credentials</h3>
          <p className="mt-1.5 text-sm text-neutral-500 max-w-[200px]">Our training meets international safety standards</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-10 md:justify-end">
          {partners.map((p) => (
            <div key={p.alt} className="group flex flex-col items-center gap-2">
              <div className="flex h-20 w-40 items-center justify-center rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition-all group-hover:shadow-md group-hover:border-orange-100">
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={140}
                  height={60}
                  className="max-h-12 w-auto object-contain"
                />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-400">{p.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PartnerLogoGrid({
  partners,
}: {
  partners: Array<{ name: string; logo?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
      {partners.map((p, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
        >
          {p.logo ? (
            <Image
              src={p.logo}
              alt={p.name}
              width={120}
              height={60}
              className="max-h-12 w-auto"
            />
          ) : (
            <span className="text-sm font-bold text-neutral-400">{p.name}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function BatchScheduleStrip({
  batches,
}: {
  batches: Array<{
    courseName: string;
    startDate: string;
    branchName?: string | null;
    availableSeats: number;
  }>;
}) {
  if (batches.length === 0) return null;
  return (
    <div className="space-y-3">
      {batches.slice(0, 4).map((batch, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.08 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border-light bg-white p-4 sm:p-5 hover:border-border-accent transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-primary-700" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-neutral-900">
                {batch.courseName}
              </p>
              <p className="text-xs text-neutral-500">
                {batch.branchName ?? 'Main Campus'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-neutral-900">
                {new Date(batch.startDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-neutral-500">
                {batch.availableSeats > 0
                  ? `${batch.availableSeats} seats left`
                  : 'Waitlist'}
              </p>
            </div>
            <Link
              href="/contact-us"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-accent-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-accent-700 transition-colors"
            >
              Book <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/96896589150"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 hover:bg-green-600 hover:scale-105 transition-all"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-[2rem] border border-border-light bg-white overflow-hidden">
      <div className="aspect-[4/3] bg-surface-100 shimmer" />
      <div className="p-6 space-y-3">
        <div className="h-3 w-24 bg-surface-100 rounded-full shimmer" />
        <div className="h-6 w-3/4 bg-surface-100 rounded shimmer" />
        <div className="h-4 w-full bg-surface-100 rounded shimmer" />
        <div className="h-4 w-2/3 bg-surface-100 rounded shimmer" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-[2rem] border border-border-light bg-white p-6">
      <div className="h-8 w-20 bg-surface-100 rounded shimmer" />
      <div className="h-3 w-24 bg-surface-100 rounded shimmer mt-3" />
    </div>
  );
}
