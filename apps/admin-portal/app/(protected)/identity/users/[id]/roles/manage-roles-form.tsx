'use client';

import { useTransition, useState, useMemo } from 'react';
import {
  Button,
  Badge,
  SearchInput,
  Select,
} from '@ims/shared-ui';
import type { RoleRecord } from '@ims/identity-access';
import { toggleUserRoleAction } from '../../../actions';

export function ManageRolesForm({ userId, allRoles, initialAssignedRoleIds }: { userId: string, allRoles: RoleRecord[], initialAssignedRoleIds: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>(initialAssignedRoleIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all');
  const [sortOption, setSortOption] = useState('alpha_asc');

  const handleToggle = (roleId: string, isAssigned: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedRoleIds((prev) =>
        isAssigned ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
      await toggleUserRoleAction(userId, roleId, !isAssigned);
    });
  };

  if (allRoles.length === 0) {
    return <p className="text-sm text-[color:var(--ims-muted)]">No roles available in the system.</p>;
  }

  const filteredRoles = useMemo(() => {
    return allRoles.filter((role) => {
      const isAssigned = assignedRoleIds.includes(role.id);
      if (filterOption === 'assigned' && !isAssigned) return false;
      if (filterOption === 'unassigned' && isAssigned) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !role.roleName.toLowerCase().includes(query) &&
          !role.roleCode.toLowerCase().includes(query) &&
          !(role.description?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allRoles, assignedRoleIds, filterOption, searchQuery]);

  const sortedRoles = useMemo(() => {
    const roles = [...filteredRoles];
    if (sortOption === 'alpha_asc' || sortOption === 'status') {
      roles.sort((a, b) => a.roleName.localeCompare(b.roleName));
    } else if (sortOption === 'alpha_desc') {
      roles.sort((a, b) => b.roleName.localeCompare(a.roleName));
    }
    return roles;
  }, [filteredRoles, sortOption]);

  const groupedRoles = useMemo(() => {
    if (sortOption !== 'status') return {};
    const groups: Record<string, RoleRecord[]> = {};
    for (const role of sortedRoles) {
      const status = role.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(role);
    }
    return groups;
  }, [sortedRoles, sortOption]);

  return (
    <div className="space-y-6">
      <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchInput
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { label: 'All Roles', value: 'all' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'Unassigned', value: 'unassigned' },
              ]}
              value={filterOption}
              onValueChange={setFilterOption}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { label: 'Alphabetical (A-Z)', value: 'alpha_asc' },
                { label: 'Alphabetical (Z-A)', value: 'alpha_desc' },
                { label: 'Group by Status', value: 'status' },
              ]}
              value={sortOption}
              onValueChange={setSortOption}
            />
          </div>
        </div>

        {sortedRoles.length === 0 ? (
          <p className="text-sm text-[color:var(--ims-muted)] py-8 text-center">No roles found matching your criteria.</p>
        ) : sortOption === 'status' ? (
          <div className="space-y-8">
            {Object.entries(groupedRoles).sort(([a], [b]) => a.localeCompare(b)).map(([status, roles]) => (
              <div key={status} className="space-y-4">
                <h3 className="text-lg font-semibold text-[color:var(--ims-ink)] border-b border-[color:var(--ims-border)] pb-2">{status}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {roles.map((role) => {
                    const isAssigned = assignedRoleIds.includes(role.id);
                    return (
                      <div
                        key={role.id}
                        className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[color:var(--ims-ink)]">{role.roleName}</span>
                            <Badge variant={role.status === 'Active' ? 'success' : 'muted'}>{role.status}</Badge>
                          </div>
                          <p className="text-xs text-[color:var(--ims-muted)] mt-1">{role.roleCode}</p>
                        </div>
                        <Button
                          variant={isAssigned ? 'destructive' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggle(role.id, isAssigned)}
                          disabled={isPending || role.status !== 'Active'}
                          data-testid={`toggle-role-${role.id}`}
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
            {sortedRoles.map((role) => {
              const isAssigned = assignedRoleIds.includes(role.id);
              return (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[color:var(--ims-ink)]">{role.roleName}</span>
                      <Badge variant={role.status === 'Active' ? 'success' : 'muted'}>{role.status}</Badge>
                    </div>
                    <p className="text-xs text-[color:var(--ims-muted)] mt-1">{role.roleCode}</p>
                  </div>
                  <Button
                    variant={isAssigned ? 'destructive' : 'secondary'}
                    size="sm"
                    onClick={() => handleToggle(role.id, isAssigned)}
                    disabled={isPending || role.status !== 'Active'}
                    data-testid={`toggle-role-${role.id}`}
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
