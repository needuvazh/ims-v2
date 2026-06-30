import Link from 'next/link';
import { Eye, UserPlus, Users as UsersIcon, Home, ShieldCheck } from 'lucide-react';
import { 
  Breadcrumbs, 
  PageHeader, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Avatar,
  Badge,
  Button,
  EmptyState,
  Pagination,
  SimpleTooltip,
  DataTableFilter
} from '@ims/shared-ui';
import { loadIdentityData } from '../shared-data';

export const metadata = { title: 'IAM Users | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IdentityUsersPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string; type?: string; branchId?: string; roleId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadIdentityData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  const typeFilter = searchParams.type || '';
  const branchFilter = searchParams.branchId || '';
  const roleFilter = searchParams.roleId || '';

  const branchById = new Map<string, string>(data.branches.map((branch) => [String(branch.id), branch.branchName]));
  
  let filteredUsers = data.users;
  
  if (q) {
    filteredUsers = filteredUsers.filter((u: any) => 
      u.fullName.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  }
  
  if (statusFilter) {
    filteredUsers = filteredUsers.filter((u: any) => u.status === statusFilter);
  }
  
  if (typeFilter) {
    filteredUsers = filteredUsers.filter((u: any) => u.userType === typeFilter);
  }

  if (branchFilter) {
    filteredUsers = filteredUsers.filter((user: any) =>
      (user.dataScopes ?? []).some((scope: any) => scope.scopeType === 'Branch' && scope.branchId === branchFilter)
    );
  }

  if (roleFilter) {
    filteredUsers = filteredUsers.filter((user: any) =>
      (user.roleSummaries ?? []).some((role: any) => role.id === roleFilter)
    );
  }
  
  const totalCount = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const offset = (clampedPage - 1) * limit;
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        title="IAM Users"
        actions={
          <Link href="/iam/users/create">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </Link>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Users', icon: <UsersIcon className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search users by name or email..."
          filters={[
            {
              key: 'branchId',
              label: 'Branch',
              options: data.branches.map((branch) => ({ value: branch.id, label: branch.branchName })),
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'PendingActivation', label: 'Pending Activation' },
                { value: 'Active', label: 'Active' },
                { value: 'Locked', label: 'Locked' },
                { value: 'Suspended', label: 'Suspended' },
                { value: 'Archived', label: 'Archived' },
              ]
            },
            {
              key: 'type',
              label: 'Type',
              options: [
                { value: 'Owner', label: 'Owner' },
                { value: 'Admin', label: 'Admin' },
                { value: 'BranchManager', label: 'Branch Manager' },
                { value: 'Counselor', label: 'Counselor' },
                { value: 'Trainer', label: 'Trainer' },
                { value: 'Accountant', label: 'Accountant' },
                { value: 'AcademicCoordinator', label: 'Academic Coordinator' },
                { value: 'Management', label: 'Management' },
                { value: 'Student', label: 'Student' },
              ]
            },
            {
              key: 'roleId',
              label: 'Role',
              options: data.roles.map((role: { id: string; roleName: string }) => ({ value: role.id, label: role.roleName })),
            }
          ]}
        />
        
        {totalCount === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" />}
            title="No users found"
            description="No users match the current search or filter criteria."
          />
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table data-testid="users-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user: any) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-mono text-xs text-[color:var(--ims-muted)] max-w-[80px] truncate" title={user.id}>{user.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar fallback={user.fullName} size="sm" />
                          <div>
                            <p className="font-medium text-[color:var(--ims-ink)]">{user.fullName}</p>
                            <p className="text-xs text-[color:var(--ims-muted)]">{user.email}</p>
                            <p className="text-[10px] text-[color:var(--ims-muted)]">{user.phone ?? 'No phone'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(user.dataScopes ?? []).some((scope: { scopeType: string }) => scope.scopeType === 'All') ? (
                            <Badge variant="default">All Branches</Badge>
                          ) : (
                            (user.dataScopes ?? [])
                              .filter((scope: { scopeType: string; branchId?: string | null }) => scope.scopeType === 'Branch' && scope.branchId)
                              .map((scope: { branchId?: string | null }, index: number) => (
                                <Badge key={`${user.id}-${scope.branchId}-${index}`} variant="muted">
                                  {scope.branchId ? branchById.get(scope.branchId as string) ?? scope.branchId : 'Branch'}
                                </Badge>
                              ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(user.roleSummaries ?? []).map((role: { id: string; roleName: string }) => (
                            <Badge key={role.id} variant="default">
                              {role.roleName}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          user.status === 'Active' ? 'success'
                          : user.status === 'Locked' ? 'error'
                          : user.status === 'PendingActivation' ? 'warning'
                          : 'muted'
                          }>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[color:var(--ims-muted)]">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SimpleTooltip content="View Details" side="top">
                            <Link href={`/iam/users/${user.id}`}>
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
              {paginatedUsers.map((user: any) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-[color:var(--ims-border)] bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-[1.01]"
                  data-testid={`user-card-${user.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-[color:var(--ims-muted)] block max-w-[120px] truncate" title={user.id}>
                        {user.id}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <Avatar fallback={user.fullName} size="sm" />
                        <div>
                          <h3 className="font-semibold text-base text-[color:var(--ims-ink)] leading-tight">
                            {user.fullName}
                          </h3>
                          <p className="text-xs text-[color:var(--ims-muted)]">{user.email}</p>
                          <p className="text-[10px] text-[color:var(--ims-muted)]">{user.phone ?? 'No phone'}</p>
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      user.status === 'Active' ? 'success'
                      : user.status === 'Locked' ? 'error'
                      : user.status === 'PendingActivation' ? 'warning'
                      : 'muted'
                    }>
                      {user.status}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[color:var(--ims-border)]/50 pt-4 text-xs">
                    <div>
                      <span className="text-[color:var(--ims-muted)] block mb-1">Branch</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(user.dataScopes ?? []).some((scope: { scopeType: string }) => scope.scopeType === 'All') ? (
                          <Badge variant="default">All Branches</Badge>
                        ) : (
                          (user.dataScopes ?? [])
                            .filter((scope: { scopeType: string; branchId?: string | null }) => scope.scopeType === 'Branch' && scope.branchId)
                            .map((scope: { branchId?: string | null }, index: number) => (
                              <Badge key={`${user.id}-${scope.branchId}-${index}`} variant="muted">
                                {scope.branchId ? branchById.get(scope.branchId as string) ?? scope.branchId : 'Branch'}
                              </Badge>
                            ))
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[color:var(--ims-muted)] block mb-1">Roles</span>
                      <div className="flex flex-wrap gap-1">
                        {(user.roleSummaries ?? []).map((role: { id: string; roleName: string }) => (
                          <Badge key={role.id} variant="default">
                            {role.roleName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-[color:var(--ims-muted)] pt-1">
                      <span>Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-[color:var(--ims-border)]/50 pt-3">
                    <SimpleTooltip content="View Details" side="top">
                      <Link href={`/iam/users/${user.id}`}>
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
              page={clampedPage}
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
