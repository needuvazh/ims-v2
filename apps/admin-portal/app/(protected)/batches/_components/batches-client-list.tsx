'use client';

import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Calendar,
  AlertCircle,
  Users,
  ArrowRight,
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

interface BatchesClientListProps {
  batches: any[];
  courses: any[];
  branches: any[];
  total: number;
  kpis: {
    total: number;
    open: number;
    inProgress: number;
    cancelled: number;
  };
  currentPage: number;
  canCreate: boolean;
}

export function BatchesClientList({
  batches,
  courses,
  branches,
  total,
  kpis,
  currentPage,
  canCreate,
}: BatchesClientListProps) {
  const router = useRouter();
  const totalPages = Math.ceil(total / 10);

  const filterConfigs = [
    {
      key: 'courseId',
      label: 'Course',
      options: courses.map((c) => ({ value: c.id, label: c.nameEnglish })),
    },
    {
      key: 'branchId',
      label: 'Branch',
      options: branches.map((b) => ({ value: b.id, label: b.branchName })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'OpenForEnrollment', label: 'Open' },
        { value: 'InProgress', label: 'In Progress' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'OpenForEnrollment':
        return <Badge variant="success">Open</Badge>;
      case 'InProgress':
        return <Badge variant="info">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="default">Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.branchName : 'Unknown Branch';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--ims-ink)] flex items-center gap-2">
            <Layers className="h-8 w-8 text-indigo-600" />
            Batches
          </h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Manage course scheduling, classroom allocations, and trainer assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => router.push('/batches/new')} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Create Batch
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Batches"
          value={kpis.total}
          description="Schedules configured globally or in branch"
          icon={<Layers className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Open for Enrollment"
          value={kpis.open}
          description="Batches accepting new registrations"
          icon={<Users className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="In Progress"
          value={kpis.inProgress}
          description="Active learning sessions currently running"
          icon={<Calendar className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Cancelled / Suspended"
          value={kpis.cancelled}
          description="Batches cancelled, suspended or in draft"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      {/* Search and Filters */}
      <DataTableFilter
        searchPlaceholder="Search batches by code, English name or Arabic name..."
        filters={filterConfigs}
      />

      {/* Batches List Table */}
      <div className="rounded-lg border border-[color:var(--ims-border)] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Batch Code</TableHead>
              <TableHead>English Name</TableHead>
              <TableHead>Arabic Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="w-[180px]">Dates</TableHead>
              <TableHead className="w-[120px]">Enrolled / Cap</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-[color:var(--ims-muted)]">
                  No batches found matching the active filters.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => {
                return (
                  <TableRow key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-semibold text-indigo-600 font-mono">{batch.batchCode}</TableCell>
                    <TableCell className="font-medium text-slate-800">{batch.batchNameEnglish}</TableCell>
                    <TableCell className="font-medium text-slate-800 text-right font-arabic" dir="rtl">
                      {batch.batchNameArabic}
                    </TableCell>
                    <TableCell className="text-slate-700">{batch.course?.nameEnglish || 'N/A'}</TableCell>
                    <TableCell className="text-[color:var(--ims-muted)]">{getBranchName(batch.branchId)}</TableCell>
                    <TableCell className="text-[color:var(--ims-muted)] text-sm">
                      {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[color:var(--ims-muted)]">
                      {batch.currentEnrollmentCount} / {batch.capacity}
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/batches/${batch.id}`)}
                        title="Manage Batch"
                      >
                        <ArrowRight className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />
      )}
    </div>
  );
}
