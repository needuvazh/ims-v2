import Link from 'next/link';
import { ArrowRight, CalendarDays, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';
import { loadSchedulingOverview } from './data';

export const metadata = { title: 'Scheduling | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function SchedulingHomePage() {
  const { counts } = await loadSchedulingOverview();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Institute calendar ledger"
        description="Manage the institute baseline calendar, then layer branch-year exceptions on top. The resolved view keeps inheritance visible instead of hiding it."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Scheduling', icon: <CalendarDays className="h-3.5 w-3.5" /> }]} />}
        actions={<Link href="/scheduling/calendars"><Button><ArrowRight className="h-4 w-4" /> Open calendars</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total calendars</CardTitle><CardDescription>Canonical institute calendars in the system.</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-[color:var(--ims-ink)]">{counts.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active</CardTitle><CardDescription>Available for scheduling validation.</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-[color:var(--ims-ink)]">{counts.active}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Draft or closed</CardTitle><CardDescription>Calendars still being prepared or retired.</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-[color:var(--ims-ink)]">{counts.draft + counts.closed}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-[color:var(--ims-border)] bg-[linear-gradient(135deg,rgba(16,36,58,0.98),rgba(180,98,40,0.88))] p-6 text-white">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/70"><Sparkles className="h-4 w-4" /> Design principle</div>
            <h2 className="mt-3 font-[family-name:var(--font-display,serif)] text-2xl">One calendar, visible exceptions.</h2>
            <p className="mt-2 max-w-xl text-sm text-white/80">Keep institute rules authoritative, keep branch overrides sparse, and make the inherited values obvious in the detail view.</p>
          </div>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--ims-border)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-ink)]"><ShieldCheck className="h-4 w-4 text-[color:var(--ims-brass)]" /> Authorization</div>
              <p className="mt-2 text-sm text-[color:var(--ims-muted)]">Viewing requires `scheduling.calendar.read`; creating and updating calendar rules requires `schedule.manage`.</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--ims-border)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ims-ink)]"><CalendarDays className="h-4 w-4 text-[color:var(--ims-brass)]" /> Resolution</div>
              <p className="mt-2 text-sm text-[color:var(--ims-muted)]">Branch/year overrides win first, institute defaults second, system fallback last.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle><CardDescription>Start the calendar setup flow.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Link href="/scheduling/calendars/new" className="block"><Button className="w-full">Create institute calendar</Button></Link>
            <Link href="/scheduling/calendars" className="block"><Button variant="secondary" className="w-full">Review calendar ledger</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
