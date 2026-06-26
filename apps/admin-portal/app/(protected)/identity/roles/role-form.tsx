'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldPlus, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Input,
  Textarea,
} from '@ims/shared-ui';
import type { RoleRecord } from '@ims/identity-access';
import { createRoleAction, updateRoleAction, type ActionResult } from '../actions';

const initialState: ActionResult = { success: false };

export interface RoleFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: RoleRecord;
}

export function RoleForm({ mode, initialData }: RoleFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = mode === 'edit' && initialData?.id
        ? await updateRoleAction(initialData.id, prev, formData)
        : await createRoleAction(prev, formData);
      if (result.success) {
        router.push('/identity/roles');
      }
      return result;
    },
    initialState,
  );

  const isView = mode === 'view';

  return (
    <form action={formAction} className="space-y-6 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)]">
      {state.error && <Alert variant="error" description={state.error} />}
      
      <div className="space-y-4">
        <Input 
          name="roleCode" 
          label="Role Code" 
          placeholder="SUPER_ADMIN" 
          required 
          defaultValue={initialData?.roleCode}
          disabled={isView || mode === 'edit'} // Usually code is immutable
          data-testid="role-code-input" 
        />
        <Input 
          name="roleName" 
          label="Role Name" 
          placeholder="Super Administrator" 
          required 
          defaultValue={initialData?.roleName}
          disabled={isView}
          data-testid="role-name-input" 
        />
        <Textarea 
          name="description" 
          label="Description" 
          placeholder="Full administrative access." 
          defaultValue={initialData?.description ?? ''}
          disabled={isView}
        />
      </div>

      {!isView && (
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push('/identity/roles')}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} data-testid="role-submit-btn">
            {mode === 'create' ? (
              <><ShieldPlus className="h-4 w-4 mr-2" /> Create Role</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
