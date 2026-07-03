import Link from 'next/link';
import { CalendarDays, Clock3, Edit2, Home, Layers3, Plus, Sparkles } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims/shared-ui';
import { BranchOverrideForm } from '../../_components/branch-override-form';
import { loadCalendarDetail } from '../../data';

export const metadata = { title: 'Calendar Details | IMS Admin' };
export const dynamic = 'force-dynamic';

function formatDayHours(day: { isOpen: boolean; workingHours: { startTime: string; endTime: string }[] }) {
  if (!day.isOpen) return 'Closed';
  return day.workingHours.length > 0 ? day.workingHours.map((window) => `${window.startTime} - ${window.endTime}`).join(', ') : 'Open';
}

export default async function CalendarDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ branchId?: string }> }) {
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const { calendar, branches, selectedBranchId, resolved } = await loadCalendarDetail(id, searchParams.branchId);
  const branchLabel = branches.find((branch) => branch.id === selectedBranchId)?.name ?? 'System fallback';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scheduling"
        title={calendar.name}
        description="Inspect the institute baseline, then layer a branch/year override without losing the inherited values."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Scheduling', href: '/scheduling', icon: <CalendarDays className="h-3.5 w-3.5" /> }, { label: 'Calendars', href: '/scheduling/calendars', icon: <Layers3 className="h-3.5 w-3.5" /> }, { label: calendar.code, icon: <Sparkles className="h-3.5 w-3.5" /> }]} />}
        actions={<Link href={`/scheduling/calendars/${calendar.id}/edit`}><Button><Edit2 className="h-4 w-4" /> Edit calendar</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Code</CardTitle></CardHeader><CardContent className="font-mono text-sm">{calendar.code}</CardContent></Card>
        <Card><CardHeader><CardTitle>Year</CardTitle></CardHeader><CardContent className="text-sm">{calendar.year}</CardContent></Card>
        <Card><CardHeader><CardTitle>Status</CardTitle></CardHeader><CardContent><Badge variant={calendar.status === 'Active' ? 'success' : 'muted'}>{calendar.status}</Badge></CardContent></Card>
        <Card><CardHeader><CardTitle>Branch view</CardTitle></CardHeader><CardContent className="text-sm">{branchLabel}</CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Resolved calendar</CardTitle>
            <CardDescription>The table below shows inherited versus overridden values for the selected branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolved ? (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={resolved.source === 'branch-override' ? 'success' : 'muted'}>{resolved.source === 'system-default' ? 'System fallback' : resolved.source === 'branch-override' ? 'Branch override applied' : 'Institute default'}</Badge>
                  <Badge variant="muted">Branch {branchLabel}</Badge>
                  <Badge variant="muted">TZ Asia/Muscat</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Provenance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolved.resolvedOperatingDays.map((day) => {
                      const overridden = resolved.branchOverride?.operatingDays.some((overrideDay) => overrideDay.dayOfWeek === day.dayOfWeek);
                      return (
                        <TableRow key={day.dayOfWeek}>
                          <TableCell className="font-medium">{day.dayOfWeek}</TableCell>
                          <TableCell className="text-sm text-[color:var(--ims-muted)]">{formatDayHours(day)}</TableCell>
                          <TableCell>{overridden ? <Badge variant="success">Overridden</Badge> : <Badge variant="muted">Inherited</Badge>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            ) : (
              <EmptyState icon={<Clock3 className="h-6 w-6" />} title="No branch selected" description="Choose a branch to resolve the inherited and overridden working days." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add branch/year override</CardTitle>
              <CardDescription>Override only the days that differ from the institute baseline.</CardDescription>
            </CardHeader>
            <CardContent>
              {branches.length > 0 ? <BranchOverrideForm calendar={calendar} branches={branches} defaultBranchId={selectedBranchId} /> : <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No branches found" description="Create a branch before adding an override." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[color:var(--ims-muted)]">
              <div>Institute ID: <span className="font-mono text-[color:var(--ims-ink)]">{calendar.instituteId}</span></div>
              <div>Effective range: <span className="text-[color:var(--ims-ink)]">{calendar.effectiveStartDate.toISOString().split('T')[0]} - {calendar.effectiveEndDate ? calendar.effectiveEndDate.toISOString().split('T')[0] : 'Indefinite'}</span></div>
              <div>Timezone: <span className="text-[color:var(--ims-ink)]">Asia/Muscat</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
