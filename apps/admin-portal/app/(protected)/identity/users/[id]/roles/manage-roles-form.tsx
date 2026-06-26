'use client';

import { useTransition, useState } from 'react';
import {
  Button,
  Badge,
} from '@ims/shared-ui';
import type { RoleRecord } from '@ims/identity-access';
import { toggleUserRoleAction } from '../../../actions';

export function ManageRolesForm({ userId, allRoles, initialAssignedRoleIds }: { userId: string, allRoles: RoleRecord[], initialAssignedRoleIds: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>(initialAssignedRoleIds);

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

  return (
    <div className="bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
      <div className="grid gap-4">
        {allRoles.map((role) => {
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
  );
}
