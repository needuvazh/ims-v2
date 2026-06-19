import { cookies } from 'next/headers';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { Badge, PageHeader, StatCard } from '@ims/shared-ui';
import { BookOpen, Building2, GraduationCap, Users } from 'lucide-react';

export const metadata = { title: 'Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);
  const { organizationService } = await import('../../lib/runtime');

  const summary = await organizationService.listDashboardSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${session?.displayName ?? 'Admin'}`}
        description="Here's your institute summary for today."
        actions={
          <Badge variant="success" data-testid="dashboard-status-badge">
            System Online
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-stats">
        <StatCard
          title="Institutes"
          value={summary.totalInstitutes}
          description="Active training institutes"
          icon={<Building2 className="h-5 w-5" />}
          data-testid="stat-institutes"
        />
        <StatCard
          title="Branches"
          value={summary.totalBranches}
          description="Active branches"
          icon={<BookOpen className="h-5 w-5" />}
          data-testid="stat-branches"
        />
        <StatCard
          title="Students"
          value="—"
          description="Enrollment module pending"
          icon={<Users className="h-5 w-5" />}
          data-testid="stat-students"
        />
        <StatCard
          title="Certificates"
          value="—"
          description="Certificate module pending"
          icon={<GraduationCap className="h-5 w-5" />}
          data-testid="stat-certificates"
        />
      </div>

      {/* Institutes summary */}
      {summary.institutes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]">
            Registered Institutes
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="institute-list">
            {summary.institutes.map((inst) => (
              <div
                key={inst.id}
                className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4"
                data-testid={`institute-card-${inst.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[color:var(--ims-ink)]">{inst.instituteName}</p>
                    <p className="text-xs text-[color:var(--ims-muted)]">{inst.instituteCode}</p>
                  </div>
                  <Badge variant={inst.status === 'Active' ? 'success' : 'muted'}>
                    {inst.status}
                  </Badge>
                </div>
                {inst.primaryEmail && (
                  <p className="mt-2 text-xs text-[color:var(--ims-muted)]">{inst.primaryEmail}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
