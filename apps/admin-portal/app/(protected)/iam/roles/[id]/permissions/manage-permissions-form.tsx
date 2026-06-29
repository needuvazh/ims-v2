'use client';

import { useTransition, useState, useMemo } from 'react';
import {
  Button,
  Badge,
  SearchInput,
  Select,
} from '@ims/shared-ui';
import { toggleRolePermissionAction } from '../../actions';

// Define minimal expected interfaces from domain to keep it decoupled from raw types if needed
export interface UIRolePermission {
  id: string;
  permissionCode: string;
  permissionType: string;
  status: string;
  moduleCode: string | null;
  featureCode: string | null;
  actionCode: string | null;
  description: string | null;
}

export function ManagePermissionsForm({ roleId, allPermissions, initialAssignedPermissionIds }: { roleId: string, allPermissions: UIRolePermission[], initialAssignedPermissionIds: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>(initialAssignedPermissionIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');
  const [sortOption, setSortOption] = useState('module');

  const handleToggle = (permissionId: string, isAssigned: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedPermissionIds((prev) =>
        isAssigned ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
      );
      await toggleRolePermissionAction(roleId, permissionId, !isAssigned);
    });
  };

  if (allPermissions.length === 0) {
    return <p className="text-sm text-[color:var(--ims-muted)]">No permissions available in the system.</p>;
  }

  const filteredPermissions = useMemo(() => {
    return allPermissions.filter((perm) => {
      const isAssigned = assignedPermissionIds.includes(perm.id);
      if (filterOption === 'assigned' && !isAssigned) return false;
      if (filterOption === 'unassigned' && isAssigned) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !perm.permissionCode.toLowerCase().includes(query) &&
          !(perm.description?.toLowerCase().includes(query)) &&
          !(perm.moduleCode?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allPermissions, assignedPermissionIds, filterOption, searchQuery]);

  const sortedPermissions = useMemo(() => {
    const perms = [...filteredPermissions];
    if (sortOption === 'alpha_asc' || sortOption === 'module') {
      perms.sort((a, b) => a.permissionCode.localeCompare(b.permissionCode));
    } else if (sortOption === 'alpha_desc') {
      perms.sort((a, b) => b.permissionCode.localeCompare(a.permissionCode));
    }
    return perms;
  }, [filteredPermissions, sortOption]);

  const groupedPermissions = useMemo(() => {
    if (sortOption !== 'module') return {};
    const groups: Record<string, UIRolePermission[]> = {};
    for (const perm of sortedPermissions) {
      const moduleCode = perm.moduleCode || 'Other';
      if (!groups[moduleCode]) {
        groups[moduleCode] = [];
      }
      groups[moduleCode].push(perm);
    }
    return groups;
  }, [sortedPermissions, sortOption]);
  
  return (
    <div className="space-y-6">
      <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchInput
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              name="filterOption"
              options={[
                { label: 'All Permissions', value: 'all' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'Unassigned', value: 'unassigned' },
              ]}
              value={filterOption}
              onValueChange={setFilterOption}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              name="sortOption"
              options={[
                { label: 'Alphabetical (A-Z)', value: 'alpha_asc' },
                { label: 'Alphabetical (Z-A)', value: 'alpha_desc' },
                { label: 'Group by Module', value: 'module' },
              ]}
              value={sortOption}
              onValueChange={setSortOption}
            />
          </div>
        </div>
        
        {sortedPermissions.length === 0 ? (
          <p className="text-sm text-[color:var(--ims-muted)] py-8 text-center">No permissions found matching your criteria.</p>
        ) : sortOption === 'module' ? (
          <div className="space-y-8">
            {Object.entries(groupedPermissions).sort(([a], [b]) => a.localeCompare(b)).map(([moduleCode, perms]) => (
              <div key={moduleCode} className="space-y-4">
                <h3 className="text-lg font-semibold text-[color:var(--ims-ink)] capitalize border-b border-[color:var(--ims-border)] pb-2">{moduleCode}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {perms.map((perm) => {
                    const isAssigned = assignedPermissionIds.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[color:var(--ims-brass)] font-semibold">{perm.permissionCode}</span>
                            <Badge variant="outline">{perm.permissionType}</Badge>
                            <Badge variant={perm.status === 'Active' ? 'success' : 'muted'}>{perm.status}</Badge>
                          </div>
                          <p className="text-xs text-[color:var(--ims-muted)] mt-1">
                            {perm.moduleCode} / {perm.featureCode} / {perm.actionCode}
                          </p>
                          <p className="text-sm text-[color:var(--ims-ink)] mt-1">{perm.description || 'No description'}</p>
                        </div>
                        <Button
                          variant={isAssigned ? 'destructive' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggle(perm.id, isAssigned)}
                          disabled={isPending}
                          data-testid={`toggle-perm-${perm.id}`}
                        >
                          {isAssigned ? 'Remove' : 'Assign'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedPermissions.map((perm) => {
              const isAssigned = assignedPermissionIds.includes(perm.id);
              return (
                <div
                  key={perm.id}
                  className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[color:var(--ims-brass)] font-semibold">{perm.permissionCode}</span>
                      <Badge variant="outline">{perm.permissionType}</Badge>
                      <Badge variant={perm.status === 'Active' ? 'success' : 'muted'}>{perm.status}</Badge>
                    </div>
                    <p className="text-xs text-[color:var(--ims-muted)] mt-1">
                      {perm.moduleCode} / {perm.featureCode} / {perm.actionCode}
                    </p>
                    <p className="text-sm text-[color:var(--ims-ink)] mt-1">{perm.description || 'No description'}</p>
                  </div>
                  <Button
                    variant={isAssigned ? 'destructive' : 'secondary'}
                    size="sm"
                    onClick={() => handleToggle(perm.id, isAssigned)}
                    disabled={isPending}
                    data-testid={`toggle-perm-${perm.id}`}
                  >
                    {isAssigned ? 'Remove' : 'Assign'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
