import Link from 'next/link';
import { Layers, Edit2, Eye, Plus } from 'lucide-react';
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

export const metadata = { title: 'Departments - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function DepartmentsPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string; branchId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  const branchFilter = searchParams.branchId || '';
  
  let filteredDepartments = data.departments;
  
  if (q) {
    filteredDepartments = filteredDepartments.filter(d => 
      d.departmentName.toLowerCase().includes(q) || 
      d.departmentCode.toLowerCase().includes(q)
    );
  }
  
  if (statusFilter) {
    filteredDepartments = filteredDepartments.filter(d => d.status === statusFilter);
  }

  if (branchFilter) {
    filteredDepartments = filteredDepartments.filter(d => d.branchId === branchFilter);
  }
  
  const totalCount = filteredDepartments.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedDepartments = filteredDepartments.slice(offset, offset + limit);

  const formatDateForDisplay = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const branchOptions = data.branches.map(b => ({ value: b.id, label: b.branchName }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title="Departments"
        description="Manage departments within branches."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Departments' },
            ]}
          />
        }
        actions={
          data.branches.length > 0 ? (
            <Link href="/organization/departments/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Department
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search departments by name or code..."
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
            },
            ...(branchOptions.length > 0 ? [{
              key: 'branchId',
              label: 'Branch',
              options: branchOptions
            }] : [])
          ]}
        />

        {totalCount === 0 ? (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="No departments found"
            description={data.branches.length === 0 ? "You must create a branch before adding departments." : "No departments match the current search or filter criteria."}
          />
        ) : (
          <>
            <Table data-testid="departments-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDepartments.map((dept) => {
                  const branch = data.branches.find((b) => b.id === dept.branchId);
                  const head = data.users.find((u) => u.id === dept.departmentHeadId);
                  return (
                    <TableRow key={dept.id} data-testid={`dept-row-${dept.id}`}>
                      <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{dept.departmentCode}</TableCell>
                      <TableCell className="font-medium text-[color:var(--ims-ink)]">{dept.departmentName}</TableCell>
                      <TableCell className="text-sm">{branch ? branch.branchName : '—'}</TableCell>
                      <TableCell className="text-sm">{head ? head.fullName : '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div>Start: {formatDateForDisplay(dept.effectiveStartDate) || '—'}</div>
                        <div className="text-[color:var(--ims-muted)]">End: {formatDateForDisplay(dept.effectiveEndDate) || 'Indefinite'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.status === 'Active' ? 'success' : 'muted'}>{dept.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SimpleTooltip content="View Details" side="top">
                            <Link href={`/organization/departments/${dept.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </SimpleTooltip>

                          <SimpleTooltip content="Edit Department" side="top">
                            <Link href={`/organization/departments/${dept.id}/edit`}>
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
