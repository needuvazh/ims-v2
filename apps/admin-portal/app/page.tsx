import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  Users,
} from 'lucide-react';
import { AnimateIn } from './components/animate-in';
import { CountUp } from './components/count-up';

/* ─── Data ─────────────────────────────────────────────────────────────── */
const NAV = [
  { label: 'HOME',       href: '/'            },
  { label: 'PROGRAMS',   href: '#programs'    },
  { label: 'FACILITIES', href: '#facilities'  },
  { label: 'EVENTS',     href: '#events'      },
  { label: 'ABOUT',      href: '#about'       },
  { label: 'CONTACT',    href: '#contact'     },
];

const STATS = [
  { value: '80+',  suffix: '', label: 'Global Programs',   num: '80+'  },
  { value: '25k+', suffix: '', label: 'Students Trained',  num: '25k+' },
  { value: '150+', suffix: '', label: 'Success Partners',  num: '150+' },
  { value: '20+',  suffix: '', label: 'Years Experience',  num: '20+'  },
];

const PARTNERS = ['ISO 9001', 'PDO Approved', 'MoL Certified', 'NEBOSH', 'IOSH', 'PMI Authorized'];

const FEATURES = [
  { icon: Shield,    title: 'Strategic Vision',   desc: 'Aligning training goals with national workforce development targets.' },
  { icon: Building2, title: 'Modern Facilities',  desc: 'High-spec classrooms, simulation labs, and collaborative spaces.'   },
  { icon: Users,     title: 'Certified Trainers', desc: 'Expert instructors with global certifications and industry experience.' },
];

const PROGRAMS = [
  { tag: 'Safety',    title: 'Process Safety Fundamentals',          mode: 'Classroom', hours: '8 hrs'  },
  { tag: 'Language',  title: 'IELTS Preparation Course',             mode: 'Classroom', hours: '40 hrs' },
  { tag: 'Project',   title: 'Project Management Professional',      mode: 'Blended',   hours: '5 days' },
  { tag: 'Engineering', title: 'Industrial Safety & Risk Assessment', mode: 'Classroom', hours: '3 days' },
];

const EVENTS = [
  { month: 'JUL', day: '15', title: 'IELTS Information Session',  place: 'Main Campus',        time: '10:00 AM' },
  { month: 'JUL', day: '22', title: 'Process Safety Workshop',    place: 'Training Centre B',  time: '09:00 AM' },
  { month: 'AUG', day: '05', title: 'Corporate Training Expo',    place: 'Conference Hall',    time: '08:30 AM' },
];

const PORTALS = [
  { id: 'admin',   label: 'Admin Portal',       cta: 'Sign In as Admin',  desc: 'Full control over institute operations — branches, staff, enrollment, fees.',      icon: Shield,       href: '/sign-in', dark: true  },
  { id: 'student', label: 'Student Portal',     cta: 'Student Login',     desc: 'Access courses, attendance, results, certificates, and fee payments.',               icon: GraduationCap, href: '#',       dark: false },
  { id: 'trainer', label: 'Trainer Portal',     cta: 'Trainer Login',     desc: 'Mark attendance, upload content, track progress, and schedule sessions.',            icon: BookOpen,     href: '#',        dark: false },
  { id: 'verify',  label: 'Certificate Verify', cta: 'Verify Now',        desc: 'Instantly verify the authenticity of any certificate issued by the institute.',      icon: Award,        href: '#',        dark: false },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-[#0F172A]"
      style={{ background: '#FAFAF8', fontFamily: 'var(--font-body, Manrope, sans-serif)' }}
    >

      {/* ══ TOP UTILITY BAR ══════════════════════════════════════════════ */}
      <div
        className="hidden border-b border-[rgba(15,23,42,0.08)] px-6 py-2 text-xs lg:block"
        style={{ background: '#0F172A' }}
        data-testid="utility-bar"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6 text-white/50">
            <a href="tel:+96896589150" className="flex items-center gap-1.5 transition-colors hover:text-white/80">
              <Phone className="h-3 w-3" /> +968 9658 9150
            </a>
            <a href="mailto:contactus@alsaud-intl.com" className="flex items-center gap-1.5 transition-colors hover:text-white/80">
              <Mail className="h-3 w-3" /> contactus@alsaud-intl.com
            </a>
          </div>
          <div className="flex items-center gap-4 text-white/50">
            <Link href="/sign-in" className="font-semibold text-[#EA580C] transition-colors hover:text-[#f97316]" data-testid="utility-ims-login">
              IMS Login
            </Link>
            <span className="opacity-30">|</span>
            <span className="cursor-pointer transition-colors hover:text-white/80">العربية</span>
          </div>
        </div>
      </div>

      {/* ══ MAIN NAVBAR ══════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 border-b border-[rgba(15,23,42,0.08)]"
        style={{ background: 'rgba(250,250,248,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        data-testid="main-nav"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3" data-testid="nav-logo">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#EA580C]">Al-Saud Training</p>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F172A]" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>
                Institute
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 xl:flex">
            {NAV.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[10.5px] font-semibold tracking-[0.18em] text-[rgba(15,23,42,0.55)] transition-colors hover:text-[#0F172A]"
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-full px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)', boxShadow: '0 4px 14px rgba(234,88,12,0.35)' }}
              data-testid="nav-admin-login"
            >
              Admin Login
            </Link>
            <button
              className="rounded-xl border border-[rgba(15,23,42,0.12)] p-2.5 transition-colors hover:bg-[rgba(234,88,12,0.06)] xl:hidden"
              aria-label="Open menu"
              data-testid="nav-mobile-menu"
            >
              <Menu className="h-5 w-5 text-[#0F172A]" />
            </button>
          </div>
        </div>
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: '#0F172A' }}
        data-testid="hero-section"
      >
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="animate-morph-blob animate-float-slow absolute -left-32 -top-32 h-[600px] w-[600px] opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.6) 0%, transparent 70%)' }}
          />
          <div
            className="animate-morph-blob animate-float-rev absolute -right-24 bottom-0 h-[500px] w-[500px] opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.4) 0%, transparent 70%)', animationDelay: '4s' }}
          />
          {/* Dot grid */}
          <div className="dot-grid-light absolute inset-0 opacity-40" />
          {/* Spinning ring */}
          <div
            className="animate-spin-vslow absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed"
            style={{ borderColor: 'rgba(234,88,12,0.12)' }}
          />
          <div
            className="animate-spin-rev absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pb-32 lg:pt-20">
          <div className="flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:gap-12">

            {/* Text column */}
            <div className="flex-1 text-center lg:text-left" data-testid="hero-text">
              {/* Eyebrow */}
              <div
                className="animate-fade-in-up mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
                style={{ borderColor: 'rgba(234,88,12,0.35)', background: 'rgba(234,88,12,0.1)' }}
                data-testid="hero-badge"
              >
                <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f97316]">
                  Al-Saud Training Institute
                </span>
              </div>

              {/* Headline */}
              <h1
                className="mb-6 leading-[1.04] tracking-tight text-white"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 700 }}
                data-testid="hero-heading"
              >
                <span className="animate-fade-in-up block">Redefining</span>
                <span className="animate-fade-in-up delay-100 block text-gradient-orange">Professional</span>
                <span className="animate-fade-in-up delay-200 block">Growth.</span>
              </h1>

              {/* Subtitle */}
              <p
                className="animate-fade-in-up delay-300 mb-8 max-w-lg text-base leading-relaxed lg:mx-0"
                style={{ color: 'rgba(255,255,255,0.58)' }}
                data-testid="hero-subtitle"
              >
                Building a future-ready workforce through international accreditations,
                world-class facilities, and industry-leading expertise.
              </p>

              {/* CTAs */}
              <div
                className="animate-fade-in-up delay-400 mb-8 flex flex-wrap justify-center gap-3 lg:justify-start"
                data-testid="hero-ctas"
              >
                <a
                  href="#programs"
                  className="group flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)', boxShadow: '0 6px 22px rgba(234,88,12,0.45)' }}
                  data-testid="hero-cta-browse"
                >
                  Browse Programs
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#about"
                  className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.97]"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                  data-testid="hero-cta-about"
                >
                  About Us
                </a>
              </div>

              {/* Trust badges */}
              <div
                className="animate-fade-in-up delay-500 flex flex-wrap justify-center gap-5 text-xs lg:justify-start"
                style={{ color: 'rgba(255,255,255,0.42)' }}
              >
                {['ISO 9001 Accredited', 'MoL Certified', 'PDO Approved'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-[#EA580C]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Image column */}
            <div
              className="animate-fade-in-right delay-200 relative w-full max-w-[420px] flex-shrink-0 lg:max-w-[520px]"
              data-testid="hero-image"
            >
              {/* Main image card */}
              <div
                className="animate-float-slow relative overflow-hidden rounded-2xl"
                style={{
                  boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
                  animationDelay: '0.3s',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200"
                  alt="Al-Saud Training Institute"
                  className="h-[300px] w-full object-cover lg:h-[420px]"
                  style={{ filter: 'brightness(0.9)' }}
                />
                {/* Gradient overlay on image */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 50%)' }}
                />
              </div>

              {/* Floating chip — students */}
              <div
                className="animate-float absolute -bottom-5 -left-5 rounded-2xl px-5 py-3.5"
                style={{
                  background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                  boxShadow: '0 12px 32px rgba(234,88,12,0.4)',
                  animationDelay: '1s',
                }}
                data-testid="hero-chip-students"
              >
                <p className="text-xl font-bold text-white">25k+</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Students Trained</p>
              </div>

              {/* Floating chip — programs */}
              <div
                className="animate-float-rev absolute -right-5 -top-5 rounded-2xl px-5 py-3.5"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                  animationDelay: '0.5s',
                }}
                data-testid="hero-chip-programs"
              >
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display, serif)' }}>80+</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Programs</p>
              </div>

              {/* Floating chip — live */}
              <div
                className="absolute right-4 bottom-4 flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(15,23,42,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-[#EA580C]" />
                  <div className="pulse-ring absolute inset-0 rounded-full" />
                </div>
                <p className="text-[10px] font-semibold text-white">Live Enrollment Open</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(234,88,12,0.4)] to-transparent" />
      </section>

      {/* ══ STATS RIBBON ════════════════════════════════════════════════ */}
      <section
        className="border-b border-[rgba(15,23,42,0.08)] bg-white px-6 py-14 lg:px-8"
        data-testid="stats-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 divide-x divide-[rgba(15,23,42,0.08)] md:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-2 px-6 py-2 text-center"
                data-testid={`stat-${i}`}
              >
                <span
                  className="text-5xl font-bold tracking-tight text-gradient-orange lg:text-6xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  <CountUp value={stat.num} />
                </span>
                <span className="section-eyebrow text-[rgba(15,23,42,0.5)]" style={{ color: undefined }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ INDUSTRY ACCREDITATION ══════════════════════════════════════ */}
      <section className="px-6 py-16 lg:px-8" data-testid="accreditation-section">
        <div className="mx-auto max-w-7xl">
          <AnimateIn>
            <p className="section-eyebrow mb-3">Industry Accreditation</p>
            <h2
              className="mb-4 text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl"
              style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
            >
              Success Partners.
            </h2>
            <p className="mb-8 max-w-2xl text-base leading-relaxed text-[rgba(15,23,42,0.55)]">
              Accredited by the world&apos;s leading professional organizations — our certifications
              are recognized globally across industries.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <div className="flex flex-wrap items-center gap-4" data-testid="partner-logos">
              {PARTNERS.map((p) => (
                <div
                  key={p}
                  className="hover-lift flex h-12 items-center justify-center rounded-xl border border-[rgba(15,23,42,0.1)] bg-white px-5 text-[11px] font-bold uppercase tracking-widest text-[rgba(15,23,42,0.4)] shadow-sm transition-all hover:border-[#EA580C]/30 hover:text-[#EA580C]"
                >
                  {p}
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ══ INTEGRATED LEARNING ═════════════════════════════════════════ */}
      <section id="about" className="bg-white px-6 py-20 lg:px-8" data-testid="learning-section">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-14 lg:flex-row lg:items-center lg:gap-20">

            {/* Text */}
            <div className="flex-1">
              <AnimateIn>
                <p className="section-eyebrow mb-3">Integrated Learning</p>
                <h2
                  className="mb-8 text-4xl font-semibold leading-tight tracking-tight text-[#0F172A] sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  Market Relevant
                  <br />
                  <span className="text-gradient-orange">Programs</span> for
                  <br />
                  Professional Growth.
                </h2>
              </AnimateIn>

              <div className="space-y-6">
                {FEATURES.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <AnimateIn key={feat.title} delay={i * 100}>
                      <div
                        className="group flex items-start gap-4 rounded-2xl p-4 transition-all hover:bg-[rgba(234,88,12,0.04)]"
                        data-testid={`feature-${feat.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                          style={{ background: 'rgba(234,88,12,0.1)' }}
                        >
                          <Icon className="h-5 w-5 text-[#EA580C]" />
                        </div>
                        <div>
                          <p className="section-eyebrow mb-1">{feat.title}</p>
                          <p className="text-sm leading-relaxed text-[rgba(15,23,42,0.6)]">{feat.desc}</p>
                        </div>
                      </div>
                    </AnimateIn>
                  );
                })}
              </div>

              <AnimateIn delay={300}>
                <blockquote
                  className="mt-10 rounded-2xl p-5"
                  style={{ background: 'rgba(234,88,12,0.06)', borderLeft: '3px solid #EA580C' }}
                >
                  <p className="text-base italic leading-relaxed text-[rgba(15,23,42,0.65)]">
                    &ldquo;Excellence is not an act, but a habit. We build that habit here.&rdquo;
                  </p>
                </blockquote>
              </AnimateIn>
            </div>

            {/* Image */}
            <AnimateIn direction="right" className="relative w-full max-w-md flex-shrink-0 lg:max-w-lg">
              <div className="overflow-hidden rounded-2xl" style={{ boxShadow: '0 24px 60px rgba(15,23,42,0.14)' }}>
                <img
                  src="https://images.unsplash.com/photo-1758691736067-b309ee3ef7b9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900"
                  alt="Training Classroom"
                  className="h-[360px] w-full object-cover transition-transform duration-700 hover:scale-105 lg:h-[480px]"
                />
              </div>
              {/* Decorative accent */}
              <div
                className="absolute -bottom-4 -right-4 h-28 w-28 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.2), rgba(234,88,12,0.05))' }}
              />
              {/* Stat overlay */}
              <div
                className="absolute bottom-6 left-6 rounded-xl px-5 py-4"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(15,23,42,0.15)' }}
              >
                <p className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-display, serif)' }}>98%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#EA580C]">Placement Rate</p>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* ══ FEATURED PROGRAMS ═══════════════════════════════════════════ */}
      <section id="programs" className="px-6 py-20 lg:px-8" data-testid="programs-section">
        <div className="mx-auto max-w-7xl">
          <AnimateIn>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="section-eyebrow mb-2">Our Portfolio</p>
                <h2
                  className="text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  Featured Programs.
                </h2>
              </div>
              <a
                href="#programs"
                className="hidden items-center gap-1.5 text-sm font-semibold text-[#EA580C] transition-colors hover:text-[#0F172A] sm:flex"
              >
                View Full Directory <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </AnimateIn>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROGRAMS.map((prog, i) => (
              <AnimateIn key={prog.title} delay={i * 80} className="h-full">
                <div
                  className="group flex h-full cursor-pointer flex-col gap-4 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#EA580C]/25 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
                  data-testid={`program-${i}`}
                  style={{ willChange: 'transform' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#EA580C]"
                      style={{ background: 'rgba(234,88,12,0.1)' }}
                    >
                      {prog.mode}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[rgba(15,23,42,0.4)]">
                      <Clock className="h-3 w-3" /> {prog.hours}
                    </span>
                  </div>
                  <h3 className="flex-1 text-sm font-semibold leading-snug text-[#0F172A]">
                    {prog.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ background: 'rgba(15,23,42,0.06)', color: 'rgba(15,23,42,0.5)' }}
                    >
                      {prog.tag}
                    </span>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((n) => (
                        <img
                          key={n}
                          src={`https://i.pravatar.cc/100?u=${n + i * 3}`}
                          alt=""
                          className="h-6 w-6 rounded-full border-2 border-white object-cover"
                        />
                      ))}
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-white"
                        style={{ background: '#EA580C' }}
                      >
                        +12
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FACILITIES ══════════════════════════════════════════════════ */}
      <section
        id="facilities"
        className="relative overflow-hidden px-6 py-20 lg:px-8"
        style={{ background: '#0F172A' }}
        data-testid="facilities-section"
      >
        {/* BG decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="dot-grid-light absolute inset-0 opacity-30" />
          <div
            className="animate-float-slow absolute -right-32 top-0 h-[400px] w-[400px] opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.5) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-14 lg:flex-row lg:items-center lg:gap-20">

            {/* Image */}
            <AnimateIn direction="left" className="relative w-full max-w-lg flex-shrink-0">
              <div className="overflow-hidden rounded-2xl" style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
                <img
                  src="https://images.pexels.com/photos/36834057/pexels-photo-36834057.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Training Facilities"
                  className="h-[320px] w-full object-cover transition-transform duration-700 hover:scale-105 lg:h-[420px]"
                />
              </div>
              <div
                className="absolute -bottom-3 -left-3 h-24 w-24 rounded-2xl"
                style={{ background: 'rgba(234,88,12,0.25)' }}
              />
            </AnimateIn>

            {/* Text */}
            <div className="flex-1">
              <AnimateIn direction="right">
                <p className="section-eyebrow mb-3 text-[#EA580C]">Infrastructure</p>
                <h2
                  className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  World-Class
                  <br />
                  <span className="text-gradient-orange">Training</span>
                  <br />
                  Facilities.
                </h2>
                <p className="mb-8 max-w-md text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  High-spec classrooms, advanced computer labs, and realistic simulation zones
                  designed to mimic industry environments for focused, practical learning.
                </p>
              </AnimateIn>

              <div className="flex flex-wrap gap-10">
                {[{ val: '12k+', label: 'Sq. Meter Campus' }, { val: '24/7', label: 'Support Access' }, { val: '98%', label: 'Satisfaction Rate' }].map((item) => (
                  <AnimateIn key={item.label}>
                    <div>
                      <p className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display, serif)' }}>{item.val}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</p>
                    </div>
                  </AnimateIn>
                ))}
              </div>

              <AnimateIn delay={200}>
                <div className="mt-10">
                  <a
                    href="#facilities"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                  >
                    Virtual Tour <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </AnimateIn>
            </div>
          </div>
        </div>
      </section>

      {/* ══ UPCOMING EVENTS ═════════════════════════════════════════════ */}
      <section id="events" className="bg-white px-6 py-20 lg:px-8" data-testid="events-section">
        <div className="mx-auto max-w-7xl">
          <AnimateIn>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="section-eyebrow mb-2">Stay Informed</p>
                <h2
                  className="text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  Upcoming Events.
                </h2>
              </div>
              <a
                href="#events"
                className="hidden items-center gap-1.5 text-sm font-semibold text-[#EA580C] hover:text-[#0F172A] sm:flex"
              >
                View All Calendar <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </AnimateIn>

          <div className="divide-y divide-[rgba(15,23,42,0.07)]">
            {EVENTS.map((evt, i) => (
              <AnimateIn key={evt.title} delay={i * 80}>
                <div
                  className="group flex cursor-pointer items-center justify-between py-5 transition-all hover:bg-[rgba(234,88,12,0.03)]"
                  data-testid={`event-${i}`}
                >
                  <div className="flex items-center gap-5">
                    <div
                      className="flex w-14 flex-col items-center justify-center rounded-2xl py-2.5 text-center"
                      style={{ background: 'rgba(234,88,12,0.08)' }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#EA580C]">{evt.month}</span>
                      <span className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'var(--font-display, serif)' }}>{evt.day}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A] transition-colors group-hover:text-[#EA580C]">{evt.title}</p>
                      <p className="flex items-center gap-1.5 text-xs text-[rgba(15,23,42,0.45)]">
                        <MapPin className="h-3 w-3" /> {evt.place} · {evt.time}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all group-hover:bg-[rgba(234,88,12,0.1)]"
                  >
                    <ChevronRight className="h-4 w-4 text-[rgba(15,23,42,0.3)] transition-colors group-hover:text-[#EA580C]" />
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PORTAL ACCESS ═══════════════════════════════════════════════ */}
      <section id="portals" className="px-6 py-20 lg:px-8" data-testid="portals-section">
        <div className="mx-auto max-w-7xl">
          <AnimateIn className="mb-12 text-center">
            <p className="section-eyebrow mx-auto mb-3 justify-center">Portal Access</p>
            <h2
              className="text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl"
              style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
            >
              Your Gateway Awaits.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-[rgba(15,23,42,0.55)]">
              Each portal is purpose-built — delivering the right tools at the right time.
            </p>
          </AnimateIn>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PORTALS.map((portal, i) => {
              const Icon = portal.icon;
              return (
                <AnimateIn key={portal.id} delay={i * 80} direction="scale">
                  <Link
                    href={portal.href}
                    className={`group flex h-full flex-col gap-5 rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                      portal.dark
                        ? 'text-white'
                        : 'border border-[rgba(15,23,42,0.08)] bg-white hover:border-[#EA580C]/25 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]'
                    }`}
                    style={
                      portal.dark
                        ? {
                            background: 'linear-gradient(135deg, #0F172A 60%, #1e293b)',
                            boxShadow: '0 16px 40px rgba(15,23,42,0.3)',
                          }
                        : {}
                    }
                    data-testid={`portal-${portal.id}`}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                      style={
                        portal.dark
                          ? { background: 'linear-gradient(135deg, #EA580C, #C2410C)' }
                          : { background: 'rgba(234,88,12,0.1)' }
                      }
                    >
                      <Icon className={`h-5 w-5 ${portal.dark ? 'text-white' : 'text-[#EA580C]'}`} />
                    </div>

                    <div className="flex-1">
                      <h3 className={`mb-2 text-base font-bold ${portal.dark ? 'text-white' : 'text-[#0F172A]'}`}>
                        {portal.label}
                      </h3>
                      <p className={`text-sm leading-relaxed ${portal.dark ? 'text-white/55' : 'text-[rgba(15,23,42,0.55)]'}`}>
                        {portal.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${portal.dark ? 'text-[#f97316]' : 'text-[#EA580C]'}`}>
                        {portal.cta}
                      </span>
                      <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${portal.dark ? 'text-[#EA580C]' : 'text-[rgba(15,23,42,0.3)]'}`} />
                    </div>
                  </Link>
                </AnimateIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ CORPORATE SOLUTIONS ═════════════════════════════════════════ */}
      <section id="contact" className="bg-white px-6 py-20 lg:px-8" data-testid="corporate-section">
        <div className="mx-auto max-w-7xl">
          <AnimateIn>
            <div
              className="relative overflow-hidden rounded-3xl p-10 lg:p-16"
              style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1e293b 100%)' }}
            >
              {/* Decorative orbs */}
              <div
                className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.5), transparent 70%)' }}
              />
              <div
                className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.4), transparent 70%)' }}
              />
              <div className="dot-grid-light absolute inset-0 opacity-20" />

              <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-20">
                <div className="flex-1">
                  <p className="section-eyebrow mb-3 text-[#EA580C]">Corporate Solutions</p>
                  <h2
                    className="mb-5 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
                    style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                  >
                    Empower Your Workforce
                    <br />
                    <span className="text-gradient-orange">With Custom Training.</span>
                  </h2>
                  <p className="max-w-lg text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    We design bespoke learning pathways aligned with your institutional goals
                    and industry benchmarks, trusted by 150+ corporate partners.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Link
                    href="/sign-in"
                    className="rounded-full px-7 py-3.5 text-center text-sm font-bold text-white transition-all active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)', boxShadow: '0 6px 22px rgba(234,88,12,0.4)' }}
                    data-testid="corporate-partner-cta"
                  >
                    Partner With Us
                  </Link>
                  <a
                    href="#programs"
                    className="rounded-full px-7 py-3.5 text-center text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.97]"
                    style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                    data-testid="corporate-catalog-cta"
                  >
                    Training Catalog
                  </a>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer
        className="px-6 pb-10 pt-14 lg:px-8"
        style={{ background: '#0F172A' }}
        data-testid="footer"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 border-b border-white/8 pb-10 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}
                >
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#EA580C]">Al-Saud Training</p>
                  <p className="text-sm font-bold uppercase tracking-widest text-white" style={{ fontFamily: 'var(--font-display, serif)' }}>
                    Institute
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Empowering professional education across the Gulf region.
              </p>
            </div>

            {/* Portals */}
            <div>
              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.24em] text-[#EA580C]">Portals</p>
              <ul className="space-y-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><Link href="/sign-in" className="transition-colors hover:text-white" data-testid="footer-admin">Admin Portal</Link></li>
                <li><a href="#" className="transition-colors hover:text-white" data-testid="footer-student">Student Portal</a></li>
                <li><a href="#" className="transition-colors hover:text-white" data-testid="footer-trainer">Trainer Portal</a></li>
                <li><a href="#" className="transition-colors hover:text-white" data-testid="footer-verify">Certificate Verify</a></li>
              </ul>
            </div>

            {/* Institute */}
            <div>
              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.24em] text-[#EA580C]">Institute</p>
              <ul className="space-y-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="#programs"  className="transition-colors hover:text-white">Programs</a></li>
                <li><a href="#facilities" className="transition-colors hover:text-white">Facilities</a></li>
                <li><a href="#events"    className="transition-colors hover:text-white">Events</a></li>
                <li><a href="#about"     className="transition-colors hover:text-white">About</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.24em] text-[#EA580C]">Contact</p>
              <address className="space-y-2.5 text-sm not-italic" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" />+968 9658 9150</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" />contactus@alsaud-intl.com</p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EA580C]" />Muscat, Sultanate of Oman</p>
              </address>
            </div>
          </div>

          <div
            className="mt-8 flex flex-col items-center justify-between gap-3 text-xs sm:flex-row"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            data-testid="footer-bottom"
          >
            <p>© {new Date().getFullYear()} Al-Saud Training Institute. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="transition-colors hover:text-white/60">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-white/60">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
