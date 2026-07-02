'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, Eye, Plus, FileSpreadsheet } from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@ims/shared-ui';
import { toast } from 'sonner';

interface AdmissionListItem {
  id: string;
  admissionNumber: string;
  admissionStatus: string;
  admissionDate: string;
  createdAt: string;
  branchName: string;
  courseName: string;
  studentName: string;
  studentEmail: string;
  studentMobile: string;
}

interface CourseOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  label: string;
}

interface AdmissionsClientListProps {
  admissions: AdmissionListItem[];
  branches: Array<{ id: string; name: string }>;
  courses: CourseOption[];
  students: StudentOption[];
}

export function AdmissionsClientList({ admissions, branches, courses, students }: AdmissionsClientListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');

  // Direct Intake Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status) params.set('status', status);
    if (branchId) params.set('branchId', branchId);
    router.push(`/admissions?${params.toString()}`);
  };

  const handleReset = () => {
    setQuery('');
    setStatus('');
    setBranchId('');
    router.push('/admissions');
  };

  const handleCreateDraft = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentProfileId: selectedStudent,
          courseId: selectedCourse || null,
          branchId: selectedBranch || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.messageEnglish || 'Failed to create admission draft.');
      }

      toast.success('Admission draft created successfully!');
      setIsOpen(false);
      router.push(`/admissions/${data.admissionId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admission draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Submitted':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Draft':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--ims-foreground)]">Admissions</h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Manage student admissions, review application documents, and track review status transitions.
          </p>
        </div>
        <div>
          <Button onClick={() => setIsOpen(true)} className="bg-green-600 text-white hover:bg-green-700 gap-1.5">
            <Plus className="h-4 w-4" />
            Direct Intake
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[color:var(--ims-muted)]" />
            <Input
              type="text"
              placeholder="Search by admission #, student name, email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <Button onClick={handleSearch} className="bg-green-600 text-white hover:bg-green-700">
              Apply Filters
            </Button>

            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--ims-border)] bg-slate-55/10 text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]">
                <th className="py-3 px-4">Admission #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ims-border)] text-sm text-[color:var(--ims-foreground)]">
              {admissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[color:var(--ims-muted)]">
                    No admissions found matching the current search parameters.
                  </td>
                </tr>
              ) : (
                admissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{adm.admissionNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{adm.studentName}</div>
                      <div className="text-xs text-[color:var(--ims-muted)]">{adm.studentEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">{adm.courseName}</td>
                    <td className="py-3.5 px-4">{adm.branchName}</td>
                    <td className="py-3.5 px-4 text-xs text-[color:var(--ims-muted)]">
                      {new Date(adm.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(adm.admissionStatus)}`}>
                        {adm.admissionStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/admissions/${adm.id}`}>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Intake Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direct Admission Intake</DialogTitle>
            <DialogDescription>
              Create a new draft admission directly for an existing candidate student profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Student Profile</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Choose Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Choose Course (Optional) --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target Campus / Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleCreateDraft}
              disabled={isSubmitting || !selectedStudent}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
