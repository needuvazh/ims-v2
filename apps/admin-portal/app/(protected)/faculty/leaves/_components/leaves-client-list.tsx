'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Pagination,
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
  EmptyState,
  FormLabel,
  Input,
  Select,
  Textarea,
  Checkbox,
} from '@ims/shared-ui';

interface LeaveRequestItem {
  id: string;
  personId: string;
  branchId: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  leaveType: string;
  reason: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  person: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  branch: {
    branchName: string;
  } | null;
}

interface LeavesClientListProps {
  initialLeaves: LeaveRequestItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  branches: Array<{ id: string; branchName: string; branchCode: string }>;
  staff: Array<{ id: string; firstName: string; lastName: string; email: string | null }>;
  currentBranchId: string;
  canApprove: boolean;
  canApply: boolean;
  kpis: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export function LeavesClientList({
  initialLeaves,
  totalCount,
  currentPage,
  pageSize,
  branches,
  staff,
  currentBranchId,
  canApprove,
  canApply,
  kpis,
}: LeavesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Dialog & Prompt states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for new leave request
  const [formData, setFormData] = useState({
    personId: '',
    branchId: currentBranchId || (branches[0]?.id ?? ''),
    startDate: '',
    endDate: '',
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00',
    leaveType: 'Casual',
    reason: '',
  });

  // Filter handlers
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset page to 1 on filter update
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // API Call handlers
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId) {
      toast.error('Please select a staff member.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startTime: formData.isFullDay ? null : formData.startTime,
          endTime: formData.isFullDay ? null : formData.endTime,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.messageEnglish || 'Failed to submit leave request.');
      }

      toast.success('Leave request submitted successfully.');
      setIsApplyModalOpen(false);
      // Reset form
      setFormData({
        personId: '',
        branchId: currentBranchId || (branches[0]?.id ?? ''),
        startDate: '',
        endDate: '',
        isFullDay: true,
        startTime: '09:00',
        endTime: '17:00',
        leaveType: 'Casual',
        reason: '',
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this leave request?')) return;

    try {
      const res = await fetch(`/api/v1/leaves/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.messageEnglish || 'Failed to approve leave request.');
      }

      toast.success('Leave request approved.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/leaves/${selectedLeaveId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.messageEnglish || 'Failed to reject leave request.');
      }

      toast.success('Leave request rejected.');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setSelectedLeaveId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel/delete this leave request?')) return;

    try {
      const res = await fetch(`/api/v1/leaves/${id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.messageEnglish || 'Failed to cancel leave request.');
      }

      toast.success('Leave request cancelled/deleted.');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const branchOptions = [
    { value: '', label: 'All branches' },
    ...branches.map((b) => ({ value: b.id, label: b.branchName })),
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const staffOptions = [
    { value: '', label: 'All staff' },
    ...staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
  ];

  const columns = [
    {
      header: 'Staff Member',
      render: (leave: LeaveRequestItem) => (
        <div className="flex flex-col">
          <div className="font-semibold text-slate-800">
            {leave.person ? `${leave.person.firstName} ${leave.person.lastName}` : 'Unknown Staff'}
          </div>
          <div className="text-xs text-[var(--ims-muted)]">
            {leave.person?.email || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Branch',
      render: (leave: LeaveRequestItem) => leave.branch?.branchName || '—',
    },
    {
      header: 'Leave Details',
      render: (leave: LeaveRequestItem) => (
        <div className="flex flex-col">
          <div className="font-medium text-slate-800">
            {leave.startDate} to {leave.endDate}
          </div>
          <div className="text-xs text-[var(--ims-muted)]">
            {leave.isFullDay ? (
              'Full Day'
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 inline mr-0.5" />
                {leave.startTime} - {leave.endTime}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      render: (leave: LeaveRequestItem) => (
        <Badge variant="default" className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-none font-medium">
          {leave.leaveType}
        </Badge>
      ),
    },
    {
      header: 'Reason',
      render: (leave: LeaveRequestItem) => (
        <div className="max-w-[200px] truncate text-slate-600 font-medium" title={leave.reason ?? ''}>
          {leave.reason || '—'}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (leave: LeaveRequestItem) => {
        let variant: 'success' | 'info' | 'outline' | 'error' | 'muted' | 'default' = 'default';
        if (leave.status === 'Approved') variant = 'success';
        else if (leave.status === 'Pending') variant = 'info';
        else if (leave.status === 'Rejected') variant = 'error';
        else if (leave.status === 'Cancelled') variant = 'muted';

        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={variant}>{leave.status}</Badge>
            {leave.status === 'Rejected' && leave.rejectionReason && (
              <span className="text-[10px] text-rose-600 max-w-[150px] truncate font-medium" title={leave.rejectionReason}>
                Note: {leave.rejectionReason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (leave: LeaveRequestItem) => (
        <div className="flex items-center justify-end gap-2">
          {canApprove && leave.status === 'Pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-200 text-xs font-semibold py-1 px-2.5 rounded-lg"
                onClick={() => handleApprove(leave.id)}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border-rose-200 text-xs font-semibold py-1 px-2.5 rounded-lg"
                onClick={() => {
                  setSelectedLeaveId(leave.id);
                  setIsRejectModalOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          )}
          {leave.status === 'Pending' && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-rose-600"
              onClick={() => handleCancel(leave.id)}
              title="Cancel Request"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const renderCard = (leave: LeaveRequestItem) => {
    let variant: 'success' | 'info' | 'outline' | 'error' | 'muted' | 'default' = 'default';
    if (leave.status === 'Approved') variant = 'success';
    else if (leave.status === 'Pending') variant = 'info';
    else if (leave.status === 'Rejected') variant = 'error';
    else if (leave.status === 'Cancelled') variant = 'muted';

    return (
      <Card className="hover:border-[var(--ims-brass)] transition-colors bg-white shadow-sm border border-slate-100 rounded-xl">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--ims-ink)]">
                {leave.person ? `${leave.person.firstName} ${leave.person.lastName}` : 'Unknown Staff'}
              </p>
              <p className="text-xs text-[var(--ims-muted)]">
                {leave.person?.email || '—'}
              </p>
            </div>
            <Badge variant={variant}>{leave.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Dates</p>
              <p className="font-medium text-slate-800">
                {leave.startDate} to {leave.endDate}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {leave.isFullDay ? 'Full Day' : `${leave.startTime} - ${leave.endTime}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Leave Type</p>
              <p className="truncate font-medium text-slate-800">{leave.leaveType}</p>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Reason</p>
              <p className="text-slate-600 italic whitespace-normal font-medium">
                {leave.reason || '—'}
              </p>
            </div>
            {leave.status === 'Rejected' && leave.rejectionReason && (
              <div className="col-span-2 space-y-1 bg-red-50 p-2 rounded-lg border border-red-100">
                <p className="font-semibold text-red-800">Rejection Reason</p>
                <p className="text-red-700 font-medium">{leave.rejectionReason}</p>
              </div>
            )}
          </div>
        </CardContent>
        {canApprove && leave.status === 'Pending' && (
          <CardFooter className="p-4 pt-0 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-200 font-semibold"
              onClick={() => handleApprove(leave.id)}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border-rose-200 font-semibold"
              onClick={() => {
                setSelectedLeaveId(leave.id);
                setIsRejectModalOpen(true);
              }}
            >
              Reject
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Apply Leave Header / Action bar */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0" />
        {canApply && (
          <Button
            onClick={() => setIsApplyModalOpen(true)}
            className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="sr-only sm:not-sr-only">Apply Leave</span>
          </Button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Leaves"
          value={kpis.total}
          description="Total leave requests registered"
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Pending"
          value={kpis.pending}
          description="Awaiting coordinator approval"
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Approved"
          value={kpis.approved}
          description="Active and scheduled time-offs"
          icon={<CheckCircle className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Rejected"
          value={kpis.rejected}
          description="Declined leave requests"
          icon={<XCircle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      {/* Filters Bar */}
      <Card className="border-[color:var(--ims-border)] bg-white/75 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]">
            {/* Branch Select */}
            {branches.length > 1 ? (
              <Select
                label="Branch"
                placeholder="All branches"
                value={searchParams.get('branchId') ?? ''}
                onValueChange={(val) => updateFilter('branchId', val)}
                options={branchOptions}
              />
            ) : (
              <div className="hidden md:block" />
            )}

            {/* Status Select */}
            <Select
              label="Status"
              placeholder="All statuses"
              value={searchParams.get('status') ?? ''}
              onValueChange={(val) => updateFilter('status', val)}
              options={statusOptions}
            />

            {/* Staff Select */}
            <Select
              label="Staff Member"
              placeholder="All staff"
              value={searchParams.get('personId') ?? ''}
              onValueChange={(val) => updateFilter('personId', val)}
              options={staffOptions}
            />

            {/* Date Picker Filter */}
            <div className="space-y-1.5">
              <FormLabel>Filter by Date</FormLabel>
              <Input
                type="date"
                value={searchParams.get('date') ?? ''}
                onChange={(e) => updateFilter('date', e.target.value)}
                className="h-10"
              />
            </div>

            {/* Clear Filters */}
            {searchParams.get('branchId') ||
            searchParams.get('status') ||
            searchParams.get('personId') ||
            searchParams.get('date') ? (
              <div className="flex items-end justify-start sm:justify-end pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(pathname)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold uppercase tracking-[0.1em]"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="hidden lg:block" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaves Table */}
      <Card className="border-[color:var(--ims-border)] bg-white shadow-sm overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <ResponsiveDataTable
            data={initialLeaves}
            columns={columns}
            keyExtractor={(item) => item.id}
            renderCard={renderCard}
            breakpoint="lg"
            emptyState={
              <EmptyState
                title="No leave requests found"
                description="Try modifying your filters or submit a new leave request."
                icon={<Calendar className="h-12 w-12 text-slate-300 animate-pulse" />}
              />
            }
          />
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 p-4 justify-between items-center flex">
            <span className="text-xs font-semibold text-slate-500">
              Showing page {currentPage} of {totalPages} ({totalCount} records)
            </span>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={pageSize}
            />
          </CardFooter>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="!left-auto !right-0 !top-0 !translate-x-0 !translate-y-0 h-full max-h-screen w-full max-w-[32rem] rounded-none border-l border-[color:var(--ims-border)] p-0 overflow-hidden bg-white shadow-2xl">
          <div className="flex h-full flex-col overflow-hidden">
            <DialogHeader className="border-b border-slate-100 p-5 shrink-0">
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request. Approved leaves will automatically adjust trainer availability and trigger conflict scheduling alerts.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApplyLeave} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <FormLabel>Staff Member *</FormLabel>
                  <Select
                    placeholder="Select staff member"
                    value={formData.personId}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, personId: val }))}
                    options={staff.map((s) => ({
                      value: s.id,
                      label: `${s.firstName} ${s.lastName} (${s.email || 'No email'})`,
                    }))}
                  />
                </div>

                {branches.length > 1 && (
                  <div className="space-y-1.5">
                    <FormLabel>Branch *</FormLabel>
                    <Select
                      placeholder="Select branch"
                      value={formData.branchId}
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, branchId: val }))}
                      options={branches.map((b) => ({
                        value: b.id,
                        label: b.branchName,
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <FormLabel>Leave Type *</FormLabel>
                  <Select
                    placeholder="Select leave type"
                    value={formData.leaveType}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, leaveType: val }))}
                    options={[
                      { value: 'Sick', label: 'Sick Leave' },
                      { value: 'Casual', label: 'Casual Leave' },
                      { value: 'Annual', label: 'Annual Leave' },
                      { value: 'Unpaid', label: 'Unpaid Leave' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FormLabel>Start Date *</FormLabel>
                    <Input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FormLabel>End Date *</FormLabel>
                    <Input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="py-1">
                  <Checkbox
                    label="Full Day Leave"
                    checked={formData.isFullDay}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isFullDay: e.target.checked }))}
                  />
                </div>

                {!formData.isFullDay && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
                    <div className="space-y-1.5">
                      <FormLabel className="flex items-center gap-1 font-semibold text-xs">
                        <Clock className="h-3 w-3 inline text-slate-400" /> Start Time *
                      </FormLabel>
                      <Input
                        type="time"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FormLabel className="flex items-center gap-1 font-semibold text-xs">
                        <Clock className="h-3 w-3 inline text-slate-400" /> End Time *
                      </FormLabel>
                      <Input
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <FormLabel>Reason / Remarks</FormLabel>
                  <Textarea
                    placeholder="State the reason for this time-off..."
                    value={formData.reason || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 p-5 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setIsApplyModalOpen(false)}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Apply'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-700">Reject Leave Request</DialogTitle>
            <DialogDescription>
              Explain the reason why this leave request is being rejected. The staff member will see this note.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <FormLabel>Reason for Rejection *</FormLabel>
              <Textarea
                required
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setSelectedLeaveId(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
