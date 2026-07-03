import React from 'react';
import Link from 'next/link';
import { CalendarDays, Edit2, Eye, Home, Layers3, Plus, Search } from 'lucide-react';
import { 
  Badge, 
  Breadcrumbs, 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  DataTableFilter, 
  EmptyState, 
  PageHeader, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  SimpleTooltip
} from '@ims/shared-ui';
import { loadSchedulingCalendars } from '../data';

export const metadata = { title: 'Calendar Ledger | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CalendarsPage(props: { 
  searchParams: Promise<{ q?: string; status?: 'Draft' | 'Active' | 'Closed' | 'Archived'; year?: string }> 
}) {
  const searchParams = await props.searchParams;
  const calendars = await loadSchedulingCalendars({
    q: searchParams.q,
    status: searchParams.status,
    year: searchParams.year ? Number(searchParams.year) : undefined,
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Calendar ledger"
        description="The authoritative list of institute baseline calendars. Branch exceptions are layered on top of these records."
        breadcrumbs={
          <Breadcrumbs 
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Scheduling', href: '/scheduling', icon: <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Ledger', icon: <Layers3 className="h-3.5 w-3.5 text-slate-500" /> }
            ]} 
          />
        }
        actions={
          <Link href="/scheduling/calendars/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New baseline
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <DataTableFilter
          searchPlaceholder="Search calendars by code or name..."
          filters={[
            { 
              key: 'status', 
              label: 'Status', 
              options: [
                { value: 'Draft', label: 'Draft' },
                { value: 'Active', label: 'Active' },
                { value: 'Closed', label: 'Closed' },
                { value: 'Archived', label: 'Archived' },
              ] 
            }
          ]}
        />

        {calendars.length === 0 ? (
          <EmptyState 
            icon={<CalendarDays className="h-6 w-6" />} 
            title="No calendars found" 
            description="No institute baseline calendars match your current filter criteria." 
          />
        ) : (
          <div className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Baseline Name</TableHead>
                  <TableHead className="w-[100px]">Year</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendars.map((calendar) => (
                  <TableRow key={calendar.id} className="group">
                    <TableCell className="font-mono text-xs font-semibold text-[color:var(--ims-muted)] uppercase">
                      {calendar.code}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-[color:var(--ims-ink)]">{calendar.name}</div>
                      <div className="text-xs text-[color:var(--ims-muted)]">Inst: {calendar.instituteId.slice(0, 8)}...</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{calendar.year}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={calendar.status === 'Active' ? 'success' : 'muted'}>
                        {calendar.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="text-[color:var(--ims-ink)]">{formatDate(calendar.effectiveStartDate)}</span>
                        <span className="text-[color:var(--ims-muted)] text-xs">
                          to {calendar.effectiveEndDate ? formatDate(calendar.effectiveEndDate) : 'Indefinite'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <SimpleTooltip content="View detail" side="top">
                          <Link href={`/scheduling/calendars/${calendar.id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>
                        <SimpleTooltip content="Edit baseline" side="top">
                          <Link href={`/scheduling/calendars/${calendar.id}/edit`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
