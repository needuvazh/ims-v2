'use client';

import { useActionState, useState } from 'react';
import {
  GraduationCap, Eye, EyeOff, ArrowLeft, Lock, Mail, Users, Award, TrendingUp, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@ims/shared-ui';
import { signInAction, type SignInState } from './actions';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="flex min-h-screen w-full font-sans bg-slate-50 overflow-hidden">
      
      {/* ════════════════════════════════════════════════════════════════
          LEFT PANEL — Vibrant Brand Panel
      ════════════════════════════════════════════════════════════════ */}
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        className="relative hidden flex-col overflow-hidden lg:flex w-[55%] z-10 rounded-r-[3rem] shadow-2xl"
      >
        {/* Background photo & overlay */}
        <div className="absolute inset-0 bg-slate-900">
          <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1400&auto=format&fit=crop" className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-40" alt="" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-fuchsia-900/60 to-cyan-900/80" />
        </div>

        {/* Animated blobs */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }} className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-fuchsia-600/30 blur-[100px]" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute top-[40%] -right-[20%] w-[600px] h-[600px] rounded-full bg-cyan-500/30 blur-[100px]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16 text-white">
          
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] transform group-hover:rotate-12 transition-transform">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.8 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/20 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-violet-200">Admin Portal</span>
            </div>
            
            <h1 className="text-5xl xl:text-7xl font-black leading-[1.1] mb-6">
              Manage. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300">Empower.</span><br/>
              Succeed.
            </h1>
            
            <p className="text-lg text-violet-100/80 max-w-md mb-8">
              The central hub for managing Al-Saud Training Institute — staff, programs, enrollment, and operations.
            </p>

            <div className="flex flex-wrap gap-3">
              {TRUST.map((t, i) => (
                <motion.div key={t} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.1 }} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white/90">{t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              {STATS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex flex-col items-center gap-2 px-4 text-center first:pl-0 last:pr-0">
                    <div className="p-2 rounded-xl bg-white/10 text-fuchsia-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-black">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANEL — Sign-in form
      ════════════════════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col overflow-y-auto bg-white z-0">
        
        {/* Top bar */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex shrink-0 items-center justify-between px-8 py-6">
          <Link href="/" className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-600 transition-colors">
            <div className="p-2 rounded-full bg-slate-100 group-hover:bg-violet-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Home
          </Link>
          
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="w-full max-w-[420px]">
            
            <div className="text-center mb-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.6 }} className="w-16 h-16 mx-auto bg-violet-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-violet-200">
                <Lock className="w-8 h-8 text-violet-600" />
              </motion.div>
              <h1 className="text-3xl font-black text-slate-900 mb-3">Welcome Back!</h1>
              <p className="text-slate-500 text-sm">Sign in to manage the admin portal securely.</p>
            </div>

            <form action={formAction} className="space-y-5">
              <AnimatePresence>
                {state.error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Alert variant="error" description={state.error} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label htmlFor="si-email" className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  </div>
                  <input
                    id="si-email" name="email" type="email" placeholder="admin@ims.com" required
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                    data-testid="sign-in-email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="si-password" className="text-xs font-bold text-slate-700">Password</label>
                  <a href="#" className="text-xs font-bold text-violet-600 hover:text-fuchsia-600 transition-colors">Forgot?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  </div>
                  <input
                    id="si-password" name="password" type={showPass ? 'text' : 'password'} placeholder="••••••••••" required
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                    data-testid="sign-in-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer ml-1 w-fit group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 group-hover:border-violet-500 transition-colors">
                  <input type="checkbox" name="remember" className="peer absolute opacity-0 w-full h-full cursor-pointer" />
                  <CheckCircle2 className="w-4 h-4 text-violet-600 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="font-medium group-hover:text-slate-900 transition-colors">Keep me signed in</span>
              </label>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                data-testid="sign-in-submit"
              >
                {isPending ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In Securely <ChevronRight className="h-4 w-4" /></>
                )}
              </motion.button>
            </form>

            <div className="mt-10">
              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Demo Access</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              
              <select
                className="w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none hover:border-slate-300 transition-colors"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const em = document.querySelector<HTMLInputElement>('[data-testid="sign-in-email"]');
                  if (em) em.value = v;
                }}
              >
                <option value="" disabled>Select a demo role...</option>
                <option value="admin@ims.com">Admin Portal (admin@ims.com)</option>
              </select>
            </div>
            
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
