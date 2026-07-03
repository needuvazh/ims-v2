'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  Plus,
  Eye,
  Clock,
  UserCheck,
  FileText,
  FileEdit,
} from 'lucide-react';
import {
  Badge,
  Button,
  Pagination,
  DataTableFilter,
  StatCard,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  ResponsiveDataTable,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  EmptyState
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
  total: number;
  currentPage: number;
  kpis: {
    total: number;
    approved: number;
    submitted: number;
    draft: number;
  };
}

export function AdmissionsClientList({
  admissions,
  branches,
  courses,
  students,
  total,
  currentPage,
  kpis,
}: AdmissionsClientListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  // Direct Intake Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filterConfigs = [
    {
      key: 'branchId',
      label: 'Branch',
      options: branches.map((b) => ({ value: b.id, label: b.name })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'Submitted', label: 'Submitted' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
    },
  ];

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

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'Approved':
        return 'success';
      case 'Submitted':
        return 'info';
      case 'Draft':
        return 'outline';
      case 'Rejected':
        return 'error';
      case 'Cancelled':
        return 'muted';
      default:
        return 'default';
    }
  };

  const columns = [
    { header: 'Admission #', render: (adm: any) => <span className="font-mono font-medium text-slate-800">{adm.admissionNumber}</span> },
    {
      header: 'Student',
      render: (adm: any) => (
        <div className="flex flex-col">
          <div className="font-semibold text-slate-800">{adm.studentName}</div>
          <div className="text-xs text-[var(--ims-muted)]">{adm.studentEmail}</div>
        </div>
      )
    },
    { header: 'Course', render: (adm: any) => adm.courseName },
    { header: 'Branch', render: (adm: any) => adm.branchName },
    {
      header: 'Date',
      render: (adm: any) => (
        <span className="text-xs text-[var(--ims-muted)]">
          {new Date(adm.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )
    },
    { header: 'Status', className: 'text-center', render: (adm: any) => <Badge variant={getStatusBadgeVariant(adm.admissionStatus)}>{adm.admissionStatus}</Badge> },
    {
      header: 'Actions',
      className: 'text-right',
      render: (adm: any) => (
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admissions/${adm.id}`)}>
          <Eye className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
        </Button>
      )
    }
  ];

  const renderCard = (adm: any) => (
    <Card className="hover:border-[var(--ims-brass)] transition-colors">
      <CardHeader className="p-card-p border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {adm.admissionNumber}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{adm.studentName}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(adm.admissionStatus)}>{adm.admissionStatus}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-card-p space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Course</p>
            <p className="truncate">{adm.courseName}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{adm.branchName}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Email</p>
            <p className="truncate">{adm.studentEmail}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/admissions/${adm.id}`)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-page-title font-bold tracking-tight text-[var(--ims-ink)] flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-indigo-600" />
            Admissions
          </h1>
          <p className="text-sm text-[var(--ims-muted)]">
            Manage student admissions, review application documents, and track review status transitions.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" />
            Direct Intake
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Admissions"
          value={kpis.total}
          description="Total student admission profiles"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Approved"
          value={kpis.approved}
          description="Successfully completed admissions"
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Submitted"
          value={kpis.submitted}
          description="Applications pending verification"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Draft"
          value={kpis.draft}
          description="Incomplete draft applications"
          icon={<FileEdit className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      {/* Search and Filters */}
      <DataTableFilter
        searchPlaceholder="Search by admission #, student name, email..."
        filters={filterConfigs}
      />

      {/* Admissions Data */}
      <ResponsiveDataTable
        data={admissions}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(adm) => adm.id}
        emptyState={
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No admissions found"
            description="No student admission profiles match your current filter criteria."
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}

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
