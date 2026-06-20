'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowLeft, Mail, Lock, Eye, EyeOff, Sparkles, ChevronRight, BookOpen } from 'lucide-react';

export default function StudentSignInPage() {
  const [showPass, setShowPass] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setTimeout(() => setIsPending(false), 1500); // Mock delay
  };

  return (
    <div className="flex min-h-screen w-full font-sans bg-slate-50 overflow-hidden">
      
      {/* ════════════════════════════════════════════════════════════════
          LEFT PANEL — Vibrant Brand Panel
      ════════════════════════════════════════════════════════════════ */}
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        className="relative hidden flex-col overflow-hidden lg:flex w-[50%] z-10 rounded-r-[3rem] shadow-2xl"
      >
        {/* Background photo & overlay */}
        <div className="absolute inset-0 bg-slate-900">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop" className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-30" alt="" />
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/80 via-rose-600/80 to-orange-500/60" />
        </div>

        {/* Animated blobs */}
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-yellow-400/30 blur-[100px]" />
        
        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16 text-white">
          
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Link href="/student" className="inline-flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-pink-600 shadow-xl transform group-hover:rotate-12 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink-200">Al-Saud Training</p>
                <p className="text-xl font-black tracking-tight text-white">Institute</p>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.8 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-pink-100">Student Portal</span>
            </div>
            
            <h1 className="text-5xl xl:text-7xl font-black leading-[1.1] mb-6">
              Learn. <br/>
              <span className="text-yellow-300">Grow.</span><br/>
              Achieve.
            </h1>
            
            <p className="text-lg text-pink-100 max-w-md">
              Access your courses, track assignments, and engage with your learning community.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex items-center gap-4">
             <div className="flex -space-x-3">
               {[1,2,3,4].map(i => (
                 <img key={i} src={`https://i.pravatar.cc/100?img=${i+10}`} className="w-10 h-10 rounded-full border-2 border-pink-500 object-cover" alt="Student" />
               ))}
             </div>
             <p className="text-sm font-bold text-pink-100">Join 25,000+ students</p>
          </motion.div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANEL — Sign-in form
      ════════════════════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col overflow-y-auto bg-white z-0">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex shrink-0 items-center justify-between px-8 py-6">
          <Link href="/student" className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-pink-600 transition-colors">
            <div className="p-2 rounded-full bg-slate-100 group-hover:bg-pink-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Portal
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-600 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
        </motion.div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="w-full max-w-[400px]">
            
            <div className="text-center mb-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.6 }} className="w-16 h-16 mx-auto bg-pink-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-pink-200 rotate-3">
                <BookOpen className="w-8 h-8 text-pink-600" />
              </motion.div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">Student Sign In</h1>
              <p className="text-slate-500 text-sm">Log in to access your dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                  </div>
                  <input
                    type="email" placeholder="student@example.com" required
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <a href="#" className="text-xs font-bold text-pink-600 hover:text-rose-600 transition-colors">Forgot?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="••••••••••" required
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 py-4 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-6"
              >
                {isPending ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Access Dashboard <ChevronRight className="h-4 w-4" /></>
                )}
              </motion.button>
            </form>
            
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
