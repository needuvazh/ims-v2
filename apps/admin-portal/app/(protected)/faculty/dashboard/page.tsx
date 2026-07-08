import Link from 'next/link';
import {
  BarChart3,
  BadgeCheck,
  CalendarClock,
  Users,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LinkButton,
  PageHeader,
  StatCard,
  Badge,
} from '@ims/shared-ui';
import { getFacultyTrainerContext } from '../_lib';

export const metadata = { title: 'Faculty Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function FacultyDashboardPage() {
  const { authContext } = await getFacultyTrainerContext();
  const { trainerManagementService } = await import('../../../lib/runtime');

  const [trainerPage, reportPage] = await Promise.all([
    trainerManagementService.listTrainers(
      {},
      { page: 1, pageSize: 4 },
      authContext,
    ),
    trainerManagementService.listReports(
      'trainer.roster',
      {},
      { page: 1, pageSize: 4 },
      authContext,
    ),
  ]);
  const trainers = trainerPage.items as Array<{
    id: string;
    trainerCode: string;
    specialization: string;
    status: string;
    person?: { firstName: string; lastName: string } | null;
  }>;

  const shortcuts = [
    {
      title: 'Trainer Registry',
      desc: 'Browse, search, and manage trainer profiles',
      href: '/faculty/trainers',
      icon: Users,
      iconColor:
        'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
    },
    {
      title: 'Add New Trainer',
      desc: 'Register a new trainer profile and specialization',
      href: '/faculty/trainers/new',
      icon: UserPlus,
      iconColor:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    },
    {
      title: 'Eligible Trainer Finder',
      desc: 'Check course authorizations and schedule availability',
      href: '/faculty/eligible-trainers',
      icon: BadgeCheck,
      iconColor:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    },
    {
      title: 'Faculty Reports',
      desc: 'View branch-scoped trainer utilization and rosters',
      href: '/faculty/reports',
      icon: BarChart3,
      iconColor:
        'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Trainer Management"
        actions={
          <LinkButton href="/faculty/trainers/new">Add trainer</LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Trainer profiles"
          value={trainerPage.total}
          description="Active and inactive profiles"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Authorizations"
          value={reportPage.total}
          description="Roster coverage snapshot"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Availability"
          value={trainers.reduce(
            (count: number, trainer) =>
              count + (trainer.status === 'Active' ? 1 : 0),
            0,
          )}
          description="Currently active trainers"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Reports"
          value={1}
          description="Module report views"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Trainers</CardTitle>
            <CardDescription>
              Branch-scoped roster with direct access to profile detail and
              maintenance screens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainers.length === 0 ? (
              <p className="text-sm text-[color:var(--ims-muted)]">
                No trainers found in the current scope.
              </p>
            ) : (
              trainers.map((trainer) => (
                <Link
                  key={trainer.id}
                  href={`/faculty/trainers/${trainer.id}`}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 transition hover:border-[color:var(--ims-brass)]"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--ims-ink)]">
                      {trainer.person?.firstName} {trainer.person?.lastName}
                    </p>
                    <p className="text-xs text-[color:var(--ims-muted)]">
                      {trainer.trainerCode} · {trainer.specialization}
                    </p>
                  </div>
                  <Badge
                    variant={trainer.status === 'Active' ? 'success' : 'muted'}
                  >
                    {trainer.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Operational Shortcuts</CardTitle>
            <CardDescription>
              Quick entry points for the Module 09 workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <Link
                  key={shortcut.title}
                  href={shortcut.href}
                  className="group/item flex items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 transition-all duration-300 hover:border-[color:var(--ims-brass)] hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 group-hover/item:scale-105 ${shortcut.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <p className="font-semibold text-[color:var(--ims-ink)] text-sm group-hover/item:text-[color:var(--ims-brass)] transition-colors">
                        {shortcut.title}
                      </p>
                      <p className="text-xs text-[color:var(--ims-muted)] line-clamp-1">
                        {shortcut.desc}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[color:var(--ims-muted)] transition-transform duration-300 group-hover/item:translate-x-1 group-hover/item:text-[color:var(--ims-brass)]" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
