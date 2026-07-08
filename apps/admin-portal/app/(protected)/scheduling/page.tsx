import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Layers,
  Plus,
  Home,
  Sparkles,
  ShieldAlert,
  MapPin,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import {
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  AdminListPageLayout,
  StatCard,
  LinkButton,
  Badge,
} from '@ims/shared-ui';
import { loadSchedulingOverview } from './data';

export const metadata = { title: 'Scheduling Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function SchedulingHomePage() {
  const data = await loadSchedulingOverview();
  const { counts, calendars, conflicts, venueBlocks, permissions } = data;

  return (
    <AdminListPageLayout>
      <PageHeader
        title="Scheduling & Calendar"
        eyebrow="Scheduling"
        actions={
          permissions.hasCalRead && (
            <Link href="/scheduling/calendars/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Create Calendar
              </Button>
            </Link>
          )
        }
      />

      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Calendars"
          value={counts.total}
          description="Canonical institute baselines"
          icon={<Layers className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="Active Calendars"
          value={counts.active}
          description="Currently used for validations"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Active Venue Blocks"
          value={venueBlocks.totalCount}
          description="Blocked classrooms & campuses"
          icon={<MapPin className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Unresolved Conflicts"
          value={conflicts.totalCount}
          description="Sessions requiring intervention"
          icon={<ShieldAlert className="h-5 w-5" />}
          tone={conflicts.totalCount > 0 ? 'rose' : undefined}
          className={
            conflicts.totalCount > 0
              ? 'animate-pulse border-rose-200 bg-rose-50/20'
              : ''
          }
        />
      </div>

      {/* Two-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left/Main Column: Data Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent calendars section */}
          {permissions.hasCalRead && (
            <Card className="border-[color:var(--ims-border)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Baseline Calendars</CardTitle>
                  <CardDescription>
                    Authorize academic and operational years
                  </CardDescription>
                </div>
                <Link
                  href="/scheduling/calendars"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                >
                  View Ledger <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {calendars.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">
                    No calendars found.
                  </p>
                ) : (
                  calendars.slice(0, 5).map((cal) => (
                    <div
                      key={cal.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[color:var(--ims-ink)] truncate">
                            {cal.name}
                          </p>
                          <Badge
                            variant={
                              cal.status === 'Active'
                                ? 'success'
                                : cal.status === 'Draft'
                                  ? 'warning'
                                  : 'muted'
                            }
                          >
                            {cal.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-[color:var(--ims-muted)] mt-1">
                          Code: <span className="font-mono">{cal.code}</span> •
                          Year: {cal.year} • Effective:{' '}
                          {new Date(
                            cal.effectiveStartDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <LinkButton
                        href={`/scheduling/calendars/${cal.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        View Detail
                      </LinkButton>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Venue Blocks section */}
          {permissions.hasVenueRead && (
            <Card className="border-[color:var(--ims-border)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Active Venue Blocks</CardTitle>
                  <CardDescription>
                    Classrooms and branches currently unavailable for sessions
                  </CardDescription>
                </div>
                <Link
                  href="/scheduling/venues"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                >
                  Manage Venue Blocks <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {venueBlocks.items.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">
                    No active venue blocks.
                  </p>
                ) : (
                  venueBlocks.items.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-semibold text-[color:var(--ims-ink)] truncate">
                          {block.classroom
                            ? `${block.classroom.classroomName} (${block.branch.branchName})`
                            : `Whole Branch: ${block.branch.branchName}`}
                        </p>
                        <p className="text-xs text-[color:var(--ims-muted)] mt-1">
                          Reason:{' '}
                          <span className="font-medium text-slate-700">
                            {block.reasonCode}
                          </span>{' '}
                          • Dates:{' '}
                          {new Date(block.blockStartDate).toLocaleDateString()}{' '}
                          - {new Date(block.blockEndDate).toLocaleDateString()}
                        </p>
                      </div>
                      <LinkButton
                        href={`/scheduling/venues/${block.id}/edit`}
                        variant="ghost"
                        size="sm"
                      >
                        Edit Block
                      </LinkButton>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Quick Navigation & Conflicts list */}
        <div className="space-y-6">
          {/* Quick Access Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Quick Access
            </h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {permissions.hasCalRead && (
                <>
                  <Link href="/scheduling/calendars" className="group">
                    <div className="flex flex-col h-full rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-200">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors">
                        <CalendarClock className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="mt-3 text-xs font-black text-slate-800 group-hover:text-sky-700 transition-colors">
                        Calendar
                      </h4>
                      <p className="mt-1 text-[10px] text-slate-500 leading-relaxed font-semibold">
                        Maintain baseline rules & overrides.
                      </p>
                    </div>
                  </Link>

                  <Link href="/scheduling/calendars/new" className="group">
                    <div className="flex flex-col h-full rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                        <Plus className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="mt-3 text-xs font-black text-slate-800 group-hover:text-emerald-700 transition-colors">
                        New Calendar
                      </h4>
                      <p className="mt-1 text-[10px] text-slate-500 leading-relaxed font-semibold">
                        Create new academic baseline cycle.
                      </p>
                    </div>
                  </Link>
                </>
              )}

              {permissions.hasVenueRead && (
                <Link href="/scheduling/venues" className="group">
                  <div className="flex flex-col h-full rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-200">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                      <MapPin className="h-4.5 w-4.5" />
                    </div>
                    <h4 className="mt-3 text-xs font-black text-slate-800 group-hover:text-amber-700 transition-colors">
                      Venue Blocks
                    </h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-relaxed font-semibold">
                      Temporarily disable classrooms/branches.
                    </p>
                  </div>
                </Link>
              )}

              {permissions.hasConflictRead && (
                <Link href="/scheduling/conflicts" className="group">
                  <div className="flex flex-col h-full rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-200">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                      <ShieldAlert className="h-4.5 w-4.5" />
                    </div>
                    <h4 className="mt-3 text-xs font-black text-slate-800 group-hover:text-rose-700 transition-colors">
                      Conflicts
                    </h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-relaxed font-semibold">
                      Review and resolve schedule warnings.
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Scheduling Conflicts section */}
          {permissions.hasConflictRead && (
            <Card className="border-[color:var(--ims-border)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-rose-950 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" /> Recent
                    Conflicts
                  </CardTitle>
                  <CardDescription>
                    Unresolved scheduling anomalies
                  </CardDescription>
                </div>
                <Link
                  href="/scheduling/conflicts"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                >
                  View All ({conflicts.totalCount}){' '}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {conflicts.items.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">
                    No active scheduling conflicts.
                  </p>
                ) : (
                  conflicts.items.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {session.titleEnglish}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                            Batch: {session.batch.batchCode} (
                            {session.batch.course.nameEnglish})
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                              {session.conflictType}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(
                                session.sessionDate,
                              ).toLocaleDateString()}{' '}
                              @ {session.startTime}
                            </span>
                          </div>
                        </div>
                        <LinkButton
                          href="/scheduling/conflicts"
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-800"
                        >
                          Resolve
                        </LinkButton>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminListPageLayout>
  );
}
