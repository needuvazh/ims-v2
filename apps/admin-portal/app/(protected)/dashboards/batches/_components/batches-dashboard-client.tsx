'use client';

import React from 'react';
import Link from 'next/link';
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
}

export function BatchesDashboardClient({
  kpis,
  courseCapacities,
  upcoming,
}: BatchesDashboardClientProps) {
  const router = useRouter();

  const getFillRateColor = (rate: number) => {
    if (rate >= 90) return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20';
    if (rate >= 75) return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20';
  };

  return (
    <div className="space-y-6 sm:space-y-8">
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
    </div>
  );
}
