import Link from 'next/link';
import { Eye, Pencil, Ban, CheckCircle, UserPlus, ShieldAlert, Users as UsersIcon } from 'lucide-react';
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
import { updateUserStatusAction } from '../actions';

export const metadata = { title: 'Users - Identity | IMS Admin' };
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
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access Control"
        title="Identity & Access"
        description="Manage users in the system."
        actions={
          <Link href="/identity/users/create">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </Link>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Users' },
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
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Locked', label: 'Locked' },
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
              options: data.roles.map((role) => ({ value: role.id, label: role.roleName })),
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
            <Table data-testid="users-table">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user: any) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{user.id}</TableCell>
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
                        {(user.dataScopes ?? []).some((scope) => scope.scopeType === 'All') ? (
                          <Badge variant="default">All Branches</Badge>
                        ) : (
                          (user.dataScopes ?? [])
                            .filter((scope) => scope.scopeType === 'Branch' && scope.branchId)
                            .map((scope, index) => (
                              <Badge key={`${user.id}-${scope.branchId}-${index}`} variant="muted">
                                {scope.branchId ? branchById.get(scope.branchId as string) ?? scope.branchId : 'Branch'}
                              </Badge>
                            ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{user.roleCount ?? user.roleSummaries?.length ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{user.userType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        user.status === 'Active' ? 'success'
                        : user.status === 'Locked' ? 'error'
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
                        <SimpleTooltip content="Manage Roles" side="top">
                          <Link href={`/identity/users/${user.id}/roles`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <ShieldAlert className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>
                        
                        <SimpleTooltip content="View Details" side="top">
                          <Link href={`/identity/users/${user.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>

                        <SimpleTooltip content="Edit User" side="top">
                          <Link href={`/identity/users/${user.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </SimpleTooltip>

                        <form action={async () => {
                          'use server';
                          await updateUserStatusAction(user.id, user.status === 'Active' ? 'Inactive' : 'Active');
                        }} noValidate>
                          {user.status === 'Active' ? (
                            <SimpleTooltip content="Deactivate User" side="top">
                              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-error)] hover:bg-[color:var(--ims-error)]/10">
                                <Ban className="h-4 w-4" />
                              </Button>
                            </SimpleTooltip>
                          ) : (
                            <SimpleTooltip content="Activate User" side="top">
                              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-success)] hover:bg-[color:var(--ims-success)]/10">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </SimpleTooltip>
                          )}
                        </form>
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
