'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Award,
  ArrowLeft,
  CheckCircle,
  Search,
  ShieldCheck,
  FileText,
  Sparkles,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function PublicVerificationPage() {
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/public/v1/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode: code }),
      });

      const json = await response.json();
      if (response.ok && json.success) {
        setResult(json.data);
      } else {
        setError(json.messageEnglish || 'Failed to verify certificate.');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-hidden text-slate-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/alsaud/logo.png"
              alt="Al-Saud Training Institute"
              width={156}
              height={52}
              className="h-10 w-auto"
              priority
            />
            <span className="font-black text-lg tracking-tight">
              Certificate<span className="text-amber-500">Verify</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 min-h-screen flex items-center justify-center">
        {/* Animated Background Elements */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 left-[10%] w-[500px] h-[500px] bg-amber-300/20 blur-[100px] rounded-full pointer-events-none -z-10"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-1/4 right-[10%] w-[600px] h-[600px] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none -z-10"
        />

        <div className="max-w-3xl mx-auto w-full relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" /> Official Institute Verification
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4 text-slate-900">
              Verify Certificate <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                Authenticity.
              </span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Enter the unique certificate verification code to instantly verify
              its validity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-amber-900/5 border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full pointer-events-none" />

            <form onSubmit={handleVerify} noValidate className="relative z-10">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter Verification Code..."
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-5 pl-14 pr-6 text-lg font-bold text-slate-900 outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSearching || !code}
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

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 font-semibold text-sm"
              >
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Results Area */}
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 pt-8 border-t border-slate-100"
              >
                {result.status === 'VALID' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                      <Award className="w-48 h-48 text-emerald-600" />
                    </div>

                    <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                      <CheckCircle className="w-10 h-10" />
                    </div>

                    <div className="relative z-10 text-center md:text-left w-full">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-3">
                        <ShieldCheck className="w-3.5 h-3.5" /> Valid
                        Certificate
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-4">
                        Certificate is Authentic
                      </h3>

                      <div className="grid sm:grid-cols-2 gap-4 bg-white/60 p-4 rounded-2xl text-left">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Student Name
                          </p>
                          <p className="font-bold text-slate-900">
                            {result.studentDisplayName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Program
                          </p>
                          <p className="font-bold text-slate-900">
                            {result.courseName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Issue Date
                          </p>
                          <p className="font-bold text-slate-900">
                            {result.issuedDate
                              ? new Date(result.issuedDate).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Certificate No
                          </p>
                          <p className="font-bold text-slate-900 font-mono">
                            {result.certificateNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result.status === 'REVOKED' && (
                  <div className="bg-red-50 border border-red-100 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                    <div className="bg-red-500 text-white p-4 rounded-2xl shadow-lg shadow-red-500/30 shrink-0">
                      <XCircle className="w-10 h-10" />
                    </div>

                    <div className="relative z-10 text-center md:text-left w-full">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-widest mb-3">
                        <AlertTriangle className="w-3.5 h-3.5" /> Revoked
                        Certificate
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-4">
                        Certificate Has Been Revoked
                      </h3>

                      <div className="p-4 bg-white/60 rounded-2xl text-left space-y-3">
                        <p className="text-sm font-semibold text-slate-700">
                          This certificate was revoked on{' '}
                          <span className="font-bold text-slate-900">
                            {new Date(result.revokedAt).toLocaleDateString()}
                          </span>
                          .
                        </p>
                        <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs text-red-800">
                          <p className="font-bold uppercase tracking-wider text-[10px] text-red-500 mb-1">
                            Reason for Revocation
                          </p>
                          {result.revocationReason}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result.status === 'REPLACED' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                    <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg shadow-amber-500/30 shrink-0">
                      <RotateCcw className="w-10 h-10" />
                    </div>

                    <div className="relative z-10 text-center md:text-left w-full">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest mb-3">
                        <AlertTriangle className="w-3.5 h-3.5" /> Superseded
                        Certificate
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-4">
                        Certificate Has Been Replaced
                      </h3>

                      <div className="p-4 bg-white/60 rounded-2xl text-left">
                        <p className="text-sm font-medium text-slate-700">
                          This credential was replaced by a newer version.
                          Please contact Al Saud Training Institute for the
                          active verification code.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.status === 'INVALID' && (
                  <div className="text-center py-6 text-red-500 font-bold">
                    Invalid Verification Code. No matching certificate found.
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-bold text-slate-400"
          >
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> ISO 9001 Certified
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" /> Blockchain Backed
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Tamper Proof
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
