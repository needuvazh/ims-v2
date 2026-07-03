'use client';

import { useState } from 'react';
import { Search, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type PreflightResult = {
  personFound: boolean;
  personId: string | null;
  firstNameMasked: string | null;
  lastNameMasked: string | null;
  maskedMobile: string | null;
  maskedEmail: string | null;
  studentProfileId: string | null;
  studentNumber: string | null;
  preflight: {
    hasActiveAdmission: boolean;
    activeAdmissionId: string | null;
    hasEnrollment: boolean;
    conflictCode: string | null;
  } | null;
};

type Props = {
  onClear: () => void;
  onMatchFound: (result: PreflightResult) => void;
  onNoMatch: () => void;
};

/**
 * PreflightLookupWidget
 *
 * Renders an email/mobile lookup step before the full registration form
 * is displayed. Prevents duplicate StudentProfile creation.
 *
 * Outcomes:
 *  - No match → parent can show the full registration form (onNoMatch)
 *  - Match found → parent shows the OTP claim modal (onMatchFound)
 *  - Clear → reset to initial state (onClear)
 */
export function PreflightLookupWidget({ onClear, onMatchFound, onNoMatch }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isMobile = (v: string) => /^\+?[\d\s\-]{7,20}$/.test(v.trim());

  const handleLookup = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error('Enter an email address or mobile number to search.');
      return;
    }

    const body: { email?: string; mobile?: string } = {};
    if (isEmail(trimmed)) {
      body.email = trimmed;
    } else if (isMobile(trimmed)) {
      body.mobile = trimmed;
    } else {
      toast.error('Please enter a valid email address or mobile number.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/students/preflight-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.messageEnglish || 'Lookup failed.');
      }

      const lookupResult: PreflightResult = data.data;
      setResult(lookupResult);

      if (lookupResult.personFound) {
        onMatchFound(lookupResult);
      } else {
        onNoMatch();
      }
    } catch (err: any) {
      toast.error(err.message || 'Preflight lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setValue('');
    setResult(null);
    onClear();
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Email or Mobile (Duplicate Check)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              id="preflight-lookup-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="student@example.com or +968 9XXX XXXX"
              className="w-full pl-9 pr-3 h-10 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--ims-brass)] focus:border-transparent"
            />
          </div>
          <button
            id="preflight-lookup-btn"
            type="button"
            onClick={handleLookup}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-[color:var(--ims-brass)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {loading ? 'Checking…' : 'Check'}
          </button>
          {result && (
            <button
              id="preflight-clear-btn"
              type="button"
              onClick={handleClear}
              className="h-10 px-3 rounded-lg border border-slate-200 text-slate-500 text-sm hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {result && !result.personFound && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>No existing profile found — you can proceed with a new registration.</span>
        </div>
      )}

      {result && result.personFound && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
          <div className="flex items-start gap-2 text-amber-800 font-medium mb-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Existing profile found — cross-branch claim required</span>
          </div>
          <div className="text-amber-700 space-y-0.5 pl-6 text-xs">
            <div>Name: <span className="font-semibold">{result.firstNameMasked} {result.lastNameMasked}</span></div>
            {result.maskedEmail && <div>Email: <span className="font-semibold">{result.maskedEmail}</span></div>}
            {result.maskedMobile && <div>Mobile: <span className="font-semibold">{result.maskedMobile}</span></div>}
            {result.studentNumber && <div>Student #: <span className="font-semibold">{result.studentNumber}</span></div>}
            {result.preflight?.hasActiveAdmission && (
              <div className="text-red-600 font-medium pt-1">
                ⚠ Already has an active admission at this branch.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
