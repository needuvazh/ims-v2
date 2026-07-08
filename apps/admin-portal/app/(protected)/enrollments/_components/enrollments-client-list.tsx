'use client';

import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  FileText,
  FileEdit,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Pagination,
  DataTableFilter,
  StatCard,
} from '@ims/shared-ui';
import Link from 'next/link';

interface EnrollmentListItem {
  id: string;
  enrollmentNumber: string;
  enrollmentStatus: string;
  createdAt: string;
  branchName: string;
  courseName: string;
  batchCode: string;
  studentName: string;
  studentEmail: string;
}

interface AdmissionsListItem {
  id: string;
  studentProfileId: string;
  courseId: string;
  branchId: string;
  label: string;
}

interface EnrollmentsClientListProps {
  enrollments: EnrollmentListItem[];
  branches: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; name: string }>;
  batches: Array<{ id: string; code: string; courseId: string }>;
  admissions: AdmissionsListItem[];
  total: number;
  currentPage: number;
  kpis: {
    total: number;
    active: number;
    submitted: number;
    draft: number;
  };
  defaultSearch?: string;
  defaultStatus?: string;
  defaultBranchId?: string;
  defaultCourseId?: string;
  defaultBatchId?: string;
  defaultSortBy?: string;
  defaultSortOrder?: string;
}

export function EnrollmentsClientList({
  enrollments,
  branches,
  courses,
  batches,
  admissions,
  total,
  currentPage,
  kpis,
  defaultSearch,
  defaultStatus,
  defaultBranchId,
  defaultCourseId,
  defaultBatchId,
  defaultSortBy,
  defaultSortOrder,
}: EnrollmentsClientListProps) {
  const router = useRouter();
  const totalPages = Math.ceil(total / 10);

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
        { value: 'Confirmed', label: 'Confirmed' },
        { value: 'Active', label: 'Active' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Dropped', label: 'Dropped' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'courseId',
      label: 'Course',
      options: courses.map((c) => ({ value: c.id, label: c.name })),
    },
  ];

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'Active':
      case 'Confirmed':
        return 'success';
      case 'Submitted':
      case 'Approved':
        return 'info';
      case 'Draft':
        return 'outline';
      case 'Dropped':
      case 'Cancelled':
        return 'error';
      case 'Completed':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--ims-ink)] flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
            Enrollments
          </h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Manage student course registrations, assign learning batches, and
            track operational states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/enrollments/create">
            <Button
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4" />
              New Enrollment
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Enrollments"
          value={kpis.total}
          description="Total active registrations"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active / Confirmed"
          value={kpis.active}
          description="Active learning student list"
          icon={<CheckCircle className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Pending Approval"
          value={kpis.submitted}
          description="Submitted enrollments review queue"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Draft"
          value={kpis.draft}
          description="Incomplete draft enrollments"
          icon={<FileEdit className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      {/* Search and Filters */}
      <DataTableFilter
        searchPlaceholder="Search by enrollment #, student name..."
        filters={filterConfigs}
      />

      {/* Enrollments Table */}
      <div className="rounded-lg border border-[color:var(--ims-border)] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Enrollment #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="w-[130px]">Created</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-[color:var(--ims-muted)]"
                >
                  No enrollments found matching the active filters.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((enr) => (
                <TableRow
                  key={enr.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="font-mono font-medium text-slate-800">
                    {enr.enrollmentNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">
                      {enr.studentName}
                    </div>
                    <div className="text-xs text-[color:var(--ims-muted)]">
                      {enr.studentEmail}
                    </div>
                  </TableCell>
                  <TableCell>{enr.courseName}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {enr.batchCode}
                  </TableCell>
                  <TableCell>{enr.branchName}</TableCell>
                  <TableCell className="text-xs text-[color:var(--ims-muted)]">
                    {new Date(enr.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={getStatusBadgeVariant(enr.enrollmentStatus)}
                    >
                      {enr.enrollmentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/enrollments/${enr.id}`)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={total}
          limit={10}
        />
      )}
    </div>
  );
}
