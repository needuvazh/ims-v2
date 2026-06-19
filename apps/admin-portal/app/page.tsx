import Link from 'next/link';
import Image from 'next/image';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle,
  GraduationCap,
  Mail,
  Menu,
  Phone,
  Shield,
  Users,
  ArrowRight,
  ChevronRight,
  MapPin,
  Clock,
  Star,
} from 'lucide-react';

/* ─── Nav links ─────────────────────────────────────────────────── */
const navLinks = [
  { label: 'HOME',       href: '/' },
  { label: 'PROGRAMS',   href: '#programs' },
  { label: 'FACILITIES', href: '#facilities' },
  { label: 'EVENTS',     href: '#events' },
  { label: 'ABOUT',      href: '#about' },
  { label: 'CONTACT',    href: '#contact' },
];

/* ─── Stats ──────────────────────────────────────────────────────── */
const stats = [
  { value: '80+',  label: 'Global Programs' },
  { value: '25k+', label: 'Students Trained' },
  { value: '150+', label: 'Success Partners' },
  { value: '20+',  label: 'Years Experience' },
];

/* ─── Programs ───────────────────────────────────────────────────── */
const programs = [
  {
    tag: 'Safety & Compliance',
    title: 'Process Safety Fundamentals',
    mode: 'Classroom',
    duration: '8 Hours',
    testid: 'program-safety',
  },
  {
    tag: 'Language',
    title: 'IELTS Preparation Course',
    mode: 'Classroom',
    duration: '40 Hours',
    testid: 'program-ielts',
  },
  {
    tag: 'Management',
    title: 'Project Management Professional',
    mode: 'Blended',
    duration: '5 Days',
    testid: 'program-pmp',
  },
  {
    tag: 'Engineering',
    title: 'Industrial Safety & Risk Assessment',
    mode: 'Classroom',
    duration: '3 Days',
    testid: 'program-isa',
  },
];

/* ─── Features ───────────────────────────────────────────────────── */
const features = [
  {
    icon: Shield,
    title: 'Strategic Vision',
    desc: 'Aligning training goals with national workforce development targets.',
  },
  {
    icon: Building2,
    title: 'Modern Facilities',
    desc: 'High-spec classrooms, simulation labs, and collaborative spaces.',
  },
  {
    icon: Users,
    title: 'Certified Trainers',
    desc: 'Expert instructors with global certifications and industry experience.',
  },
];

/* ─── Portals ────────────────────────────────────────────────────── */
const portals = [
  {
    id: 'admin',
    label: 'Admin Portal',
    desc: 'Full control over institute operations — branches, staff, enrollment, fees.',
    icon: Shield,
    href: '/sign-in',
    testid: 'portal-admin',
    dark: true,
  },
  {
    id: 'student',
    label: 'Student Portal',
    desc: 'Access courses, attendance, results, certificates, and fee payments.',
    icon: GraduationCap,
    href: '#',
    testid: 'portal-student',
    dark: false,
  },
  {
    id: 'trainer',
    label: 'Trainer Portal',
    desc: 'Mark attendance, upload content, track progress, and schedule sessions.',
    icon: BookOpen,
    href: '#',
    testid: 'portal-trainer',
    dark: false,
  },
  {
    id: 'verify',
    label: 'Certificate Verify',
    desc: 'Instantly verify the authenticity of any certificate issued by the institute.',
    icon: Award,
    href: '#',
    testid: 'portal-verify',
    dark: false,
  },
];

/* ─── Events ─────────────────────────────────────────────────────── */
const events = [
  { date: 'Jul 15', title: 'IELTS Information Session', location: 'Main Campus', time: '10:00 AM' },
  { date: 'Jul 22', title: 'Process Safety Workshop', location: 'Training Centre B', time: '09:00 AM' },
  { date: 'Aug 05', title: 'Corporate Training Expo', location: 'Conference Hall', time: '08:30 AM' },
];

/* ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-[#14213d]"
      style={{ background: '#FAF8F2', fontFamily: 'var(--font-body, Manrope, sans-serif)' }}
    >

      {/* ═══════ TOP UTILITY BAR ═══════ */}
      <div
        className="hidden border-b border-[rgba(20,33,61,0.1)] px-6 py-2 text-xs lg:block"
        style={{ background: '#FAF8F2' }}
        data-testid="utility-bar"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6 text-[rgba(20,33,61,0.6)]">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              +968 9658 9150
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              contactus@alsaud-intl.com
            </span>
          </div>
          <div className="flex items-center gap-5 text-[rgba(20,33,61,0.6)]">
            <Link
              href="/sign-in"
              className="font-medium text-[#c47d46] transition-colors hover:text-[#14213d]"
              data-testid="utility-ims-login"
            >
              IMS Login
            </Link>
            <span className="text-[rgba(20,33,61,0.3)]">|</span>
            <span className="cursor-pointer transition-colors hover:text-[#14213d]">العربية</span>
          </div>
        </div>
      </div>

      {/* ═══════ MAIN NAVBAR ═══════ */}
      <header
        className="sticky top-0 z-50 border-b border-[rgba(20,33,61,0.1)]"
        style={{ background: 'rgba(250,248,242,0.95)', backdropFilter: 'blur(16px)' }}
        data-testid="main-nav"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3" data-testid="nav-logo">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#c47d46]">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#c47d46] leading-none">
                Al-Saud Training Institute
              </p>
              <p
                className="text-base font-bold uppercase tracking-[0.12em] text-[#14213d] leading-tight"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                Institute
              </p>
            </div>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden items-center gap-7 xl:flex" data-testid="desktop-nav">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[11px] font-semibold tracking-[0.18em] text-[rgba(20,33,61,0.65)] transition-colors hover:text-[#14213d]"
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Admin Login CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-full bg-[#14213d] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-[#c47d46] active:scale-[0.97]"
              data-testid="nav-admin-login"
            >
              Admin Login
            </Link>
            <button
              className="rounded-xl border border-[rgba(20,33,61,0.15)] p-2.5 text-[#14213d] transition-colors hover:bg-[rgba(196,125,70,0.08)] xl:hidden"
              aria-label="Open menu"
              data-testid="nav-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════ HERO ═══════ */}
      <section
        className="overflow-hidden px-6 pb-16 pt-14 lg:px-8 lg:pb-24 lg:pt-20"
        data-testid="hero-section"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">

          {/* Text column */}
          <div className="flex-1 text-center lg:text-left" data-testid="hero-text">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
              Al-Saud Training Institute
            </p>
            <h1
              className="mb-6 text-5xl font-bold leading-[1.06] tracking-tight text-[#14213d] sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              data-testid="hero-heading"
            >
              Redefining
              <br />
              <span className="text-[#c47d46]">Professional</span>
              <br />
              Growth.
            </h1>
            <p
              className="mb-8 max-w-lg text-base leading-relaxed text-[rgba(20,33,61,0.65)] sm:text-lg lg:mx-0"
              data-testid="hero-subtitle"
            >
              Building a future-ready workforce through international accreditations,
              world-class facilities, and industry-leading expertise.
            </p>
            <div
              className="flex flex-wrap justify-center gap-3 lg:justify-start"
              data-testid="hero-ctas"
            >
              <a
                href="#programs"
                className="flex items-center gap-2 rounded-full bg-[#14213d] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(20,33,61,0.22)] transition-all hover:bg-[#c47d46] active:scale-[0.97]"
                data-testid="hero-cta-browse"
              >
                Browse Programs
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#about"
                className="rounded-full border border-[rgba(20,33,61,0.2)] bg-white px-6 py-3 text-sm font-semibold text-[#14213d] transition-all hover:border-[#c47d46] hover:text-[#c47d46] active:scale-[0.97]"
                data-testid="hero-cta-about"
              >
                About Us
              </a>
            </div>
            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-[rgba(20,33,61,0.5)] lg:justify-start">
              {['ISO 9001 Accredited', 'MoL Certified', 'PDO Approved'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-[#c47d46]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Image column */}
          <div className="relative w-full max-w-md flex-shrink-0 lg:max-w-xl" data-testid="hero-image">
            <div className="overflow-hidden rounded-2xl shadow-[0_28px_70px_rgba(20,33,61,0.16)]">
              <img
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200"
                alt="Al-Saud Training Institute — Premier Training"
                className="h-[340px] w-full object-cover lg:h-[460px]"
              />
            </div>
            {/* Floating stat chip */}
            <div
              className="absolute -bottom-5 -left-4 rounded-2xl bg-[#14213d] px-5 py-3.5 shadow-[0_12px_36px_rgba(20,33,61,0.22)]"
              data-testid="hero-chip-students"
            >
              <p className="text-xl font-bold text-white">25k+</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Students Trained</p>
            </div>
            {/* Floating stat chip — top right */}
            <div
              className="absolute -right-4 -top-4 rounded-2xl border border-[rgba(196,125,70,0.25)] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(20,33,61,0.1)]"
              data-testid="hero-chip-programs"
            >
              <p className="font-bold text-[#c47d46] text-xl" style={{ fontFamily: 'var(--font-display, serif)' }}>80+</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(20,33,61,0.5)]">Programs</p>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════ STATS RIBBON ═══════ */}
      <section
        id="stats"
        className="border-y border-[rgba(20,33,61,0.1)] bg-white px-6 py-12 lg:px-8"
        data-testid="stats-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 divide-x divide-[rgba(20,33,61,0.1)] md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 px-6 py-2 text-center"
                data-testid={`stat-${i}`}
              >
                <span
                  className="text-4xl font-bold tracking-tight text-[#14213d] sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  {stat.value}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c47d46]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ INDUSTRY ACCREDITATION ═══════ */}
      <section className="px-6 py-16 lg:px-8" data-testid="accreditation-section">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-center gap-6">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                Industry Accreditation
              </p>
              <h2
                className="text-4xl font-semibold tracking-tight text-[#14213d] sm:text-5xl"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                Success Partners.
              </h2>
            </div>
          </div>
          <p className="max-w-2xl text-base text-[rgba(20,33,61,0.6)] leading-relaxed">
            We are proud to be accredited by the world&apos;s leading professional organizations,
            ensuring our certifications are recognized globally across industries.
          </p>
          {/* Partner logos row — placeholder badges */}
          <div className="mt-8 flex flex-wrap items-center gap-6" data-testid="partner-logos">
            {['ISO 9001', 'PDO Approved', 'MoL Certified', 'NEBOSH', 'IOSH', 'PMI Authorized'].map((p) => (
              <div
                key={p}
                className="flex h-14 items-center justify-center rounded-xl border border-[rgba(20,33,61,0.1)] bg-white px-6 text-xs font-bold uppercase tracking-widest text-[rgba(20,33,61,0.4)] shadow-sm"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ INTEGRATED LEARNING ═══════ */}
      <section
        id="about"
        className="bg-white px-6 py-20 lg:px-8"
        data-testid="learning-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">

            {/* Text */}
            <div className="flex-1">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                Integrated Learning
              </p>
              <h2
                className="mb-8 text-4xl font-semibold leading-tight tracking-tight text-[#14213d] sm:text-5xl"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                Market Relevant
                <br />
                <span className="text-[#c47d46]">Programs</span> for
                <br />
                Professional Growth.
              </h2>
              <div className="space-y-6">
                {features.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="flex items-start gap-4" data-testid={`feature-${feat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c47d46]/10">
                        <Icon className="h-5 w-5 text-[#c47d46]" />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#c47d46]">
                          {feat.title}
                        </p>
                        <p className="text-sm leading-relaxed text-[rgba(20,33,61,0.65)]">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <blockquote className="mt-10 border-l-2 border-[#c47d46] pl-5">
                <p className="text-base italic text-[rgba(20,33,61,0.6)] leading-relaxed">
                  &ldquo;Excellence is not an act, but a habit. We build that habit here.&rdquo;
                </p>
              </blockquote>
            </div>

            {/* Image */}
            <div className="relative w-full max-w-md flex-shrink-0 lg:max-w-lg">
              <div className="overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(20,33,61,0.12)]">
                <img
                  src="https://images.unsplash.com/photo-1758691736067-b309ee3ef7b9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900"
                  alt="Training Classroom"
                  className="h-[380px] w-full object-cover lg:h-[480px]"
                />
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-2xl bg-[#c47d46]/15" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURED PROGRAMS ═══════ */}
      <section
        id="programs"
        className="px-6 py-20 lg:px-8"
        data-testid="programs-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                Our Portfolio
              </p>
              <h2
                className="text-4xl font-semibold tracking-tight text-[#14213d] sm:text-5xl"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                Featured Programs.
              </h2>
            </div>
            <a
              href="#programs"
              className="hidden items-center gap-1.5 text-sm font-semibold text-[#c47d46] transition-colors hover:text-[#14213d] sm:flex"
            >
              View Full Directory
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((prog) => (
              <div
                key={prog.title}
                className="group cursor-pointer rounded-2xl border border-[rgba(20,33,61,0.08)] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#c47d46]/30 hover:shadow-[0_16px_40px_rgba(20,33,61,0.1)]"
                data-testid={prog.testid}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded-lg bg-[#c47d46]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c47d46]">
                    {prog.mode}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[rgba(20,33,61,0.4)]">
                    <Clock className="h-3 w-3" />
                    {prog.duration}
                  </span>
                </div>
                <h3 className="mb-3 text-base font-semibold leading-snug text-[#14213d]">
                  {prog.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[rgba(20,33,61,0.06)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[rgba(20,33,61,0.5)]">
                    {prog.tag}
                  </span>
                  {/* Avatars */}
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((n) => (
                      <img
                        key={n}
                        src={`https://i.pravatar.cc/100?u=${n}`}
                        alt=""
                        className="h-6 w-6 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#c47d46] text-[8px] font-bold text-white">
                      +12
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ INFRASTRUCTURE / FACILITIES ═══════ */}
      <section
        id="facilities"
        className="overflow-hidden bg-[#14213d] px-6 py-20 lg:px-8"
        data-testid="facilities-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">

            {/* Image */}
            <div className="relative w-full max-w-lg flex-shrink-0">
              <div className="overflow-hidden rounded-2xl">
                <img
                  src="https://images.pexels.com/photos/36834057/pexels-photo-36834057.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Modern Labs"
                  className="h-[320px] w-full object-cover lg:h-[420px]"
                />
              </div>
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                Infrastructure
              </p>
              <h2
                className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                World-Class
                <br />
                <span className="text-[#c47d46]">Training</span>
                <br />
                Facilities.
              </h2>
              <p className="mb-8 max-w-md text-base leading-relaxed text-white/60">
                High-spec classrooms, advanced computer labs, and realistic simulation zones
                designed to mimic industry environments for focused, practical learning.
              </p>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p
                    className="text-3xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-display, serif)' }}
                  >
                    12k+
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    Sq. Meter Campus
                  </p>
                </div>
                <div>
                  <p
                    className="text-3xl font-bold text-white"
                    style={{ fontFamily: 'var(--font-display, serif)' }}
                  >
                    24/7
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                    Support Access
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <a
                  href="#facilities"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Virtual Tour
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ UPCOMING EVENTS ═══════ */}
      <section
        id="events"
        className="bg-white px-6 py-20 lg:px-8"
        data-testid="events-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                Stay Informed
              </p>
              <h2
                className="text-4xl font-semibold tracking-tight text-[#14213d] sm:text-5xl"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                Upcoming Events.
              </h2>
            </div>
            <a
              href="#events"
              className="hidden items-center gap-1.5 text-sm font-semibold text-[#c47d46] hover:text-[#14213d] sm:flex"
            >
              View All Calendar
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <div className="divide-y divide-[rgba(20,33,61,0.08)]">
            {events.map((evt) => (
              <div
                key={evt.title}
                className="flex items-center justify-between py-5 transition-colors hover:bg-[rgba(196,125,70,0.03)]"
                data-testid={`event-${evt.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-5">
                  <div className="flex w-14 flex-col items-center justify-center rounded-xl bg-[#c47d46]/10 py-2 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#c47d46]">
                      {evt.date.split(' ')[0]}
                    </span>
                    <span className="text-xl font-bold text-[#14213d]">
                      {evt.date.split(' ')[1]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#14213d]">{evt.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-[rgba(20,33,61,0.5)]">
                      <MapPin className="h-3 w-3" />
                      {evt.location} · {evt.time}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[rgba(20,33,61,0.3)]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PORTAL ACCESS ═══════ */}
      <section
        id="portals"
        className="px-6 py-20 lg:px-8"
        data-testid="portals-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
              Portal Access
            </p>
            <h2
              className="text-4xl font-semibold tracking-tight text-[#14213d] sm:text-5xl"
              style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
            >
              Your Gateway Awaits.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-[rgba(20,33,61,0.6)]">
              Each portal is purpose-built — delivering the right tools at the right time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.id}
                  href={portal.href}
                  className={`group flex flex-col gap-5 rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                    portal.dark
                      ? 'bg-[#14213d] text-white hover:bg-[#1e2f52]'
                      : 'border border-[rgba(20,33,61,0.1)] bg-white hover:border-[#c47d46]/40 hover:shadow-[0_16px_40px_rgba(20,33,61,0.1)]'
                  }`}
                  data-testid={portal.testid}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      portal.dark ? 'bg-[#c47d46]' : 'bg-[#c47d46]/10'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${portal.dark ? 'text-white' : 'text-[#c47d46]'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`mb-2 text-base font-bold ${
                        portal.dark ? 'text-white' : 'text-[#14213d]'
                      }`}
                    >
                      {portal.label}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        portal.dark ? 'text-white/60' : 'text-[rgba(20,33,61,0.6)]'
                      }`}
                    >
                      {portal.desc}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        portal.dark ? 'text-[#c47d46]' : 'text-[#c47d46]'
                      }`}
                    >
                      {portal.dark ? 'Sign In as Admin' : 'Access Portal'}
                    </span>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${
                        portal.dark ? 'text-[#c47d46]' : 'text-[rgba(20,33,61,0.3)]'
                      }`}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ CORPORATE SOLUTIONS ═══════ */}
      <section
        id="contact"
        className="bg-white px-6 py-20 lg:px-8"
        data-testid="corporate-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-2xl bg-[#FAF8F2] p-10 lg:p-16">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
              <div className="flex-1">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                  Corporate Solutions
                </p>
                <h2
                  className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-[#14213d] sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                >
                  Empower Your Workforce
                  <br />
                  <span className="text-[#c47d46]">With Custom Training.</span>
                </h2>
                <p className="max-w-lg text-base leading-relaxed text-[rgba(20,33,61,0.65)]">
                  We design bespoke learning pathways aligned with your institutional goals
                  and industry benchmarks, trusted by 150+ corporate partners.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/sign-in"
                  className="rounded-full bg-[#14213d] px-7 py-3.5 text-center text-sm font-semibold text-white transition-all hover:bg-[#c47d46] active:scale-[0.97]"
                  data-testid="corporate-cta-partner"
                >
                  Partner With Us
                </Link>
                <a
                  href="#programs"
                  className="rounded-full border border-[rgba(20,33,61,0.2)] bg-white px-7 py-3.5 text-center text-sm font-semibold text-[#14213d] transition-all hover:border-[#c47d46] hover:text-[#c47d46] active:scale-[0.97]"
                  data-testid="corporate-cta-catalog"
                >
                  Training Catalog
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer
        className="bg-[#14213d] px-6 pb-10 pt-14 text-white lg:px-8"
        data-testid="footer"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 border-b border-white/10 pb-10 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c47d46]">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#c47d46]">Al-Saud Training</p>
                  <p className="text-sm font-bold uppercase tracking-widest text-white" style={{ fontFamily: 'var(--font-display, serif)' }}>
                    Institute
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/50">
                Empowering professional education across the Gulf region.
              </p>
            </div>
            {/* Portals */}
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c47d46]">Portals</p>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link href="/sign-in" className="transition-colors hover:text-white" data-testid="footer-admin">Admin Portal</Link></li>
                <li><a href="#" className="transition-colors hover:text-white" data-testid="footer-student">Student Portal</a></li>
                <li><a href="#" className="transition-colors hover:text-white" data-testid="footer-trainer">Trainer Portal</a></li>
                <li><a href="#" className="transition-colors hover:text-white" data-testid="footer-verify">Certificate Verify</a></li>
              </ul>
            </div>
            {/* Institute */}
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c47d46]">Institute</p>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><a href="#programs" className="transition-colors hover:text-white">Programs</a></li>
                <li><a href="#facilities" className="transition-colors hover:text-white">Facilities</a></li>
                <li><a href="#events" className="transition-colors hover:text-white">Events</a></li>
                <li><a href="#about" className="transition-colors hover:text-white">About</a></li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c47d46]">Contact</p>
              <address className="space-y-2 text-sm not-italic text-white/50">
                <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />+968 9658 9150</p>
                <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />contactus@alsaud-intl.com</p>
                <p className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />Muscat, Sultanate of Oman</p>
              </address>
            </div>
          </div>
          <div
            className="mt-8 flex flex-col items-center justify-between gap-3 text-xs text-white/30 sm:flex-row"
            data-testid="footer-bottom"
          >
            <p>© {new Date().getFullYear()} Al-Saud Training Institute. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="transition-colors hover:text-white/70">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-white/70">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
