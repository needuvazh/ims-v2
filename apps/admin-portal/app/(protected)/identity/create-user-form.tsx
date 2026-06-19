'use client';

import { useActionState, useState } from 'react';
import { UserPlus } from 'lucide-react';
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
  Select,
} from '@ims/shared-ui';
import type { RoleRecord } from '@ims/identity-access';
import { createUserAction, type ActionResult } from './actions';

const initialState: ActionResult = { success: false };

export function CreateUserForm({ roles }: { roles: RoleRecord[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await createUserAction(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="create-user-btn">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <Alert variant="error" description={state.error} />}
          <Input name="fullName" label="Full Name" placeholder="Fatima Al-Saud" required data-testid="user-name-input" />
          <Input name="email" type="email" label="Email" placeholder="fatima@institute.com" required data-testid="user-email-input" />
          <Input name="phone" label="Phone" placeholder="+966 xx xxxx xxxx" />
          <Input name="password" type="password" label="Password" placeholder="Min 8 characters" required data-testid="user-password-input" />
          <Select
            name="userType"
            label="User Type"
            placeholder="Select type"
            options={[
              { value: 'SuperAdmin', label: 'Super Admin' },
              { value: 'InstituteAdmin', label: 'Institute Admin' },
              { value: 'Trainer', label: 'Trainer' },
              { value: 'Staff', label: 'Staff' },
            ]}
            required
            data-testid="user-type-select"
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending} data-testid="user-submit-btn">Create User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
