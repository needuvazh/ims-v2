'use client';

import { useActionState, useState } from 'react';
import {
  GraduationCap,
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Mail,
  Users,
  Award,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@ims/shared-ui';
import { signInAction, type SignInState } from './actions';

const initialState: SignInState = {};

const STATS = [
  { icon: Users,      value: '25k+', label: 'Students Trained' },
  { icon: Award,      value: '150+', label: 'Partners'         },
  { icon: TrendingUp, value: '98%',  label: 'Success Rate'     },
];

const TRUST = [
  'ISO 9001 Certified',
  'MoL & PDO Approved',
  'NEBOSH Authorized',
];

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const [showPass, setShowPass] = useState(false);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)' }}
      data-testid="sign-in-page"
    >

      {/* ════════════════════════════════════════════════════════════════
          LEFT PANEL — Full bleed brand/visual
      ════════════════════════════════════════════════════════════════ */}
      <div
        className="relative hidden flex-col overflow-hidden lg:flex"
        style={{ width: '52%', flexShrink: 0 }}
        data-testid="sign-in-brand-panel"
      >
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />

        {/* Multi-layer gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              'linear-gradient(180deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.4) 35%, rgba(15,23,42,0.5) 65%, rgba(15,23,42,0.92) 100%)',
            ].join(', '),
          }}
          aria-hidden="true"
        />

        {/* Orange accent glow (bottom-left) */}
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.6) 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">

          {/* Top — Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                boxShadow: '0 8px 24px rgba(234,88,12,0.5)',
              }}
            >
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-[8px] font-bold uppercase tracking-[0.26em] text-[#EA580C]">
                Al-Saud Training
              </p>
              <p
                className="text-sm font-bold uppercase tracking-[0.16em] text-white"
                style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              >
                Institute
              </p>
            </div>
          </div>

          {/* Middle — Hero text */}
          <div>
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: 'rgba(234,88,12,0.18)', border: '1px solid rgba(234,88,12,0.35)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f97316]">
                Admin Portal
              </span>
            </div>

            <h1
              className="mb-5 leading-[1.05] text-white"
              style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontSize: 'clamp(2.6rem, 4vw, 4rem)',
                fontWeight: 700,
              }}
            >
              Redefining
              <br />
              <span className="text-gradient-orange">Professional</span>
              <br />
              Excellence.
            </h1>

            <p
              className="mb-8 max-w-sm text-base leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              The central hub for managing Al-Saud Training Institute — staff, programs,
              enrollment, attendance, and performance, all in one place.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {TRUST.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#EA580C]" />
                  <span className="text-[11px] font-semibold text-white/75">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — Stats */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex flex-col items-center gap-1.5 px-4 text-center first:pl-0 last:pr-0">
                    <Icon className="h-4 w-4 text-[#EA580C]" />
                    <p
                      className="text-2xl font-bold text-white xl:text-3xl"
                      style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
                    >
                      {s.value}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANEL — Sign-in form
      ════════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex flex-1 flex-col overflow-y-auto"
        style={{ background: '#FAFAF8' }}
      >
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between px-8 py-5 xl:px-12">
          <Link
            href="/"
            className="group flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: 'rgba(15,23,42,0.4)' }}
            data-testid="sign-in-back-home"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span
              style={{ color: 'rgba(15,23,42,0.4)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EA580C')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(15,23,42,0.4)')}
            >
              Back to Home
            </span>
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0F172A]" style={{ fontFamily: 'var(--font-display, serif)' }}>
              Institute
            </p>
          </div>
        </div>

        {/* ── Form ──────────────────────────────────────── */}
        <div className="flex flex-1 items-center justify-center px-8 py-6 xl:px-16">
          <div className="w-full max-w-[440px]">

            {/* Heading */}
            <div className="mb-9">
              <p className="section-eyebrow mb-4" data-testid="sign-in-subtitle">
                Authentication Portal
              </p>
              <h1
                className="mb-3 tracking-tight text-[#0F172A]"
                style={{
                  fontFamily: 'var(--font-display, Georgia, serif)',
                  fontSize: 'clamp(2.4rem, 4vw, 3rem)',
                  fontWeight: 700,
                  lineHeight: 1.06,
                }}
                data-testid="sign-in-heading"
              >
                Welcome Back.
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(15,23,42,0.48)' }}>
                Sign in to manage programs, staff, and institute operations.
              </p>
            </div>

            {/* Form */}
            <form action={formAction} className="space-y-5" data-testid="sign-in-form">
              {state.error && (
                <Alert variant="error" description={state.error} data-testid="sign-in-error" />
              )}

              {/* Email field */}
              <div>
                <label
                  htmlFor="si-email"
                  className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(15,23,42,0.5)' }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
                    style={{ color: 'rgba(15,23,42,0.28)' }}
                  />
                  <input
                    id="si-email"
                    name="email"
                    type="email"
                    placeholder="admin@ims.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border bg-white py-4 pl-12 pr-4 text-sm text-[#0F172A] outline-none transition-all"
                    style={{
                      borderColor: 'rgba(15,23,42,0.11)',
                      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#EA580C';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234,88,12,0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(15,23,42,0.11)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)';
                    }}
                    data-testid="sign-in-email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="si-password"
                    className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(15,23,42,0.5)' }}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-xs font-semibold text-[#EA580C] transition-colors hover:text-[#C2410C]"
                    data-testid="sign-in-forgot"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
                    style={{ color: 'rgba(15,23,42,0.28)' }}
                  />
                  <input
                    id="si-password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border bg-white py-4 pl-12 pr-13 text-sm text-[#0F172A] outline-none transition-all"
                    style={{
                      borderColor: 'rgba(15,23,42,0.11)',
                      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                      paddingRight: '3.25rem',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#EA580C';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(234,88,12,0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(15,23,42,0.11)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)';
                    }}
                    data-testid="sign-in-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 transition-colors hover:bg-[rgba(234,88,12,0.08)]"
                    style={{ color: 'rgba(15,23,42,0.32)' }}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    data-testid="sign-in-toggle-password"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm" style={{ color: 'rgba(15,23,42,0.55)' }}>
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded"
                  style={{ accentColor: '#EA580C' }}
                  data-testid="sign-in-remember"
                />
                Keep me signed in for 30 days
              </label>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending}
                className="group relative mt-2 w-full overflow-hidden rounded-xl py-4 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                style={{
                  background: isPending ? 'rgba(15,23,42,0.5)' : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  boxShadow: isPending ? 'none' : '0 8px 28px rgba(234,88,12,0.38)',
                }}
                data-testid="sign-in-submit"
              >
                {/* Shimmer overlay on hover */}
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/15 transition-transform duration-700 group-hover:translate-x-full"
                  aria-hidden="true"
                />
                <span className="relative flex items-center justify-center gap-2">
                  {isPending ? 'Signing in…' : 'Sign In to Admin Portal'}
                  {!isPending && <ChevronRight className="h-4 w-4" />}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: 'rgba(15,23,42,0.08)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(15,23,42,0.32)' }}>
                Quick Demo Access
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(15,23,42,0.08)' }} />
            </div>

            {/* Quick access */}
            <div
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: 'rgba(15,23,42,0.08)', background: '#FFFFFF', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
              data-testid="quick-access"
            >
              <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(15,23,42,0.07)', background: 'rgba(15,23,42,0.02)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(15,23,42,0.38)' }}>
                  Select a demo role to pre-fill
                </p>
              </div>
              <div className="p-3">
                <select
                  className="w-full cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium text-[#0F172A] outline-none transition-all"
                  style={{
                    borderColor: 'rgba(15,23,42,0.1)',
                    background: '#FAFAF8',
                    appearance: 'auto',
                  }}
                  data-testid="quick-access-select"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const em = document.querySelector<HTMLInputElement>('[data-testid="sign-in-email"]');
                    if (em) em.value = v;
                  }}
                >
                  <option value="" disabled>Select a demo account…</option>
                  <option value="admin@ims.com">Admin — admin@ims.com</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 border-t px-8 py-4 xl:px-12"
          style={{ borderColor: 'rgba(15,23,42,0.07)' }}
        >
          <p className="text-center text-[11px]" style={{ color: 'rgba(15,23,42,0.28)' }} data-testid="sign-in-footer">
            Official Training Portal · Al-Saud Training Institute · Muscat, Oman
          </p>
        </div>
      </div>
    </div>
  );
}
