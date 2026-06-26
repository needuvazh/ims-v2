'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles, ChevronRight, ClipboardCheck } from 'lucide-react';
import { buildRequiredFieldMessage } from '@ims/shared-ui';
import { PortalAuthHeroPanel, PortalAuthLayout } from '@ims/portal-ui';

export default function TrainerSignInPage() {
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
          backgroundImageSrc="https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=800&auto=format&fit=crop"
          overlay={
            <div className="absolute inset-0 bg-gradient-to-br from-[#2b1a12]/90 via-[#8a4a1d]/78 to-[#c96a22]/70" />
          }
          decoration={
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-[#d8a06d]/30 blur-[100px]"
            />
          }
          header={
            <Link href="/trainer" className="inline-flex items-center gap-3 group">
              <Image src="/alsaud/logo.png" alt="Al-Saud Training Institute" width={156} height={52} className="h-11 w-auto" priority />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#f4d5b7]">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          }
          body={
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#f4d5b7]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#f8e8d7]">Trainer Portal</span>
              </div>

              <h1 className="mb-6 text-5xl font-black leading-[1.1] xl:text-7xl">
                Teach. <br />
                <span className="text-[#f4d5b7]">Inspire.</span><br />
                Lead.
              </h1>

              <p className="max-w-md text-lg text-[#f8e8d7]/85">
                Your centralized workspace for managing classes, sharing content, and tracking student success.
              </p>
            </>
          }
          footer={
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((index) => (
                    <Image
                    key={index}
                    src={`https://i.pravatar.cc/100?img=${index + 20}`}
                    className="h-10 w-10 rounded-full border-2 border-[#c96a22] object-cover"
                    alt="Trainer"
                    width={40}
                    height={40}
                  />
                ))}
              </div>
              <p className="text-sm font-bold text-[#f8e8d7]">Join our expert faculty</p>
            </div>
          }
        />
      }
      contentClassName="max-w-[400px]"
      topBar={
        <>
          <Link href="/trainer" className="group flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#b75c16]">
            <div className="rounded-full bg-slate-100 p-2 transition-colors group-hover:bg-[#fff1e3]">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Portal
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#c96a22] to-[#8a4a1d] text-white">
              <BookOpen className="h-4 w-4" />
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
          className="mx-auto mb-6 flex h-16 w-16 -rotate-3 items-center justify-center rounded-3xl border border-[#efd8bf] bg-[#fff6ee] shadow-inner"
        >
          <ClipboardCheck className="h-8 w-8 text-[#b75c16]" />
        </motion.div>
        <h1 className="mb-2 text-3xl font-black text-slate-900">Trainer Login</h1>
        <p className="text-sm text-slate-500">Secure access to your teaching tools.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label className="ml-1 text-xs font-bold text-slate-700">Email Address</label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#c96a22]" />
            </div>
            <input
              type="email"
              placeholder="trainer@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'trainer-email-error' : undefined}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-[#c96a22] focus:bg-white focus:ring-4 focus:ring-[#c96a22]/10"
              onInput={() => setFieldErrors((prev) => ({ ...prev, email: undefined }))}
            />
          </div>
          {fieldErrors.email ? (
            <p id="trainer-email-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="ml-1 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <a href="#" className="text-xs font-bold text-[#b75c16] transition-colors hover:text-[#8a4a1d]">Forgot?</a>
          </div>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-[#c96a22]" />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'trainer-password-error' : undefined}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-[#c96a22] focus:bg-white focus:ring-4 focus:ring-[#c96a22]/10"
              onInput={() => setFieldErrors((prev) => ({ ...prev, password: undefined }))}
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
            <p id="trainer-password-error" role="alert" className="ml-1 text-xs font-medium text-rose-600">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c96a22] to-[#8a4a1d] py-4 text-sm font-bold text-white shadow-lg shadow-[#c96a22]/25 transition-all disabled:opacity-70"
        >
          {isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>Access Tools <ChevronRight className="h-4 w-4" /></>
          )}
        </motion.button>
      </form>
    </PortalAuthLayout>
  );
}
