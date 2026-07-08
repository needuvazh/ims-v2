'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
  Badge,
  Select,
  ResponsiveDataTable,
  Button,
} from '@ims/shared-ui';
import {
  RefreshCw,
  Download,
  Users,
  Award,
  Calendar,
  DollarSign,
  Search,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface TrainerReportRow {
  reportCode: string;
  trainerId: string;
  trainerCode: string;
  displayNameEn: string;
  displayNameAr?: string | null;
  branchId: string;
  branchCode?: string | null;
  branchName?: string | null;
  trainerType: string;
  status: string;
  effectiveStartDate: Date | string;
  effectiveEndDate?: Date | string | null;
  authorizationCount?: number;
  availabilityCount?: number;
  assignmentCount?: number;
  utilizationPct?: number | null;
  compensationConfigured?: boolean;
}

interface ReportsClientProps {
  initialData: {
    items: TrainerReportRow[];
    total: number;
  };
  branches: Array<{ id: string; branchName: string; branchCode: string }>;
  session: {
    userId: string;
    activeBranchId?: string | null;
    permissions: string[];
  };
}

export default function ReportsClient({
  initialData,
  branches,
  session,
}: ReportsClientProps) {
  const [reportData, setReportData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [reportCode, setReportCode] = useState('trainer.roster');
  const [branchId, setBranchId] = useState(session.activeBranchId ?? '');
  const [trainerType, setTrainerType] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Real-Time Refresh State
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10); // 10 seconds
  const [timeLeft, setTimeLeft] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const hasCompensationRead = session.permissions.includes(
    'trainer.compensation.read',
  );
  const hasExportPermission = session.permissions.includes(
    'trainer.report.export',
  );

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  // Fetch Logic
  const fetchReportData = useCallback(
    async (
      code: string,
      branch: string,
      type: string,
      stat: string,
      pageNum: number,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('reportCode', code);
        if (branch) params.append('branchId', branch);
        if (type !== 'ALL') params.append('trainerType', type);
        if (stat !== 'ALL') params.append('status', stat);
        params.append('page', String(pageNum));
        params.append('pageSize', String(pageSize));

        const res = await fetch(`/api/v1/faculty/reports?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch reports');
        }
        const data = await res.json();
        setReportData(data.data || { items: [], total: 0 });
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading reports');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Handle manual refresh
  const handleRefresh = () => {
    fetchReportData(reportCode, branchId, trainerType, status, page);
    setTimeLeft(refreshInterval);
  };

  // Poll timer effect
  useEffect(() => {
    if (!autoRefresh) return;
    setTimeLeft(refreshInterval);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchReportData(reportCode, branchId, trainerType, status, page);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    autoRefresh,
    refreshInterval,
    reportCode,
    branchId,
    trainerType,
    status,
    page,
    fetchReportData,
  ]);

  // Sync on filter change
  const handleFilterChange = (
    newCode: string,
    newBranch: string,
    newType: string,
    newStatus: string,
  ) => {
    setReportCode(newCode);
    setBranchId(newBranch);
    setTrainerType(newType);
    setStatus(newStatus);
    setPage(1); // Reset to page 1
    fetchReportData(newCode, newBranch, newType, newStatus, 1);
  };

  // Export CSV
  const handleExport = () => {
    if (!hasExportPermission) return;
    const reportItems = reportData?.items || [];
    const headers = [
      'Trainer Code',
      'Name',
      'Branch',
      'Type',
      'Status',
      'Effective Start',
      'Effective End',
      'Authorizations Count',
      'Availability Slots',
    ];
    if (hasCompensationRead) {
      headers.push('Compensation Configured');
    }

    const csvContent = [
      headers.join(','),
      ...reportItems.map((item) => {
        const row = [
          `"${item.trainerCode}"`,
          `"${item.displayNameEn}"`,
          `"${item.branchName ?? item.branchCode ?? ''}"`,
          `"${item.trainerType}"`,
          `"${item.status}"`,
          `"${new Date(item.effectiveStartDate).toLocaleDateString()}"`,
          `"${item.effectiveEndDate ? new Date(item.effectiveEndDate).toLocaleDateString() : 'Open-ended'}"`,
          item.authorizationCount ?? 0,
          item.availabilityCount ?? 0,
        ];
        if (hasCompensationRead) {
          row.push(item.compensationConfigured ? 'Yes' : 'No');
        }
        return row.join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Faculty_Report_${reportCode}_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Metrics from reportData items (current page or overall if matches length)
  const reportItems = reportData?.items || [];
  const totalItems = reportData?.total || 0;
  const activeCount = reportItems.filter(
    (i) => i.status === 'Active',
  ).length;
  const activePct = reportItems.length
    ? Math.round((activeCount / reportItems.length) * 100)
    : 0;

  const totalAuths = reportItems.reduce(
    (acc, curr) => acc + (curr.authorizationCount ?? 0),
    0,
  );
  const avgAuths = reportItems.length
    ? (totalAuths / reportItems.length).toFixed(1)
    : '0';

  const compensationConfiguredCount = reportItems.filter(
    (i) => i.compensationConfigured,
  ).length;
  const compensationPct = reportItems.length
    ? Math.round(
        (compensationConfiguredCount / reportItems.length) * 100,
      )
    : 0;

  const trainerTypeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'FullTime', label: 'Full Time' },
    { value: 'PartTime', label: 'Part Time' },
    { value: 'Freelance', label: 'Freelance' },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' },
  ];

  const branchOptions = [
    { value: '', label: 'All Branches' },
    ...branches.map((b) => ({
      value: b.id,
      label: `${b.branchName} (${b.branchCode})`,
    })),
  ];

  const refreshIntervalOptions = [
    { value: '5', label: '5s' },
    { value: '10', label: '10s' },
    { value: '30', label: '30s' },
  ];

  // Helper for generating page numbers
  const totalPages = Math.ceil(totalItems / pageSize);
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Info Banner & Refresh Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {autoRefresh && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--ims-success)] opacity-75"></span>
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${autoRefresh ? 'bg-[color:var(--ims-success)]' : 'bg-slate-400'}`}
              ></span>
            </span>
            <span className="font-medium text-[color:var(--ims-ink)]">
              {autoRefresh
                ? `Auto-refreshes in ${timeLeft}s`
                : 'Auto-refresh paused'}
            </span>
          </div>
          <span className="text-[color:var(--ims-muted)]">|</span>
          <span className="text-[color:var(--ims-muted)]">
            Last updated: {lastUpdated}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[color:var(--ims-brass)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-700"></div>
              <span className="ms-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em]">
                Live Poll
              </span>
            </label>
          </div>

          {autoRefresh && (
            <div className="w-24">
              <Select
                value={String(refreshInterval)}
                onValueChange={(val) => {
                  const num = parseInt(val, 10);
                  setRefreshInterval(num);
                  setTimeLeft(num);
                }}
                options={refreshIntervalOptions}
                placeholder="Interval"
                className="h-8 py-0 text-xs"
              />
            </div>
          )}

          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2 border-[color:var(--ims-border)] hover:bg-[color:var(--ims-accent-soft)]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          {hasExportPermission && (
            <Button
              onClick={handleExport}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 border-[color:var(--ims-border)] hover:bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Scope Trainers"
          value={totalItems}
          description="Matching active filters"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
          loading={loading}
        />
        <StatCard
          title="Active Rate (Page)"
          value={`${activePct}%`}
          description={`${activeCount} Active on current page`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="Avg Course Auths"
          value={avgAuths}
          description="Authorizations per trainer"
          icon={<Award className="h-5 w-5" />}
          tone="sky"
          loading={loading}
        />
        {hasCompensationRead ? (
          <StatCard
            title="Compensation Configured"
            value={`${compensationPct}%`}
            description="With configured rates"
            icon={<DollarSign className="h-5 w-5" />}
            tone="violet"
            loading={loading}
          />
        ) : (
          <StatCard
            title="Compensation Data"
            value="Hidden"
            description="Lacks trainer.compensation.read"
            icon={<DollarSign className="h-5 w-5" />}
            tone="violet"
            loading={loading}
          />
        )}
      </div>

      {/* Interactive Tabs List */}
      <div className="border-b border-[color:var(--ims-border)] pb-1 flex flex-wrap gap-2">
        {[
          { id: 'trainer.roster', label: 'Trainer Roster' },
          { id: 'trainer.authorizations', label: 'Authorization Coverage' },
          { id: 'trainer.availability', label: 'Availability Coverage' },
          ...(hasCompensationRead
            ? [{ id: 'trainer.compensation', label: 'Compensation Coverage' }]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              handleFilterChange(tab.id, branchId, trainerType, status)
            }
            className={`px-4 py-2 text-sm font-semibold tracking-wide border-b-2 transition-all ${
              reportCode === tab.id
                ? 'border-b-[color:var(--ims-brass)] text-[color:var(--ims-ink)] bg-[color:var(--ims-accent-soft)]/50 rounded-t-xl'
                : 'border-transparent text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl border border-[color:var(--ims-border)] bg-white/50 p-4 shadow-sm backdrop-blur-md">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--ims-muted)]">
            Branch Context
          </label>
          <Select
            value={branchId}
            onValueChange={(val) =>
              handleFilterChange(reportCode, val, trainerType, status)
            }
            options={branchOptions}
            placeholder="All branches"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--ims-muted)]">
            Trainer Type
          </label>
          <Select
            value={trainerType}
            onValueChange={(val) =>
              handleFilterChange(reportCode, branchId, val, status)
            }
            options={trainerTypeOptions}
            placeholder="All Types"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--ims-muted)]">
            Status
          </label>
          <Select
            value={status}
            onValueChange={(val) =>
              handleFilterChange(reportCode, branchId, trainerType, val)
            }
            options={statusOptions}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Report Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Report Output</CardTitle>
            <CardDescription>
              {totalItems} row(s) found. Updated in real-time.
            </CardDescription>
          </div>
          {loading && (
            <Badge variant="info" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Loading
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="p-6 text-center text-sm text-[color:var(--ims-error)] bg-[color:var(--ims-error-bg)] border border-[color:var(--ims-error-border)] rounded-b-2xl">
              {error}
            </div>
          )}

          {!error && (
            <ResponsiveDataTable
              data={reportItems}
              keyExtractor={(item) => item.trainerId}
              breakpoint="lg"
              emptyState={
                <div className="p-12 text-center text-sm text-[color:var(--ims-muted)]">
                  No trainer records were found matching the filters.
                </div>
              }
              renderCard={(item) => (
                <div className="p-5 border-b border-[color:var(--ims-border)] hover:bg-[color:var(--ims-accent-soft)]/20 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold tracking-wider text-[color:var(--ims-brass)]">
                      {item.trainerCode}
                    </span>
                    <Badge
                      variant={
                        item.status === 'Active'
                          ? 'success'
                          : item.status === 'Suspended'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">
                      {item.displayNameEn}
                    </h4>
                    <p className="text-xs text-[color:var(--ims-muted)] mt-0.5">
                      {item.branchName ?? item.branchCode} · {item.trainerType}
                    </p>
                  </div>

                  {/* Render detail info based on current reportCode */}
                  {reportCode === 'trainer.authorizations' && (
                    <div className="mt-2 text-xs flex items-center justify-between bg-sky-50 text-sky-800 rounded-lg p-2 font-medium">
                      <span>Authorized Courses</span>
                      <span className="font-bold text-sm bg-white/80 px-1.5 py-0.5 rounded-md">
                        {item.authorizationCount ?? 0}
                      </span>
                    </div>
                  )}

                  {reportCode === 'trainer.availability' && (
                    <div className="mt-2 text-xs flex items-center justify-between bg-emerald-50 text-emerald-800 rounded-lg p-2 font-medium">
                      <span>Availability Slots</span>
                      <span className="font-bold text-sm bg-white/80 px-1.5 py-0.5 rounded-md">
                        {item.availabilityCount ?? 0}
                      </span>
                    </div>
                  )}

                  {reportCode === 'trainer.compensation' && (
                    <div className="mt-2 text-xs flex items-center justify-between bg-violet-50 text-violet-800 rounded-lg p-2 font-medium">
                      <span>Compensation Configured</span>
                      <Badge
                        variant={
                          item.compensationConfigured ? 'success' : 'outline'
                        }
                      >
                        {item.compensationConfigured ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Link
                      href={`/faculty/trainers/${item.trainerId}`}
                      className="text-xs font-semibold text-[color:var(--ims-brass)] flex items-center gap-1 hover:underline"
                    >
                      View Profile <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
              columns={[
                {
                  header: 'Trainer Code',
                  render: (item) => (
                    <Link
                      href={`/faculty/trainers/${item.trainerId}`}
                      className="font-mono font-bold text-[color:var(--ims-brass)] hover:underline"
                    >
                      {item.trainerCode}
                    </Link>
                  ),
                },
                {
                  header: 'Name',
                  render: (item) => (
                    <Link
                      href={`/faculty/trainers/${item.trainerId}`}
                      className="font-semibold text-slate-800 hover:text-[color:var(--ims-brass)] transition-colors hover:underline"
                    >
                      {item.displayNameEn}
                    </Link>
                  ),
                },
                {
                  header: 'Branch',
                  render: (item) => item.branchName ?? item.branchCode ?? '-',
                },
                {
                  header: 'Type',
                  render: (item) => (
                    <span className="text-xs font-medium text-slate-600">
                      {item.trainerType}
                    </span>
                  ),
                },
                ...(reportCode === 'trainer.roster'
                  ? [
                      {
                        header: 'Effective Period',
                        render: (item: TrainerReportRow) => (
                          <span className="text-xs text-slate-500">
                            {new Date(
                              item.effectiveStartDate,
                            ).toLocaleDateString()}{' '}
                            -{' '}
                            {item.effectiveEndDate
                              ? new Date(
                                  item.effectiveEndDate,
                                ).toLocaleDateString()
                              : 'Open-ended'}
                          </span>
                        ),
                      },
                    ]
                  : []),
                ...(reportCode === 'trainer.authorizations'
                  ? [
                      {
                        header: 'Courses Authorized',
                        render: (item: TrainerReportRow) => (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-sky-400"></span>
                            <span className="font-bold text-slate-700">
                              {item.authorizationCount ?? 0}
                            </span>
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...(reportCode === 'trainer.availability'
                  ? [
                      {
                        header: 'Availability Windows',
                        render: (item: TrainerReportRow) => (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                            <span className="font-bold text-slate-700">
                              {item.availabilityCount ?? 0}
                            </span>
                          </div>
                        ),
                      },
                    ]
                  : []),
                ...(reportCode === 'trainer.compensation' && hasCompensationRead
                  ? [
                      {
                        header: 'Compensation Configured',
                        render: (item: TrainerReportRow) => (
                          <Badge
                            variant={
                              item.compensationConfigured
                                ? 'success'
                                : 'outline'
                            }
                          >
                            {item.compensationConfigured ? 'Yes' : 'No'}
                          </Badge>
                        ),
                      },
                    ]
                  : []),
                {
                  header: 'Status',
                  render: (item) => (
                    <Badge
                      variant={
                        item.status === 'Active'
                          ? 'success'
                          : item.status === 'Suspended'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {item.status}
                    </Badge>
                  ),
                },
              ]}
            />
          )}

          {/* Client State Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[color:var(--ims-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-xs text-[color:var(--ims-muted)]">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, totalItems)} of {totalItems} entries
              </span>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => {
                    const newPage = page - 1;
                    setPage(newPage);
                    fetchReportData(
                      reportCode,
                      branchId,
                      trainerType,
                      status,
                      newPage,
                    );
                  }}
                  className="rounded-xl border-[color:var(--ims-border)]"
                >
                  Previous
                </Button>
                {getPageNumbers().map((p, idx) => {
                  if (p === 'ellipsis') {
                    return (
                      <span
                        key={`ell-${idx}`}
                        className="px-2 text-xs text-[color:var(--ims-muted)]"
                      >
                        ...
                      </span>
                    );
                  }
                  const isActive = p === page;
                  return (
                    <Button
                      key={p}
                      variant={isActive ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        setPage(p);
                        fetchReportData(
                          reportCode,
                          branchId,
                          trainerType,
                          status,
                          p,
                        );
                      }}
                      className={`h-8 w-8 p-0 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[color:var(--ims-ink)] text-[color:var(--ims-surface)] shadow-md'
                          : 'border-[color:var(--ims-border)] hover:bg-[color:var(--ims-accent-soft)]'
                      }`}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    fetchReportData(
                      reportCode,
                      branchId,
                      trainerType,
                      status,
                      newPage,
                    );
                  }}
                  className="rounded-xl border-[color:var(--ims-border)]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
