'use client';

import { useActionState } from 'react';
import { GraduationCap, MapPin, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@ims/shared-ui';
import { signInAction, type SignInState } from './actions';

const initialState: SignInState = {};

const features = [
  'Localized training for regional workforce goals',
  'Digital roadmap with precision data & analytics',
  'MoL & PDO accredited programs with global standards',
  'Backed by ONEIC — Oman National Engineering & Investment Co.',
];

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#FAFAF8', fontFamily: 'var(--font-body, Manrope, sans-serif)' }}
      data-testid="sign-in-page"
    >

      {/* ═══ LEFT PANEL — Brand ═══════════════════════════════════════ */}
      <div
        className="relative hidden w-[45%] flex-shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex xl:w-[42%]"
        style={{ background: '#0F172A' }}
        data-testid="sign-in-brand-panel"
      >
        {/* Background decoration */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full"
          style={{ background: 'rgba(196,125,70,0.12)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full"
          style={{ background: 'rgba(196,125,70,0.08)' }}
          aria-hidden="true"
        />

        {/* Top — Logo */}
        <div className="relative">
          {/* Logo box (large orange square matching reference) */}
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}
          >
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <p
            className="mb-1 text-[9px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#EA580C' }}
          >
            Al-Saud Training Institute
          </p>
          <h2
            className="text-2xl font-bold uppercase tracking-[0.12em] text-white"
            style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
          >
            Institute
          </h2>
        </div>

        {/* Middle — Headline + features */}
        <div className="relative">
          <h1
            className="mb-4 text-4xl font-bold leading-tight text-white xl:text-5xl"
            style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
          >
            Empowering
            <br />
            <span style={{ color: '#c47d46' }}>Excellence.</span>
          </h1>
          <p className="mb-8 max-w-xs text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            The Al-Saud Institute provides world-class technical education and professional
            development for the next generation of industry leaders.
          </p>

          <div className="space-y-4">
            {features.map((feat) => (
              <div key={feat} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#c47d46' }} />
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {feat}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — location */}
        <div className="relative">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <MapPin className="h-3.5 w-3.5" />
            <span>Muscat, Sultanate of Oman</span>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Form ═══════════════════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-16">

        {/* Mobile logo (only visible on small screens) */}
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}
          >
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: '#c47d46' }}>
            Al-Saud Training Institute
          </p>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ color: '#EA580C' }}
              data-testid="sign-in-subtitle"
            >
              Authentication Portal
            </p>
            <h2
              className="text-4xl font-bold tracking-tight text-[#14213d]"
              style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
              data-testid="sign-in-heading"
            >
              Sign In
            </h2>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-5" data-testid="sign-in-form">
            {state.error && (
              <Alert variant="error" description={state.error} data-testid="sign-in-error" />
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="sign-in-email-input"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(20,33,61,0.6)]"
              >
                Username or Email
              </label>
              <input
                id="sign-in-email-input"
                name="email"
                type="email"
                placeholder="admin@ims.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-[rgba(20,33,61,0.15)] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-all placeholder:text-[rgba(20,33,61,0.35)] focus:border-[#c47d46] focus:ring-2 focus:ring-[rgba(196,125,70,0.2)]"
                data-testid="sign-in-email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="sign-in-password-input"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(20,33,61,0.6)]"
              >
                Password
              </label>
              <input
                id="sign-in-password-input"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-[rgba(20,33,61,0.15)] bg-white px-4 py-3 text-sm text-[#14213d] outline-none transition-all placeholder:text-[rgba(20,33,61,0.35)] focus:border-[#c47d46] focus:ring-2 focus:ring-[rgba(196,125,70,0.2)]"
                data-testid="sign-in-password"
              />
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[rgba(20,33,61,0.6)]">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded border-[rgba(20,33,61,0.2)] accent-[#c47d46]"
                  data-testid="sign-in-remember"
                />
                Keep me signed in
              </label>
              <a
                href="#"
                className="text-sm font-medium text-[#c47d46] transition-colors hover:text-[#14213d]"
                data-testid="sign-in-forgot"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white transition-all hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              data-testid="sign-in-submit"
            >
              {isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Quick Access */}
          <div
            className="mt-8 rounded-xl border border-[rgba(20,33,61,0.1)] bg-white p-4"
            data-testid="quick-access"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[rgba(20,33,61,0.4)]">
              Quick Access
            </p>
            <select
              className="w-full rounded-lg border border-[rgba(20,33,61,0.12)] bg-[#FAF8F2] px-3 py-2 text-sm text-[#14213d] outline-none focus:border-[#c47d46]"
              data-testid="quick-access-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  const emailInput = document.querySelector<HTMLInputElement>('[data-testid="sign-in-email"]');
                  if (emailInput) emailInput.value = e.target.value;
                }
              }}
            >
              <option value="" disabled>Select Demo Account</option>
              <option value="admin@ims.com">Admin — admin@ims.com</option>
            </select>
          </div>
        </div>

        {/* Bottom label */}
        <p className="mt-10 text-center text-xs text-[rgba(20,33,61,0.35)]" data-testid="sign-in-footer">
          Official Training Portal · Al-Saud Training Institute
        </p>

        {/* Back to home */}
        <Link
          href="/"
          className="mt-3 text-xs font-medium text-[rgba(20,33,61,0.45)] transition-colors hover:text-[#c47d46]"
          data-testid="sign-in-back-home"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
