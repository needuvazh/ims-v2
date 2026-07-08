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
        eyebrow="Dashboard"
        description="The institute calendar defines the authoritative baseline. Exceptions are handled via sparse branch-year overrides."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Scheduling',
                icon: <CalendarDays className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
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
          {/* Quick Actions */}
          <Card className="border-[color:var(--ims-border)] bg-[color:var(--ims-surface)]">
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>Direct navigation and tools</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {permissions.hasCalRead && (
                <>
                  <LinkButton
                    href="/scheduling/calendars"
                    variant="outline"
                    className="w-full justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-sky-600" />
                      Calendar Ledger
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-60" />
                  </LinkButton>
                  <LinkButton
                    href="/scheduling/calendars/new"
                    variant="outline"
                    className="w-full justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-emerald-600" />
                      Create New Calendar
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-60" />
                  </LinkButton>
                </>
              )}
              {permissions.hasVenueRead && (
                <LinkButton
                  href="/scheduling/venues"
                  variant="outline"
                  className="w-full justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    Venue Management
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </LinkButton>
              )}
              {permissions.hasConflictRead && (
                <LinkButton
                  href="/scheduling/conflicts"
                  variant="outline"
                  className="w-full justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    Conflict Dashboard
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </LinkButton>
              )}
            </CardContent>
          </Card>

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

      <Card className="overflow-hidden border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)] shadow-none border-dashed mt-6">
        <CardContent className="p-card-p flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="h-14 w-14 rounded-full bg-[color:var(--ims-surface)] border border-[color:var(--ims-border)] flex items-center justify-center text-[color:var(--ims-brass)] shrink-0">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-section-title text-[color:var(--ims-ink)]">
              Resolution Design
            </h3>
            <p className="text-[color:var(--ims-muted)] max-w-2xl leading-relaxed text-sm">
              Scheduling checks always resolve rules in a deterministic
              hierarchy: Branch Override &gt; Institute Baseline &gt; System
              Defaults. This ensures local operational flexibility without
              duplicating entire calendars.
            </p>
          </div>
        </CardContent>
      </Card>
    </AdminListPageLayout>
  );
}
