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
  EmptyState,
  Pagination,
  DataTableFilter
} from '@ims/shared-ui';
import { KeyRound, Home, ShieldCheck, Key } from 'lucide-react';
import { loadIdentityData } from '../shared-data';

export const metadata = { title: 'IAM Permissions | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IdentityPermissionsPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; module?: string; type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadIdentityData();
  
  const page = parseInt(searchParams.page || '1', 10);
  const limit = parseInt(searchParams.limit || '10', 10);
  const q = (searchParams.q || '').toLowerCase();
  const moduleFilter = searchParams.module || '';
  const typeFilter = searchParams.type || '';
  
  let filteredPermissions = data.permissions;
  
  if (q) {
    filteredPermissions = filteredPermissions.filter(p => 
      p.permissionCode.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    );
  }
  
  if (moduleFilter) {
    filteredPermissions = filteredPermissions.filter(p => p.moduleCode === moduleFilter);
  }

  if (typeFilter) {
    filteredPermissions = filteredPermissions.filter(p => p.permissionType === typeFilter);
  }
  
  const uniqueModules = Array.from(new Set(data.permissions.map(p => p.moduleCode))).sort();
  const uniqueTypes = Array.from(new Set(data.permissions.map(p => p.permissionType))).sort();
  
  const totalCount = filteredPermissions.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginatedPermissions = filteredPermissions.slice(offset, offset + limit);

  return (
    <div className="space-y-8">
      <PageHeader
        title="IAM Permissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Permissions', icon: <Key className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />

      <div className="space-y-4">
        <DataTableFilter 
          searchPlaceholder="Search permissions by code or description..."
          filters={[
            {
              key: 'module',
              label: 'Module',
              options: uniqueModules.map(m => ({ value: m, label: m }))
            },
            {
              key: 'type',
              label: 'Type',
              options: uniqueTypes.map(type => ({ value: type, label: type }))
            }
          ]}
        />

        {totalCount === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title="No permissions found"
            description="No permissions match the current search or filter criteria."
          />
        ) : (
          <>
            <Table data-testid="permissions-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Permission Code</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPermissions.map((perm) => (
                  <TableRow key={perm.id} data-testid={`perm-row-${perm.id}`}>
                    <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">{perm.permissionCode}</TableCell>
                    <TableCell>{perm.moduleCode}</TableCell>
                    <TableCell>{perm.featureCode}</TableCell>
                    <TableCell>{perm.actionCode}</TableCell>
                    <TableCell>{perm.permissionType}</TableCell>
                    <TableCell>
                      <Badge variant={perm.status === 'Active' ? 'success' : 'muted'}>{perm.status}</Badge>
                    </TableCell>
                    <TableCell className="text-[color:var(--ims-muted)]">{perm.description ?? '—'}</TableCell>
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
