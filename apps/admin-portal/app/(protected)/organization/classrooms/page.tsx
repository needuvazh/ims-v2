import Link from 'next/link';
import { Home, Edit2, Eye, Plus, Building2, GraduationCap } from 'lucide-react';
import { 
  Breadcrumbs, 
  AdminListPageLayout,
  PageHeader, 
  Badge,
  Button,
  EmptyState,
  Pagination,
  SimpleTooltip,
  DataTableFilter,
  ResponsiveDataTable,
  Card,
  CardContent,
  CardFooter,
  CardHeader
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

  const columns = [
    { header: 'Classroom', render: (room: (typeof paginatedClassrooms)[number]) => <span className="font-medium text-[color:var(--ims-ink)]">{room.classroomName}</span> },
    { header: 'Branch', render: (room: (typeof paginatedClassrooms)[number]) => { const branch = data.branches.find((b) => b.id === room.branchId); return <span className="text-sm">{branch ? branch.branchName : '—'}</span>; } },
    { header: 'Capacity', render: (room: (typeof paginatedClassrooms)[number]) => <span className="font-mono text-sm">{room.capacity} seats</span> },
    { header: 'Location', render: (room: (typeof paginatedClassrooms)[number]) => <span className="text-sm">{room.location ?? '—'}</span> },
    { header: 'Dates', render: (room: (typeof paginatedClassrooms)[number]) => (<div className="text-xs"><div>Start: {formatDateForDisplay(room.effectiveStartDate) || '—'}</div><div className="text-[color:var(--ims-muted)]">End: {formatDateForDisplay(room.effectiveEndDate) || 'Indefinite'}</div></div>) },
    { header: 'Status', render: (room: (typeof paginatedClassrooms)[number]) => <Badge variant={room.status === 'Active' ? 'success' : 'muted'}>{room.status}</Badge>, headerClassName: 'w-[110px]' },
    { header: 'Actions', className: 'text-right', render: (room: (typeof paginatedClassrooms)[number]) => (<div className="flex items-center justify-end gap-2"><SimpleTooltip content="View Details" side="top"><Link href={`/organization/classrooms/${room.id}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"><Eye className="h-4 w-4" /></Button></Link></SimpleTooltip><SimpleTooltip content="Edit Classroom" side="top"><Link href={`/organization/classrooms/${room.id}/edit`}><Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"><Edit2 className="h-4 w-4" /></Button></Link></SimpleTooltip></div>), headerClassName: 'text-right w-[120px]' },
  ];

  const renderCard = (room: (typeof paginatedClassrooms)[number]) => {
    const branch = data.branches.find((b) => b.id === room.branchId);
    return (
      <Card className="transition-colors hover:border-[var(--ims-brass)]">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{room.classroomName}</p>
              <p className="text-sm font-bold text-[var(--ims-ink)]">{branch ? branch.branchName : '—'}</p>
            </div>
            <Badge variant={room.status === 'Active' ? 'success' : 'muted'}>{room.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-card-p text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="font-semibold text-[var(--ims-muted)]">Capacity</p><p className="truncate">{room.capacity} seats</p></div>
            <div><p className="font-semibold text-[var(--ims-muted)]">Location</p><p className="truncate">{room.location ?? '—'}</p></div>
            <div><p className="font-semibold text-[var(--ims-muted)]">Start</p><p className="truncate">{formatDateForDisplay(room.effectiveStartDate) || '—'}</p></div>
            <div><p className="font-semibold text-[var(--ims-muted)]">End</p><p className="truncate">{formatDateForDisplay(room.effectiveEndDate) || 'Indefinite'}</p></div>
          </div>
        </CardContent>
        <CardFooter className="p-card-p pt-0">
          <div className="flex w-full gap-2">
            <Link href={`/organization/classrooms/${room.id}`} className="flex-1"><Button variant="outline" size="sm" className="w-full text-[11px]"><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Button></Link>
            <Link href={`/organization/classrooms/${room.id}/edit`} className="flex-1"><Button variant="outline" size="sm" className="w-full text-[11px]"><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button></Link>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
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
            <ResponsiveDataTable
              data={paginatedClassrooms}
              columns={columns}
              renderCard={renderCard}
              keyExtractor={(room) => room.id}
              emptyState={null}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={limit}
            />
          </>
        )}
      </div>
    </AdminListPageLayout>
  );
}
