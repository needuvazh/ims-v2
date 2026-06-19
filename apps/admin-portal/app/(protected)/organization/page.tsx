import Link from 'next/link';
import {
  Badge,
  Breadcrumbs,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';
import { Building2, Plus } from 'lucide-react';
import { organizationService } from '../lib/runtime';
import { CreateInstituteForm } from './create-institute-form';
import { CreateBranchForm } from './create-branch-form';

export const metadata = { title: 'Organization | IMS Admin' };

export default async function OrganizationPage() {
  const [{ items: institutes }, { items: branches }] = await Promise.all([
    organizationService.listInstitutes({ pageSize: 50 }),
    organizationService.listBranches({ pageSize: 50 }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Management"
        title="Organization"
        description="Manage institutes, branches, and departments."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Organization' }]} />}
        actions={<CreateInstituteForm />}
      />

      {/* Institutes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]" data-testid="institutes-heading">
            Institutes ({institutes.length})
          </h2>
        </div>

        {institutes.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No institutes yet"
            description="Create your first institute to get started."
            data-testid="institutes-empty"
          />
        ) : (
          <Table data-testid="institutes-table">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutes.map((inst) => (
                <TableRow key={inst.id} data-testid={`institute-row-${inst.id}`}>
                  <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{inst.instituteCode}</TableCell>
                  <TableCell>
                    <Link href={`/organization/${inst.id}`} className="font-medium text-[color:var(--ims-brass)] hover:underline">
                      {inst.instituteName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[color:var(--ims-muted)]">{inst.primaryEmail ?? '—'}</TableCell>
                  <TableCell className="text-[color:var(--ims-muted)]">{inst.country ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={inst.status === 'Active' ? 'success' : 'muted'}>{inst.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Branches */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--ims-muted)]" data-testid="branches-heading">
            Branches ({branches.length})
          </h2>
          {institutes.length > 0 && <CreateBranchForm institutes={institutes} />}
        </div>

        {branches.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No branches yet"
            description="Add a branch to an institute above."
            data-testid="branches-empty"
          />
        ) : (
          <Table data-testid="branches-table">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id} data-testid={`branch-row-${branch.id}`}>
                  <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{branch.branchCode}</TableCell>
                  <TableCell className="font-medium text-[color:var(--ims-ink)]">{branch.branchName}</TableCell>
                  <TableCell className="text-[color:var(--ims-muted)]">{branch.city ?? '—'}</TableCell>
                  <TableCell className="text-[color:var(--ims-muted)]">{branch.country ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={branch.status === 'Active' ? 'success' : 'muted'}>{branch.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
