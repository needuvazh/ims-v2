import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims/shared-ui';
import { ShieldAlert as AuditIcon, Home, ShieldCheck, FileSliders } from 'lucide-react';
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
