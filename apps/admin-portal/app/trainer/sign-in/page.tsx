'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles, ChevronRight, ClipboardCheck } from 'lucide-react';
import {
  createRequiredInputValidationHandlers,
  validateRequiredInput,
} from '@ims/shared-ui';
import { PortalAuthHeroPanel, PortalAuthLayout } from '@ims/portal-ui';

export default function TrainerSignInPage() {
  const [showPass, setShowPass] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const emailValidation = createRequiredInputValidationHandlers('Email Address');
  const passwordValidation = createRequiredInputValidationHandlers('Password');

  const handleSubmit = (event: React.FormEvent) => {
    const form = event.currentTarget as HTMLFormElement;
    const emailInput = form.elements.namedItem('email') as HTMLInputElement | null;
    const passwordInput = form.elements.namedItem('password') as HTMLInputElement | null;

    const isEmailValid = validateRequiredInput(emailInput, 'Email Address');
    const isPasswordValid = validateRequiredInput(passwordInput, 'Password');

    if (!isEmailValid || !isPasswordValid) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

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
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/80 via-blue-600/80 to-indigo-800/60" />
          }
          decoration={
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-emerald-400/30 blur-[100px]"
            />
          }
          header={
            <Link href="/trainer" className="inline-flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-xl transition-transform group-hover:rotate-12">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          }
          body={
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-100">Trainer Portal</span>
              </div>

              <h1 className="mb-6 text-5xl font-black leading-[1.1] xl:text-7xl">
                Teach. <br />
                <span className="text-emerald-300">Inspire.</span><br />
                Lead.
              </h1>

              <p className="max-w-md text-lg text-cyan-100">
                Your centralized workspace for managing classes, sharing content, and tracking student success.
              </p>
            </>
          }
          footer={
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((index) => (
                  <img
                    key={index}
                    src={`https://i.pravatar.cc/100?img=${index + 20}`}
                    className="h-10 w-10 rounded-full border-2 border-cyan-500 object-cover"
                    alt="Trainer"
                  />
                ))}
              </div>
              <p className="text-sm font-bold text-cyan-100">Join our expert faculty</p>
            </div>
          }
        />
      }
      contentClassName="max-w-[400px]"
      topBar={
        <>
          <Link href="/trainer" className="group flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-cyan-600">
            <div className="rounded-full bg-slate-100 p-2 transition-colors group-hover:bg-cyan-100">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Portal
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600 text-white">
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
          className="mx-auto mb-6 flex h-16 w-16 -rotate-3 items-center justify-center rounded-3xl border border-cyan-200 bg-cyan-100 shadow-inner"
        >
          <ClipboardCheck className="h-8 w-8 text-cyan-600" />
        </motion.div>
        <h1 className="mb-2 text-3xl font-black text-slate-900">Trainer Login</h1>
        <p className="text-sm text-slate-500">Secure access to your teaching tools.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label className="ml-1 text-xs font-bold text-slate-700">Email Address</label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
            </div>
            <input
              type="email"
              placeholder="trainer@example.com"
              required
              {...emailValidation}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="ml-1 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <a href="#" className="text-xs font-bold text-cyan-600 transition-colors hover:text-blue-600">Forgot?</a>
          </div>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              required
              {...passwordValidation}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition-colors hover:bg-cyan-50 hover:text-cyan-600"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-70"
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
