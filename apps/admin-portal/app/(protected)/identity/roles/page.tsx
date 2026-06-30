import Link from 'next/link';
import { Eye, ShieldPlus, Shield as ShieldIcon, Home, ShieldCheck } from 'lucide-react';
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
import { loadIdentityData } from '../shared-data';

export const metadata = { title: 'IAM Roles | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IdentityRolesPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadIdentityData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  
  let filteredRoles = data.roles;
  
  if (q) {
    filteredRoles = filteredRoles.filter((r: any) => 
      r.roleName.toLowerCase().includes(q) || 
      r.roleCode.toLowerCase().includes(q)
    );
  }
  
  if (statusFilter) {
    filteredRoles = filteredRoles.filter((r: any) => r.status === statusFilter);
  }
  
  const totalCount = filteredRoles.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedRoles = filteredRoles.slice(offset, offset + limit);

  function formatDate(value?: Date | null) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="IAM Roles"
        actions={
          <Link href="/iam/roles/create">
            <Button size="sm">
              <ShieldPlus className="h-4 w-4 mr-2" /> Add Role
            </Button>
          </Link>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Roles', icon: <ShieldIcon className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search roles by name or code..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'Active', label: 'Active' },
                { value: 'Archived', label: 'Archived' },
              ]
            }
          ]}
        />

        {totalCount === 0 ? (
          <EmptyState
            icon={<ShieldIcon className="h-6 w-6" />}
            title="No roles found"
            description="No roles match the current search or filter criteria."
          />
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table data-testid="roles-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRoles.map((role: any) => (
                    <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                      <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{role.roleCode}</TableCell>
                      <TableCell>
                        <div className="font-medium text-[color:var(--ims-ink)]">{role.roleName}</div>
                        <div className="text-xs text-[color:var(--ims-muted)] line-clamp-1">{role.description ?? '—'}</div>
                      </TableCell>
                      <TableCell className="text-sm text-[color:var(--ims-muted)]">
                        <div>{formatDate(role.effectiveStartDate)}</div>
                        <div>{role.effectiveEndDate ? `to ${formatDate(role.effectiveEndDate)}` : 'Open ended'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{role.permissions.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.status === 'Active' ? 'success' : 'muted'}>{role.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SimpleTooltip content="View Details" side="top">
                            <Link href={`/iam/roles/${role.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </SimpleTooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {paginatedRoles.map((role: any) => (
                <div
                  key={role.id}
                  className="rounded-2xl border border-[color:var(--ims-border)] bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-[1.01]"
                  data-testid={`role-card-${role.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-[color:var(--ims-muted)] block">
                        {role.roleCode}
                      </span>
                      <h3 className="font-semibold text-lg text-[color:var(--ims-ink)] leading-tight">
                        {role.roleName}
                      </h3>
                    </div>
                    <Badge variant={role.status === 'Active' ? 'success' : 'muted'}>
                      {role.status}
                    </Badge>
                  </div>

                  {role.description && (
                    <p className="mt-2.5 text-sm text-[color:var(--ims-muted)] line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[color:var(--ims-border)]/50 pt-4 text-xs">
                    <div>
                      <span className="text-[color:var(--ims-muted)] block mb-1">Validity</span>
                      <div className="text-[color:var(--ims-ink)] font-medium">
                        {formatDate(role.effectiveStartDate)}
                      </div>
                      <div className="text-[color:var(--ims-muted)] mt-0.5">
                        {role.effectiveEndDate ? `to ${formatDate(role.effectiveEndDate)}` : 'Open ended'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[color:var(--ims-muted)] block mb-1">Permissions</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ShieldIcon className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-semibold text-sm text-[color:var(--ims-ink)]">
                          {role.permissions.length}
                        </span>
                        <span className="text-[color:var(--ims-muted)]">assigned</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-[color:var(--ims-border)]/50 pt-3">
                    <SimpleTooltip content="View Details" side="top">
                      <Link href={`/iam/roles/${role.id}`}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                          <Eye className="h-4.5 w-4.5" />
                        </Button>
                      </Link>
                    </SimpleTooltip>
                  </div>
                </div>
              ))}
            </div>

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
