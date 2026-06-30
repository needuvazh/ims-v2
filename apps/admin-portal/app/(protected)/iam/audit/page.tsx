import Link from 'next/link';
import { 
  Breadcrumbs, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  PageHeader, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Input,
  Select,
  Button,
  Pagination,
  EmptyState
} from '@ims/shared-ui';
import { ShieldAlert as AuditIcon, Home, ShieldCheck, FileSliders } from 'lucide-react';
import { getSession } from '../../../lib/auth-guard';
import { AuditDetailsButton } from './_components/audit-details-button';

export const metadata = { title: 'Audit | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  page?: string;
  pageSize?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  performerId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}>;

export default async function IamAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const session = await getSession();

  const page = Number.parseInt(resolved.page ?? '1', 10) || 1;
  const pageSize = Number.parseInt(resolved.pageSize ?? '20', 10) || 20;
  
  const action = resolved.action?.trim() ?? '';
  const entityType = resolved.entityType?.trim() ?? '';
  const entityId = resolved.entityId?.trim() ?? '';
  const performerId = resolved.performerId?.trim() ?? '';
  const moduleParam = resolved.module !== undefined ? resolved.module.trim() : 'iam';
  const startDateStr = resolved.startDate?.trim() ?? '';
  const endDateStr = resolved.endDate?.trim() ?? '';

  const { auditQueryService } = await import('../../../lib/runtime');

  // Convert string dates to Date objects if present
  let startDate: Date | undefined;
  if (startDateStr) {
    startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  }
  let endDate: Date | undefined;
  if (endDateStr) {
    // Set to end of the selected day (23:59:59)
    endDate = new Date(`${endDateStr}T23:59:59.999Z`);
  }

  const result = await auditQueryService.listAuditLogs(
    {
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      performerId: performerId || undefined,
      module: moduleParam || undefined,
      startDate,
      endDate,
    },
    page,
    pageSize,
    {
      actorId: session.userId as never,
      actorPermissions: session.permissions,
      activeBranchId: session.activeBranchId as never,
    }
  );

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit Trail"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Audit', icon: <FileSliders className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AuditIcon className="h-5 w-5" /> Filters</CardTitle>
          <CardDescription>Filter audit events across different actions, entities, modules, and dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2 md:grid-cols-4" action="/iam/audit" method="get">
            <Input name="action" label="Action" placeholder="e.g. iam.user.create" defaultValue={action} />
            <Input name="entityType" label="Entity Type" placeholder="e.g. User" defaultValue={entityType} />
            <Input name="entityId" label="Entity ID" placeholder="UUID" defaultValue={entityId} />
            <Input name="performerId" label="Performer ID" placeholder="UUID" defaultValue={performerId} />
            <Select
              name="module"
              label="Module"
              defaultValue={moduleParam}
              options={[
                { value: '', label: 'All Modules' },
                { value: 'iam', label: 'IAM' },
                { value: 'organization', label: 'Organization' },
                { value: 'finance', label: 'Finance' },
                { value: 'courses-batches', label: 'Courses & Batches' },
                { value: 'crm-leads', label: 'CRM / Leads' },
                { value: 'admissions-enrollment', label: 'Admissions & Enrollment' },
                { value: 'attendance', label: 'Attendance' },
              ]}
            />
            <Input name="startDate" label="Start Date" type="date" defaultValue={startDateStr} />
            <Input name="endDate" label="End Date" type="date" defaultValue={endDateStr} />
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  name="pageSize"
                  label="Limit"
                  defaultValue={String(pageSize)}
                  options={[
                    { value: '10', label: '10' },
                    { value: '20', label: '20' },
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                  ]}
                />
              </div>
              <input type="hidden" name="page" value="1" />
              <Button type="submit">Filter</Button>
              <Link
                href="/iam/audit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl font-semibold tracking-tight transition-all duration-200 border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] text-[color:var(--ims-ink)] shadow-sm hover:border-[color:var(--ims-brass)] hover:bg-[color:var(--ims-accent-soft)] h-10 px-4 text-sm"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit entries</CardTitle>
          <CardDescription>
            {result.total} audit event(s) found. Page {page} of {totalPages}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.total === 0 ? (
            <EmptyState
              icon={<AuditIcon className="h-6 w-6 text-[color:var(--ims-muted)]" />}
              title="No audit logs found"
              description="No audit logs match the current filter criteria."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-12 text-center">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">{new Date(item.performedAt).toLocaleString()}</TableCell>
                      <TableCell className="capitalize text-xs font-medium">{item.module}</TableCell>
                      <TableCell className="font-mono text-xs">{item.action}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[180px]" title={`${item.entityType}:${item.entityId}`}>
                        {item.entityType}:{item.entityId.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.performedBy ? (
                          <Link href={`/iam/users/${item.performedBy}`} className="font-semibold text-[color:var(--ims-brass)] hover:underline">
                            {item.performedBy.substring(0, 8)}...
                          </Link>
                        ) : (
                          'System'
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{item.branchId ? `Branch (${item.branchId.substring(0, 8)})` : 'All Branches'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.reason ?? ''}>{item.reason ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        <AuditDetailsButton item={item as any} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={result.total}
                limit={pageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
