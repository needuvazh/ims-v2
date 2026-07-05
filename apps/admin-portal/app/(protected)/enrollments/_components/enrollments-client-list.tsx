'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  Eye,
  FileEdit,
  FileText,
  GraduationCap,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormLabel,
  Input,
  Pagination,
  ResponsiveDataTable,
  Select,
  StatCard,
} from '@ims/shared-ui';
import { toast } from 'sonner';
import { PricingPanel } from './pricing-panel';

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
  defaultSearch: string;
  defaultStatus: string;
  defaultBranchId: string;
  defaultCourseId: string;
  defaultBatchId: string;
  defaultSortBy: string;
  defaultSortOrder: 'asc' | 'desc';
}

type SortOrder = 'asc' | 'desc';

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'Regular' | 'Corporate' | 'Online'>('Regular');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingPreview, setPricingPreview] = useState<{
    pricingSource: string;
    resolvedPrice: string;
    resolvedDiscount: string;
    finalAmount: string;
    paymentValidationRequired: boolean;
    priceEvaluationTimestamp: string | null;
  } | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(defaultSearch);

  const currentSortBy = searchParams.get('sortBy') ?? defaultSortBy ?? 'createdAt';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? defaultSortOrder;

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearchValue((current) => (current === nextSearch ? current : nextSearch));
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get('q') || '';
    if (searchValue === currentSearch) {
      return;
    }

    const timeout = setTimeout(() => {
      updateParams({ q: searchValue || null, page: '1' });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  const selectedAdmission = admissions.find((admission) => admission.id === selectedAdmissionId);
  const filteredBatches = selectedAdmission ? batches.filter((batch) => batch.courseId === selectedAdmission.courseId) : [];

  useEffect(() => {
    let cancelled = false;

    const refreshPricing = async () => {
      if (!selectedAdmission || !selectedBatchId) {
        setPricingPreview(null);
        setPricingError(null);
        setPricingLoading(false);
        return;
      }

      setPricingLoading(true);
      setPricingError(null);

      try {
        const customerType = enrollmentType === 'Corporate' ? 'Corporate' : 'Individual';
        const response = await fetch(
          `/api/v1/courses/${selectedAdmission.courseId}/pricing/resolve?customerType=${encodeURIComponent(customerType)}&branchId=${selectedAdmission.branchId}&batchId=${selectedBatchId}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.messageEnglish || 'Failed to resolve pricing.');
        }

        if (!cancelled) {
          const resolvedDiscount = (data.data.applicableDiscounts ?? []).reduce((sum: number, discount: { discountValue: number }) => sum + discount.discountValue, 0);
          const finalAmount = Number(data.data.totalPrice);

          setPricingPreview({
            pricingSource: data.data.pricingSource,
            resolvedPrice: String(data.data.basePrice),
            resolvedDiscount: String(resolvedDiscount),
            finalAmount: String(Math.max(0, finalAmount)),
            paymentValidationRequired: finalAmount > 0,
            priceEvaluationTimestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPricingPreview(null);
          setPricingError((error as Error).message || 'Failed to resolve pricing.');
        }
      } finally {
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    };

    void refreshPricing();

    return () => {
      cancelled = true;
    };
  }, [selectedAdmission, selectedBatchId, enrollmentType]);

  const handleSort = (field: string) => {
    const nextOrder: SortOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
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

  const requestedBranchId = searchParams.get('branchId') || '';
  const requestedCourseId = searchParams.get('courseId') || '';
  const requestedBatchId = searchParams.get('batchId') || '';
  const requestedStatus = searchParams.get('status') || '';

  const validStatuses = ['Draft', 'Submitted', 'Approved', 'Confirmed', 'Active', 'Completed', 'Dropped', 'Cancelled'];
  const currentBranchId = branches.some((branch) => branch.id === requestedBranchId)
    ? requestedBranchId
    : branches.some((branch) => branch.id === defaultBranchId)
      ? defaultBranchId
      : '';
  const currentCourseId = courses.some((course) => course.id === requestedCourseId)
    ? requestedCourseId
    : courses.some((course) => course.id === defaultCourseId)
      ? defaultCourseId
      : '';
  const currentBatchId = batches.some((batch) => batch.id === requestedBatchId)
    ? requestedBatchId
    : batches.some((batch) => batch.id === defaultBatchId)
      ? defaultBatchId
      : '';
  const currentStatus = validStatuses.includes(requestedStatus)
    ? requestedStatus
    : validStatuses.includes(defaultStatus)
      ? defaultStatus
      : '';

  const columns = [
    {
      header: 'Enrollment #',
      sortable: true,
      sortDirection: currentSortBy === 'enrollmentNumber' ? currentSortOrder : null,
      onSort: () => handleSort('enrollmentNumber'),
      render: (enrollment: EnrollmentListItem) => <span className="font-mono font-medium text-slate-800">{enrollment.enrollmentNumber}</span>,
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Student',
      sortable: true,
      sortDirection: currentSortBy === 'studentName' ? currentSortOrder : null,
      onSort: () => handleSort('studentName'),
      render: (enrollment: EnrollmentListItem) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-800">{enrollment.studentName}</div>
          <div className="text-xs text-[color:var(--ims-muted)]">{enrollment.studentEmail}</div>
        </div>
      ),
    },
    {
      header: 'Course',
      sortable: true,
      sortDirection: currentSortBy === 'courseName' ? currentSortOrder : null,
      onSort: () => handleSort('courseName'),
      render: (enrollment: EnrollmentListItem) => enrollment.courseName,
    },
    {
      header: 'Batch',
      sortable: true,
      sortDirection: currentSortBy === 'batchCode' ? currentSortOrder : null,
      onSort: () => handleSort('batchCode'),
      render: (enrollment: EnrollmentListItem) => <span className="font-mono text-xs font-semibold">{enrollment.batchCode}</span>,
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchName' ? currentSortOrder : null,
      onSort: () => handleSort('branchName'),
      render: (enrollment: EnrollmentListItem) => enrollment.branchName,
    },
    {
      header: 'Created',
      sortable: true,
      sortDirection: currentSortBy === 'createdAt' ? currentSortOrder : null,
      onSort: () => handleSort('createdAt'),
      render: (enrollment: EnrollmentListItem) => <span className="text-xs text-[color:var(--ims-muted)]">{new Date(enrollment.createdAt).toLocaleDateString()}</span>,
      headerClassName: 'w-[130px]',
    },
    {
      header: 'Status',
      className: 'text-center',
      sortable: true,
      sortDirection: currentSortBy === 'enrollmentStatus' ? currentSortOrder : null,
      onSort: () => handleSort('enrollmentStatus'),
      render: (enrollment: EnrollmentListItem) => <Badge variant={getStatusBadgeVariant(enrollment.enrollmentStatus)}>{enrollment.enrollmentStatus}</Badge>,
      headerClassName: 'w-[120px] text-center',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (enrollment: EnrollmentListItem) => (
        <Button variant="ghost" size="icon" onClick={() => router.push(`/enrollments/${enrollment.id}`)} title="View Details">
          <Eye className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
        </Button>
      ),
      headerClassName: 'w-[100px] text-right',
    },
  ];

  const renderCard = (enrollment: EnrollmentListItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{enrollment.enrollmentNumber}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{enrollment.studentName}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(enrollment.enrollmentStatus)}>{enrollment.enrollmentStatus}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Course</p>
            <p className="truncate">{enrollment.courseName}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Batch</p>
            <p className="truncate font-mono">{enrollment.batchCode}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{enrollment.branchName}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Created</p>
            <p className="truncate">{new Date(enrollment.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/enrollments/${enrollment.id}`)}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );

  const activeFilters = [
    { label: 'Search', value: defaultSearch },
    { label: 'Branch', value: currentBranchId ? branches.find((branch) => branch.id === currentBranchId)?.name || currentBranchId : '' },
    { label: 'Status', value: currentStatus },
    { label: 'Course', value: currentCourseId ? courses.find((course) => course.id === currentCourseId)?.name || currentCourseId : '' },
    { label: 'Batch', value: currentBatchId ? batches.find((batch) => batch.id === currentBatchId)?.code || currentBatchId : '' },
  ].filter((item) => item.value);

  const handleCreateEnrollment = async () => {
    if (!selectedAdmissionId) {
      toast.error('Please select an approved admission profile.');
      return;
    }
    if (!selectedBatchId) {
      toast.error('Please select a batch assignment.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentProfileId: selectedAdmission?.studentProfileId,
          admissionId: selectedAdmissionId,
          courseId: selectedAdmission?.courseId,
          batchId: selectedBatchId,
          enrollmentType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.messageEnglish || 'Failed to initialize enrollment.');
      }

      toast.success('Enrollment initialized successfully!');
      setIsOpen(false);
      router.push(`/enrollments/${data.enrollmentId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize enrollment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <GraduationCap className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Enrollments
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Manage student course enrollments, statuses, and batch assignments.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="h-10 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-4">
          <Plus className="h-4 w-4" />
          New Enrollment
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard title="Total Enrollments" value={kpis.total} description="Total active registrations" icon={<FileText className="h-5 w-5" />} tone="indigo" />
        <StatCard title="Active / Confirmed" value={kpis.active} description="Active learning student list" icon={<CheckCircle className="h-5 w-5" />} tone="emerald" />
        <StatCard title="Pending Approval" value={kpis.submitted} description="Submitted enrollments review queue" icon={<Clock className="h-5 w-5" />} tone="amber" />
        <StatCard title="Draft" value={kpis.draft} description="Incomplete draft enrollments" icon={<FileEdit className="h-5 w-5" />} tone="sky" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Search</FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by enrollment #, student name..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-12 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ q: null, page: '1' });
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Branch</FormLabel>
          <Select
            value={currentBranchId}
            onChange={(e) => updateParams({ branchId: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
            ]}
            className="h-12"
            placeholder="All Branches"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Status</FormLabel>
          <Select
            value={currentStatus}
            onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Submitted', label: 'Submitted' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Confirmed', label: 'Confirmed' },
              { value: 'Active', label: 'Active' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Dropped', label: 'Dropped' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Course</FormLabel>
          <Select
            value={currentCourseId}
            onChange={(e) => updateParams({ courseId: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map((course) => ({ value: course.id, label: course.name })),
            ]}
            className="h-12"
            placeholder="All Courses"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">Batch</FormLabel>
          <Select
            value={currentBatchId}
            onChange={(e) => updateParams({ batchId: e.target.value, page: '1' })}
            options={[
              { value: '', label: 'All Batches' },
              ...batches.map((batch) => ({ value: batch.id, label: batch.code })),
            ]}
            className="h-12"
            placeholder="All Batches"
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ims-muted)]">
          <span className="font-semibold uppercase tracking-[0.18em]">Active filters</span>
          {activeFilters.map((filter) => (
            <span key={`${filter.label}-${filter.value}`} className="rounded-full border border-[color:var(--ims-border)] bg-white px-3 py-1">
              {filter.label}: {filter.value}
            </span>
          ))}
        </div>
      )}

      <ResponsiveDataTable
        data={enrollments}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(enrollment) => enrollment.id}
        emptyState={
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title="No enrollments found"
            description="No enrollments match your current filter criteria."
          />
        }
      />

      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Student Enrollment</DialogTitle>
            <DialogDescription>
              Select an approved student admission, define enrollment channel, and assign the target learning batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Approved Admission Profile</label>
              <select
                value={selectedAdmissionId}
                onChange={(e) => {
                  setSelectedAdmissionId(e.target.value);
                  setSelectedBatchId('');
                }}
                className="h-10 w-full rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
              >
                <option value="">-- Select Approved Student --</option>
                {admissions.map((admission) => (
                  <option key={admission.id} value={admission.id}>
                    {admission.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Enrollment Type</label>
              <select
                value={enrollmentType}
                onChange={(e) => setEnrollmentType(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
              >
                <option value="Regular">Regular (Individual)</option>
                <option value="Corporate">Corporate Sourced</option>
                <option value="Online">Online Intake</option>
              </select>
            </div>

            <div className="space-y-2">
              {pricingLoading && <p className="text-xs text-slate-500">Resolving pricing snapshot…</p>}
              {pricingError && <p className="text-xs text-rose-600">{pricingError}</p>}
              {pricingPreview && (
                <PricingPanel
                  pricingSource={pricingPreview.pricingSource}
                  resolvedPrice={pricingPreview.resolvedPrice}
                  resolvedDiscount={pricingPreview.resolvedDiscount}
                  finalAmount={pricingPreview.finalAmount}
                  paymentValidationRequired={pricingPreview.paymentValidationRequired}
                  priceEvaluationTimestamp={pricingPreview.priceEvaluationTimestamp}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target Learning Batch</label>
              <select
                value={selectedBatchId}
                disabled={!selectedAdmissionId || filteredBatches.length === 0}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="h-10 w-full rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!selectedAdmissionId
                    ? '-- Select Student Admission First --'
                    : filteredBatches.length === 0
                      ? '-- No Active Batches for this Course --'
                      : '-- Choose Batch --'}
                </option>
                {filteredBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.code}
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
              onClick={handleCreateEnrollment}
              disabled={isSubmitting || !selectedAdmissionId || !selectedBatchId}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isSubmitting ? 'Initializing...' : 'Create Enrollment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
