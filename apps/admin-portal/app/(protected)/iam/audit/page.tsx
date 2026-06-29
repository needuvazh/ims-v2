import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims/shared-ui';
import { ShieldAlert as AuditIcon } from 'lucide-react';
import { getSession } from '../../../lib/auth-guard';

export const metadata = { title: 'Audit | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamAuditPage() {
  const session = await getSession();
  const { auditQueryService } = await import('../../../lib/runtime');
  const result = await auditQueryService.listAuditLogs({ module: 'iam' }, 1, 20, { actorId: session.userId as never, actorPermissions: session.permissions, activeBranchId: session.activeBranchId as never });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance"
        title="Audit Trail"
        description="Inspect immutable IAM audit events within the current branch scope."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM', href: '/iam' }, { label: 'Audit' }]} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AuditIcon className="h-5 w-5" /> Recent audit entries</CardTitle>
          <CardDescription>{result.total} total IAM audit events in the current scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.performedAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{item.action}</TableCell>
                  <TableCell>{item.entityType}:{item.entityId}</TableCell>
                  <TableCell>{item.branchId ?? 'All Branches'}</TableCell>
                  <TableCell>{item.reason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
