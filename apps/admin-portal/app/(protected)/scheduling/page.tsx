import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Layers3, LayoutDashboard, Plus, Home, Sparkles } from 'lucide-react';
import { Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';
import { loadSchedulingOverview } from './data';

export const metadata = { title: 'Scheduling | IMS Admin' };
export const dynamic = 'force-dynamic';

const sections = [
  { 
    href: '/scheduling/calendars', 
    title: 'Calendar ledger', 
    description: 'Maintain institute-level baseline operating hours and holiday rules.', 
    icon: Layers3 
  },
  { 
    href: '/scheduling/calendars/new', 
    title: 'New calendar', 
    description: 'Set up the baseline configuration for a new academic or business cycle.', 
    icon: Plus 
  },
];

export default async function SchedulingHomePage() {
  const { counts } = await loadSchedulingOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scheduling & Calendar"
        eyebrow="Management"
        description="The institute calendar defines the authoritative baseline. Exceptions are handled via sparse branch-year overrides."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Scheduling', icon: <CalendarDays className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
        actions={
          <Link href="/scheduling/calendars">
            <Button size="sm">Open ledger <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[color:var(--ims-border)]">
          <CardHeader>
            <CardTitle>Total baseline</CardTitle>
            <CardDescription>Canonical institute calendars.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[color:var(--ims-ink)] tracking-tight">{counts.total}</div>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--ims-border)]">
          <CardHeader>
            <CardTitle>Active</CardTitle>
            <CardDescription>Currently in-use for validation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[color:var(--ims-ink)] tracking-tight">{counts.active}</div>
          </CardContent>
        </Card>
        <Card className="border-[color:var(--ims-border)]">
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
            <CardDescription>Draft, closed, or archived.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[color:var(--ims-ink)] tracking-tight">{counts.draft + counts.closed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)] transition-colors group-hover:bg-[color:var(--ims-brass-soft)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-muted)] group-hover:text-[color:var(--ims-ink)]">
                    Manage section <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden border-[color:var(--ims-border)] bg-[color:var(--ims-surface-hover)] shadow-none border-dashed">
        <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="h-14 w-14 rounded-full bg-[color:var(--ims-surface)] border border-[color:var(--ims-border)] flex items-center justify-center text-[color:var(--ims-brass)] shrink-0">
             <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1">
             <h3 className="font-bold text-lg text-[color:var(--ims-ink)]">Resolution Design</h3>
             <p className="text-[color:var(--ims-muted)] max-w-2xl leading-relaxed">
               Scheduling checks always resolve rules in a deterministic hierarchy: Branch Override &gt; Institute Baseline &gt; System Defaults.
               This ensures local operational flexibility without duplicating entire calendars.
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
