import React from 'react';
import Link from 'next/link';
import { ArrowRight, Activity, ShieldCheck, Users, FileBarChart2, Home, LayoutDashboard } from 'lucide-react';
import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';

export const metadata = { title: 'Dashboards | IMS Admin' };

const dashboards = [
  { href: '/api/v1/dashboards/iam/security', label: 'Security Dashboard', desc: 'Login, lockout, and session KPIs.', icon: ShieldCheck },
  { href: '/api/v1/dashboards/iam/administration', label: 'Administration Dashboard', desc: 'Users, roles, permissions, and branches.', icon: Users },
  { href: '/api/v1/dashboards/iam/compliance', label: 'Compliance Dashboard', desc: 'Audit and failed-login trends.', icon: Activity },
  { href: '/iam/reports', label: 'Filtered Reports', desc: 'Jump from KPI views into detailed reports.', icon: FileBarChart2 },
];

export default function IamDashboardsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="IAM Dashboards"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Dashboards', icon: <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {dashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          return (
            <Link key={dashboard.href} href={dashboard.href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{dashboard.label}</CardTitle>
                  <CardDescription>{dashboard.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">Open view <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
