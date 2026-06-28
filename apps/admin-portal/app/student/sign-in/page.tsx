'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles, ChevronRight, BookOpen } from 'lucide-react';
import { buildRequiredFieldMessage } from '@ims/shared-ui';
import { PortalAuthHeroPanel, PortalAuthLayout } from '@ims/portal-ui';

export default function StudentSignInPage() {
  const [showPass, setShowPass] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = (event: React.FormEvent) => {
    const form = event.currentTarget as HTMLFormElement;
    const emailInput = form.elements.namedItem('email') as HTMLInputElement | null;
    const passwordInput = form.elements.namedItem('password') as HTMLInputElement | null;

    const nextErrors = {
      email: emailInput?.value.trim() ? undefined : buildRequiredFieldMessage('Email Address'),
      password: passwordInput?.value.trim() ? undefined : buildRequiredFieldMessage('Password'),
    };

    if (nextErrors.email || nextErrors.password) {
      event.preventDefault();
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    event.preventDefault();
    setIsPending(true);
    setTimeout(() => setIsPending(false), 1500);
  };

  return (
    <PortalAuthLayout
      hero={
        <PortalAuthHeroPanel
          backgroundImageSrc="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop"
          overlay={
            <div className="absolute inset-0 bg-gradient-to-br from-primary-950/90 via-primary-800/78 to-accent-600/70" />
          }
          decoration={
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-brand-300/30 blur-[100px]"
            />
          }
          header={
            <Link href="/student" className="inline-flex items-center gap-3 group">
              <Image src="/alsaud/logo.png" alt="Al-Saud Training Institute" width={156} height={52} className="h-11 w-auto" priority />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent-200">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          }
          body={
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-accent-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-accent-50">Student Portal</span>
              </div>

              <h1 className="mb-6 text-5xl font-black leading-[1.1] xl:text-7xl">
                Learn. <br />
                <span className="text-accent-200">Grow.</span><br />
                Achieve.
              </h1>

              <p className="max-w-md text-lg text-accent-50/85">
                Access your courses, track assignments, and engage with your learning community.
              </p>
            </>
          }
          footer={
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((index) => (
                  <Image
                    key={index}
                    src={`https://i.pravatar.cc/100?img=${index + 10}`}
                    className="h-10 w-10 rounded-full border-2 border-accent-600 object-cover"
                    alt="Student"
                    width={40}
                    height={40}
                  />
                ))}
              </div>
              <p className="text-sm font-bold text-accent-50">Join 25,000+ students</p>
            </div>
          }
        />
      }
      contentClassName="max-w-[400px]"
      topBar={
        <>
          <Link href="/student" className="group flex items-center gap-2 text-xs font-bold text-neutral-500 transition-colors hover:text-accent-700">
            <div className="rounded-full bg-muted-100 p-2 transition-colors group-hover:bg-accent-50">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Portal
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-700 to-accent-600 text-white">
              <GraduationCap className="h-4 w-4" />
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
          className="mx-auto mb-6 flex h-16 w-16 rotate-3 items-center justify-center rounded-3xl border border-border-accent bg-accent-50 shadow-inner"
        >
          <BookOpen className="h-8 w-8 text-accent-700" />
        </motion.div>
        <h1 className="mb-2 text-3xl font-black text-slate-900">Student Sign In</h1>
        <p className="text-sm text-slate-500">Log in to access your dashboard.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label className="ml-1 text-xs font-bold text-slate-700">Email Address</label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-neutral-400 transition-colors group-focus-within:text-accent-600" />
            </div>
            <input
              type="email"
              placeholder="student@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'student-email-error' : undefined}
              className="w-full rounded-2xl border-2 border-border-light bg-muted-50/50 py-3.5 pl-11 pr-4 text-sm text-neutral-900 outline-none transition-all focus:border-accent-600 focus:bg-white focus:ring-4 focus:ring-accent-600/10"
              onInput={() => setFieldErrors((prev) => ({ ...prev, email: undefined }))}
            />
          </div>
          {fieldErrors.email ? (
            <p id="student-email-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="ml-1 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <a href="#" className="text-xs font-bold text-accent-700 transition-colors hover:text-primary-700">Forgot?</a>
          </div>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-5 w-5 text-neutral-400 transition-colors group-focus-within:text-accent-600" />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'student-password-error' : undefined}
              className="w-full rounded-2xl border-2 border-border-light bg-muted-50/50 py-3.5 pl-11 pr-12 text-sm text-neutral-900 outline-none transition-all focus:border-accent-600 focus:bg-white focus:ring-4 focus:ring-accent-600/10"
              onInput={() => setFieldErrors((prev) => ({ ...prev, password: undefined }))}
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
            <p id="student-password-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-accent-600 py-4 text-sm font-bold text-white shadow-lg shadow-primary-700/25 transition-all disabled:opacity-70"
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>Access Dashboard <ChevronRight className="h-4 w-4" /></>
          )}
        </motion.button>
      </form>
    </PortalAuthLayout>
  );
}
