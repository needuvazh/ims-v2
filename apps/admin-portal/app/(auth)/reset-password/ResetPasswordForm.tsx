'use client';

import { useActionState, useState } from 'react';
import {
  Eye, EyeOff, ArrowLeft, Lock, Users, Award, TrendingUp, CheckCircle2, ChevronRight, Sparkles, KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { Alert, CountUp } from '@ims/shared-ui';
import { PortalAuthHeroPanel, PortalAuthLayout } from '@ims/portal-ui';
import { resetPasswordAction, type ResetPasswordState } from './actions';
import { parseResetFieldErrors, type ResetFieldErrors } from './schema';
import { motion, AnimatePresence } from 'framer-motion';

const initialState: ResetPasswordState = {};

const STATS = [
  { icon: Users, value: '25k+', label: 'Students Trained' },
  { icon: Award, value: '150+', label: 'Partners' },
  { icon: TrendingUp, value: '98%', label: 'Success Rate' },
];

const TRUST = [
  'ISO 9001 Certified',
  'MoL & PDO Approved',
  'NEBOSH Authorized',
];

export default function ResetPasswordForm({ token }: { token: string }) {
  const boundAction = resetPasswordAction.bind(null, token);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const errors = parseResetFieldErrors(new FormData(event.currentTarget), token);

    if (errors.token || errors.password || errors.confirmPassword) {
      event.preventDefault();
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
  };

  return (
    <PortalAuthLayout
      heroWidthClassName="w-[55%]"
      hero={
        <PortalAuthHeroPanel
          backgroundImageSrc="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1400&auto=format&fit=crop"
          backgroundImageClassName="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-40"
          overlay={
            <div className="absolute inset-0 bg-gradient-to-br from-primary-950/85 via-primary-800/70 to-accent-600/50" />
          }
          decoration={
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-brand-300/30 blur-[100px]"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute top-[40%] -right-[20%] h-[600px] w-[600px] rounded-full bg-accent-300/24 blur-[100px]"
              />
            </>
          }
          header={
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-700 to-accent-600 shadow-[0_0_30px_rgba(11,69,101,0.35)] transition-transform group-hover:rotate-12">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent-200">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          }
          body={
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-200/30 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-accent-200 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-accent-50">Admin Portal</span>
              </div>

              <h1 className="mb-6 text-5xl font-black leading-[1.1] xl:text-7xl">
                Secure. <br />
                <span className="bg-gradient-to-r from-brand-100 via-accent-200 to-white bg-clip-text text-transparent">Updated.</span><br />
                Restored.
              </h1>

              <p className="mb-8 max-w-md text-lg text-accent-50/80">
                Setup your new password. Ensure it satisfies the minimum criteria to secure your account.
              </p>

              <div className="flex flex-wrap gap-3">
                {TRUST.map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
                  >
                    <CheckCircle2 className="h-4 w-4 text-brand-300" />
                    <span className="text-xs font-bold text-white/90">{item}</span>
                  </motion.div>
                ))}
              </div>
            </>
          }
          footer={
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="grid grid-cols-3 divide-x divide-white/10">
                {STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex flex-col items-center gap-2 px-4 text-center first:pl-0 last:pr-0">
                      <div className="rounded-xl bg-white/10 p-2 text-accent-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-2xl font-black">
                        <CountUp value={stat.value} />
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          }
        />
      }
      topBar={
        <>
          <Link href="/sign-in" className="group flex items-center gap-2 text-xs font-bold text-neutral-500 transition-colors hover:text-accent-700">
            <div className="rounded-full bg-muted-100 p-2 transition-colors group-hover:bg-accent-50">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Sign In
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700 to-accent-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
        </>
      }
    >
      <div className="mb-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.6 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-accent bg-accent-50 shadow-inner"
        >
          <KeyRound className="h-8 w-8 text-accent-700" />
        </motion.div>
        <h1 className="mb-3 text-3xl font-black text-slate-900">Reset Password</h1>
        <p className="text-sm text-slate-500">Create a secure new password for your account.</p>
      </div>

      <AnimatePresence mode="wait">
        {state.success ? (
          <motion.div
            key="success-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <Alert
              variant="success"
              title="Password Reset Complete"
              description="Your password has been successfully updated and all active login sessions have been revoked. You can now log in securely with your new password."
            />
            <Link
              href="/sign-in"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-accent-600 py-4 text-sm font-bold text-white shadow-lg shadow-primary-700/25 transition-all"
            >
              Go to Login
            </Link>
          </motion.div>
        ) : (
          <motion.form
            key="reset-form"
            action={formAction}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5"
          >
            <AnimatePresence>
              {state.error ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert variant="error" description={state.error} />
                </motion.div>
              ) : null}
              {fieldErrors.token ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert variant="error" description={fieldErrors.token} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label htmlFor="rp-password" className="ml-1 text-xs font-bold text-slate-700">New Password</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-neutral-400 transition-colors group-focus-within:text-accent-600" />
                </div>
                <input
                  id="rp-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'rp-password-error' : undefined}
                  className="w-full rounded-2xl border-2 border-border-light bg-muted-50/50 py-3.5 pl-11 pr-12 text-sm text-neutral-900 outline-none transition-all focus:border-accent-600 focus:bg-white focus:ring-4 focus:ring-accent-600/10"
                  data-testid="reset-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-neutral-400 transition-colors hover:bg-accent-50 hover:text-accent-700"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="rp-password-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rp-confirm-password" className="ml-1 text-xs font-bold text-slate-700">Confirm New Password</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-neutral-400 transition-colors group-focus-within:text-accent-600" />
                </div>
                <input
                  id="rp-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'rp-confirm-password-error' : undefined}
                  className="w-full rounded-2xl border-2 border-border-light bg-muted-50/50 py-3.5 pl-11 pr-12 text-sm text-neutral-900 outline-none transition-all focus:border-accent-600 focus:bg-white focus:ring-4 focus:ring-accent-600/10"
                  data-testid="reset-password-confirm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-neutral-400 transition-colors hover:bg-accent-50 hover:text-accent-700"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword ? (
                <p id="rp-confirm-password-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-500">
              <p className="font-bold text-slate-700 mb-1">Password Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Minimum of 8 characters long</li>
                <li>At least one uppercase letter (A-Z)</li>
                <li>At least one lowercase letter (a-z)</li>
                <li>At least one number (0-9)</li>
                <li>At least one special character (e.g. @, $, !, %, *, ?, &)</li>
              </ul>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isPending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-accent-600 py-4 text-sm font-bold text-white shadow-lg shadow-primary-700/25 transition-all disabled:cursor-not-allowed disabled:opacity-70"
              data-testid="reset-password-submit"
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>Reset Password <ChevronRight className="h-4 w-4" /></>
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </PortalAuthLayout>
  );
}
