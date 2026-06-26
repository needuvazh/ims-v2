import Link from 'next/link';
import { Building2, Edit2, Eye, Plus } from 'lucide-react';
import { 
  Breadcrumbs, 
  PageHeader, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge,
  Button,
  EmptyState,
  Pagination,
  SimpleTooltip,
  DataTableFilter
} from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';

export const metadata = { title: 'Branches - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function BranchesPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  
  let filteredBranches = data.branches;
  
  if (q) {
    filteredBranches = filteredBranches.filter(b => 
      b.branchName.toLowerCase().includes(q) || 
      b.branchCode.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  }
  
  if (statusFilter) {
    filteredBranches = filteredBranches.filter(b => b.status === statusFilter);
  }
  
  const totalCount = filteredBranches.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedBranches = filteredBranches.slice(offset, offset + limit);

  const formatDateForDisplay = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title="Branches"
        description="Manage branches across different institutes."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Branches' },
            ]}
          />
        }
        actions={
          data.institutes.length > 0 ? (
            <Link href="/organization/branches/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Branch
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search branches by name, code, or city..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Archived', label: 'Archived' },
              ]
            }
          ]}
        />

        {totalCount === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No branches found"
            description={data.institutes.length === 0 ? "You must create an institute before adding branches." : "No branches match the current search or filter criteria."}
          />
        ) : (
          <>
            <Table data-testid="branches-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBranches.map((branch) => {
                  const manager = data.users.find((u) => u.id === branch.branchManagerId);
                  return (
                    <TableRow key={branch.id} data-testid={`branch-row-${branch.id}`}>
                      <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{branch.branchCode}</TableCell>
                      <TableCell>
                        <span className="font-medium text-[color:var(--ims-ink)]">{branch.branchName}</span>
                        {branch.city && <span className="block text-xs text-[color:var(--ims-muted)]">{branch.city}, {branch.country}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{manager ? manager.fullName : '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div>Start: {formatDateForDisplay(branch.effectiveStartDate) || '—'}</div>
                        <div className="text-[color:var(--ims-muted)]">End: {formatDateForDisplay(branch.effectiveEndDate) || 'Indefinite'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={branch.status === 'Active' ? 'success' : 'muted'}>{branch.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SimpleTooltip content="View Details" side="top">
                            <Link href={`/organization/branches/${branch.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </SimpleTooltip>

                          <SimpleTooltip content="Edit Branch" side="top">
                            <Link href={`/organization/branches/${branch.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </Link>
                          </SimpleTooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={limit}
            />
          </>
        )}
      </div>
    </div>
  );
}
