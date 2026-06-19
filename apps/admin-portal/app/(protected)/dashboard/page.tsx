import { Card, PageHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@ims/shared-ui';
import { organizationService } from '../../lib/runtime';

export const metadata = {
  title: 'Dashboard | IMS Admin',
};

export default async function DashboardPage() {
  const summary = await organizationService.listDashboardSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected workflow"
        title="Dashboard"
        description="The dashboard is a server component that reads from application services instead of talking directly to persistence."
        actions={<div className="rounded-full border border-[color:var(--ims-border)] px-4 py-2 text-sm">Branch: Central Campus</div>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <div className="text-sm text-[color:var(--ims-muted)]">Institutes</div>
          <div className="mt-2 text-3xl font-semibold">{summary.institutes.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-[color:var(--ims-muted)]">Branches</div>
          <div className="mt-2 text-3xl font-semibold">{summary.branches.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-[color:var(--ims-muted)]">Current actor</div>
          <div className="mt-2 text-3xl font-semibold">Admin</div>
        </Card>
      </div>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Architecture checks</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Concern</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Route groups</TableCell>
              <TableCell>Implemented</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Server actions</TableCell>
              <TableCell>Implemented</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Branch scoping</TableCell>
              <TableCell>Wired into shell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
