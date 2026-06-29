import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, FileClock, KeyRound, LayoutDashboard, ShieldAlert, ShieldCheck, ShieldPlus, Users } from 'lucide-react';
import { Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';

export const metadata = { title: 'IAM | IMS Admin' };

const sections = [
  { href: '/iam/users', title: 'Users', description: 'Create, update, activate, suspend, and assign access.', icon: Users },
  { href: '/iam/roles', title: 'Roles', description: 'Maintain roles and permission assignments.', icon: ShieldPlus },
  { href: '/iam/permissions', title: 'Permissions', description: 'Review the approved IAM permission catalog.', icon: KeyRound },
  { href: '/iam/sessions', title: 'Sessions', description: 'Inspect active sessions and enforce sign-out.', icon: Clock3 },
  { href: '/iam/login-history', title: 'Login History', description: 'Browse sign-in attempts and lockouts.', icon: Clock3 },
  { href: '/iam/security-policy', title: 'Security Policy', description: 'Tune password, lockout, and session policy.', icon: ShieldCheck },
  { href: '/iam/audit', title: 'Audit', description: 'Review immutable security and branch audit events.', icon: ShieldAlert },
  { href: '/iam/reports', title: 'Reports', description: 'Open IAM report views and export jobs.', icon: LayoutDashboard },
  { href: '/iam/reports/export-jobs', title: 'Export Jobs', description: 'Track report export status and downloads.', icon: FileClock },
  { href: '/iam/dashboards', title: 'Dashboards', description: 'Track security and compliance KPIs.', icon: LayoutDashboard },
];

export default function IamHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="IAM Console"
        description="Branch-aware operational controls for users, roles, sessions, policy, audit, reports, and dashboards."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM' }]} />}
        actions={
          <Link href="/iam/users">
            <Button size="sm">Open Users <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-ink)]">
                    Open section <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
