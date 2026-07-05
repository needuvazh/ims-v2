import Link from 'next/link';
import { BarChart3, BadgeCheck, CalendarClock, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, LinkButton, PageHeader, StatCard, Badge } from '@ims/shared-ui';
import { getFacultyTrainerContext } from '../_lib';

export const metadata = { title: 'Faculty Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function FacultyDashboardPage() {
  const { authContext } = await getFacultyTrainerContext();
  const { trainerManagementService } = await import('../../../lib/runtime');

  const [trainerPage, reportPage] = await Promise.all([
    trainerManagementService.listTrainers({}, { page: 1, pageSize: 4 }, authContext),
    trainerManagementService.listReports('trainer.roster', {}, { page: 1, pageSize: 4 }, authContext),
  ]);
  const trainers = trainerPage.items as Array<{
    id: string;
    trainerCode: string;
    specialization: string;
    status: string;
    person?: { firstName: string; lastName: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 09"
        title="Faculty & Trainer Management"
        description="Manage trainer profiles, compliance evidence, availability, authorizations, and branch-scoped reporting."
        actions={<LinkButton href="/faculty/trainers/new">Add trainer</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Trainer profiles" value={trainerPage.total} description="Active and inactive profiles" icon={<Users className="h-5 w-5" />} tone="indigo" />
        <StatCard title="Authorizations" value={reportPage.total} description="Roster coverage snapshot" icon={<BadgeCheck className="h-5 w-5" />} tone="emerald" />
        <StatCard title="Availability" value={trainers.reduce((count: number, trainer) => count + (trainer.status === 'Active' ? 1 : 0), 0)} description="Currently active trainers" icon={<CalendarClock className="h-5 w-5" />} tone="amber" />
        <StatCard title="Reports" value={1} description="Module report views" icon={<BarChart3 className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Trainers</CardTitle>
            <CardDescription>Branch-scoped roster with direct access to profile detail and maintenance screens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainers.length === 0 ? (
              <p className="text-sm text-[color:var(--ims-muted)]">No trainers found in the current scope.</p>
            ) : trainers.map((trainer) => (
              <Link key={trainer.id} href={`/faculty/trainers/${trainer.id}`} className="flex items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 transition hover:border-[color:var(--ims-brass)]">
                <div>
                  <p className="font-semibold text-[color:var(--ims-ink)]">{trainer.person?.firstName} {trainer.person?.lastName}</p>
                  <p className="text-xs text-[color:var(--ims-muted)]">{trainer.trainerCode} · {trainer.specialization}</p>
                </div>
                <Badge variant={trainer.status === 'Active' ? 'success' : 'muted'}>{trainer.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Shortcuts</CardTitle>
            <CardDescription>Quick entry points for the Module 09 workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <LinkButton href="/faculty/trainers" variant="secondary" className="w-full">Trainer registry</LinkButton>
            <LinkButton href="/faculty/eligible-trainers" variant="secondary" className="w-full">Eligible trainers</LinkButton>
            <LinkButton href="/faculty/reports" variant="secondary" className="w-full">Faculty reports</LinkButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
