'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Hash,
  BookOpen,
  Layers,
  Contact,
  Fingerprint,
  ExternalLink,
} from 'lucide-react';

function VerificationContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const autoTriggerRef = useRef(false);

  const handleVerifyCode = async (verificationCode: string) => {
    if (!verificationCode) return;
    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/public/v1/certificates/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode }),
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

  useEffect(() => {
    const queryCode = searchParams.get('code');
    if (queryCode && !autoTriggerRef.current) {
      autoTriggerRef.current = true;
      setCode(queryCode);
      handleVerifyCode(queryCode);
    }
  }, [searchParams]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    handleVerifyCode(code);
  };

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
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
          Enter the unique certificate verification code or scan the QR code to instantly verify its validity.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-amber-900/5 border border-slate-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full pointer-events-none" />

        <form onSubmit={handleFormSubmit} noValidate className="relative z-10">
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
              className="w-full md:w-auto rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-amber-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shrink-0"
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
              <div className="space-y-6">
                {/* Status Alert */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-5">
                    <Award className="w-32 h-32 text-emerald-600" />
                  </div>
                  <div className="bg-emerald-500 text-white p-3 rounded-xl shadow-md shadow-emerald-500/20 shrink-0 z-10">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="z-10">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <ShieldCheck className="w-3 h-3" /> Certified Authentic
                    </div>
                    <h3 className="text-xl font-extrabold text-emerald-950">
                      Certificate is Valid & Active
                    </h3>
                  </div>
                </div>

                {/* Profile and Certificate Info Panels */}
                <div className="grid md:grid-cols-12 gap-6">
                  {/* Student Profile Card (4 cols on desktop) */}
                  <div className="md:col-span-5 bg-gradient-to-b from-slate-50 to-white border border-slate-100 rounded-3xl p-6 flex flex-col items-center text-center">
                    <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-black">
                      {result.photoUrl ? (
                        <img
                          src={result.photoUrl}
                          alt={result.studentDisplayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className="absolute z-0">{getInitials(result.studentDisplayName)}</span>
                    </div>

                    <h4 className="text-lg font-black text-slate-800 leading-tight">
                      {result.studentDisplayName}
                    </h4>
                    <p className="text-xs font-bold text-amber-600 mt-1 uppercase tracking-wider">
                      Student Profile
                    </p>
                    <div className="w-full border-t border-slate-100 my-4" />

                    <div className="w-full text-left space-y-3.5">
                      <div className="flex items-start gap-2.5">
                        <Contact className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                            Student ID
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono">{result.studentNumber || '—'}</p>
                        </div>
                      </div>

                      {result.nationalId && (
                        <div className="flex items-start gap-2.5">
                          <Fingerprint className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                              National ID
                            </p>
                            <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono">{result.nationalId}</p>
                          </div>
                        </div>
                      )}

                      {result.passportNumber && (
                        <div className="flex items-start gap-2.5">
                          <Fingerprint className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                              Passport Number
                            </p>
                            <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono">{result.passportNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate Information Card (7 cols on desktop) */}
                  <div className="md:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Credential Information
                        </h4>
                        <span className="text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                          {result.language === 'ar' ? 'Arabic' : 'English'}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Course / Program Name
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <BookOpen className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                            <p className="font-extrabold text-slate-800 text-sm leading-snug">
                              {result.courseName}
                            </p>
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 ml-6 font-mono">
                            Code: {result.courseCode || '—'}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Batch / Training Delivery
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Layers className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                            <p className="font-bold text-slate-800 text-sm leading-snug">
                              {result.batchName}
                            </p>
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 ml-6 font-mono">
                            Code: {result.batchCode || '—'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Certificate No.
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                              <p className="font-extrabold text-slate-800 text-xs font-mono break-all">
                                {result.certificateNumber}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Date of Issue
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                              <p className="font-bold text-slate-800 text-xs">
                                {result.issuedDate
                                  ? new Date(result.issuedDate).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
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
                    <AlertTriangle className="w-3.5 h-3.5" /> Revoked Certificate
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
                    <AlertTriangle className="w-3.5 h-3.5" /> Superseded Certificate
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">
                    Certificate Has Been Replaced
                  </h3>

                  <div className="p-4 bg-white/60 rounded-2xl text-left">
                    <p className="text-sm font-medium text-slate-700">
                      This credential was replaced by a newer version. Please contact Al Saud Training Institute for the active verification code.
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
    </div>
  );
}

export default function PublicVerificationPage() {
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

        <Suspense fallback={
          <div className="max-w-3xl mx-auto w-full text-center py-12">
            <div className="h-10 w-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-sm">Loading verification page...</p>
          </div>
        }>
          <VerificationContent />
        </Suspense>
      </section>
    </div>
  );
}
