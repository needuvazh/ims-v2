'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Breadcrumbs,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ims/shared-ui';
import {
  Home,
  LayoutDashboard,
  School,
  Layers,
  Users,
  Calendar,
  AlertCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

interface BatchesDashboardClientProps {
  kpis: {
    total: number;
    open: number;
    inProgress: number;
    cancelled: number;
    draft: number;
  };
  courseCapacities: Array<{
    courseName: string;
    activeBatchCount: number;
    capacity: number;
    enrolled: number;
    fillRate: number;
  }>;
  upcoming: Array<{
    id: string;
    batchCode: string;
    batchNameEnglish: string;
    courseName: string;
    startDate: string;
    capacity: number;
    currentEnrollmentCount: number;
  }>;
  courses: Array<{ id: string; nameEnglish: string }>;
  branches: Array<{ id: string; branchName: string }>;
  activeFilters: {
    startDate: string;
    endDate: string;
    courseId: string;
    status: string;
    branchId: string;
  };
}

export function BatchesDashboardClient({
  kpis,
  courseCapacities,
  upcoming,
  courses,
  branches,
  activeFilters,
}: BatchesDashboardClientProps) {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({ ...activeFilters });

  const getFillRateColor = (rate: number) => {
    if (rate >= 90) return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20';
    if (rate >= 75) return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20';
  };

  const handleApplyFilters = (filters: typeof activeFilters) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.courseId) params.set('courseId', filters.courseId);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.status) params.set('status', filters.status);

    router.push(`/dashboards/batches?${params.toString()}`);
  };

  const handleResetFilters = () => {
    router.push('/dashboards/batches');
  };

  return (
    <div className="space-y-6 sm:space-y-8 relative">
      <PageHeader
        title="Batches Operational Dashboard"
        description="Roster fill rates, scheduling horizons, and capacity metrics."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Batches List',
                href: '/batches',
                icon: <School className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Analytics',
                icon: <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
      />

      {/* Active Filters Info Banner */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm text-slate-600">
        <span className="font-semibold text-slate-500">Active Filters:</span>
        <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
          Date: {activeFilters.startDate} {activeFilters.endDate ? `to ${activeFilters.endDate}` : '(default: last 60 days)'}
        </span>
        {activeFilters.courseId && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Course: {courses.find(c => c.id === activeFilters.courseId)?.nameEnglish || activeFilters.courseId}
          </span>
        )}
        {activeFilters.branchId && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Branch: {branches.find(b => b.id === activeFilters.branchId)?.branchName || activeFilters.branchId}
          </span>
        )}
        {activeFilters.status && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Status: {activeFilters.status}
          </span>
        )}
        {(activeFilters.endDate || activeFilters.courseId || activeFilters.branchId || activeFilters.status) && (
          <button
            onClick={handleResetFilters}
            className="ml-auto text-xs text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-2"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:gap-5">
        <StatCard
          title="Total Batches"
          value={kpis.total}
          description="Configured in branch scope"
          icon={<Layers className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Open for Enrollment"
          value={kpis.open}
          description="Accepting registrations"
          icon={<Users className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="In Progress"
          value={kpis.inProgress}
          description="Currently running batches"
          icon={<Calendar className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Draft Batches"
          value={kpis.draft}
          description="Pending scheduling approval"
          icon={<FileText className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Cancelled / Suspended"
          value={kpis.cancelled}
          description="Inactive schedules"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Capacity Fill Rates Card */}
        <Card className="xl:col-span-2 shadow-sm rounded-2xl border-[color:var(--ims-border)]">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold">Course Capacity & Fill Rates</CardTitle>
              <CardDescription>
                Active enrollment density and batch capacity utilization.
              </CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {courseCapacities.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-sm text-slate-500">
                No active/enrolling batches available to display utilization.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-center">Active Batches</TableHead>
                      <TableHead className="text-right">Students Enrolled</TableHead>
                      <TableHead className="text-right">Total Capacity</TableHead>
                      <TableHead className="text-right">Fill Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseCapacities.map((item) => (
                      <TableRow key={item.courseName} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.courseName}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.activeBatchCount}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">
                          {item.enrolled}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {item.capacity}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getFillRateColor(
                              item.fillRate
                            )}`}
                          >
                            {item.fillRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Timelines Card */}
        <Card className="shadow-sm rounded-2xl border-[color:var(--ims-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Upcoming Cohorts (Next 30 Days)</CardTitle>
            <CardDescription>
              Chronological pipeline of upcoming batch launches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-sm text-slate-500">
                No cohorts scheduled to launch in the next 30 days.
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((batch) => {
                  const startDateObj = new Date(batch.startDate);
                  const formattedDate = startDateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const fillPercentage = batch.capacity > 0
                    ? Math.round((batch.currentEnrollmentCount / batch.capacity) * 100)
                    : 0;

                  return (
                    <div
                      key={batch.id}
                      className="group flex flex-col gap-2 rounded-xl border border-slate-100 p-3.5 hover:border-slate-200 hover:shadow-xs transition-all bg-slate-50/20"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="text-slate-600 bg-slate-100 font-semibold mb-1">
                            {batch.batchCode}
                          </Badge>
                          <h4 className="font-semibold text-slate-800 text-sm group-hover:text-[color:var(--ims-brass)] transition-colors">
                            {batch.batchNameEnglish}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">{batch.courseName}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {formattedDate}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Enrolled: <strong className="text-slate-800">{batch.currentEnrollmentCount}</strong> / {batch.capacity}
                        </span>
                        <span className="font-semibold">{fillPercentage}% filled</span>
                      </div>
                    </div>
                  );
                })}
                <Button
                  onClick={() => router.push('/batches?group=future')}
                  variant="outline"
                  className="w-full h-10 mt-2 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 gap-1"
                >
                  View All Future Batches
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button (FAB) for Filters */}
      <div className="fixed bottom-6 right-6 z-40">
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogTrigger asChild>
            <Button
              className="rounded-full shadow-lg hover:shadow-xl w-12 h-12 flex items-center justify-center bg-[color:var(--ims-brass)] text-white hover:bg-[color:var(--ims-brass-dark)] transition-all cursor-pointer p-0"
              title="Filter Dashboard"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Filter Batches Dashboard</DialogTitle>
              <DialogDescription>
                Customize the date range and dimensions to filter batch statistics.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={tempFilters.startDate}
                    onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={tempFilters.endDate}
                    onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Course</label>
                <select
                  value={tempFilters.courseId}
                  onChange={(e) => setTempFilters({ ...tempFilters, courseId: e.target.value })}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                >
                  <option value="">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.nameEnglish}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Branch</label>
                <select
                  value={tempFilters.branchId}
                  onChange={(e) => setTempFilters({ ...tempFilters, branchId: e.target.value })}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                >
                  <option value="">All Authorized Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Status</label>
                <select
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="OpenForEnrollment">Open for Enrollment</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsFilterOpen(false)}
                className="h-10 text-xs font-semibold text-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleApplyFilters(tempFilters);
                  setIsFilterOpen(false);
                }}
                className="h-10 text-xs font-semibold bg-[color:var(--ims-brass)] text-white hover:bg-[color:var(--ims-brass-dark)]"
              >
                Apply Filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
