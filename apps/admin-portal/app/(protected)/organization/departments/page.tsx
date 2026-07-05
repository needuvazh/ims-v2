import Link from 'next/link';
import { Layers, Edit2, Eye, Plus, Home, Building2 } from 'lucide-react';
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

  const columns = [
    { header: 'Code', render: (dept: (typeof paginatedDepartments)[number]) => <span className="font-mono text-xs text-[color:var(--ims-muted)]">{dept.departmentCode}</span>, headerClassName: 'w-[120px]' },
    { header: 'Name', render: (dept: (typeof paginatedDepartments)[number]) => <span className="font-medium text-[color:var(--ims-ink)]">{dept.departmentName}</span> },
    { header: 'Branch', render: (dept: (typeof paginatedDepartments)[number]) => { const branch = data.branches.find((b) => b.id === dept.branchId); return <span className="text-sm">{branch ? branch.branchName : '—'}</span>; } },
    { header: 'Head', render: (dept: (typeof paginatedDepartments)[number]) => { const head = data.users.find((u) => u.id === dept.departmentHeadId); return <span className="text-sm">{head ? head.fullName : '—'}</span>; } },
    { header: 'Dates', render: (dept: (typeof paginatedDepartments)[number]) => (<div className="text-xs"><div>Start: {formatDateForDisplay(dept.effectiveStartDate) || '—'}</div><div className="text-[color:var(--ims-muted)]">End: {formatDateForDisplay(dept.effectiveEndDate) || 'Indefinite'}</div></div>) },
    { header: 'Status', render: (dept: (typeof paginatedDepartments)[number]) => <Badge variant={dept.status === 'Active' ? 'success' : 'muted'}>{dept.status}</Badge>, headerClassName: 'w-[110px]' },
    { header: 'Actions', className: 'text-right', render: (dept: (typeof paginatedDepartments)[number]) => (<div className="flex items-center justify-end gap-2"><SimpleTooltip content="View Details" side="top"><Link href={`/organization/departments/${dept.id}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"><Eye className="h-4 w-4" /></Button></Link></SimpleTooltip><SimpleTooltip content="Edit Department" side="top"><Link href={`/organization/departments/${dept.id}/edit`}><Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"><Edit2 className="h-4 w-4" /></Button></Link></SimpleTooltip></div>), headerClassName: 'text-right w-[120px]' },
  ];

  const renderCard = (dept: (typeof paginatedDepartments)[number]) => {
    const branch = data.branches.find((b) => b.id === dept.branchId);
    const head = data.users.find((u) => u.id === dept.departmentHeadId);

    return (
      <Card className="transition-colors hover:border-[var(--ims-brass)]">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{dept.departmentCode}</p>
              <p className="text-sm font-bold text-[var(--ims-ink)]">{dept.departmentName}</p>
            </div>
            <Badge variant={dept.status === 'Active' ? 'success' : 'muted'}>{dept.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-card-p text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="font-semibold text-[var(--ims-muted)]">Branch</p><p className="truncate">{branch ? branch.branchName : '—'}</p></div>
            <div><p className="font-semibold text-[var(--ims-muted)]">Head</p><p className="truncate">{head ? head.fullName : '—'}</p></div>
            <div><p className="font-semibold text-[var(--ims-muted)]">Start</p><p className="truncate">{formatDateForDisplay(dept.effectiveStartDate) || '—'}</p></div>
            <div><p className="font-semibold text-[var(--ims-muted)]">End</p><p className="truncate">{formatDateForDisplay(dept.effectiveEndDate) || 'Indefinite'}</p></div>
          </div>
        </CardContent>
        <CardFooter className="p-card-p pt-0">
          <div className="flex w-full gap-2">
            <Link href={`/organization/departments/${dept.id}`} className="flex-1"><Button variant="outline" size="sm" className="w-full text-[11px]"><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Button></Link>
            <Link href={`/organization/departments/${dept.id}/edit`} className="flex-1"><Button variant="outline" size="sm" className="w-full text-[11px]"><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button></Link>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Organization"
        title="Departments"
        description="Manage departments within branches."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Departments', icon: <Layers className="h-3.5 w-3.5 text-slate-500" /> },
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
            <ResponsiveDataTable
              data={paginatedDepartments}
              columns={columns}
              renderCard={renderCard}
              keyExtractor={(dept) => dept.id}
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
