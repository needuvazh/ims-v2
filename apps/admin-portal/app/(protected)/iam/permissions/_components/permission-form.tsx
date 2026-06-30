'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Input,
  Select,
  Textarea,
} from '@ims/shared-ui';
import { createPermissionAction, updatePermissionAction, type ActionResult } from '../actions';

const initialState: ActionResult = { success: false };

export interface PermissionFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: any;
}

export function PermissionForm({ mode, initialData }: PermissionFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = mode === 'edit' && initialData?.id
        ? await updatePermissionAction(initialData.id, prev, formData)
        : await createPermissionAction(prev, formData);
      if (result.success) {
        router.push('/iam/permissions');
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          name="permissionCode" 
          label="Permission Code" 
          placeholder="iam.user.create" 
          required 
          defaultValue={state.values?.permissionCode ?? initialData?.permissionCode}
          disabled={isView || mode === 'edit'} // Code is immutable after creation
          data-testid="perm-code-input" 
          errorText={fieldErrors.permissionCode}
        />
        <Select
          name="permissionType"
          label="Type"
          placeholder="Select type"
          defaultValue={state.values?.permissionType ?? initialData?.permissionType ?? 'Action'}
          options={[
            { value: 'Action', label: 'Action' },
            { value: 'Menu', label: 'Menu' },
            { value: 'Data', label: 'Data' },
            { value: 'UI', label: 'UI' },
          ]}
          required
          disabled={isView}
          errorText={fieldErrors.permissionType}
        />
        
        <Input 
          name="moduleCode" 
          label="Module" 
          placeholder="iam" 
          defaultValue={state.values?.moduleCode ?? initialData?.moduleCode}
          disabled={isView}
          errorText={fieldErrors.moduleCode}
        />
        
        <Input 
          name="featureCode" 
          label="Feature" 
          placeholder="user" 
          defaultValue={state.values?.featureCode ?? initialData?.featureCode}
          disabled={isView}
          errorText={fieldErrors.featureCode}
        />
        
        <Input 
          name="actionCode" 
          label="Action" 
          placeholder="create" 
          defaultValue={state.values?.actionCode ?? initialData?.actionCode}
          disabled={isView}
          errorText={fieldErrors.actionCode}
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
          errorText={fieldErrors.status}
        />
      </div>

      <Textarea 
        name="description" 
        label="Description" 
        placeholder="Allows creating new users." 
        defaultValue={state.values?.description ?? initialData?.description ?? ''}
        disabled={isView}
        errorText={fieldErrors.description}
      />

      {!isView && (
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push('/iam/permissions')}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} data-testid="perm-submit-btn">
            {mode === 'create' ? (
              <><ShieldCheck className="h-4 w-4 mr-2" /> Create Permission</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Changes</>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
