'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldPlus, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Input,
  Select,
  Textarea,
} from '@ims/shared-ui';
import { createRoleAction, updateRoleAction, type ActionResult } from '../actions';

const initialState: ActionResult = { success: false };

export interface RoleFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: any;
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function RoleForm({ mode, initialData }: RoleFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = mode === 'edit' && initialData?.id
        ? await updateRoleAction(initialData.id, prev, formData)
        : await createRoleAction(prev, formData);
      if (result.success) {
        router.push('/iam/roles');
      }
      return result;
    },
    initialState,
  );

  useEffect(() => {
    if (state.fieldErrors) {
      setFieldErrors(state.fieldErrors);
    }
  }, [state.fieldErrors]);

  useEffect(() => {
    if (state.success) {
      setFieldErrors({});
    }
  }, [state.success]);

  const isView = mode === 'view';

  return (
    <form action={formAction} noValidate className="space-y-6 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)] shadow-sm">
      {state.error && <Alert variant="error" description={state.error} />}
      
      <div className="space-y-4">
        <Input 
          name="roleCode" 
          label="Role Code" 
          placeholder="SUPER_ADMIN" 
          required 
          defaultValue={state.values?.roleCode ?? initialData?.roleCode}
          disabled={isView || mode === 'edit'} // Code is immutable after creation
          data-testid="role-code-input" 
          errorText={fieldErrors.roleCode}
        />
        <Input 
          name="roleName" 
          label="Role Name" 
          placeholder="Super Administrator" 
          required 
          defaultValue={state.values?.roleName ?? initialData?.roleName}
          disabled={isView}
          data-testid="role-name-input" 
          errorText={fieldErrors.roleName}
        />
        <Textarea 
          name="description" 
          label="Description" 
          placeholder="Full administrative access." 
          defaultValue={state.values?.description ?? initialData?.description ?? ''}
          disabled={isView}
          errorText={fieldErrors.description}
        />
        <Select
          name="status"
          label="Status"
          placeholder="Select status"
          defaultValue={state.values?.status ?? initialData?.status ?? 'Active'}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Archived', label: 'Archived' },
          ]}
          required
          disabled={isView}
          data-testid="role-status-select"
          errorText={fieldErrors.status}
        />
        <Input
          name="effectiveStartDate"
          type="date"
          label="Effective Start Date"
          defaultValue={state.values?.effectiveStartDate ? toDateInputValue(new Date(state.values.effectiveStartDate)) : toDateInputValue(initialData?.effectiveStartDate)}
          disabled={isView}
          errorText={fieldErrors.effectiveStartDate}
        />
        <Input
          name="effectiveEndDate"
          type="date"
          label="Effective End Date"
          defaultValue={state.values?.effectiveEndDate ? toDateInputValue(new Date(state.values.effectiveEndDate)) : toDateInputValue(initialData?.effectiveEndDate ?? null)}
          disabled={isView}
          errorText={fieldErrors.effectiveEndDate}
        />
      </div>

      {!isView && (
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push('/iam/roles')}>
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
