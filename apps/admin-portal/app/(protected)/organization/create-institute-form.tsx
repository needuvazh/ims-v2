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
} from '@ims/shared-ui';
import { createInstituteAction, type ActionResult } from './actions';

const initialState: ActionResult = { success: false };

export function CreateInstituteForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await createInstituteAction(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="create-institute-btn">
          <Plus className="h-4 w-4" /> Add Institute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Institute</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && <Alert variant="error" description={state.error} />}
          <Input name="instituteCode" label="Institute Code" placeholder="AST-HQ" required data-testid="institute-code-input" />
          <Input name="instituteName" label="Institute Name" placeholder="Al-Saud Training Institute" required data-testid="institute-name-input" />
          <Input name="registrationNumber" label="Registration Number" placeholder="Optional" />
          <Input name="primaryEmail" type="email" label="Primary Email" placeholder="admin@institute.com" />
          <Input name="primaryPhone" label="Phone" placeholder="+971 xxx xxx xxxx" />
          <Input name="country" label="Country" placeholder="Saudi Arabia" />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending} data-testid="institute-submit-btn">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
