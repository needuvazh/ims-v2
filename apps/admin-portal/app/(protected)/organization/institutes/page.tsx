import Link from 'next/link';
import { Building2, Edit2, Eye, Plus, Home, Building } from 'lucide-react';
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

export const metadata = { title: 'Institutes - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function InstitutesPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  
  let filteredInstitutes = data.institutes;
  
  if (q) {
    filteredInstitutes = filteredInstitutes.filter(i => 
      i.instituteName.toLowerCase().includes(q) || 
      i.instituteCode.toLowerCase().includes(q)
    );
  }
  
  if (statusFilter) {
    filteredInstitutes = filteredInstitutes.filter(i => i.status === statusFilter);
  }
  
  const totalCount = filteredInstitutes.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedInstitutes = filteredInstitutes.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title="Institutes"
        description="Manage top-level organizational entities."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Institutes', icon: <Building className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
        actions={
          <Link href="/organization/institutes/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Institute
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search institutes by name or code..."
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
            title="No institutes found"
            description="No institutes match the current search or filter criteria."
          />
        ) : (
          <>
            <Table data-testid="institutes-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Registration / Tax No</TableHead>
                  <TableHead>Email / Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInstitutes.map((inst) => (
                  <TableRow key={inst.id} data-testid={`institute-row-${inst.id}`}>
                    <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{inst.instituteCode}</TableCell>
                    <TableCell className="font-semibold text-[color:var(--ims-ink)]">{inst.instituteName}</TableCell>
                    <TableCell className="text-xs">
                      <div>Reg: {inst.registrationNumber ?? '—'}</div>
                      <div className="text-[color:var(--ims-muted)]">Tax: {inst.taxNumber ?? '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{inst.primaryEmail ?? '—'}</div>
                      <div className="text-[color:var(--ims-muted)]">{inst.primaryPhone ?? '—'}</div>
                    </TableCell>
                    <TableCell className="text-sm">{inst.country ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={inst.status === 'Active' ? 'success' : 'muted'}>{inst.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <SimpleTooltip content="View Details" side="top">
                          <Link href={`/organization/institutes/${inst.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>

                        <SimpleTooltip content="Edit Institute" side="top">
                          <Link href={`/organization/institutes/${inst.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
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
