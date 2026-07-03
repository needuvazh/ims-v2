import Link from 'next/link';
import { ArrowRight, CalendarDays, Edit2, Eye, Home, Layers3, Plus } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataTableFilter, EmptyState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims/shared-ui';
import { loadSchedulingCalendars } from '../data';

export const metadata = { title: 'Scheduling Calendars | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CalendarsPage(props: { searchParams: Promise<{ q?: string; status?: 'Draft' | 'Active' | 'Closed' | 'Archived'; year?: string }> }) {
  const searchParams = await props.searchParams;
  const calendars = await loadSchedulingCalendars({
    q: searchParams.q,
    status: searchParams.status,
    year: searchParams.year ? Number(searchParams.year) : undefined,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Calendar ledger"
        description="Institute calendars are authoritative. Branch overrides remain sparse and visible in the detail view."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Scheduling', href: '/scheduling', icon: <CalendarDays className="h-3.5 w-3.5" /> }, { label: 'Calendars', icon: <Layers3 className="h-3.5 w-3.5" /> }]} />}
        actions={<Link href="/scheduling/calendars/new"><Button><Plus className="h-4 w-4" /> New calendar</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total</CardTitle><CardDescription>All institute calendars.</CardDescription></CardHeader><CardContent><div className="text-3xl font-semibold">{calendars.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Active</CardTitle><CardDescription>Currently schedulable calendars.</CardDescription></CardHeader><CardContent><div className="text-3xl font-semibold">{calendars.filter((calendar) => calendar.status === 'Active').length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Draft</CardTitle><CardDescription>Calendars still being prepared.</CardDescription></CardHeader><CardContent><div className="text-3xl font-semibold">{calendars.filter((calendar) => calendar.status === 'Draft').length}</div></CardContent></Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Calendar records</CardTitle>
          <CardDescription>Use the ledger to open a detail view or edit the institute baseline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <DataTableFilter
              searchPlaceholder="Search by code or name..."
              filters={[{ key: 'status', label: 'Status', options: [
                { value: 'Draft', label: 'Draft' },
                { value: 'Active', label: 'Active' },
                { value: 'Closed', label: 'Closed' },
                { value: 'Archived', label: 'Archived' },
              ] }]}
            />
          </div>

          {calendars.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No calendars yet" description="Create the institute baseline calendar before adding branch overrides." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendars.map((calendar) => (
                  <TableRow key={calendar.id}>
                    <TableCell className="font-mono text-xs">{calendar.code}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[color:var(--ims-ink)]">{calendar.name}</div>
                      <div className="text-xs text-[color:var(--ims-muted)]">Institute {calendar.instituteId}</div>
                    </TableCell>
                    <TableCell>{calendar.year}</TableCell>
                    <TableCell><Badge variant={calendar.status === 'Active' ? 'success' : 'muted'}>{calendar.status}</Badge></TableCell>
                    <TableCell className="text-sm text-[color:var(--ims-muted)]">{calendar.effectiveStartDate.toISOString().split('T')[0]} to {calendar.effectiveEndDate ? calendar.effectiveEndDate.toISOString().split('T')[0] : 'Indefinite'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/scheduling/calendars/${calendar.id}`}><Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button></Link>
                        <Link href={`/scheduling/calendars/${calendar.id}/edit`}><Button size="icon" variant="ghost"><Edit2 className="h-4 w-4" /></Button></Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
