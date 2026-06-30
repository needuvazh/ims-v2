import Link from 'next/link';
import { Home, Edit2, Eye, Plus, Building2, GraduationCap } from 'lucide-react';
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

export const metadata = { title: 'Classrooms - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ClassroomsPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string; branchId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  const branchFilter = searchParams.branchId || '';
  
  let filteredClassrooms = data.classrooms;
  
  if (q) {
    filteredClassrooms = filteredClassrooms.filter(c => 
      c.classroomName.toLowerCase().includes(q) || 
      (c.location && c.location.toLowerCase().includes(q))
    );
  }
  
  if (statusFilter) {
    filteredClassrooms = filteredClassrooms.filter(c => c.status === statusFilter);
  }

  if (branchFilter) {
    filteredClassrooms = filteredClassrooms.filter(c => c.branchId === branchFilter);
  }
  
  const totalCount = filteredClassrooms.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedClassrooms = filteredClassrooms.slice(offset, offset + limit);

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
        title="Classrooms"
        description="Manage classrooms and physical spaces within branches."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Classrooms', icon: <GraduationCap className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
        actions={
          data.branches.length > 0 ? (
            <Link href="/organization/classrooms/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Classroom
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search classrooms by name or location..."
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
            icon={<Home className="h-6 w-6" />}
            title="No classrooms found"
            description={data.branches.length === 0 ? "You must create a branch before adding classrooms." : "No classrooms match the current search or filter criteria."}
          />
        ) : (
          <>
            <Table data-testid="classrooms-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Classroom Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClassrooms.map((room) => {
                  const branch = data.branches.find((b) => b.id === room.branchId);
                  return (
                    <TableRow key={room.id} data-testid={`room-row-${room.id}`}>
                      <TableCell className="font-medium text-[color:var(--ims-ink)]">{room.classroomName}</TableCell>
                      <TableCell className="text-sm">{branch ? branch.branchName : '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{room.capacity} seats</TableCell>
                      <TableCell className="text-sm">{room.location ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        <div>Start: {formatDateForDisplay(room.effectiveStartDate) || '—'}</div>
                        <div className="text-[color:var(--ims-muted)]">End: {formatDateForDisplay(room.effectiveEndDate) || 'Indefinite'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={room.status === 'Active' ? 'success' : 'muted'}>{room.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SimpleTooltip content="View Details" side="top">
                            <Link href={`/organization/classrooms/${room.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </SimpleTooltip>

                          <SimpleTooltip content="Edit Classroom" side="top">
                            <Link href={`/organization/classrooms/${room.id}/edit`}>
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
