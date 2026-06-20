'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Award, ArrowLeft, CheckCircle, Search, ShieldCheck, FileText, Sparkles } from 'lucide-react';

export default function PublicVerificationPage() {
  const [certId, setCertId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<null | 'success'>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId) return;
    setIsSearching(true);
    setResult(null);
    setTimeout(() => {
      setIsSearching(false);
      setResult('success');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-hidden text-slate-900">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-amber-500/30 transform group-hover:rotate-12 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-black text-lg tracking-tight">Certificate<span className="text-amber-500">Verify</span></span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 min-h-screen flex items-center justify-center">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} 
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-[10%] w-[500px] h-[500px] bg-amber-300/20 blur-[100px] rounded-full pointer-events-none -z-10" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-[10%] w-[600px] h-[600px] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none -z-10" 
        />

        <div className="max-w-3xl mx-auto w-full relative z-10">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" /> Official Institute Verification
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4 text-slate-900">
              Verify Certificate <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Authenticity.</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Enter the unique certificate number below to instantly verify its validity and view credential details.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-amber-900/5 border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full pointer-events-none" />

            <form onSubmit={handleVerify} className="relative z-10">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                    placeholder="e.g. CERT-2026-001"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-5 pl-14 pr-6 text-lg font-bold text-slate-900 outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 uppercase"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSearching || !certId}
                  className="w-full md:w-auto rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-amber-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify Now'
                  )}
                </motion.button>
              </div>
            </form>

            {/* Results Area */}
            {result === 'success' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 pt-8 border-t border-slate-100"
              >
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                    <Award className="w-48 h-48 text-emerald-600" />
                  </div>
                  
                  <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  
                  <div className="relative z-10 text-center md:text-left w-full">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-3">
                      <ShieldCheck className="w-3.5 h-3.5" /> Valid Certificate
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4">Certificate is Authentic</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-4 bg-white/60 p-4 rounded-2xl">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Student Name</p>
                        <p className="font-bold text-slate-900">Ahmed Al-Balushi</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Program</p>
                        <p className="font-bold text-slate-900">Process Safety Fundamentals</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Issue Date</p>
                        <p className="font-bold text-slate-900">August 12, 2025</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Certificate ID</p>
                        <p className="font-bold text-slate-900 font-mono">{certId.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-bold text-slate-400"
          >
            <div className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> ISO 9001 Certified</div>
            <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500" /> Blockchain Backed</div>
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-500" /> Tamper Proof</div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
