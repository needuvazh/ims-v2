import Link from 'next/link';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

/* ─── Portal definitions ──────────────────────────────────────────────────── */
const portals = [
  {
    id: 'admin',
    label: 'Admin Portal',
    eyebrow: 'Institute Management',
    description:
      'Full control over institute operations — manage branches, staff, enrollments, fees, and academic programs from a single command centre.',
    icon: LayoutDashboard,
    href: '/sign-in',
    testid: 'admin-portal-card',
    cta: 'Sign In as Admin',
    style: 'bg-[#14213d] text-white',
    iconBg: 'bg-white/10',
    iconColor: 'text-[#c47d46]',
    badgeStyle: 'bg-white/10 text-white/80',
    arrowStyle: 'text-[#c47d46]',
  },
  {
    id: 'student',
    label: 'Student Portal',
    eyebrow: 'Learner Dashboard',
    description:
      'Access course materials, track attendance, view examination results, download certificates, and manage fee payments — all in one place.',
    icon: GraduationCap,
    href: process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL ?? '/student',
    testid: 'student-portal-card',
    cta: 'Student Login',
    style: 'bg-[#FAF8F4] border border-[rgba(20,33,61,0.12)]',
    iconBg: 'bg-[#c47d46]/10',
    iconColor: 'text-[#c47d46]',
    badgeStyle: 'bg-[#c47d46]/10 text-[#c47d46]',
    arrowStyle: 'text-[#14213d]',
  },
  {
    id: 'trainer',
    label: 'Trainer Portal',
    eyebrow: 'Educator Workspace',
    description:
      'Mark attendance, upload course content, track student progress, schedule sessions, and collaborate with institute staff effortlessly.',
    icon: BookOpen,
    href: process.env.NEXT_PUBLIC_TRAINER_PORTAL_URL ?? '/trainer',
    testid: 'trainer-portal-card',
    cta: 'Trainer Login',
    style: 'bg-[#c47d46] text-white',
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
    badgeStyle: 'bg-white/15 text-white/90',
    arrowStyle: 'text-white',
  },
  {
    id: 'verify',
    label: 'Certificate Verify',
    eyebrow: 'Public Access',
    description:
      'Instantly verify the authenticity of any certificate issued by Al-Saud Training Institute. Enter a certificate number to validate.',
    icon: Award,
    href: process.env.NEXT_PUBLIC_PUBLIC_PORTAL_URL ?? '/verify',
    testid: 'verify-portal-card',
    cta: 'Verify Certificate',
    style: 'bg-white border border-[rgba(20,33,61,0.12)]',
    iconBg: 'bg-[#14213d]/8',
    iconColor: 'text-[#14213d]',
    badgeStyle: 'bg-[#14213d]/8 text-[#14213d]/70',
    arrowStyle: 'text-[#c47d46]',
  },
];

const features = [
  { icon: Users, title: 'Multi-Role Access', body: 'Role-based access ensures every user — admin, trainer, student — sees only what they need.', span: 'md:col-span-4' },
  { icon: Shield, title: 'Enterprise Security', body: 'HMAC-signed sessions, bcrypt passwords, and audit logs on every mutation.', span: 'md:col-span-4' },
  { icon: BookOpen, title: 'Course & Batch Management', body: 'Build courses, assign trainers, schedule batches, and track outcomes end-to-end.', span: 'md:col-span-4' },
  { icon: GraduationCap, title: 'Certificate Engine', body: 'Digitally signed certificates with public QR verification — trusted by employers.', span: 'md:col-span-6' },
  { icon: Building2, title: 'Multi-Branch Operations', body: 'Run multiple campuses under one umbrella with branch-scoped data isolation.', span: 'md:col-span-6' },
  { icon: Sparkles, title: 'Audit & Compliance', body: 'Complete immutable audit trail for every action taken across all portals.', span: 'md:col-span-12' },
];

const stats = [
  { value: '25,000+', label: 'Students Enrolled' },
  { value: '150+',    label: 'Corporate Partners' },
  { value: '80+',     label: 'Active Programs' },
  { value: '99.8%',   label: 'Platform Uptime' },
];

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbf8f2] font-[family-name:var(--font-body,Manrope,sans-serif)] text-[#14213d]">

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <header className="sticky top-0 z-50 glass border-b border-[rgba(20,33,61,0.08)] animate-fade-in-down">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" data-testid="nav-logo">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14213d]">
              <GraduationCap className="h-5 w-5 text-[#c47d46]" />
            </span>
            <span className="hidden font-[family-name:var(--font-display,serif)] text-xl font-semibold tracking-tight text-[#14213d] sm:block">
              Al-Saud IMS
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-7 text-sm font-medium text-[rgba(20,33,61,0.65)] lg:flex">
            <a href="#portals" className="transition-colors hover:text-[#14213d]" data-testid="nav-portals">Portals</a>
            <a href="#features" className="transition-colors hover:text-[#14213d]" data-testid="nav-features">Features</a>
            <a href="#stats" className="transition-colors hover:text-[#14213d]" data-testid="nav-stats">Outcomes</a>
            <a href="#footer" className="transition-colors hover:text-[#14213d]" data-testid="nav-contact">Contact</a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="hidden rounded-full border border-[rgba(20,33,61,0.15)] bg-transparent px-4 py-2 text-sm font-medium text-[#14213d] transition-all hover:border-[#c47d46] hover:text-[#c47d46] sm:block"
              data-testid="nav-verify-link"
            >
              Verify Certificate
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full bg-[#14213d] px-4 py-2 text-sm font-medium text-[#fbf8f2] transition-all hover:bg-[#c47d46]"
              data-testid="nav-signin-btn"
            >
              Sign In
            </Link>
            <button className="rounded-xl border border-[rgba(20,33,61,0.12)] p-2 text-[#14213d] hover:bg-[rgba(196,125,70,0.08)] lg:hidden" aria-label="Menu" data-testid="nav-menu-btn">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden px-5 pb-20 pt-16 lg:px-8 lg:pt-24 lg:pb-28" data-testid="hero-section">

        {/* ── Decorative floating geometry ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* Large brass circle */}
          <div className="animate-float-slow absolute -right-24 -top-24 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#c47d46]/12 to-transparent" style={{ animationDelay: '0s' }} />
          {/* Medium ink circle */}
          <div className="animate-float absolute bottom-8 -left-16 h-[380px] w-[380px] rounded-full bg-gradient-to-tr from-[#14213d]/6 to-transparent" style={{ animationDelay: '1.5s' }} />
          {/* Spinning ring */}
          <div className="animate-spin-vslow absolute left-1/3 top-8 h-72 w-72 rounded-full border border-dashed border-[#c47d46]/20" />
          {/* Spinning inner ring */}
          <div className="animate-spin-rev absolute right-1/4 bottom-12 h-48 w-48 rounded-full border border-[#14213d]/10" />
          {/* Small floating dots */}
          <div className="animate-float absolute top-24 left-24 h-5 w-5 rounded-full bg-[#c47d46]/40" style={{ animationDelay: '0.8s' }} />
          <div className="animate-float-rev absolute top-40 right-36 h-3 w-3 rounded-full bg-[#14213d]/20" style={{ animationDelay: '2.2s' }} />
          <div className="animate-float absolute bottom-32 right-56 h-4 w-4 rounded-full bg-[#c47d46]/30" style={{ animationDelay: '1.1s' }} />
          <div className="animate-float-slow absolute bottom-20 left-1/2 h-6 w-6 rounded-full bg-[#14213d]/10" style={{ animationDelay: '3s' }} />
          {/* Grid dot pattern */}
          <svg className="absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#14213d" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* ── Hero content ── */}
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:gap-12">

            {/* Left column */}
            <div className="flex-1 text-center lg:text-left">
              {/* Eyebrow badge */}
              <div className="animate-fade-in-up mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(196,125,70,0.3)] bg-[rgba(196,125,70,0.08)] px-4 py-1.5" data-testid="hero-badge">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#c47d46]" />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c47d46]">
                  Al-Saud Training Institute
                </span>
              </div>

              {/* Headline */}
              <h1 className="animate-fade-in-up delay-100 mb-6 font-[family-name:var(--font-display,serif)] text-5xl font-bold leading-[1.05] tracking-tight text-[#14213d] sm:text-6xl lg:text-7xl xl:text-8xl" data-testid="hero-heading">
                Redefining
                <br />
                <span className="text-shimmer">Professional</span>
                <br />
                Excellence
              </h1>

              {/* Subtitle */}
              <p className="animate-fade-in-up delay-200 mb-8 max-w-xl text-base leading-relaxed text-[rgba(20,33,61,0.65)] sm:text-lg lg:mx-0 lg:text-lg" data-testid="hero-subtitle">
                One unified platform connecting administrators, trainers, and students across
                every campus — empowering growth, ensuring compliance, and building careers.
              </p>

              {/* CTA Buttons */}
              <div className="animate-fade-in-up delay-300 flex flex-wrap justify-center gap-3 lg:justify-start" data-testid="hero-cta-group">
                <a
                  href="#portals"
                  className="group flex items-center gap-2 rounded-full bg-[#14213d] px-6 py-3 text-sm font-semibold text-[#fbf8f2] shadow-[0_8px_24px_rgba(20,33,61,0.25)] transition-all hover:bg-[#c47d46] hover:shadow-[0_8px_24px_rgba(196,125,70,0.35)] active:scale-[0.98]"
                  data-testid="hero-cta-explore"
                >
                  Explore Portals
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </a>
                <Link
                  href="/sign-in"
                  className="rounded-full border border-[rgba(20,33,61,0.15)] bg-white px-6 py-3 text-sm font-semibold text-[#14213d] shadow-sm transition-all hover:border-[#c47d46] hover:text-[#c47d46] active:scale-[0.98]"
                  data-testid="hero-cta-signin"
                >
                  Admin Sign In
                </Link>
              </div>

              {/* Trust row */}
              <div className="animate-fade-in-up delay-500 mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-[rgba(20,33,61,0.5)] lg:justify-start" data-testid="hero-trust">
                {['ISO 9001 Accredited', 'Data Encrypted', 'GDPR Compliant'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#c47d46]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — dashboard preview mockup */}
            <div className="animate-slide-right delay-400 relative w-full max-w-lg flex-shrink-0 lg:max-w-xl" data-testid="hero-visual">
              {/* Main card */}
              <div className="animate-float-slow relative overflow-hidden rounded-[28px] border border-[rgba(20,33,61,0.1)] bg-white shadow-[0_32px_80px_rgba(17,24,39,0.14)]" style={{ animationDelay: '0.4s' }}>
                {/* Card top bar */}
                <div className="flex items-center justify-between border-b border-[rgba(20,33,61,0.07)] bg-[#14213d] px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#c47d46]" />
                    <span className="text-xs font-semibold text-white/80">IMS Admin Dashboard</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                  </div>
                </div>
                {/* Dashboard body */}
                <div className="p-5">
                  {/* Mini stat cards */}
                  <div className="mb-4 grid grid-cols-3 gap-2.5">
                    {[
                      { label: 'Students', val: '2,840', color: 'text-[#c47d46]' },
                      { label: 'Batches',  val: '38',    color: 'text-[#14213d]' },
                      { label: 'Revenue',  val: '↑ 12%', color: 'text-green-600' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-[#fbf8f2] px-3 py-2.5">
                        <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] text-[rgba(20,33,61,0.5)]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Mini table */}
                  <div className="overflow-hidden rounded-xl border border-[rgba(20,33,61,0.07)]">
                    <div className="bg-[#fbf8f2] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[rgba(20,33,61,0.4)]">Recent Enrollments</div>
                    {[
                      { name: 'Fatima Al-Saud',  course: 'Process Safety', status: 'Active' },
                      { name: 'Ahmed Al-Rashid', course: 'IELTS Prep',     status: 'Pending' },
                      { name: 'Nora Al-Qahtani', course: 'Project Mgmt',   status: 'Active' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between border-t border-[rgba(20,33,61,0.05)] px-4 py-2.5">
                        <div>
                          <p className="text-[11px] font-semibold text-[#14213d]">{row.name}</p>
                          <p className="text-[10px] text-[rgba(20,33,61,0.45)]">{row.course}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${row.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating stat chip — top right */}
              <div className="animate-float absolute -right-4 -top-5 rounded-2xl border border-[rgba(196,125,70,0.25)] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(17,24,39,0.1)]" style={{ animationDelay: '1s' }}>
                <p className="font-[family-name:var(--font-display,serif)] text-2xl font-bold text-[#c47d46]">98%</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(20,33,61,0.5)]">Pass Rate</p>
              </div>

              {/* Floating chip — bottom left */}
              <div className="animate-float-rev absolute -bottom-4 -left-4 flex items-center gap-2.5 rounded-2xl bg-[#14213d] px-4 py-3 shadow-[0_12px_30px_rgba(17,24,39,0.2)]" style={{ animationDelay: '0.5s' }}>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c47d46]">
                  <Award className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">1,240 Certs</p>
                  <p className="text-[9px] text-white/50">Issued this year</p>
                </div>
              </div>

              {/* Floating chip — left center */}
              <div className="animate-float absolute -left-10 top-1/2 -translate-y-1/2 rounded-xl border border-[rgba(20,33,61,0.1)] bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(17,24,39,0.08)] lg:block hidden" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <p className="text-[10px] font-semibold text-[#14213d]">Live Sync</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS RIBBON ══════════════════════ */}
      <section id="stats" className="border-y border-[rgba(20,33,61,0.08)] bg-white/60 px-5 py-14 lg:px-8" data-testid="stats-section">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 divide-x divide-[rgba(20,33,61,0.08)] md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="animate-count-up flex flex-col items-center gap-1 px-6 py-2 text-center"
                style={{ animationDelay: `${i * 120}ms` }}
                data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="font-[family-name:var(--font-display,serif)] text-4xl font-bold tracking-tight text-[#14213d] sm:text-5xl lg:text-6xl">
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

      {/* ══════════════════════ PORTAL CARDS ══════════════════════ */}
      <section id="portals" className="px-5 py-20 lg:px-8 lg:py-28" data-testid="portals-section">
        <div className="mx-auto max-w-7xl">
          {/* Section header */}
          <div className="mb-12 text-center">
            <p className="animate-fade-in-up mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
              Four Portals, One Ecosystem
            </p>
            <h2 className="animate-fade-in-up delay-100 font-[family-name:var(--font-display,serif)] text-4xl font-semibold tracking-tight text-[#14213d] sm:text-5xl lg:text-6xl">
              Your gateway awaits
            </h2>
            <p className="animate-fade-in-up delay-200 mx-auto mt-4 max-w-2xl text-base text-[rgba(20,33,61,0.6)] sm:text-lg">
              Each portal is purpose-built for its users, delivering exactly the right tools and
              information at the right time.
            </p>
          </div>

          {/* Portal grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {portals.map((portal, i) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.id}
                  href={portal.href}
                  className={`group animate-fade-in-up hover-lift flex flex-col gap-5 rounded-3xl p-7 transition-all ${portal.style}`}
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                  data-testid={portal.testid}
                >
                  {/* Icon + badge */}
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${portal.iconBg}`}>
                      <Icon className={`h-6 w-6 ${portal.iconColor}`} />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${portal.badgeStyle}`}>
                      {portal.eyebrow}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="flex flex-1 flex-col gap-2">
                    <h3 className="text-lg font-bold">{portal.label}</h3>
                    <p className="flex-1 text-sm leading-relaxed opacity-70">{portal.description}</p>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{portal.cta}</span>
                    <span className={`transition-transform group-hover:translate-x-1 ${portal.arrowStyle} text-lg`}>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section id="features" className="px-5 py-20 lg:px-8 lg:py-28" data-testid="features-section">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="animate-fade-in-up mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
              Platform Capabilities
            </p>
            <h2 className="animate-fade-in-up delay-100 font-[family-name:var(--font-display,serif)] text-4xl font-semibold tracking-tight text-[#14213d] sm:text-5xl">
              Everything you need to run
              <br className="hidden lg:block" />
              a modern institute
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              const isFull = feat.span === 'md:col-span-12';
              return (
                <div
                  key={feat.title}
                  className={`animate-fade-in-up hover-lift group relative overflow-hidden rounded-3xl border border-[rgba(20,33,61,0.08)] bg-white p-8 ${feat.span}`}
                  style={{ animationDelay: `${i * 80 + 150}ms` }}
                  data-testid={`feature-${feat.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {/* Subtle background glow */}
                  <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[#c47d46]/6 transition-all duration-500 group-hover:scale-150 group-hover:opacity-100" />
                  <div className={`mb-4 flex items-center ${isFull ? 'gap-8' : 'flex-col gap-3'}`}>
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#14213d]">
                      <Icon className="h-5 w-5 text-[#c47d46]" />
                    </div>
                    <div className={isFull ? 'flex-1' : ''}>
                      <h3 className="mb-1.5 font-semibold text-[#14213d] text-lg">{feat.title}</h3>
                      <p className="text-sm leading-relaxed text-[rgba(20,33,61,0.6)]">{feat.body}</p>
                    </div>
                    {isFull && (
                      <div className="hidden shrink-0 items-center gap-2 rounded-full bg-[#14213d]/5 px-4 py-2 md:flex">
                        <span className="h-2 w-2 rounded-full bg-[#c47d46]" />
                        <span className="text-xs font-semibold text-[#14213d]">Built-in</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA BANNER ══════════════════════ */}
      <section className="px-5 py-20 lg:px-8" data-testid="cta-section">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[36px] bg-[#14213d] px-8 py-16 text-center lg:px-16">
            {/* Decorative orbs */}
            <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-[#c47d46]/15" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-1/4 translate-y-1/4 rounded-full bg-[#c47d46]/10" aria-hidden="true" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#c47d46]/40 to-transparent" aria-hidden="true" />

            <div className="relative">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#c47d46]">
                Get Started Today
              </p>
              <h2 className="mb-6 font-[family-name:var(--font-display,serif)] text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Ready to transform
                <br />
                your institute?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/60">
                Join hundreds of training institutes across the Gulf using Al-Saud IMS to streamline
                operations and empower learners.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/sign-in"
                  className="rounded-full bg-[#c47d46] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(196,125,70,0.4)] transition-all hover:bg-[#d48d56] hover:shadow-[0_12px_32px_rgba(196,125,70,0.5)] active:scale-[0.98]"
                  data-testid="cta-admin-signin"
                >
                  Admin Sign In
                </Link>
                <Link
                  href="/verify"
                  className="rounded-full border border-white/20 bg-white/8 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/15 active:scale-[0.98]"
                  data-testid="cta-verify"
                >
                  Verify a Certificate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer id="footer" className="bg-[#14213d] px-5 pb-12 pt-16 text-white lg:px-8" data-testid="footer">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 border-b border-white/10 pb-12 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c47d46]">
                  <GraduationCap className="h-5 w-5 text-white" />
                </span>
                <span className="font-[family-name:var(--font-display,serif)] text-xl font-semibold text-white">
                  Al-Saud IMS
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/50">
                Empowering professional education across the Gulf region.
              </p>
            </div>
            {/* Portals */}
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c47d46]">Portals</p>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link href="/sign-in" className="transition-colors hover:text-white" data-testid="footer-admin-link">Admin Portal</Link></li>
                <li><a href={process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL ?? '#'} className="transition-colors hover:text-white" data-testid="footer-student-link">Student Portal</a></li>
                <li><a href={process.env.NEXT_PUBLIC_TRAINER_PORTAL_URL ?? '#'} className="transition-colors hover:text-white" data-testid="footer-trainer-link">Trainer Portal</a></li>
                <li><Link href="/verify" className="transition-colors hover:text-white" data-testid="footer-verify-link">Certificate Verify</Link></li>
              </ul>
            </div>
            {/* Platform */}
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c47d46]">Platform</p>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><a href="#features" className="transition-colors hover:text-white">Features</a></li>
                <li><a href="#stats" className="transition-colors hover:text-white">Outcomes</a></li>
                <li><a href="#portals" className="transition-colors hover:text-white">Portals</a></li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c47d46]">Contact</p>
              <address className="space-y-2 text-sm not-italic text-white/50">
                <p>King Fahd Road, Olaya</p>
                <p>Riyadh, Saudi Arabia</p>
                <a href="mailto:info@al-saud.edu.sa" className="transition-colors hover:text-white">info@al-saud.edu.sa</a>
              </address>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-white/35 sm:flex-row" data-testid="footer-bottom">
            <p>© {new Date().getFullYear()} Al-Saud Training Institute. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="transition-colors hover:text-white/70">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-white/70">Terms of Service</a>
              <a href="#" className="transition-colors hover:text-white/70">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
