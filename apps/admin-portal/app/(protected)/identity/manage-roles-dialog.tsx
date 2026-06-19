'use client';

import { useTransition, useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
} from '@ims/shared-ui';
import type { RoleRecord } from '@ims/identity-access';
import { toggleUserRoleAction, getUserRolesAction } from './actions';

export function ManageRolesDialog({ userId, userName, allRoles }: { userId: string, userName: string, allRoles: RoleRecord[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    const res = await getUserRolesAction(userId);
    if (res.success && res.data) {
      setAssignedRoleIds(res.data.map((r) => r.id));
    }
    setLoading(false);
  };

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchRoles();
    }
  };

  const handleToggle = (roleId: string, isAssigned: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setAssignedRoleIds((prev) =>
        isAssigned ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
      await toggleUserRoleAction(userId, roleId, !isAssigned);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`manage-roles-btn-${userId}`}>
          <ShieldAlert className="h-4 w-4" /> Manage Roles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Roles for {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4">Loading roles...</div>
          ) : allRoles.length === 0 ? (
            <p className="text-sm text-gray-500">No roles available in the system.</p>
          ) : (
            <div className="grid gap-3">
              {allRoles.map((role) => {
                const isAssigned = assignedRoleIds.includes(role.id);
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--ims-border)] p-3"
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
      </DialogContent>
    </Dialog>
  );
}
