'use client';

import { useActionState, useState } from 'react';
import { ShieldPlus } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Textarea,
} from '@ims/shared-ui';
import type { PermissionRecord } from '@ims/identity-access';
import { createRoleAction, type ActionResult } from './actions';

const initialState: ActionResult = { success: false };

export function CreateRoleForm({ permissions }: { permissions: PermissionRecord[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await createRoleAction(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" data-testid="create-role-btn">
          <ShieldPlus className="h-4 w-4" /> Add Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <Alert variant="error" description={state.error} />}
          <Input name="roleCode" label="Role Code" placeholder="SUPER_ADMIN" required data-testid="role-code-input" />
          <Input name="roleName" label="Role Name" placeholder="Super Administrator" required data-testid="role-name-input" />
          <Textarea name="description" label="Description" placeholder="Full administrative access." />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending} data-testid="role-submit-btn">Create Role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
