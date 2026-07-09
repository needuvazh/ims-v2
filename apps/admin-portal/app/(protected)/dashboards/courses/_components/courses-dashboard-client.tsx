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
  BookOpen,
  Layers,
  CheckCircle2,
  FileText,
  Archive,
  SlidersHorizontal,
  FolderOpen,
  Building,
} from 'lucide-react';

interface CoursesDashboardClientProps {
  kpis: {
    total: number;
    published: number;
    approved: number;
    draft: number;
    archived: number;
  };
  categoryBreakdowns: Array<{
    id: string;
    nameEnglish: string;
    courseCount: number;
  }>;
  departmentBreakdowns: Array<{
    id: string;
    departmentName: string;
    courseCount: number;
  }>;
  recentCourses: Array<{
    id: string;
    courseCode: string;
    nameEnglish: string;
    courseClassification: string;
    createdAt: string;
    status: string;
  }>;
  categories: Array<{ id: string; nameEnglish: string }>;
  departments: Array<{ id: string; departmentName: string }>;
  activeFilters: {
    startDate: string;
    endDate: string;
    categoryId: string;
    departmentId: string;
    isPubliclyExposed: string;
    courseClassification: string;
    hasPricing: string;
    hasDiscount: string;
    hasCertificateRules: string;
  };
}

export function CoursesDashboardClient({
  kpis,
  categoryBreakdowns,
  departmentBreakdowns,
  recentCourses,
  categories,
  departments,
  activeFilters,
}: CoursesDashboardClientProps) {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({ ...activeFilters });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Approved':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'InReview':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Draft':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const handleApplyFilters = (filters: typeof activeFilters) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    if (filters.isPubliclyExposed) params.set('isPubliclyExposed', filters.isPubliclyExposed);
    if (filters.courseClassification) params.set('courseClassification', filters.courseClassification);
    if (filters.hasPricing) params.set('hasPricing', filters.hasPricing);
    if (filters.hasDiscount) params.set('hasDiscount', filters.hasDiscount);
    if (filters.hasCertificateRules) params.set('hasCertificateRules', filters.hasCertificateRules);

    router.push(`/dashboards/courses?${params.toString()}`);
  };

  const handleResetFilters = () => {
    router.push('/dashboards/courses');
  };

  const hasAnyActiveFilter =
    activeFilters.endDate ||
    activeFilters.categoryId ||
    activeFilters.departmentId ||
    activeFilters.isPubliclyExposed ||
    activeFilters.courseClassification ||
    activeFilters.hasPricing ||
    activeFilters.hasDiscount ||
    activeFilters.hasCertificateRules;

  return (
    <div className="space-y-6 sm:space-y-8 relative">
      <PageHeader
        title="Courses Catalog Dashboard"
        description="Global course distribution, category splits, and rules configurations."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Courses List',
                href: '/courses-catalog',
                icon: <BookOpen className="h-3.5 w-3.5 text-slate-400" />,
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
          Effective Date: {activeFilters.startDate} {activeFilters.endDate ? `to ${activeFilters.endDate}` : '(default: last 60 days)'}
        </span>
        {activeFilters.categoryId && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Category: {categories.find(c => c.id === activeFilters.categoryId)?.nameEnglish || activeFilters.categoryId}
          </span>
        )}
        {activeFilters.departmentId && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Dept: {departments.find(d => d.id === activeFilters.departmentId)?.departmentName || activeFilters.departmentId}
          </span>
        )}
        {activeFilters.isPubliclyExposed && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Public: {activeFilters.isPubliclyExposed === 'true' ? 'Yes' : 'No'}
          </span>
        )}
        {activeFilters.courseClassification && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Class: {activeFilters.courseClassification}
          </span>
        )}
        {activeFilters.hasPricing && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Pricing: {activeFilters.hasPricing === 'true' ? 'Has Active' : 'No Active'}
          </span>
        )}
        {activeFilters.hasDiscount && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Discount: {activeFilters.hasDiscount === 'true' ? 'Has Active' : 'No Active'}
          </span>
        )}
        {activeFilters.hasCertificateRules && (
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-medium">
            Cert Rules: {activeFilters.hasCertificateRules === 'true' ? 'Has Active' : 'No Active'}
          </span>
        )}
        {hasAnyActiveFilter && (
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
          title="Total Courses"
          value={kpis.total}
          description="In resolved branches scope"
          icon={<Layers className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Published Courses"
          value={kpis.published}
          description="Active in Course Catalog"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Approved Courses"
          value={kpis.approved}
          description="Awaiting publishing"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Draft Courses"
          value={kpis.draft}
          description="Under draft creation"
          icon={<FileText className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Archived Courses"
          value={kpis.archived}
          description="Logically deleted courses"
          icon={<Archive className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Breakdown by Category & Department Cards */}
        <div className="xl:col-span-2 space-y-6">
          {/* Category Breakdown */}
          <Card className="shadow-sm rounded-2xl border-[color:var(--ims-border)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Courses by Category</CardTitle>
                <CardDescription>
                  Distribution of active courses per category.
                </CardDescription>
              </div>
              <FolderOpen className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              {categoryBreakdowns.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                  No courses available for selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category Name</TableHead>
                        <TableHead className="text-right">Course Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryBreakdowns.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.nameEnglish}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700">
                            {item.courseCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card className="shadow-sm rounded-2xl border-[color:var(--ims-border)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Courses by Department</CardTitle>
                <CardDescription>
                  Distribution of active courses per owning department.
                </CardDescription>
              </div>
              <Building className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              {departmentBreakdowns.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                  No courses available for selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department Name</TableHead>
                        <TableHead className="text-right">Course Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentBreakdowns.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.departmentName}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-700">
                            {item.courseCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recently Added Courses Card */}
        <Card className="shadow-sm rounded-2xl border-[color:var(--ims-border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Recently Added Courses</CardTitle>
            <CardDescription>
              New course specifications introduced in the catalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCourses.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-sm text-slate-500">
                No courses added recently.
              </div>
            ) : (
              <div className="space-y-4">
                {recentCourses.map((course) => {
                  const createdDateObj = new Date(course.createdAt);
                  const formattedDate = createdDateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={course.id}
                      className="group flex flex-col gap-2 rounded-xl border border-slate-100 p-3.5 hover:border-slate-200 hover:shadow-xs transition-all bg-slate-50/20"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="text-slate-600 bg-slate-100 font-semibold mb-1">
                            {course.courseCode}
                          </Badge>
                          <h4 className="font-semibold text-slate-800 text-sm group-hover:text-[color:var(--ims-brass)] transition-colors">
                            {course.nameEnglish}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(course.status)}`}>
                              {course.status}
                            </Badge>
                            <span className="text-[10px] text-slate-400">Class: {course.courseClassification}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Filter Courses Dashboard</DialogTitle>
              <DialogDescription>
                Filter course metrics by dates, category, and configurations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 py-3.5 overflow-y-auto max-h-[70vh]">
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
                <label className="text-xs font-semibold text-slate-500">Category</label>
                <select
                  value={tempFilters.categoryId}
                  onChange={(e) => setTempFilters({ ...tempFilters, categoryId: e.target.value })}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nameEnglish}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Department</label>
                <select
                  value={tempFilters.departmentId}
                  onChange={(e) => setTempFilters({ ...tempFilters, departmentId: e.target.value })}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.departmentName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Classification</label>
                  <select
                    value={tempFilters.courseClassification}
                    onChange={(e) => setTempFilters({ ...tempFilters, courseClassification: e.target.value })}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                  >
                    <option value="">All</option>
                    <option value="Regular">Regular</option>
                    <option value="FastTrack">Fast Track</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Publicly Exposed</label>
                  <select
                    value={tempFilters.isPubliclyExposed}
                    onChange={(e) => setTempFilters({ ...tempFilters, isPubliclyExposed: e.target.value })}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[color:var(--ims-brass)]"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Has Pricing</label>
                  <select
                    value={tempFilters.hasPricing}
                    onChange={(e) => setTempFilters({ ...tempFilters, hasPricing: e.target.value })}
                    className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Has Discount</label>
                  <select
                    value={tempFilters.hasDiscount}
                    onChange={(e) => setTempFilters({ ...tempFilters, hasDiscount: e.target.value })}
                    className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Cert Rules</label>
                  <select
                    value={tempFilters.hasCertificateRules}
                    onChange={(e) => setTempFilters({ ...tempFilters, hasCertificateRules: e.target.value })}
                    className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
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
