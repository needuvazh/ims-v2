'use client';

import { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Props = {
  personId: string;
  studentProfileId: string;
  maskedEmail: string | null;
  maskedMobile: string | null;
  branchId: string;
  onClose: () => void;
};

/**
 * OtpClaimModal
 *
 * Shown when preflight-lookup detects an existing cross-branch profile.
 * Step 1: Request OTP (email or mobile channel)
 * Step 2: Enter code → claim-profile API creates an Admission for this branch
 */
export function OtpClaimModal({
  personId,
  studentProfileId,
  maskedEmail,
  maskedMobile,
  branchId,
  onClose,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'choose' | 'enter'>('choose');
  const [channel, setChannel] = useState<'email' | 'mobile'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/students/request-profile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ existingPersonId: personId, channel }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.messageEnglish || 'Failed to send OTP.');
      toast.success(`OTP sent via ${channel}. It expires in 5 minutes.`);
      setStep('enter');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('OTP must be exactly 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/students/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingPersonId: personId,
          existingStudentProfileId: studentProfileId,
          branchId,
          otpCode,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.messageEnglish || 'OTP verification failed.');
      toast.success('Profile successfully claimed for this branch!');
      onClose();
      router.push(`/admissions/${data.data.admissionId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Claim Existing Profile
            </h2>
            <p className="text-xs text-slate-500">
              Verify identity to link this student to your branch
            </p>
          </div>
        </div>

        {step === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              An existing profile was found. Send a one-time code to the student
              to confirm their identity.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Send OTP via
              </label>
              <div className="grid grid-cols-2 gap-2">
                {maskedEmail && (
                  <button
                    id="otp-channel-email-btn"
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`text-left rounded-lg border p-3 text-sm transition-all ${
                      channel === 'email'
                        ? 'border-[color:var(--ims-brass)] bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium mb-0.5">Email</div>
                    <div className="text-xs text-slate-400">{maskedEmail}</div>
                  </button>
                )}
                {maskedMobile && (
                  <button
                    id="otp-channel-mobile-btn"
                    type="button"
                    onClick={() => setChannel('mobile')}
                    className={`text-left rounded-lg border p-3 text-sm transition-all ${
                      channel === 'mobile'
                        ? 'border-[color:var(--ims-brass)] bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium mb-0.5">Mobile SMS</div>
                    <div className="text-xs text-slate-400">{maskedMobile}</div>
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                id="otp-cancel-btn"
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                id="otp-send-btn"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="flex-1 h-10 rounded-lg bg-[color:var(--ims-brass)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          </div>
        )}

        {step === 'enter' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              Code sent. Ask the student to share it with you.
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="otp-code-input"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Enter 6-digit OTP
              </label>
              <input
                id="otp-code-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="_ _ _ _ _ _"
                className="w-full h-12 rounded-lg border border-slate-200 bg-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[color:var(--ims-brass)]"
              />
            </div>
            <div className="flex gap-2">
              <button
                id="otp-back-btn"
                type="button"
                onClick={() => {
                  setStep('choose');
                  setOtpCode('');
                }}
                className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Back
              </button>
              <button
                id="otp-verify-btn"
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="flex-1 h-10 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {loading ? 'Verifying…' : 'Verify & Claim'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
