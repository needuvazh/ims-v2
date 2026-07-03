'use client';

import { useEffect, useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
}: EnrollmentsClientListProps) {
  const router = useRouter();
  const totalPages = Math.ceil(total / 10);

  // Enrollment Intake Modal State
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

  const selectedAdmission = admissions.find(a => a.id === selectedAdmissionId);
  const filteredBatches = selectedAdmission 
    ? batches.filter(b => b.courseId === selectedAdmission.courseId)
    : [];

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
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize enrollment.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Manage student course registrations, assign learning batches, and track operational states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            New Enrollment
          </Button>
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
                <TableCell colSpan={8} className="text-center py-12 text-[color:var(--ims-muted)]">
                  No enrollments found matching the active filters.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((enr) => (
                <TableRow key={enr.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono font-medium text-slate-800">{enr.enrollmentNumber}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{enr.studentName}</div>
                    <div className="text-xs text-[color:var(--ims-muted)]">{enr.studentEmail}</div>
                  </TableCell>
                  <TableCell>{enr.courseName}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{enr.batchCode}</TableCell>
                  <TableCell>{enr.branchName}</TableCell>
                  <TableCell className="text-xs text-[color:var(--ims-muted)]">
                    {new Date(enr.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusBadgeVariant(enr.enrollmentStatus)}>
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
      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}

      {/* New Enrollment Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Student Enrollment</DialogTitle>
            <DialogDescription>
              Select an approved student admission, define enrollment channel, and assign target learning batch.
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
                className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
              >
                <option value="">-- Select Approved Student --</option>
                {admissions.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Enrollment Type</label>
              <select
                value={enrollmentType}
                onChange={(e) => setEnrollmentType(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
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
                className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!selectedAdmissionId 
                    ? '-- Select Student Admission First --' 
                    : filteredBatches.length === 0 
                      ? '-- No Active Batches for this Course --' 
                      : '-- Choose Batch --'}
                </option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
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
