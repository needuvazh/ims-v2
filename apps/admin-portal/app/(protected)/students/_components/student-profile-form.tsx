'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { User, Compass, Activity } from 'lucide-react';
import { toast } from 'sonner';

type BranchOption = { id: string; name: string };

type StudentFormValues = {
  studentId?: string;
  studentNumber?: string;
  version?: number;
  branchId?: string;
  branchName?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email?: string | null;
  nationalId?: string | null;
  passportNumber?: string | null;
  visaNumber?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  remarks?: string | null;
};

type Props = {
  mode: 'create' | 'edit';
  branches?: BranchOption[];
  initialValues?: StudentFormValues;
  showHeader?: boolean;
  hideBranchSelector?: boolean;
};

function toInputDate(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function StudentProfileForm({ mode, branches = [], initialValues = {}, showHeader = true, hideBranchSelector = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<number | undefined>(initialValues.version);

  const [branchId, setBranchId] = useState(initialValues.branchId || branches[0]?.id || '');
  const [firstName, setFirstName] = useState(initialValues.firstName || '');
  const [lastName, setLastName] = useState(initialValues.lastName || '');
  const [mobile, setMobile] = useState(initialValues.mobile || '');
  const [email, setEmail] = useState(initialValues.email || '');
  const [nationalId, setNationalId] = useState(initialValues.nationalId || '');
  const [passportNumber, setPassportNumber] = useState(initialValues.passportNumber || '');
  const [visaNumber, setVisaNumber] = useState(initialValues.visaNumber || '');
  const [nationality, setNationality] = useState(initialValues.nationality || '');
  const [dateOfBirth, setDateOfBirth] = useState(toInputDate(initialValues.dateOfBirth));
  const [gender, setGender] = useState(initialValues.gender || '');
  const [remarks, setRemarks] = useState(initialValues.remarks || '');

  const isCreate = mode === 'create';

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !mobile.trim()) {
      toast.error('First name, last name, and mobile are required.');
      return;
    }
    if (isCreate && !branchId) {
      toast.error('Please select a branch.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        branchId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
        nationalId: nationalId.trim() || null,
        passportNumber: passportNumber.trim() || null,
        visaNumber: visaNumber.trim() || null,
        nationality: nationality.trim() || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender.trim() || null,
        remarks: remarks.trim() || null,
        version,
      };

      const response = await fetch(
        isCreate ? '/api/v1/students' : `/api/v1/students/${initialValues.studentId}`,
        {
          method: isCreate ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.messageEnglish || 'Student save failed.');
      }

      toast.success(isCreate ? 'Student profile created.' : 'Student profile updated.');
      router.push(`/students/${result.data.studentId}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Student save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminFormPageLayout>
      {showHeader && (
        <PageHeader
          eyebrow="Student Management"
          title={isCreate ? 'Create Student' : 'Edit Student'}
          description={isCreate ? 'Create a new student profile.' : 'Update profile identity details.'}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="space-y-4 sm:space-y-5">
          <Card className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Personal Information</h3>
                <p className="text-xs text-slate-500">Identity and contact details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">First Name</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Last Name</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Mobile</span>
                <input
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 disabled:bg-slate-50 disabled:text-slate-500"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={!isCreate}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
                <input
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 disabled:bg-slate-50 disabled:text-slate-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isCreate}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Date of Birth</span>
                <input type="date" className="w-full h-10 rounded-lg border border-slate-200 px-3" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Gender</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={gender} onChange={(e) => setGender(e.target.value)} />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Remarks</span>
                <textarea className="w-full min-h-28 rounded-lg border border-slate-200 px-3 py-2" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <Card className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Identity & Branch</h3>
                <p className="text-xs text-slate-500">Branch and identity documents</p>
              </div>
            </div>

            {isCreate && !hideBranchSelector && (
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Branch</span>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!isCreate && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
                Student #: <span className="font-mono font-semibold">{initialValues.studentNumber || 'N/A'}</span>
                {' '}| Branch: <span className="font-semibold">{initialValues.branchName || 'N/A'}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Civil ID</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Passport</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Visa</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={visaNumber} onChange={(e) => setVisaNumber(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Nationality</span>
                <input className="w-full h-10 rounded-lg border border-slate-200 px-3" value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </label>
            </div>
          </Card>

          <Card className="space-y-5 rounded-2xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Save Changes</h3>
                <p className="text-xs text-slate-500">Review then create or update the student profile</p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => router.back()} type="button" className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading} type="button" className="w-full sm:w-auto">
                {loading ? 'Saving…' : isCreate ? 'Create Student' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AdminFormPageLayout>
  );
}
