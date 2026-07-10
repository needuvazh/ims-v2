'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@ims/shared-ui';
import { User, Mail, Phone, Calendar, UploadCloud, Globe, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface LearnerProfileCardProps {
  studentProfile: {
    id: string;
    joinedAt: Date | string;
    person: {
      firstName: string;
      lastName: string;
      email?: string | null;
      mobile?: string | null;
      nationalId?: string | null;
      photoUrl?: string | null;
      passportNumber?: string | null;
      visaNumber?: string | null;
      nationality?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
    };
  };
  displayEmail: string | null;
  displayMobile: string | null;
  displayNationalId: string | null;
  displayPassport: string | null;
  displayVisa: string | null;
  canRevealPII: boolean;
}

export function LearnerProfileCard({
  studentProfile,
  displayEmail,
  displayMobile,
  displayNationalId,
  displayPassport,
  displayVisa,
  canRevealPII,
}: LearnerProfileCardProps) {
  const router = useRouter();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/v1/students/${studentProfile.id}/profile-photo`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload photo');
      }

      toast.success('Profile photo uploaded successfully!');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="h-10 w-10 rounded-full bg-[color:var(--ims-brass-soft)] flex items-center justify-center text-[color:var(--ims-brass)]">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Learner Profile</h3>
          <p className="text-xs text-slate-400">Canonical Identity Details</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Profile Photo Avatar and Upload */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-inner">
            {studentProfile.person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/v1/students/${studentProfile.id}/profile-photo/view?v=${encodeURIComponent(studentProfile.person.photoUrl)}`}
                alt="Profile Photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              disabled={isUploadingPhoto}
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        {/* Profile Details Grid */}
        <div className="flex-1 w-full space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                National/Civil ID
              </span>
              <p className="font-semibold text-slate-700">
                {displayNationalId}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Mobile Phone
              </span>
              <p className="font-semibold text-slate-700">
                {displayMobile || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email address
              </span>
              <p className="font-semibold text-slate-700 break-all">
                {displayEmail || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Passport Number
              </span>
              <p className="font-semibold text-slate-700">
                {displayPassport || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Visa Number
              </span>
              <p className="font-semibold text-slate-700">
                {displayVisa || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Nationality
              </span>
              <p className="font-semibold text-slate-700">
                {studentProfile.person.nationality || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Date of Birth
              </span>
              <p className="font-semibold text-slate-700">
                {studentProfile.person.dateOfBirth
                  ? new Date(studentProfile.person.dateOfBirth).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })
                  : 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Gender
              </span>
              <p className="font-semibold text-slate-700 capitalize">
                {studentProfile.person.gender || 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Registry Joined At
              </span>
              <p className="font-semibold text-slate-700">
                {new Date(studentProfile.joinedAt).toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}
              </p>
            </div>
          </div>

          {!canRevealPII && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs">
              Contact information is masked. You need{' '}
              <strong>student.identity.unmasked.read</strong> or{' '}
              <strong>student.reveal_pii</strong> permission to reveal complete
              records.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
