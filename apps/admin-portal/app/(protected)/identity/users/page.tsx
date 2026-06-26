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
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string; type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadIdentityData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const statusFilter = searchParams.status || '';
  const typeFilter = searchParams.type || '';
  
  let filteredUsers = data.users;
  
  if (q) {
    filteredUsers = filteredUsers.filter(u => 
      u.fullName.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  }
  
  if (statusFilter) {
    filteredUsers = filteredUsers.filter(u => u.status === statusFilter);
  }
  
  if (typeFilter) {
    filteredUsers = filteredUsers.filter(u => u.userType === typeFilter);
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
                { value: 'Admin', label: 'Admin' },
                { value: 'Staff', label: 'Staff' },
                { value: 'Student', label: 'Student' },
              ]
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
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar fallback={user.fullName} size="sm" />
                        <div>
                          <p className="font-medium text-[color:var(--ims-ink)]">{user.fullName}</p>
                          <p className="text-xs text-[color:var(--ims-muted)]">{user.email}</p>
                        </div>
                      </div>
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

                        <form action={updateUserStatusAction.bind(null, user.id, user.status === 'Active' ? 'Inactive' : 'Active')}>
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
