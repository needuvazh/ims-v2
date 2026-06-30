'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldPlus, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Input,
  Select,
  Textarea,
} from '@ims/shared-ui';
import {
  createRoleAction,
  updateRoleAction,
  checkRoleCodeExistsAction,
  checkRoleNameExistsAction,
  type ActionResult,
} from '../actions';
import { createRoleFormSchema, updateRoleFormSchema } from '../schema';

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
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = async (name: string) => {
    if (!formRef.current) return true;
    const formData = new FormData(formRef.current);

    const payload: any = {
      roleName: formData.get('roleName') ? String(formData.get('roleName')) : '',
      description: formData.get('description') ? String(formData.get('description')) : null,
      status: String(formData.get('status') ?? 'Active'),
      effectiveStartDate: formData.get('effectiveStartDate') && String(formData.get('effectiveStartDate')) !== '' ? String(formData.get('effectiveStartDate')) : null,
      effectiveEndDate: formData.get('effectiveEndDate') && String(formData.get('effectiveEndDate')) !== '' ? String(formData.get('effectiveEndDate')) : null,
    };

    if (mode === 'create') {
      payload.roleCode = formData.get('roleCode') ? String(formData.get('roleCode')) : '';
    }

    console.log(`[validateField] validating field: ${name}`, { payload });

    const schema = mode === 'edit' ? updateRoleFormSchema : createRoleFormSchema;
    const validation = schema.safeParse(payload);

    // Clear error for this field first
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });

    if (!validation.success) {
      const issue = validation.error.issues.find((issue) => issue.path[0] === name);
      if (issue) {
        console.log(`[validateField] Zod validation issue found for ${name}:`, issue.message);
        setFieldErrors((prev) => ({
          ...prev,
          [name]: issue.message,
        }));
        return false;
      }
    }

    // Async check duplicate roleCode
    if (name === 'roleCode' && mode === 'create') {
      const roleCodeVal = payload.roleCode.trim();
      if (roleCodeVal) {
        console.log(`[validateField] checking duplicate roleCode: ${roleCodeVal}`);
        const exists = await checkRoleCodeExistsAction(roleCodeVal);
        console.log(`[validateField] roleCode exists result: ${exists}`);
        if (exists) {
          setFieldErrors((prev) => ({
            ...prev,
            roleCode: 'Role Code already exists. Please use a different Role Code.',
          }));
          return false;
        }
      }
    }

    // Async check duplicate roleName
    if (name === 'roleName') {
      const roleNameVal = payload.roleName.trim();
      const isDifferent = mode === 'create' || roleNameVal !== (initialData?.roleName ?? '');
      if (roleNameVal && isDifferent) {
        console.log(`[validateField] checking duplicate roleName: ${roleNameVal}`);
        const exists = await checkRoleNameExistsAction(roleNameVal);
        console.log(`[validateField] roleName exists result: ${exists}`);
        if (exists) {
          setFieldErrors((prev) => ({
            ...prev,
            roleName: 'Role Name already exists. Please use a different Role Name.',
          }));
          return false;
        }
      }
    }

    return true;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const name = e.target.name;
    if (name) {
      validateField(name);
    }
  };

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      // 1. Client-side validation
      const payload: any = {
        roleName: formData.get('roleName') ? String(formData.get('roleName')) : '',
        description: formData.get('description') ? String(formData.get('description')) : null,
        status: String(formData.get('status') ?? 'Active'),
        effectiveStartDate: formData.get('effectiveStartDate') && String(formData.get('effectiveStartDate')) !== '' ? String(formData.get('effectiveStartDate')) : null,
        effectiveEndDate: formData.get('effectiveEndDate') && String(formData.get('effectiveEndDate')) !== '' ? String(formData.get('effectiveEndDate')) : null,
      };

      if (mode === 'create') {
        payload.roleCode = formData.get('roleCode') ? String(formData.get('roleCode')) : '';
      }

      const schema = mode === 'edit' ? updateRoleFormSchema : createRoleFormSchema;
      const validation = schema.safeParse(payload);
      const errors: Record<string, string> = {};

      if (!validation.success) {
        console.warn('Client-side form validation failed!', {
          payload,
          issues: validation.error.issues,
        });
        validation.error.issues.forEach((issue) => {
          const path = issue.path[0];
          if (path && !errors[String(path)]) {
            errors[String(path)] = issue.message;
          }
        });
      }

      // Check duplicate roleCode
      if (mode === 'create' && payload.roleCode && !errors.roleCode) {
        const exists = await checkRoleCodeExistsAction(payload.roleCode.trim());
        if (exists) {
          errors.roleCode = 'Role Code already exists. Please use a different Role Code.';
        }
      }

      // Check duplicate roleName
      if (payload.roleName && !errors.roleName) {
        const roleNameVal = payload.roleName.trim();
        const isDifferent = mode === 'create' || roleNameVal !== (initialData?.roleName ?? '');
        if (isDifferent) {
          const exists = await checkRoleNameExistsAction(roleNameVal);
          if (exists) {
            errors.roleName = 'Role Name already exists. Please use a different Role Name.';
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        // Repopulate values
        const values: Record<string, string> = {};
        formData.forEach((value, key) => {
          values[key] = value.toString();
        });

        return {
          success: false,
          error: 'Please fix validation errors.',
          fieldErrors: errors,
          values,
        };
      }

      // 2. Submit to server Action
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
    <form ref={formRef} action={formAction} noValidate className="space-y-6 bg-[color:var(--ims-surface)] p-6 rounded-2xl border border-[color:var(--ims-border)] shadow-sm">
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
          onBlur={handleBlur}
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
          onBlur={handleBlur}
        />
        <Textarea 
          name="description" 
          label="Description" 
          placeholder="Full administrative access." 
          defaultValue={state.values?.description ?? initialData?.description ?? ''}
          disabled={isView}
          errorText={fieldErrors.description}
          onBlur={handleBlur}
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
          onValueChange={() => {
            setTimeout(() => validateField('status'), 0);
          }}
        />
        <Input
          name="effectiveStartDate"
          type="date"
          label="Effective Start Date"
          defaultValue={state.values?.effectiveStartDate ? toDateInputValue(new Date(state.values.effectiveStartDate)) : toDateInputValue(initialData?.effectiveStartDate)}
          disabled={isView}
          errorText={fieldErrors.effectiveStartDate}
          onBlur={handleBlur}
        />
        <Input
          name="effectiveEndDate"
          type="date"
          label="Effective End Date"
          defaultValue={state.values?.effectiveEndDate ? toDateInputValue(new Date(state.values.effectiveEndDate)) : toDateInputValue(initialData?.effectiveEndDate ?? null)}
          disabled={isView}
          errorText={fieldErrors.effectiveEndDate}
          onBlur={handleBlur}
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
