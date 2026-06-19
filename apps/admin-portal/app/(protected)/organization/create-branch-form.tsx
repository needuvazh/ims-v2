'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
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
import type { Institute } from '@ims/organization';
import { createBranchAction, type ActionResult } from './actions';

const initialState: ActionResult = { success: false };

export function CreateBranchForm({ institutes }: { institutes: Institute[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await createBranchAction(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" data-testid="create-branch-btn">
          <Plus className="h-4 w-4" /> Add Branch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Branch</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <Alert variant="error" description={state.error} />}
          <Select
            name="instituteId"
            label="Institute"
            placeholder="Select institute"
            options={institutes.map((i) => ({ value: i.id, label: i.instituteName }))}
            required
            data-testid="branch-institute-select"
          />
          <Input name="branchCode" label="Branch Code" placeholder="HQ-MAIN" required data-testid="branch-code-input" />
          <Input name="branchName" label="Branch Name" placeholder="Main Campus" required data-testid="branch-name-input" />
          <Input name="city" label="City" placeholder="Riyadh" />
          <Input name="country" label="Country" placeholder="Saudi Arabia" />
          <Input name="email" type="email" label="Branch Email" placeholder="branch@institute.com" />
          <Input name="phone" label="Phone" placeholder="+966 xx xxxx xxxx" />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending} data-testid="branch-submit-btn">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
