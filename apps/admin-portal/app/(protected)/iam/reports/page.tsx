import React from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, FileText, ShieldCheck, Users, Clock3, LayoutDashboard, Download, Home, FileSpreadsheet } from 'lucide-react';
import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';

export const metadata = { title: 'Reports | IMS Admin' };

const reports = [
  { href: '/api/v1/reports/iam/user-directory', label: 'User Directory', desc: 'Browse branch-scoped user data.', icon: Users },
  { href: '/api/v1/reports/iam/login-history', label: 'Login History', desc: 'Review successful and failed logins.', icon: Clock3 },
  { href: '/api/v1/reports/iam/security-events', label: 'Security Events', desc: 'Audit-oriented IAM activity.', icon: ShieldCheck },
  { href: '/api/v1/reports/iam/roles', label: 'Roles', desc: 'Report on role assignments.', icon: FileText },
  { href: '/api/v1/reports/iam/sessions', label: 'Sessions', desc: 'Inspect active session usage.', icon: BarChart3 },
  { href: '/api/v1/reports/iam/audit-trail', label: 'Audit Trail', desc: 'Immutable audit report view.', icon: LayoutDashboard },
  { href: '/iam/reports/export-jobs', label: 'Export Jobs', desc: 'Review job status and download links.', icon: Download },
];

export default function IamReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="IAM Reports"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Reports', icon: <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{report.label}</CardTitle>
                  <CardDescription>{report.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">Open report <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
