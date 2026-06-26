'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import {
  Eye, EyeOff, ArrowLeft, Lock, Mail, Users, Award, TrendingUp, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Alert, CountUp } from '@ims/shared-ui';
import { PortalAuthHeroPanel, PortalAuthLayout } from '@ims/portal-ui';
import { signInAction, type SignInState } from './actions';
import { parseSignInFieldErrors, type SignInFieldErrors } from './schema';
import { motion, AnimatePresence } from 'framer-motion';

const initialState: SignInState = {};

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

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const errors = parseSignInFieldErrors(new FormData(event.currentTarget));

    if (errors.email || errors.password) {
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
              backgroundImageClassName="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-30"
              overlay={
              <div className="absolute inset-0 bg-gradient-to-br from-[#2b1a12]/75 via-[#8a4a1d]/58 to-[#c96a22]/52" />
              }
              decoration={
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-[#d8a06d]/18 blur-[100px]"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute top-[40%] -right-[20%] h-[600px] w-[600px] rounded-full bg-[#ead1b2]/14 blur-[100px]"
              />
            </>
          }
          header={
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image src="/alsaud/logo.png" alt="Al-Saud Training Institute" width={156} height={52} className="h-11 w-auto" priority />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#f4d5b7]">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          }
          body={
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#efd8bf]/30 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#f4d5b7] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#f8e8d7]">Admin Portal</span>
              </div>

              <h1 className="mb-6 text-5xl font-black leading-[1.1] xl:text-7xl">
                Manage. <br />
                <span className="bg-gradient-to-r from-[#ffe8cf] via-[#f4d5b7] to-[#ffffff] bg-clip-text text-transparent">Empower.</span><br />
                Succeed.
              </h1>

              <p className="mb-8 max-w-md text-lg text-[#f8e8d7]/85">
                The central hub for managing Al-Saud Training Institute — staff, programs, enrollment, and operations.
              </p>

              <div className="flex flex-wrap gap-3">
                {TRUST.map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-md"
                    >
                    <CheckCircle2 className="h-4 w-4 text-[#f4d5b7]" />
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
                      <div className="rounded-xl bg-white/10 p-2 text-[#f4d5b7]">
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
          <Link href="/" className="group flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#b75c16]">
            <div className="rounded-full bg-slate-100 p-2 transition-colors group-hover:bg-[#fff1e3]">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Home
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#c96a22] to-[#8a4a1d]">
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
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#efd8bf] bg-[#fff6ee] shadow-inner"
        >
          <Lock className="h-8 w-8 text-[#b75c16]" />
        </motion.div>
        <h1 className="mb-3 text-3xl font-black text-slate-900">Welcome Back!</h1>
        <p className="text-sm text-slate-500">Sign in to manage the admin portal securely.</p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-5">
        <AnimatePresence>
          {state.error ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Alert variant="error" description={state.error} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-1.5">
          <label htmlFor="si-email" className="ml-1 text-xs font-bold text-slate-700">Email Address</label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#c96a22]" />
            </div>
            <input
              id="si-email"
              name="email"
              type="email"
              placeholder="admin@ims.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'si-email-error' : undefined}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-[#c96a22] focus:bg-white focus:ring-4 focus:ring-[#c96a22]/10"
              data-testid="sign-in-email"
            />
          </div>
          {fieldErrors.email ? (
            <p id="si-email-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="ml-1 flex items-center justify-between">
            <label htmlFor="si-password" className="text-xs font-bold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs font-bold text-[#b75c16] transition-colors hover:text-[#8a4a1d]">Forgot?</Link>
          </div>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#c96a22]" />
            </div>
            <input
              id="si-password"
              name="password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'si-password-error' : undefined}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-[#c96a22] focus:bg-white focus:ring-4 focus:ring-[#c96a22]/10"
              data-testid="sign-in-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition-colors hover:bg-[#fff3e7] hover:text-[#b75c16]"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password ? (
            <p id="si-password-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <label className="group ml-1 flex w-fit cursor-pointer items-center gap-3 text-sm text-slate-600">
          <div className="relative flex h-5 w-5 items-center justify-center rounded border-2 border-slate-300 transition-colors group-hover:border-violet-500">
            <input type="checkbox" name="remember" className="peer absolute h-full w-full cursor-pointer opacity-0" />
            <CheckCircle2 className="h-4 w-4 text-[#c96a22] opacity-0 transition-opacity peer-checked:opacity-100" />
          </div>
          <span className="font-medium transition-colors group-hover:text-slate-900">Keep me signed in</span>
        </label>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c96a22] to-[#8a4a1d] py-4 text-sm font-bold text-white shadow-lg shadow-[#c96a22]/25 transition-all disabled:cursor-not-allowed disabled:opacity-70"
          data-testid="sign-in-submit"
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>Sign In Securely <ChevronRight className="h-4 w-4" /></>
          )}
        </motion.button>
      </form>

      <div className="mt-10">
        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-slate-200" />
          <span className="mx-4 flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Demo Access</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <select
          className="w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors hover:border-slate-300"
          defaultValue=""
          onChange={(event) => {
            const selectedEmail = event.target.value;
            if (!selectedEmail) return;
            const demoUsers = [
              { email: 'admin@ims.com', password: 'Password@123' },
              { email: 'manager.riyadh@ims.com', password: 'Password@123' },
              { email: 'manager.muscat@ims.com', password: 'Password@123' },
              { email: 'counselor.riyadh@ims.com', password: 'Password@123' },
            ];
            const demoUser = demoUsers.find(u => u.email === selectedEmail);
            if (!demoUser) return;
            const emailInput = document.querySelector<HTMLInputElement>('[data-testid="sign-in-email"]');
            const passwordInput = document.querySelector<HTMLInputElement>('[data-testid="sign-in-password"]');
            if (emailInput) {
              emailInput.value = demoUser.email;
            }
            if (passwordInput) {
              passwordInput.value = demoUser.password;
            }
          }}
        >
          <option value="" disabled>Select a demo role...</option>
          <option value="admin@ims.com">Super Admin (admin@ims.com)</option>
          <option value="manager.riyadh@ims.com">Riyadh Branch Manager (manager.riyadh@ims.com)</option>
          <option value="manager.muscat@ims.com">Muscat Branch Manager (manager.muscat@ims.com)</option>
          <option value="counselor.riyadh@ims.com">Riyadh Counselor (counselor.riyadh@ims.com)</option>
        </select>
      </div>
    </PortalAuthLayout>
  );
}
